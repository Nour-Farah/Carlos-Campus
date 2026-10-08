import {existsSync} from 'node:fs';
import {writeFile,readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
if(!existsSync('.env')){let env=await readFile('.env.example','utf8');env=env.replace('SESSION_SECRET=','SESSION_SECRET='+randomBytes(48).toString('hex')).replace('OWNER_SETUP_KEY=','OWNER_SETUP_KEY='+randomBytes(32).toString('hex'));await writeFile('.env',env,{mode:0o600});console.log('Created private local .env settings.');}
await import('dotenv/config');const {initialize}=await import('../src/db.js');await initialize();
const {localTlsOptions}=await import('../src/transport.js');
const origin=localTlsOptions()?`https://localhost:${process.env.HTTPS_PORT||3443}`:`http://localhost:${process.env.PORT||3000}`;
console.log(`Open ${origin}`);console.log(`First owner: ${origin}/owner/setup`);console.log('Use OWNER_SETUP_KEY from .env (keep it private).');
