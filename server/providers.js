export function env(name) { return process.env[name]?.trim() || ''; }
async function getJson(url, options={}) {
  const response=await fetch(url,{...options,headers:{accept:'application/json',...(options.headers||{})},signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error('HTTP '+response.status+' from '+new URL(url).hostname);
  return response.json();
}
export function createProviders() {
  const providers=[];
  const coin=env('BRAIINS_COIN')||'btc';
  if(env('BRAIINS_POOL_TOKEN')) providers.push({name:'braiins',async overview(){
    const h={'Pool-Auth-Token':env('BRAIINS_POOL_TOKEN')};
    const from=new Date(Date.now()-30*86400000).toISOString().slice(0,10), to=new Date().toISOString().slice(0,10);
    const [profile,workers,payouts]=await Promise.all([
      getJson('https://pool.braiins.com/accounts/profile/json/'+coin+'/',{headers:h}),
      getJson('https://pool.braiins.com/accounts/workers/json/'+coin,{headers:h}),
      getJson('https://pool.braiins.com/accounts/payouts/json/'+coin+'?from='+from+'&to='+to,{headers:h})
    ]);
    return {provider:'braiins',coin,source:'Braiins Pool',pool:profile?.[coin]||{},workers:workers?.[coin]?.workers||{},payouts:payouts?.onchain||[]};
  }});
  if(env('LUXOR_API_KEY')) providers.push({name:'luxor',async overview(){
    const c=(env('LUXOR_CURRENCY')||'BTC').toUpperCase(), base=env('LUXOR_BASE_URL')||'https://app.luxor.tech/api', h={authorization:env('LUXOR_API_KEY')};
    const [stats,workers]=await Promise.all([
      getJson(base+'/v2/pool/pool-stats/'+c,{headers:h}),
      getJson(base+'/v2/pool/workers/'+c,{headers:h})
    ]);
    return {provider:'luxor',coin:c,source:'Luxor',pool:stats||{},workers:workers?.workers||[],payouts:[]};
  }});
  if(env('FOUNDRY_API_URL') && env('FOUNDRY_API_TOKEN')) providers.push({name:'foundry',async overview(){
    const data=await getJson(env('FOUNDRY_API_URL'),{headers:{authorization:'Bearer '+env('FOUNDRY_API_TOKEN')}});
    return {provider:'foundry',coin:'BTC',source:'Foundry USA',pool:data,workers:data?.workers||[],payouts:data?.payouts||[]};
  }});
  return providers;
}
