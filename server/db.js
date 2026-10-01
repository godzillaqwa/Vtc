import pg from 'pg';
import crypto from 'node:crypto';
const {Pool}=pg; let pool=null;
export function dbConfigured(){return Boolean(process.env.DATABASE_URL);}
function getPool(){if(!pool) pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==='false'?false:{rejectUnauthorized:false},max:10});return pool;}
export async function query(text,params=[]){if(!dbConfigured()) throw new Error('DATABASE_URL is not configured');return getPool().query(text,params);}
export async function appendAudit(event){const payload=JSON.stringify(event),hash=crypto.createHash('sha256').update(payload).digest('hex');await query('INSERT INTO audit_events(event_type,occurred_at,payload_json,payload_hash) VALUES($1,COALESCE($2,NOW()),$3::jsonb,$4) ON CONFLICT DO NOTHING',[event.type,event.occurredAt||null,payload,hash]);return hash;}
