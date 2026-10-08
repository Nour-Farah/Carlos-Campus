import {Router} from 'express';
import {rateLimit} from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {rows,one,run,log} from './db.js';
import {owner,csrf} from './auth.js';

export const ownerAccounts=Router();
ownerAccounts.use(owner);
const creationLimit=rateLimit({windowMs:15*60*1000,limit:10});
const invalid=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

ownerAccounts.get('/',async(req,res)=>{
  const owners=await rows("SELECT id,name,email,created_at FROM users WHERE role='admin' ORDER BY created_at,id");
  res.render('owners',{owners,created:req.query.created==='1'});
});

ownerAccounts.post('/',creationLimit,csrf,async(req,res)=>{
  const current=await one("SELECT password FROM users WHERE id=? AND role='admin' AND suspended=0",[req.user.id]);
  const password=typeof req.body.current_password==='string'?req.body.current_password.trim():'';
  if(!current||!password||password.length>128||!await bcrypt.compare(password,current.password)){
    invalid('Your current owner password is incorrect.',403);
  }
  if((await one("SELECT COUNT(*) n FROM users WHERE role='admin'")).n>=2){
    invalid('Both owner logins are already configured. CampusLoop supports two owners.',409);
  }
  const name=typeof req.body.name==='string'?req.body.name.trim():'';
  const email=typeof req.body.email==='string'?req.body.email.trim().toLowerCase():'';
  const newPassword=req.body.password;
  if(name.length<2||name.length>80)invalid('Enter an owner name between 2 and 80 characters.');
  if(email.length>200||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))invalid('Enter a valid email address.');
  if(typeof newPassword!=='string'||newPassword.length<12||Buffer.byteLength(newPassword)>72){
    invalid('Use a password of at least 12 characters and at most 72 UTF-8 bytes.');
  }
  if(newPassword!==newPassword.trim())invalid('Do not start or end the new password with whitespace.');
  if(newPassword!==req.body.confirm_password)invalid('The new passwords do not match.');
  if(await one('SELECT id FROM users WHERE email=?',[email]))invalid('That email already has an account. Use a separate email for the second owner.',409);
  const id=randomUUID();
  // The database trigger also enforces the cap if concurrent requests race.
  try{
    await run("INSERT INTO users(id,name,email,password,role) VALUES(?,?,?,?,'admin')",[id,name,email,await bcrypt.hash(newPassword,12)]);
  }catch(error){
    if(error.message?.includes('at most two owner'))invalid('Both owner logins are already configured.',409);
    throw error;
  }
  await log(req.user.id,null,'Second owner account created',id);
  res.redirect('/control/owners?created=1');
});
