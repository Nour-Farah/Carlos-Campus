import {existsSync,readFileSync} from 'node:fs';
import {createServer as httpServer} from 'node:http';
import {createServer as httpsServer} from 'node:https';

export function localTlsOptions(env=process.env){
  if(env.HTTPS_PFX_FILE){
    if(!env.HTTPS_PASSPHRASE_FILE)throw new Error('HTTPS_PASSPHRASE_FILE is required with HTTPS_PFX_FILE.');
    return {pfx:readFileSync(env.HTTPS_PFX_FILE),passphrase:readFileSync(env.HTTPS_PASSPHRASE_FILE,'utf8').trim(),minVersion:'TLSv1.2'};
  }
  if(env.HTTPS_KEY_FILE||env.HTTPS_CERT_FILE){
    if(!env.HTTPS_KEY_FILE||!env.HTTPS_CERT_FILE)throw new Error('Configure both HTTPS_KEY_FILE and HTTPS_CERT_FILE.');
    return {key:readFileSync(env.HTTPS_KEY_FILE),cert:readFileSync(env.HTTPS_CERT_FILE),minVersion:'TLSv1.2'};
  }
  if(!['production','test'].includes(env.NODE_ENV)&&existsSync('.certs/enabled')&&existsSync('.certs/localhost.pfx')){
    return localTlsOptions({...env,HTTPS_PFX_FILE:'.certs/localhost.pfx',HTTPS_PASSPHRASE_FILE:'.certs/passphrase'});
  }
  return null;
}

export function httpsRedirect(origin){
  const targetOrigin=new URL(origin).origin;
  if(!targetOrigin.startsWith('https://'))throw new Error('HTTPS redirect requires an HTTPS origin.');
  return (req,res)=>{
    let url;
    try{url=new URL(req.url,targetOrigin);}catch{res.writeHead(400);return res.end('Invalid URL');}
    if(url.origin!==targetOrigin){res.writeHead(400);return res.end('Invalid URL');}
    // Use the configured destination, never the untrusted Host header.
    res.writeHead(308,{Location:url.href,'Cache-Control':'no-store'});
    res.end();
  };
}

export function startServer(app,env=process.env){
  const tls=localTlsOptions(env);
  if(tls){
    const port=Number(env.HTTPS_PORT||3443),origin=`https://localhost:${port}`;
    const secure=httpsServer(tls,app);
    secure.listen(port,'127.0.0.1',()=>console.log(`CampusLoop: ${origin}`));
    const redirect=httpServer(httpsRedirect(origin));
    redirect.listen(Number(env.PORT||3000),'127.0.0.1',()=>console.log('Local HTTP requests redirect to HTTPS.'));
    return [secure,redirect];
  }
  const port=Number(env.PORT||3000),production=env.NODE_ENV==='production';
  const server=app.listen(port,production?'0.0.0.0':'127.0.0.1',()=>console.log(production?'CampusLoop is listening behind the hosting HTTPS proxy.':`CampusLoop: http://localhost:${port}`));
  return [server];
}
