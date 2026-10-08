import {test} from 'node:test';
import assert from 'node:assert/strict';
import {httpsRedirect,localTlsOptions} from '../src/transport.js';

test('HTTP redirects preserve paths and queries without trusting caller hosts',()=>{
  const redirect=httpsRedirect('https://localhost:3443');
  for(const [url,status,location] of [
    ['/owner/login',308,'https://localhost:3443/owner/login'],
    ['/marketplace?q=books&min=10',308,'https://localhost:3443/marketplace?q=books&min=10'],
    ['//attacker.example/steal',400,undefined],
    ['https://attacker.example/steal',400,undefined],
    ['/\\attacker.example/steal',400,undefined]
  ]){
    const response={writeHead(code,headers){this.status=code;this.headers=headers;},end(){}};
    redirect({url,headers:{host:'attacker.example'}},response);
    assert.equal(response.status,status);assert.equal(response.headers?.Location,location);
  }
});

test('Render production does not load local development certificates',()=>{
  assert.equal(localTlsOptions({NODE_ENV:'production'}),null);
  assert.equal(localTlsOptions({NODE_ENV:'test'}),null);
  assert.throws(()=>localTlsOptions({HTTPS_KEY_FILE:'missing-key.pem'}),/both HTTPS_KEY_FILE/);
});
