import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {randomUUID,randomBytes,X509Certificate} from 'node:crypto';
import {createServer,get} from 'node:https';
import {localTlsOptions} from '../src/transport.js';

test('local HTTPS validates its certificate and issues Secure session cookies',{
  skip:!existsSync('.certs/localhost.pfx')
},async()=>{
  process.env.NODE_ENV='test';
  process.env.SESSION_SECRET=randomBytes(48).toString('hex');
  process.env.TURSO_DATABASE_URL=`file:data/https-test-${randomUUID()}.db`;
  const certificate=new X509Certificate(readFileSync('.certs/localhost.cer'));
  assert.equal(certificate.ca,false);
  assert.equal(certificate.checkHost('localhost'),'localhost');
  assert.equal(certificate.checkIP('127.0.0.1'),'127.0.0.1');
  const {app}=await import('../src/server.js');
  const {db}=await import('../src/db.js');
  const server=createServer(localTlsOptions({HTTPS_PFX_FILE:'.certs/localhost.pfx',HTTPS_PASSPHRASE_FILE:'.certs/passphrase'}),app);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const result=await new Promise((resolve,reject)=>{
      const req=get({hostname:'127.0.0.1',port:server.address().port,path:'/owner/login',ca:certificate.toString()},res=>{
        let body='';res.on('data',chunk=>{body+=chunk;});
        res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));
      });req.on('error',reject);
    });
    assert.equal(result.status,200);
    assert.match(result.body,/Owner sign in/);
    const cookie=result.headers['set-cookie'][0];
    assert.match(cookie,/; Secure(?:;|$)/);
    assert.match(cookie,/; HttpOnly(?:;|$)/);
    assert.match(cookie,/SameSite=Lax/);
  }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});
