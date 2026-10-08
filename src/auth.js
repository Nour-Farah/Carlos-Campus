import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {one,run} from './db.js';
const secret=process.env.SESSION_SECRET;
if(!secret||secret.length<32)throw new Error('Run npm run setup to generate SESSION_SECRET (minimum 32 characters).');
export const token=()=>randomBytes(32).toString('hex');
const sign=id=>createHmac('sha256',secret).update(id).digest('hex');
export function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export async function session(req,res,next){try{const raw=req.headers.cookie?.split('; ').find(c=>c.startsWith('campusloop='))?.slice(11);let s;if(raw){const [id,sig]=raw.split('.');if(safeEqual(sig,sign(id)))s=await one('SELECT * FROM sessions WHERE id=? AND expires>?',[id,Date.now()]);}if(!s){s={id:token(),csrf:token(),expires:Date.now()+7*86400000};await run('INSERT INTO sessions(id,csrf,expires) VALUES(?,?,?)',[s.id,s.csrf,s.expires]);res.cookie('campusloop',`${s.id}.${sign(s.id)}`,{httpOnly:true,sameSite:'lax',secure:req.secure||process.env.NODE_ENV==='production',maxAge:7*86400000});}req.session=s;req.user=s.user_id?await one('SELECT id,name,email,role,university,location,phone,suspended,created_at FROM users WHERE id=?',[s.user_id]):null;if(req.user?.suspended){req.user=null;await run('UPDATE sessions SET user_id=NULL WHERE id=?',[s.id]);}res.locals.user=req.user;res.locals.csrf=s.csrf;next();}catch(e){next(e);}}
export function csrf(req,res,next){if(!safeEqual(req.body?._csrf||req.headers['x-csrf-token'],req.session.csrf))return res.status(403).render('error',{title:'Request expired',message:'Refresh the page and try again.'});next();}
export const requireUser=(req,res,next)=>req.user?next():res.redirect('/login');
export const owner=(req,res,next)=>req.user?.role==='admin'?next():res.status(404).render('error',{title:'Page not found',message:'This page is unavailable.'});
export const seller=(req,res,next)=>['seller','admin'].includes(req.user?.role)?next():res.status(403).render('error',{title:'Seller account required',message:'Sign in with a seller account to manage listings.'});
export async function login(req,res,user){await run('DELETE FROM sessions WHERE id=?',[req.session.id]);const id=token();await run('INSERT INTO sessions(id,user_id,csrf,expires) VALUES(?,?,?,?)',[id,user.id,token(),Date.now()+7*86400000]);res.cookie('campusloop',`${id}.${sign(id)}`,{httpOnly:true,sameSite:'lax',secure:req.secure||process.env.NODE_ENV==='production',maxAge:7*86400000});}
