// Runs inside the backend container. Read-only provider checks; never sends email or creates transactions.
const crypto = require('node:crypto');
const fs = require('node:fs');
const expected = JSON.parse(fs.readFileSync('/tmp/scanms-env-digests.json','utf8'));
const different = Object.keys(expected).filter(key=>crypto.createHash('sha256').update(process.env[key]||'').digest('hex')!==expected[key]);
console.log(JSON.stringify({check:'environment parity',keys:Object.keys(expected).length,mismatches:different}));
async function probe(name, fn) {
  let timeout;
  try { await Promise.race([fn(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Object.assign(Error(),{code:'TIMEOUT'})),15000);})]); console.log(name+': OK'); }
  catch(error) { console.log(name+': FAILED ('+(error.code||error.name||'unavailable')+')'); }
  finally { clearTimeout(timeout); }
}
(async()=>{
  if(different.length)process.exitCode=1;
  console.log(JSON.stringify({demoTopup:process.env.ALLOW_DEMO_WALLET_TOPUP,hostedShippingSimulation:process.env.ALLOW_HOSTED_SHIPPING_SIMULATION,payosReturnDomain:new URL(process.env.PAYOS_STOREFRONT_URL).hostname}));
  await probe('Gmail SMTP authentication',async()=>{
    const mail=require('/app/node_modules/nodemailer').createTransport({service:'gmail',auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_PASS},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:10000});
    try {await mail.verify();}finally{mail.close();}
  });
  await probe('Cloudinary API',async()=>{
    const response=await fetch('https://api.cloudinary.com/v1_1/'+encodeURIComponent(process.env.CLOUDINARY_CLOUD_NAME)+'/ping',{
      headers:{Authorization:'Basic '+Buffer.from(process.env.CLOUDINARY_API_KEY+':'+process.env.CLOUDINARY_API_SECRET).toString('base64')},signal:AbortSignal.timeout(10000)});
    const result=await response.json(); if(!response.ok||result.status!=='ok')throw Object.assign(Error('unavailable'),{code:'HTTP_'+response.status});
  });
  for(const test of [false,true])await probe(test?'GHN staging location API':'GHN location API',async()=>{
    const response=await fetch((test?process.env.GHN_TEST_API_URL:process.env.GHN_API_URL).replace(/\/$/,'')+'/master-data/province',{headers:{Token:test?process.env.GHN_TEST_API_TOKEN:process.env.GHN_API_TOKEN},signal:AbortSignal.timeout(12000)});
    const data=await response.json();if(!response.ok||data.code!==200||!Array.isArray(data.data))throw Error('unavailable');
  });
})().then(()=>process.exit(process.exitCode||0));
