import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,rm} from 'node:fs/promises';
import {createClient} from '@libsql/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';

process.env.NODE_ENV='test';
process.env.SESSION_SECRET=randomBytes(48).toString('hex');
process.env.OWNER_SETUP_KEY=randomBytes(32).toString('hex');
process.env.TURSO_DATABASE_URL=`file:data/owners-test-${randomUUID()}.db`;
for(const key of ['CLOUDINARY_CLOUD_NAME','HTTPS_KEY_FILE','HTTPS_CERT_FILE','HTTPS_PFX_FILE','HTTPS_PASSPHRASE_FILE'])delete process.env[key];

// Reproduce the previous single-owner database to exercise the real migration.
await mkdir('data',{recursive:true});
const legacy=createClient({url:process.env.TURSO_DATABASE_URL});
const schema=await readFile(new URL('../src/schema.sql',import.meta.url),'utf8');
await legacy.execute(schema.match(/CREATE TABLE IF NOT EXISTS users[^;]+;/)[0]);
await legacy.execute("CREATE UNIQUE INDEX singleton_owner ON users(role) WHERE role='admin'");
const firstId=randomUUID(),firstPassword='ExistingOwnerPassword123!',secondPassword='SecondOwnerPassword123!';
await legacy.execute({sql:"INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,'admin')",args:[firstId,'First Owner','first@example.com',await bcrypt.hash(firstPassword,12)]});
legacy.close();

const {app}=await import('../src/server.js');
const {db,one,run}=await import('../src/db.js');
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const first=request.agent(base),second=request.agent(base),visitor=request.agent(base);
async function csrf(agent,path){const r=await agent.get(path);assert.equal(r.status,200);return r.text.match(/name="_csrf" value="([a-f0-9]+)"/)[1];}
async function post(agent,url,body,path='/owner/login'){const token=await csrf(agent,path);return agent.post(url).type('form').send({_csrf:token,...body});}

test('existing owner can add exactly one second owner, with protected creation and separate logins',async()=>{
  assert.equal((await one('SELECT name FROM users WHERE id=?',[firstId])).name,'First Owner');
  assert.equal(await one("SELECT name FROM sqlite_master WHERE name='singleton_owner'"),undefined);
  assert.equal((await visitor.get('/owner/setup')).status,404);
  assert.equal((await visitor.get('/control/owners')).status,404);
  assert.equal((await visitor.post('/control/owners').type('form').send({role:'admin'})).status,404);
  assert.equal((await post(first,'/owner/login',{email:'first@example.com',password:firstPassword})).status,302);
  assert.match((await first.get('/control')).text,/Owner logins/);
  assert.match((await first.get('/control/owners')).text,/Add your second owner/);
  const details={name:'Second Owner',email:'second@example.com',password:secondPassword,confirm_password:secondPassword,current_password:firstPassword};
  assert.equal((await first.post('/control/owners').type('form').send({...details,_csrf:'bad'})).status,403);
  assert.equal((await post(first,'/control/owners',{...details,current_password:'IncorrectPassword'},'/control/owners')).status,403);
  assert.equal((await post(first,'/control/owners',{...details,confirm_password:'NotTheSamePassword'},'/control/owners')).status,400);
  const token=await csrf(first,'/control/owners');
  const attempts=await Promise.all([
    first.post('/control/owners').type('form').send({...details,_csrf:token}),
    first.post('/control/owners').type('form').send({...details,email:'concurrent@example.com',_csrf:token})
  ]);
  assert.deepEqual(attempts.map(r=>r.status).sort(),[302,409]);
  assert.equal((await one("SELECT COUNT(*) n FROM users WHERE role='admin'")).n,2);
  const created=await one("SELECT * FROM users WHERE role='admin' AND id<>?",[firstId]);
  assert.notEqual(created.password,secondPassword);
  assert.ok(await bcrypt.compare(secondPassword,created.password));
  assert.equal((await post(second,'/login',{email:created.email,password:secondPassword},'/login')).status,401);
  assert.equal((await post(second,'/owner/login',{email:created.email,password:secondPassword})).status,302);
  for(const section of ['','/listings','/verification','/users','/categories','/analytics','/settings','/reports','/owners']){
    assert.equal((await second.get('/control'+section)).status,200,section);
  }
  assert.match((await second.get('/control/owners')).text,/Both owner logins are configured/);
  assert.equal((await post(second,'/control/owners',{...details,email:'third@example.com',current_password:secondPassword},'/control')).status,409);
  assert.equal((await visitor.get('/owner/setup')).status,404);
  assert.equal((await post(visitor,'/owner/setup',{setup_key:process.env.OWNER_SETUP_KEY,name:'Third',email:'third@example.com',password:secondPassword})).status,404);
  assert.equal((await post(visitor,'/register',{role:'admin',name:'Third',email:'third@example.com',password:secondPassword},'/register')).status,400);
  await assert.rejects(run("INSERT INTO users(id,name,email,password,role) VALUES('third','Third','third@example.com','hash','admin')"),/at most two owner/);
  await run("INSERT INTO users(id,name,email,password,role) VALUES('buyer','Buyer','buyer@example.com',?,'buyer')",[await bcrypt.hash(firstPassword,12)]);
  await assert.rejects(run("UPDATE users SET role='admin' WHERE id='buyer'"),/at most two owner/);
  const buyer=request.agent(base);
  assert.equal((await post(buyer,'/login',{email:'buyer@example.com',password:firstPassword},'/login')).status,302);
  assert.equal((await buyer.get('/control/owners')).status,404);
  assert.equal((await buyer.post('/control/owners').type('form').send(details)).status,404);
  assert.equal((await post(first,`/control/users/${created.id}`,{action:'suspend'},'/control')).status,400);
  assert.equal((await one("SELECT COUNT(*) n FROM activity_logs WHERE action='Second owner account created'")).n,1);
});

after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();try{await rm(process.env.TURSO_DATABASE_URL.slice(5),{force:true});}catch(e){if(e.code!=='EBUSY')throw e;}});
