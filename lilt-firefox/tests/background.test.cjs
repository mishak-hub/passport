const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const C=require('../core.js');
function harness({status=200,delay=0,consent=true,key='test-only-key'}={}){
  let listener,calls=[];const store={settings:{...C.defaults,consent},apiKey:key};
  const browser={storage:{local:{get:async k=>({[k]:store[k]}),set:async p=>Object.assign(store,p)},onChanged:{addListener(){}}},theme:{getCurrent:async()=>({colors:{}})},runtime:{getURL:p=>'moz-extension://test/'+p,onMessage:{addListener:f=>listener=f},openOptionsPage:async()=>{}}};
  const context=vm.createContext({LiltCore:C,browser,console,setTimeout,clearTimeout,AbortController,fetch:async(url,opts)=>{calls.push({url,opts});if(delay)await new Promise((resolve,reject)=>{const t=setTimeout(resolve,delay);opts.signal.addEventListener('abort',()=>{clearTimeout(t);reject(Object.assign(new Error('abort'),{name:'AbortError'}));});});return {ok:status===200,status,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({translation:'こんにちは。',complete:true,tokens:[],meaning:'Hello.',detectedSource:'en'})}]}}]})};}});
  vm.runInContext(fs.readFileSync(require.resolve('../background.js'),'utf8'),context);
  const sender={tab:{id:1},frameId:0,url:'https://example.com'};
  const request=(extra={})=>listener({type:'generate',kind:'sentence',requestId:'one',payload:{text:'hello',source:'en',target:'ja'},...extra},sender);
  return {send:listener,request,calls,store,sender};
}
test('key is a header, never in the URL or public config',async()=>{const h=harness();assert.equal((await h.request()).ok,true);assert.equal(h.calls[0].opts.headers['x-goog-api-key'],'test-only-key');assert.ok(!h.calls[0].url.includes('key'));const c=await h.send({type:'config'},h.sender);assert.equal(c.apiKey,undefined);assert.equal(c.hasKey,true);});
test('no network without explicit cloud consent',async()=>{const h=harness({consent:false});assert.equal((await h.request()).ok,false);assert.equal(h.calls.length,0);});
test('no network without a saved key',async()=>{const h=harness({key:''});assert.equal((await h.request()).ok,false);assert.equal(h.calls.length,0);});
test('page content cannot change key, model or consent',async()=>{const h=harness();h.send({type:'saveKey',key:'stolen'},h.sender);await h.send({type:'saveConfig',patch:{model:'other',consent:false}},h.sender);assert.equal(h.store.apiKey,'test-only-key');assert.equal(h.store.settings.model,C.defaults.model);assert.equal(h.store.settings.consent,true);});
test('402 failure is explicit and never triggers paid-model fallback',async()=>{const h=harness({status:402});const r=await h.request();assert.equal(r.ok,false);assert.match(r.error,/402/);assert.equal(h.calls.length,1);});
test('429 prevents an immediate retry storm',async()=>{const h=harness({status:429});await h.request();await h.request({requestId:'two'});assert.equal(h.calls.length,1);});
test('repeated sentence/context results use a bounded memory cache',async()=>{const h=harness();await h.request();await h.request({requestId:'two'});assert.equal(h.calls.length,1);});
test('cancellation is scoped to sender tab and frame',async()=>{const h=harness({delay:40});const p=h.request();await new Promise(r=>setTimeout(r,5));await h.send({type:'cancel',requestId:'one'},{...h.sender,frameId:1});assert.equal((await p).ok,true);});
test('cancel an in-flight request without exposing provider errors',async()=>{const h=harness({delay:100});const p=h.request();await new Promise(r=>setTimeout(r,5));await h.send({type:'cancel',requestId:'one'},h.sender);const result=await p;assert.equal(result.ok,false);assert.match(result.error,/cancelled/);});
test('Ollama 403 identifies the current extension origin; 404 identifies a missing model',async()=>{
 for(const status of [403,404]){const h=harness({status});h.store.settings.provider='ollama';h.store.settings.ollamaModel='gemma3:4b';const r=await h.request();assert.equal(r.ok,false);assert.match(r.error,status===403?/moz-extension:\/\/test.*OLLAMA_ORIGINS/:/model was not found/);}
});
test('Gemini 3.8 Flash uses supported low thinking and JSON output',async()=>{const h=harness();h.store.settings.model='gemini-3.8-flash';assert.equal((await h.request()).ok,true);const config=JSON.parse(h.calls[0].opts.body).generationConfig;assert.equal(config.thinkingConfig.thinkingLevel,'low');assert.equal(config.responseMimeType,'application/json');});
test('Sentence provider receives separate explicit and provisional vocabulary',async()=>{
 const h=harness();await h.request({payload:{text:'bank',source:'en',target:'fr',selected:[{source:'bank',target:'rive'}],provisional:[{source:'book',target:'livre'}]}});
 const prompt=JSON.parse(h.calls[0].opts.body).contents[0].parts[0].text;assert.match(prompt,/"selected":\[\{"source":"bank","target":"rive"/);assert.match(prompt,/"provisional":\[\{"source":"book","target":"livre"/);assert.match(prompt,/automatic dictionary guesses/);
});
