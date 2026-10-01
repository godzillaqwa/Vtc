import crypto from 'node:crypto';
export function requireApiKey(req,res,next){const configured=process.env.DASHBOARD_API_KEY?.trim();if(!configured)return next();const supplied=req.get('x-dashboard-api-key')||'';const ok=supplied.length===configured.length&&crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(configured));if(!ok)return res.status(401).json({error:'UNAUTHORIZED'});next();}
export function role(req){return req.get('x-dashboard-role')||'viewer';}
export function requireRole(...allowed){return (req,res,next)=>allowed.includes(role(req))?next():res.status(403).json({error:'FORBIDDEN',requiredRoles:allowed});}
