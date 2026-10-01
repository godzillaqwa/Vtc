import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {createProviders,env} from './providers.js';
import {appendAudit,dbConfigured,query} from './db.js';
import {requireApiKey,requireRole} from './auth.js';
import {profitability,reconcile} from './calculations.js';

const app=express(),root=path.dirname(fileURLToPath(import.meta.url)),port=Number(env('PORT')||3000);
const company=env('COMPANY_NAME')||'Mining Operations',site=env('SITE_NAME')||'Unconfigured Site',address=env('BITCOIN_PAYOUT_ADDRESS');
app.disable('x-powered-by');app.use(express.json({limit:'1mb'}));app.use(express.static(path.join(root,'..','public')));app.use('/api',requireApiKey);
async function json(url){const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}
function normalize(x){return {provider:x.provider,coin:x.coin,source:x.source,pool:x.pool,workers:Array.isArray(x.workers)?x.workers:Object.entries(x.workers||{}).map(([name,w])=>({name,...w})),payouts:x.payouts||[]};}
async function collect(){const out=[];for(const p of createProviders()){try{const d=normalize(await p.overview());out.push({...d,connected:true});if(dbConfigured()){const raw=JSON.stringify(d),hash=crypto.createHash('sha256').update(raw).digest('hex');await query('INSERT INTO telemetry_snapshots(provider,coin,payload_json,payload_hash) VALUES($1,$2,$3::jsonb,$4) ON CONFLICT DO NOTHING',[d.provider,d.coin,raw,hash]);await appendAudit({type:'TELEMETRY_CAPTURED',provider:d.provider,coin:d.coin,payloadHash:hash});}}catch(e){out.push({provider:p.name,connected:false,error:e.message});}}return out;}
app.get('/api/health',(_q,r)=>r.json({ok:true,readOnly:env('READ_ONLY')!=='false',database:dbConfigured(),providers:createProviders().map(p=>p.name)}));
app.get('/api/overview',async(_q,r)=>{let wallet={connected:false,reason:'NOT_CONFIGURED'};if(address)try{wallet={connected:true,address,chain:await json('https://mempool.space/api/address/'+encodeURIComponent(address))};}catch(e){wallet={connected:false,address,error:e.message};}r.json({company,site,generatedAt:new Date().toISOString(),readOnly:env('READ_ONLY')!=='false',integrations:await collect(),wallet});});
app.get('/api/providers',async(_q,r)=>r.json(await collect()));
app.get('/api/audit',requireRole('admin','auditor'),async(_q,r)=>{if(!dbConfigured())return r.status(503).json({error:'DATABASE_NOT_CONFIGURED'});r.json((await query('SELECT id,event_type,occurred_at,payload_hash FROM audit_events ORDER BY id DESC LIMIT 500')).rows);});
app.get('/api/fleet/assets',async(_q,r)=>{if(!dbConfigured())return r.status(503).json({error:'DATABASE_NOT_CONFIGURED'});r.json((await query('SELECT * FROM fleet_assets ORDER BY asset_tag')).rows);});
app.post('/api/fleet/assets',requireRole('admin','operator'),async(q,r)=>{if(!dbConfigured())return r.status(503).json({error:'DATABASE_NOT_CONFIGURED'});const b=q.body;if(!b.assetTag)return r.status(400).json({error:'assetTag required'});const x=(await query('INSERT INTO fleet_assets(asset_tag,serial_number,model,site,expected_count) VALUES($1,$2,$3,$4,$5) RETURNING *',[b.assetTag,b.serialNumber||null,b.model||null,b.site||site,b.expectedCount||1])).rows[0];await appendAudit({type:'FLEET_ASSET_CREATED',assetTag:b.assetTag});r.status(201).json(x);});
app.get('/api/energy/readings',async(q,r)=>{if(!dbConfigured())return r.status(503).json({error:'DATABASE_NOT_CONFIGURED'});r.json((await query('SELECT * FROM energy_readings WHERE reading_at>=COALESCE($1,NOW()-INTERVAL \'24 hours\') AND reading_at<=COALESCE($2,NOW()) ORDER BY reading_at DESC',[q.query.from||null,q.query.to||null])).rows);});
app.post('/api/energy/readings',requireRole('admin','operator'),async(q,r)=>{if(!dbConfigured())return r.status(503).json({error:'DATABASE_NOT_CONFIGURED'});const b=q.body;if(!b.meterId||!b.site||!b.readingAt||b.kwh==null||!b.source)return r.status(400).json({error:'meterId, site, readingAt, kwh and source are required'});const x=(await query('INSERT INTO energy_readings(meter_id,site,reading_at,kwh,source) VALUES($1,$2,$3,$4,$5) ON CONFLICT(meter_id,reading_at) DO UPDATE SET kwh=EXCLUDED.kwh,source=EXCLUDED.source RETURNING *',[b.meterId,b.site,b.readingAt,b.kwh,b.source])).rows[0];await appendAudit({type:'ENERGY_READING_RECORDED',meterId:b.meterId,readingAt:b.readingAt,kwh:b.kwh,source:b.source});r.status(201).json(x);});
app.post('/api/reconciliation',requireRole('admin','auditor'),async(q,r)=>{if(!dbConfigured())return r.status(503).json({error:'DATABASE_NOT_CONFIGURED'});const x=reconcile(q.body);const b=q.body;const row=(await query('INSERT INTO reconciliation_records(period_start,period_end,provider,pool_reward,onchain_payout,variance,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[b.periodStart,b.periodEnd,b.provider,x.poolReward,x.onchainPayout,x.variance,x.status])).rows[0];await appendAudit({type:'RECONCILIATION_RECORDED',provider:b.provider,...x});r.status(201).json({record:row,...x});});
app.post('/api/profitability',requireRole('admin','operator','auditor'),(q,r)=>r.json(profitability(q.body)));
app.get('*',(_q,r)=>r.sendFile(path.join(root,'..','public','index.html')));
app.listen(port,()=>console.log('Mining operations dashboard listening on port '+port));
