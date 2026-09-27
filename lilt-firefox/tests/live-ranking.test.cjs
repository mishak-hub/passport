const {test}=require('node:test'),assert=require('node:assert/strict');
require('../ranking.js');const {create}=require('../live-ranking.js');
const job={source:'en',target:'es',word:'on',context:'The book is on the table.',candidates:[{text:'encendido'},{text:'en'}]};
const answer={type:'choice',choice:'candidate_1',confidence:0.95,probabilities:{candidate_0:0.02,candidate_1:0.96,none:0.02}};
test('Live Jev requires separate opt-in and a key; caches by sentence context',async()=>{
 let enabled=false,calls=0;const service=create({getSettings:async()=>({enabled:true,liveJev:enabled}),getKey:async()=> 'fixture-secret',fetchImpl:async(url,o)=>{calls++;assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(o.headers.Authorization,'Bearer fixture-secret');assert.equal(o.redirect,'error');const state=JSON.parse(JSON.parse(o.body).state);assert.ok(state.context.length<=600);return {ok:true,json:async()=>({answers:{best:answer}})};}});
 assert.equal(await service.rank(job,'1'),null);assert.equal(calls,0);enabled=true;
 assert.deepEqual((await service.rank(job,'1')).order,[1,0]);await service.rank(job,'2');assert.equal(calls,1);
 await service.rank({...job,context:'Turn the light on.'},'3');assert.equal(calls,2);
 await assert.rejects(create({getSettings:async()=>({enabled:true,liveJev:true}),getKey:async()=>''}).rank(job,'x'),/TypeSafe key/);
});
test('Malformed Jev replies and low confidence do not invent candidates',async()=>{
 for(const a of [{...answer,confidence:0.3},{...answer,choice:'none'}]){
 const service=create({getSettings:async()=>({enabled:true,liveJev:true}),getKey:async()=> 'fixture',fetchImpl:async()=>({ok:true,json:async()=>({answers:{best:a}})})});assert.deepEqual(await service.rank(job,'a'),a.choice==='none'?{abstain:true}:null);
 }
 const s=create({getSettings:async()=>({enabled:true,liveJev:true}),getKey:async()=> 'fixture',fetchImpl:async()=>({ok:true,json:async()=>({answers:{best:{...answer,choice:'unknown'}}})})});await assert.rejects(s.rank(job,'x'),/Invalid Jev/);
});
test('Disable/reset rejects an already pending response',async()=>{
 let finish,ready;const started=new Promise(r=>ready=r);
 const s=create({getSettings:async()=>({enabled:true,liveJev:true}),getKey:async()=> 'fixture',fetchImpl:async()=>{ready();return new Promise(r=>finish=r);}});
 const pending=s.rank(job,'a');await started;s.reset();finish({ok:true,json:async()=>({answers:{best:answer}})});assert.equal(await pending,null);
});
test('429 backs off rather than retrying every keystroke',async()=>{
 let calls=0;const s=create({getSettings:async()=>({enabled:true,liveJev:true}),getKey:async()=> 'fixture',fetchImpl:async()=>{calls++;return {ok:false,status:429};}});
 await assert.rejects(s.rank(job,'a'),/429/);assert.equal(await s.rank(job,'b'),null);assert.equal(calls,1);
});
test('Background rankWords uses the TypeSafe key even when sentences use Ollama',async()=>{
 const vm=require('node:vm'),fs=require('node:fs'),C=require('../core.js');let listener,calls=0;
 const store={settings:{...C.defaults,provider:'ollama',liveJev:true},jevKey:'fixture-typesafe',apiKey:'fixture-google'};
 const browser={runtime:{id:'fixture',getURL:p=>'moz-extension://fixture/'+p,onMessage:{addListener:f=>listener=f}},theme:{getCurrent:async()=>({})},storage:{local:{get:async k=>({[k]:store[k]}),set:async p=>Object.assign(store,p)},onChanged:{addListener(){}}}};
 const ctx=vm.createContext({LiltCore:C,browser,AbortController,setTimeout,clearTimeout,fetch:async(url,o)=>{calls++;assert.equal(o.headers.Authorization,'Bearer fixture-typesafe');assert.equal(o.headers['x-goog-api-key'],undefined);return {ok:true,json:async()=>({answers:{best:answer}})};}});
 for(const name of ['ranking.js','live-ranking.js','background.js'])vm.runInContext(fs.readFileSync(require.resolve('../'+name),'utf8'),ctx);
 const sender={id:'fixture',tab:{id:1},url:'https://example.test'};
 const result=await listener({type:'rankWords',payload:job,requestId:'one'},sender);assert.equal(result.ok,true);assert.deepEqual(Array.from(result.data.order),[1,0]);assert.equal(calls,1);
 const config=await listener({type:'config'},sender);assert.equal(config.hasJevKey,true);assert.equal(config.jevKey,undefined);
 await listener({type:'saveConfig',patch:{liveJev:false}},sender);assert.equal(store.settings.liveJev,true);
});
test('Jev can select the tenth candidate and has no native-origin preference',async()=>{
 const candidates=Array.from({length:10},(_,i)=>({text:i===9?'ベスト':'candidate'+i}));
 const probabilities=Object.fromEntries(candidates.map((_,i)=>['candidate_'+i,i===9?1:0]));probabilities.none=0;
 const s=create({getSettings:async()=>({enabled:true,liveJev:true}),getKey:async()=> 'fixture',fetchImpl:async(url,o)=>{
  const request=JSON.parse(o.body);assert.equal(JSON.parse(request.state).candidates.length,10);assert.match(request.questions.best.instructions,/equally eligible/);assert.doesNotMatch(request.questions.best.instructions,/prefer a common native/);
  return {ok:true,json:async()=>({answers:{best:{type:'choice',choice:'candidate_9',confidence:1,probabilities}}})};
 }});
 assert.equal((await s.rank({...job,target:'ja',word:'best',candidates},'ten')).order[0],9);
 await assert.rejects(s.rank({...job,candidates:[...candidates,{text:'extra'}]},'eleven'),/Invalid ranking request/);
});
