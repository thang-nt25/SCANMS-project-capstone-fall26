const dns=require('node:dns');
const https=require('node:https');
async function resolve(label,fn){try{const result=await fn();console.log(label+': '+JSON.stringify(result));}catch(error){console.log(label+': '+error.code);}}
async function http(label,lookup){await new Promise(resolve=>{
 const request=https.get('https://api.cloudinary.com',{lookup,timeout:8000},response=>{console.log(label+': HTTP '+response.statusCode);response.resume();resolve();});
 request.on('timeout',()=>request.destroy(Object.assign(Error(),{code:'TIMEOUT'})));
 request.on('error',error=>{console.log(label+': '+error.code);resolve();});
});}
(async()=>{
 await resolve('system lookup',()=>dns.promises.lookup('api.cloudinary.com',{all:true}));
 const resolver=new dns.promises.Resolver({timeout:3000,tries:1});resolver.setServers(['1.1.1.1','8.8.8.8']);
 let addresses;await resolve('public DNS A',async()=>{addresses=await resolver.resolve4('api.cloudinary.com');return addresses;});
 await http('system HTTPS');
 if(addresses?.length)await http('public DNS HTTPS',(_hostname,options,callback)=>options?.all?callback(null,addresses.map(address=>({address,family:4}))):callback(null,addresses[0],4));
})();
