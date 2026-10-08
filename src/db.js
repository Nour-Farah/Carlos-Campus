import 'dotenv/config';
import {createClient} from '@libsql/client';
import {mkdir,readFile} from 'node:fs/promises';
await mkdir('data',{recursive:true});
export const db=createClient({url:process.env.TURSO_DATABASE_URL||'file:data/campusloop.db',authToken:process.env.TURSO_AUTH_TOKEN});
export const run=(sql,args=[])=>db.execute({sql,args});
export const rows=async(sql,args=[])=> (await run(sql,args)).rows;
export const one=async(sql,args=[])=> (await rows(sql,args))[0];
export async function initialize(){await db.executeMultiple(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));for(const [i,name] of ['Textbooks','Laptops','Tablets','Calculators','Electronics','Bags','Accessories','Study Materials','Dorm & Campus','Other'].entries())await run('INSERT OR IGNORE INTO categories(name,position) VALUES(?,?)',[name,i]);for(const [key,value] of Object.entries({headline:'Campus essentials, passed from student to student.',description:'Buy and sell textbooks, laptops, tablets, calculators, electronics, bags, accessories, and study materials directly with students.',marketplace_headline:'Find your next campus essential.',announcement:'A little less new. A lot more possibility.',safety_notice:'CampusLoop does not process payments. Inspect the item, verify its condition, meet in a safe public location, and confirm all details before paying.',featured_categories:'Textbooks,Laptops,Calculators'}))await run('INSERT OR IGNORE INTO site_settings(key,value) VALUES(?,?)',[key,value]);}
export const log=(actor,product,action,details='')=>run('INSERT INTO activity_logs(actor_id,product_id,action,details) VALUES(?,?,?,?)',[actor||null,product||null,action,details]);
