const fs=require('node:fs');
const dotenv=require('../backend/node_modules/dotenv');
const {io}=require('../frontend/node_modules/socket.io-client');
const env=dotenv.parse(fs.readFileSync(require('node:path').join(__dirname,'../frontend/.env')));
(async()=>{
 const response=await fetch('https://scanms.io.vn/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:env.VITE_DEMO_SHOP_IDENTIFIER,password:env.VITE_DEMO_SHOP_PASSWORD}),signal:AbortSignal.timeout(15000)});
 const raw=await response.json();const auth=raw.data||raw;if(!auth.accessToken)throw Error('login');
 await new Promise((resolve,reject)=>{
  const socket=io('https://scanms.io.vn/chat',{auth:{token:auth.accessToken},transports:['websocket'],reconnection:false,timeout:12000});
  const timer=setTimeout(()=>{socket.disconnect();reject(Error('timeout'));},15000);
  socket.on('connected',data=>{clearTimeout(timer);if(data.userId!==auth.user.id){socket.disconnect();reject(Error('identity'));return;}console.log('Authenticated chat WebSocket: OK');socket.disconnect();resolve();});
  socket.on('connect_error',()=>{clearTimeout(timer);socket.disconnect();reject(Error('connect'));});
 });
})().catch(error=>{console.error('Realtime check failed: '+error.name);process.exitCode=1;});
