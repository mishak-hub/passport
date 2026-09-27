const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('../core.js'),D=require('../dictionary.js'),L=require('../lexicon.js');
const base=path.join(__dirname,'..');
const catalog=require('../data/catalog.json');
for(const lang of ['es','fr','ja','zh'])D.install(lang,catalog[lang].files.flatMap(file=>JSON.parse(fs.readFileSync(path.join(base,'data',file),'utf8'))));
test('real offline packs cover every directed language pair',()=>{for(const a of ['en','es','fr','ja','zh'])for(const b of ['en','es','fr','ja','zh'])if(a!==b){const words={en:'water',es:'agua',fr:'eau',ja:'水',zh:'水'};assert.ok(D.lookup(words[a],a,b)?.candidates.length,`${a} → ${b}`);}});
test('prefix suggestions and spell correction work before Space',()=>{assert.ok(D.lookup('neigh','en','fr',false,true)?.candidates.length);const typo=D.lookup('neigbor','en','fr',false,true);assert.ok(typo?.candidates.some(c=>/voisin/.test(c.text)));assert.equal(typo.exact,false);});
test('phonetic candidates extend beyond the starter vocabulary',()=>{assert.ok(D.lookup('taberu','en','ja',true,true)?.candidates.some(c=>c.text==='食べる'));assert.ok(D.lookup('xuexiao','en','zh',true,true)?.candidates.some(c=>c.text==='学校'));});
test('tone marks and numbers are optional; approximate French is accepted',()=>{for(const text of ['nihao','nǐhǎo','ni3hao3'])assert.ok(L.lookup(text,'en','zh',true).candidates.some(c=>c.text==='你好'));assert.equal(L.lookup('bonjoor','en','fr',true).candidates[0].text,'bonjour');});
test('unknown vocabulary remains unknown rather than calling a model',()=>{assert.equal(L.lookup('zxqvplmnzz','en','ja'),null);});
test('partial word matching excludes URLs, email addresses, and edits in mid-word',()=>{for(const s of ['me@hello','https://hello','www.hello','example.com'])assert.equal(C.currentWord(s,s.length),null);assert.equal(C.currentWord('hello',3),null);assert.equal(C.currentWord('hello',5).text,'hello');});
test('floating placement matches width/left edge and respects gap and side',()=>{
 const rect={left:80,top:200,bottom:240,width:440},v={width:1000,height:700};
 assert.deepEqual(C.placement(rect,0,48,{placement:'floating',gap:4,side:'below'},v),{width:440,left:80,top:244});
 assert.equal(C.placement(rect,0,48,{placement:'floating',gap:12,side:'above'},v).top,140);
 assert.equal(C.placement({...rect,top:650,bottom:690},0,90,{placement:'floating',gap:6,side:'auto'},v).top,554);
});
test('Ollama endpoints are limited to loopback without credentials or paths',()=>{for(const s of ['https://example.com','http://localhost.evil.test','http://user:pass@localhost:11434','http://localhost:11434/path'])assert.equal(C.localEndpoint(s),null);assert.equal(C.localEndpoint('http://127.0.0.1:11434'),'http://127.0.0.1:11434');});
function backend(provider='ollama'){
 let listener,calls=[];const store={settings:{...C.defaults,provider,ollamaModel:'local-fixture:latest',consent:true},apiKey:'fake-cloud-key'};
 const browser={runtime:{id:'fixture',getURL:p=>'moz-extension://fixture/'+p,onMessage:{addListener:f=>listener=f}},theme:{getCurrent:async()=>({})},storage:{local:{get:async k=>({[k]:store[k]}),set:async p=>Object.assign(store,p)},onChanged:{addListener(){}}}};
 const ctx=vm.createContext({LiltCore:C,browser,URL,setTimeout,clearTimeout,AbortController,fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith('/api/tags')?{models:[{name:'local-fixture:latest'},{name:'remote:cloud'},{name:'remote:120b-cloud'},{name:'proxied',remote_host:'example.com'}]}:{response:JSON.stringify({translation:'Bonjour.',complete:true,tokens:[],meaning:'Hello.'})}};}});
 vm.runInContext(fs.readFileSync(path.join(base,'background.js'),'utf8'),ctx);
 const sender={id:'fixture',url:'moz-extension://fixture/options.html'};
 return {calls,store,send:m=>listener(m,sender),page:m=>listener(m,{id:'fixture',url:'https://example.test',tab:{id:2}})};
}
test('Ollama sentence generation stays local and never carries the cloud key',async()=>{const h=backend();h.store.settings.consent=false;h.store.apiKey='';const r=await h.send({type:'generate',kind:'sentence',payload:{text:'Hello.',source:'en',target:'fr'},requestId:'local'});assert.equal(r.ok,true);assert.equal(r.data.translation,'Bonjour.');assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,'http://localhost:11434/api/generate');assert.equal(h.calls[0].options.headers['x-goog-api-key'],undefined);assert.equal(JSON.parse(h.calls[0].options.body).stream,false);assert.equal(h.calls[0].options.redirect,'error');});
test('word and detail model requests are rejected at the backend',async()=>{const h=backend();for(const kind of ['word','detail'])assert.equal((await h.send({type:'generate',kind,payload:{text:'hello',source:'en',target:'fr'}})).ok,false);assert.equal(h.calls.length,0);});
test('local model discovery is Settings-only and excludes cloud models',async()=>{const h=backend();assert.equal((await h.page({type:'ollamaModels',url:'http://localhost:11434'})).ok,false);const r=await h.send({type:'ollamaModels',url:'http://localhost:11434'});assert.deepEqual(Array.from(r.models),['local-fixture:latest']);assert.equal(h.calls.length,1);});
test('page content cannot change provider or local endpoint',async()=>{const h=backend();await h.page({type:'saveConfig',patch:{provider:'cloud',ollamaUrl:'http://127.0.0.1:99',ollamaModel:'other'}});assert.equal(h.store.settings.provider,'ollama');assert.equal(h.store.settings.ollamaUrl,C.defaults.ollamaUrl);assert.equal(h.store.settings.ollamaModel,'local-fixture:latest');});
test('changing cloud/local providers keeps the saved API key',async()=>{const h=backend();const r=await h.send({type:'saveSettings',patch:{provider:'cloud'}});assert.equal(r.ok,true);assert.equal(r.hasKey,true);assert.equal(h.store.apiKey,'fake-cloud-key');});
test('omnibox translates locally, searches on Enter, and discards late reconstruction',async()=>{
 const callbacks={},calls=[],timers=[];let resolveModel;
 const cfg={...C.defaults,target:'fr'};
 const event=name=>({addListener:f=>callbacks[name]=f});
 const browser={omnibox:{setDefaultSuggestion:x=>calls.push({suggestion:x}),onInputChanged:event('change'),onInputCancelled:event('cancel'),onInputEntered:event('enter')},storage:{onChanged:event('storage')},search:{search:async x=>calls.push({search:x})},tabs:{create:async x=>({id:3})}};
 const context=vm.createContext({browser,LiltCore:C,LiltLexicon:L,PassportDictionary:D,settings:async()=>cfg,loadPack:async()=>[],inFlight:new Map(),setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout(){},generate:()=>new Promise(r=>resolveModel=r)});
 vm.runInContext(fs.readFileSync(path.join(base,'omnibox.js'),'utf8'),context);
 await callbacks.change('hello ',()=>{});assert.equal(calls.at(-1).suggestion.description,'Search: bonjour ');
 const pending=timers.at(-1)();await callbacks.enter('hello ','currentTab');assert.equal(calls.at(-1).search.query,'bonjour ');assert.equal(calls.at(-1).search.disposition,'CURRENT_TAB');
 const before=calls.length;resolveModel({complete:true,translation:'LATE'});await pending;assert.equal(calls.length,before);
 cfg.enabled=false;await callbacks.change('hello',()=>{});await callbacks.enter('hello','newBackgroundTab');assert.equal(calls.at(-1).search.query,'hello');assert.equal(calls.at(-1).search.tabId,3);
});
test('Late omnibox abstention cannot replace a completed sentence suggestion',async()=>{
 const callbacks={},timers=[],searches=[];let finishRank;
 const event=name=>({addListener:f=>callbacks[name]=f}),cfg={...C.defaults,target:'fr',liveJev:true};
 const browser={omnibox:{setDefaultSuggestion(){},onInputChanged:event('change'),onInputCancelled:event('cancel'),onInputEntered:event('enter')},storage:{onChanged:event('storage')},search:{search:async x=>searches.push(x)},tabs:{create:async()=>({id:3})}};
 const context=vm.createContext({browser,LiltCore:C,LiltLexicon:L,PassportDictionary:D,settings:async()=>cfg,loadPack:async()=>[],inFlight:new Map(),liveRanker:{rank:()=>new Promise(r=>finishRank=r),cancel(){}},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},generate:async()=>({complete:true,translation:'Bonjour.',meaning:'Hello.'})});
 vm.runInContext(fs.readFileSync(path.join(base,'omnibox.js'),'utf8'),context);await callbacks.change('hello',()=>{});
 assert.ok(timers.some(x=>x.ms===500));const pending=timers.find(x=>x.ms===220).fn();await timers.find(x=>x.ms===500).fn();finishRank({abstain:true});await pending;
 await callbacks.enter('hello','currentTab');assert.equal(searches.at(-1).query,'Bonjour.');
});
