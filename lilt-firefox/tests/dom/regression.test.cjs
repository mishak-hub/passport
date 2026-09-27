// Red/green regression harness: actual extension scripts, no real credentials.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const base=path.resolve(__dirname,'../../..');
const ext=path.join(base,'lilt-firefox');
const C=require(path.join(ext,'core.js'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fakeKey='fixture-credential-not-a-real-key';
async function until(fn){for(let i=0;i<150&&!fn();i++)await sleep(10);assert.ok(fn(),'Expected state did not arrive');}
function backend(){
  let listener,installed;const opened=[];const store={settings:{...C.defaults,consent:false},apiKey:''},calls=[];
  const browser={runtime:{id:'lilt-prototype@local.example',getURL:p=>'moz-extension://fixture/'+p,onMessage:{addListener:f=>listener=f},onInstalled:{addListener:f=>installed=f},openOptionsPage:async()=>{}},tabs:{create:async t=>opened.push(t)},theme:{getCurrent:async()=>({})},storage:{local:{get:async k=>({[k]:store[k]}),set:async p=>Object.assign(store,p)},onChanged:{addListener(){}}}};
  const context=vm.createContext({LiltCore:C,browser,setTimeout,clearTimeout,AbortController,fetch:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>url.endsWith('/api/tags')?{models:[{name:'local-test:latest'}]}:url.endsWith('/api/generate')?{response:JSON.stringify({translation:'こんにちは。',complete:true,tokens:[],meaning:'Hello.'})}:{candidates:[{content:{parts:[{text:JSON.stringify({translation:'こんにちは。',complete:true,tokens:[],meaning:'Hello.'})}]}}]}};}});
  vm.runInContext(fs.readFileSync(path.join(ext,'background.js'),'utf8'),context);
  return {store,calls,opened,installed,send:(m,sender)=>listener(m,sender)};
}
async function options(h,inTab=true){
  const dom=new JSDOM(fs.readFileSync(path.join(ext,'options.html'),'utf8'),{url:'moz-extension://fixture/options.html',runScripts:'outside-only'});
  const sender={id:'lilt-prototype@local.example',url:'moz-extension://fixture/options.html',tab:{id:42},frameId:0};
  if(!inTab)delete sender.tab;
  dom.window.browser={runtime:{sendMessage:async m=>h.send(m,sender),onMessage:{addListener:f=>{h.optionsListener=f;}}}};
  dom.window.eval(fs.readFileSync(path.join(ext,'core.js'),'utf8'));
  dom.window.eval(fs.readFileSync(path.join(ext,'options.js'),'utf8'));
  await sleep(15);return dom;
}
async function typing(){
  const dom=new JSDOM('<textarea id="field"></textarea>',{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;w.CSS={supports:()=>true};
  w.speechSynthesis={getVoices:()=>[],cancel(){},speak(){}};
  w.SpeechSynthesisUtterance=function(){};
  for(const file of ['core.js','dictionary.js','lexicon.js','editor.js'])w.eval(fs.readFileSync(path.join(ext,file),'utf8'));
  w.eval(fs.readFileSync(path.join(base,'lilt-playground/fixture.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(ext,'content.js'),'utf8'));
  await sleep(15);const field=w.document.getElementById('field');field.focus();await sleep(5);
  const bar=()=>w.LiltDemo.root.querySelector('.bar');
  function set(text){field.value=text;field.setSelectionRange(text.length,text.length);field.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));}
  function press(key){field.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));}
  return {dom,w,field,bar,set,press};
}
test('No-Space rewrite stays provisional; Space accepts before native Space insertion',async()=>{
 const t=await typing();try{
  t.set('My neighbor is funny');const original=t.field.value;
  await until(()=>t.bar().dataset.mode==='sentence');assert.equal(t.field.value,original);
  assert.match(t.bar().textContent,/Space/);t.press(' ');
  assert.equal(t.field.value,'Mon voisin est amusant.');
  t.set(t.field.value+' ');await sleep(550);
  assert.equal(t.field.value,'Mon voisin est amusant. ');assert.equal(t.w.LiltDemo.requests.length,1);
 }finally{t.dom.window.close();}
});
test('A letter discards a ready preview and continues the unchanged native draft',async()=>{
 const t=await typing();try{t.set('hello');await until(()=>t.bar().dataset.mode==='sentence');t.press('w');t.set(t.field.value+'w');assert.equal(t.field.value,'hellow');assert.notEqual(t.bar().dataset.mode,'sentence');}finally{t.dom.window.close();}
});
test('Terminal punctuation requests reconstruction immediately; decimal dot only previews after pause',async()=>{
 const t=await typing();try{
  t.set('My neighbor is funny!');await sleep(90);assert.equal(t.w.LiltDemo.requests.length,1);
  t.set('hello 3.');const before=t.field.value,n=t.w.LiltDemo.requests.length;
  await sleep(150);assert.equal(t.w.LiltDemo.requests.length,n);
  await until(()=>t.bar().dataset.mode==='sentence');assert.equal(t.field.value,before);
 }finally{t.dom.window.close();}
});
test('Explicit Tab choices are protected; conflicts require clicking accept',async()=>{
 const t=await typing();try{
  await until(()=>t.w.PassportDictionary.has('fr'));t.set('bank');t.press('Tab');t.press(' ');
  const chosen=t.field.value;t.set(chosen+' neighbor.');await until(()=>t.bar().dataset.mode==='sentence');
  const request=t.w.LiltDemo.requests.at(-1);assert.equal(request.payload.selected[0].source,'bank');assert.equal(request.payload.selected[0].target,chosen);
  const before=t.field.value;t.press(' ');assert.equal(t.field.value,before);
  t.w.LiltDemo.root.querySelector('[aria-label="Accept sentence suggestion"]').click();assert.equal(t.field.value,'Mon voisin est amusant.');
 }finally{t.dom.window.close();}
});
test('Automatic Space vocabulary is provisional and original source reaches reconstruction',async()=>{
 const t=await typing();try{await until(()=>t.w.PassportDictionary.has('fr'));t.set('bank');t.press(' ');t.set(t.field.value+' neighbor.');await until(()=>t.w.LiltDemo.requests.length);
  const p=t.w.LiltDemo.requests[0].payload;assert.equal(p.selected.length,0);assert.ok(p.provisional.some(x=>x.source==='bank'));assert.match(p.text,/bank neighbor/);
 }finally{t.dom.window.close();}
});
test('Phrase lookup merges automatic source spans for One Piece',async()=>{
 const t=await typing();try{
  t.w.PassportDictionary.install('ja',[['one','一つ','hitotsu','','',1],['piece','作品','sakuhin','','',1]]);
  t.w.LiltDemo.set({target:'ja'});await sleep(30);t.set('one');t.press(' ');const first=t.field.value;
  assert.equal(first,'一つ');t.set(first+' piece');assert.match(t.bar().textContent,/ワンピース/);t.press(' ');assert.equal(t.field.value,'ワンピース');
 }finally{t.dom.window.close();}
});
test('Jev abstention keeps native text when the real Space input follows',async()=>{
 const t=await typing();try{
  const send=t.w.browser.runtime.sendMessage;t.w.browser.runtime.sendMessage=async m=>m.type==='rankWords'?{ok:true,data:{abstain:true}}:send(m);
  t.w.LiltDemo.set({liveJev:true});await sleep(30);await until(()=>t.w.PassportDictionary.has('fr'));t.set('bank');await until(()=>t.bar().textContent.includes('Keep original'));
  t.press(' ');t.set(t.field.value+' ');assert.equal(t.field.value,'bank ');
 }finally{t.dom.window.close();}
});
test('Settings opened in a tab really saves the key and consent, then uses the key',async()=>{
  const h=backend(),dom=await options(h);
  try{
    dom.window.document.getElementById('key').value=fakeKey;
    dom.window.document.getElementById('consent').checked=true;
    dom.window.document.getElementById('save').click();await sleep(25);
    assert.ok(h.store.apiKey===fakeKey,'Save reported success but the credential was not persisted');
    assert.equal(h.store.settings.consent,true,'Cloud consent was discarded');
    dom.window.document.getElementById('test').click();await sleep(25);
    assert.equal(h.calls.length,1,'Test connection never called the provider');
    assert.ok(h.calls[0].options.headers['x-goog-api-key']===fakeKey,'Provider did not receive the saved credential');
  }finally{dom.window.close();}
});
test('Control: identical Settings save from a popup context',async()=>{
  const h=backend(),dom=await options(h,false);try{
    dom.window.document.getElementById('key').value=fakeKey;
    dom.window.document.getElementById('consent').checked=true;
    dom.window.document.getElementById('save').click();await sleep(25);
    assert.ok(h.store.apiKey===fakeKey,'Popup did not persist the credential');
    assert.equal(h.store.settings.consent,true);
  }finally{dom.window.close();}
});
test('Control: completing a word displays the companion',async()=>{
  const t=await typing();try{t.set('hello ');assert.equal(t.bar().hidden,false);}finally{t.dom.window.close();}
});
test('An unacknowledged save keeps the entered key and reports failure',async()=>{
  const h=backend(),dom=await options(h,false);try{
    dom.window.browser.runtime.sendMessage=async()=>undefined;
    dom.window.document.getElementById('key').value=fakeKey;
    dom.window.document.getElementById('save').click();await sleep(25);
    assert.ok(dom.window.document.getElementById('key').value===fakeKey,'Key input cleared without a save acknowledgment');
    assert.ok(dom.window.document.getElementById('status').classList.contains('error'));
  }finally{dom.window.close();}
});
test('An open companion remains visible between word boundaries',async()=>{
  const t=await typing();try{
    t.w.LiltDemo.root.querySelector('.pill').click();assert.equal(t.bar().hidden,false);
    t.set('h');assert.equal(t.bar().hidden,false,'Companion disappears on the first character');
    t.set('hello ');assert.equal(t.bar().hidden,false);
    t.press('n');t.set(t.field.value+'n');assert.equal(t.bar().hidden,false,'Companion disappears when starting the next word');
  }finally{t.dom.window.close();}
});
test('A half-second pause automatically applies a complete sentence; Enter remains native',async()=>{
  const t=await typing();try{
    t.set('My neighbor is funny. ');await sleep(1250);
    assert.equal(t.bar().dataset.mode,'review');assert.equal(t.field.value,'Mon voisin est amusant. ');
    const e=new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});t.field.dispatchEvent(e);
    assert.equal(e.defaultPrevented,false);assert.equal(t.bar().hidden,false);
  }finally{t.dom.window.close();}
});

test('Idle timers cannot hide a companion while its field remains focused',async()=>{
  const t=await typing();try{
    const original=t.w.setTimeout.bind(t.w),idle=[];
    t.w.setTimeout=(fn,ms,...args)=>{if(ms>=5000)idle.push(()=>fn(...args));return original(fn,ms,...args);};
    t.w.LiltDemo.root.querySelector('.pill').click();
    for(const fn of idle)fn();
    assert.equal(t.bar().hidden,false,'Idle timer hides the active companion');
  }finally{t.dom.window.close();}
});
test('Saved key remains configured after reopening Settings; blank input does not erase it',async()=>{
  const h=backend();let dom=await options(h);try{
    dom.window.document.getElementById('key').value=fakeKey;
    dom.window.document.getElementById('consent').checked=true;
    dom.window.document.getElementById('save').click();await sleep(25);
    dom.window.close();dom=await options(h);
    assert.match(dom.window.document.getElementById('key-state').textContent,/key saved/i);
    assert.equal(dom.window.document.getElementById('key').value,'','Settings should not reveal the stored key');
    dom.window.document.getElementById('save').click();await sleep(25);
    assert.ok(h.store.apiKey===fakeKey,'Saving another setting erased the saved key');
  }finally{dom.window.close();}
});
test('Unauthorized page cannot save credentials through the new save operation',async()=>{
  const h=backend();for(const sender of [
    {id:'lilt-prototype@local.example',url:'https://example.test',tab:{id:42}},
    {id:'another-extension',url:'moz-extension://fixture/options.html'},
    {id:'lilt-prototype@local.example',url:'moz-extension://fixture/options.html/other'}
  ]){
    const response=await h.send({type:'saveSettings',key:fakeKey,patch:{consent:true}},sender);
    assert.equal(response.ok,false);assert.equal(h.store.apiKey,'');assert.equal(h.store.settings.consent,false);
  }
});
test('Explicit close stays closed while typing; globe reopens the controls',async()=>{
  const t=await typing();try{
    t.set('hello ');t.w.LiltDemo.root.querySelector('[aria-label="Dismiss companion"]').click();
    t.set(t.field.value+'a');assert.equal(t.bar().hidden,true,'Typing overrode explicit dismissal');
    t.w.LiltDemo.root.querySelector('.pill').click();assert.equal(t.bar().hidden,false);
  }finally{t.dom.window.close();}
});
test('IME composition keeps the companion and does not translate unfinished composition',async()=>{
  const t=await typing();try{
    t.set('h');t.field.dispatchEvent(new t.w.CompositionEvent('compositionstart',{bubbles:true}));
    const before=t.w.LiltDemo.requests.length;t.set('に');
    assert.equal(t.bar().hidden,false);assert.equal(t.w.LiltDemo.requests.length,before);
    t.field.dispatchEvent(new t.w.CompositionEvent('compositionend',{bubbles:true,data:'に'}));
    assert.equal(t.bar().hidden,false);
  }finally{t.dom.window.close();}
});

test('Prefix candidates appear before Space and never request a word model',async()=>{
 const t=await typing();try{t.set('hel');assert.equal(t.bar().dataset.mode,'word');assert.ok(t.bar().textContent.includes('bonjour'));assert.equal(t.field.value,'hel');assert.equal(t.w.LiltDemo.requests.length,0);}finally{t.dom.window.close();}
});
test('Unknown words stay unchanged; Tab explicitly chooses a partial candidate',async()=>{
 const t=await typing();try{t.set('zxqvplmnzz ');assert.equal(t.field.value,'zxqvplmnzz ');t.set('hel');t.press('Tab');t.press(' ');assert.equal(t.field.value,'bonjour');assert.equal(t.w.LiltDemo.requests.length,0);}finally{t.dom.window.close();}
});
test('Enter during a pending model request sends immediately and blocks late replacement',async()=>{
 const t=await typing();try{t.w.LiltDemo.delay=400;t.set('My neighbor is funny. ');for(let i=0;i<100&&!t.w.LiltDemo.requests.length;i++)await sleep(10);assert.equal(t.w.LiltDemo.requests.length,1);const before=t.field.value;const e=new t.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});t.field.dispatchEvent(e);assert.equal(e.defaultPrevented,false);await sleep(450);assert.equal(t.field.value,before);}finally{t.dom.window.close();}
});
test('Typing after the model starts cannot be overwritten by a stale response',async()=>{
 const t=await typing();try{t.w.LiltDemo.delay=400;t.set('My neighbor is funny. ');for(let i=0;i<100&&!t.w.LiltDemo.requests.length;i++)await sleep(10);t.press('a');t.set(t.field.value+'a');const before=t.field.value;await sleep(450);assert.equal(t.field.value,before);}finally{t.dom.window.close();}
});
test('An unfinished word may be checked but incomplete thoughts are not applied',async()=>{
 const t=await typing();try{t.set('neigh');await sleep(1150);assert.equal(t.w.LiltDemo.requests.length,1);t.set('My neighbor because ');const before=t.field.value;await sleep(1200);assert.equal(t.field.value,before);assert.equal(t.w.LiltDemo.requests.length,2);}finally{t.dom.window.close();}
});
test('Moving the caret while a model is pending prevents automatic replacement',async()=>{
 const t=await typing();try{t.w.LiltDemo.delay=400;t.set('My neighbor is funny. ');for(let i=0;i<100&&!t.w.LiltDemo.requests.length;i++)await sleep(10);const before=t.field.value;t.field.setSelectionRange(1,1);await sleep(450);assert.equal(t.field.value,before);}finally{t.dom.window.close();}
});
test('Returning to an accepted sentence exposes word learning without an extra model call',async()=>{
 const t=await typing();try{t.set('My neighbor is funny. ');await sleep(1200);t.field.setSelectionRange(3,3);t.field.dispatchEvent(new t.w.MouseEvent('click',{bubbles:true}));const before=t.w.LiltDemo.requests.length;const word=t.w.LiltDemo.root.querySelector('.word');assert.ok(word);word.click();await sleep(50);assert.equal(t.w.LiltDemo.requests.length,before);assert.equal(t.w.LiltDemo.root.querySelector('.bubble').hidden,false);}finally{t.dom.window.close();}
});
test('Automatic sentence replacement can be undone to the preceding visible wording',async()=>{
 const t=await typing();try{t.set('My neighbor is funny. ');const original=t.field.value;await sleep(1200);assert.notEqual(t.field.value,original);t.w.LiltDemo.root.querySelector('[aria-label="Restore original text"]').click();assert.equal(t.field.value,original);}finally{t.dom.window.close();}
});
test('Actual Settings page discovers, saves and tests an Ollama model without a cloud key',async()=>{
 const h=backend(),dom=await options(h);try{
  const doc=dom.window.document;doc.getElementById('provider').value='ollama';doc.getElementById('provider').dispatchEvent(new dom.window.Event('change'));
  assert.equal(doc.getElementById('local-fields').hidden,false);assert.equal(doc.getElementById('cloud-fields').hidden,true);
  doc.getElementById('refresh').click();await sleep(25);assert.equal(doc.getElementById('ollamaModel').value,'local-test:latest');
  doc.getElementById('test').click();await sleep(40);assert.equal(h.store.settings.provider,'ollama');assert.equal(h.store.settings.ollamaModel,'local-test:latest');assert.equal(h.store.apiKey,'');
  assert.equal(h.calls.at(-1).url,'http://localhost:11434/api/generate');assert.match(doc.getElementById('status').textContent,/Connected/);
 }finally{dom.window.close();}
});
test('Space adopts the current provisional article without waiting for a model',async()=>{
 const t=await typing();try{
  t.w.LiltDemo.set({target:'es'});await sleep(20);t.set('the');t.press(' ');assert.equal(t.field.value,'el');assert.ok(!t.bar().textContent.includes('comp.'));
 }finally{t.dom.window.close();}
});
test('Live Jev reorders visible choices and Space adopts the result',async()=>{
 const t=await typing();try{
  const original=t.w.browser.runtime.sendMessage;let finish,captured;
  t.w.browser.runtime.sendMessage=m=>m.type==='rankWords'?(captured=m,new Promise(r=>finish=r)):original(m);
  t.w.LiltDemo.set({liveJev:true});await sleep(20);t.set('bank');await sleep(260);
  assert.equal(captured.payload.word,'bank');assert.equal(t.field.value,'bank');
  finish({ok:true,data:{order:[1,0]}});await sleep(15);
  assert.ok(t.w.LiltDemo.root.querySelector('.candidate').textContent.includes('rive'));
  t.press(' ');assert.equal(t.field.value,'rive');
 }finally{t.dom.window.close();}
});
test('Jev receives ten candidates but the companion displays only five',async()=>{
 const t=await typing();try{
  const candidates=Array.from({length:10},(_,i)=>({text:'choice'+i,meaning:'meaning '+i,reading:'',characters:[]}));
  t.w.LiltLexicon.pool=()=>({candidates,detectedSource:'en',uncertain:true});
  const original=t.w.browser.runtime.sendMessage;let finish,captured;
  t.w.browser.runtime.sendMessage=m=>m.type==='rankWords'?(captured=m,new Promise(r=>finish=r)):original(m);
  t.w.LiltDemo.set({liveJev:true});await sleep(30);t.set('bank');for(let i=0;i<70&&!finish;i++)await sleep(10);
  assert.equal(captured.payload.candidates.length,10);assert.equal(t.w.LiltDemo.root.querySelectorAll('.candidate').length,5);
  finish({ok:true,data:{order:[9,8,7,6,5,4,3,2,1,0]}});await sleep(15);
  assert.equal(t.w.LiltDemo.root.querySelectorAll('.candidate').length,5);assert.ok(t.w.LiltDemo.root.querySelector('.candidate').textContent.includes('choice9'));
  t.press(' ');assert.equal(t.field.value,'choice9');
 }finally{t.dom.window.close();}
});
test('A late Jev response cannot overwrite typing, Space or an explicit Tab choice',async()=>{
 for(const action of ['typing','space','tab','off']){
  const t=await typing();try{
   const original=t.w.browser.runtime.sendMessage;let finish;
   t.w.browser.runtime.sendMessage=m=>m.type==='rankWords'?new Promise(r=>finish=r):original(m);
   t.w.LiltDemo.set({liveJev:true});await sleep(30);for(let i=0;i<100&&!t.w.PassportDictionary.has('fr');i++)await sleep(10);t.set('bank');for(let i=0;i<70&&!finish;i++)await sleep(10);assert.ok(finish,action);
   if(action==='typing')t.set('banker');else if(action==='space')t.press(' ');else if(action==='tab')t.press('Tab');else t.w.LiltDemo.set({liveJev:false});
   const before=t.field.value;finish({ok:true,data:{order:[1,0]}});await sleep(15);assert.equal(t.field.value,before);
   if(action==='tab'){t.press(' ');assert.equal(t.field.value,'rive');}
  }finally{t.dom.window.close();}
 }
});
test('TypeSafe key and consent save separately; blank saves keep the key and pages cannot change it',async()=>{
 const h=backend(),dom=await options(h);try{
  const d=dom.window.document;d.getElementById('jev-key').value='fixture-typesafe-secret';d.getElementById('liveJev').checked=true;d.getElementById('save').click();await sleep(25);
  assert.equal(h.store.jevKey,'fixture-typesafe-secret');assert.equal(h.store.settings.liveJev,true);assert.equal(h.store.apiKey,'');
  d.getElementById('save').click();await sleep(25);assert.equal(h.store.jevKey,'fixture-typesafe-secret');
  await h.send({type:'saveSettings',jevKey:'untrusted',patch:{liveJev:false}},{id:'lilt-prototype@local.example',url:'https://example.test',tab:{id:3}});assert.equal(h.store.jevKey,'fixture-typesafe-secret');
  d.getElementById('jev-forget').click();await sleep(25);assert.equal(h.store.jevKey,'');assert.equal(h.store.settings.liveJev,false);
 }finally{dom.window.close();}
});


test('Setup opens only on a fresh install, never updates or repeat events',async()=>{
 const h=backend();await h.installed({reason:'update'});assert.equal(h.opened.length,0);
 await h.installed({reason:'install'});assert.equal(h.opened.length,1);assert.match(h.opened[0].url,/options.html#setup$/);
 await h.installed({reason:'install'});assert.equal(h.opened.length,1);
});
test('Webpages cannot change setup progress',async()=>{
 const h=backend();const r=await h.send({type:'onboardingSave',step:3,completed:true},{id:'lilt-prototype@local.example',url:'https://example.test',tab:{id:1}});
 assert.equal(r.ok,false);assert.equal(h.store.onboarding,undefined);
});
test('Wizard skips keys, resumes, finishes, replays, and persists appearance',async()=>{
 const h=backend(),d=await options(h),w=d.window,by=id=>w.document.getElementById(id);
 try{
 w.scrollTo=()=>{};w.history.replaceState(null,'','options.html#setup');w.eval(fs.readFileSync(path.join(ext,'setup.js'),'utf8'));
 await until(()=>w.document.body.classList.contains('setup'));
 by('setup-next').click();await until(()=>h.store.onboarding?.step===1);
 by('setup-later').click();await until(()=>!w.document.body.classList.contains('setup'));
 by('setup-replay').click();assert.equal(by('setup-progress').textContent,'Step 2 of 4');
 by('setup-next').click();await until(()=>h.store.onboarding.step===2);
 by('custom-colors').checked=true;by('accentColor').value='#123456';by('accentSoftColor').value='#abcdef';by('appearance').value='light';
 by('setup-next').click();await until(()=>h.store.onboarding.step===3);
 assert.equal(h.store.settings.accentColor,'#123456');assert.equal(h.store.settings.appearance,'light');
 assert.match(by('tutorial-availability').textContent,/Offline practice/);
 assert.equal(by('key').closest('[data-lilt-ignore]').id,'sentence-card');assert.equal(by('tutorial-field').closest('[data-lilt-ignore]'),null);
 by('setup-next').click();await until(()=>h.store.onboarding.completed);
 assert.equal(h.calls.length,0);assert.equal(h.store.apiKey,'');
 by('setup-replay').click();assert.equal(by('setup-progress').textContent,'Step 1 of 4');
 by('reset-colors').click();await w.PassportSettings.save();assert.equal(h.store.settings.accentColor,'');assert.equal(h.store.settings.accentSoftColor,'');
 }finally{w.close();}
});
test('New model default and appearance validation preserve saved model choices',()=>{
 assert.equal(C.config({}).model,'gemini-3.8-flash');assert.equal(C.config({model:'gemini-existing'}).model,'gemini-existing');
 assert.equal(C.config({accentColor:'red; color:black',appearance:'invalid'}).accentColor,'');
 assert.equal(C.config({appearance:'invalid'}).appearance,'auto');assert.equal(C.config({accentColor:'#abcdef'}).accentColor,'#abcdef');
});

test('Open Settings never claims dictionary, sentence or config response channels',async()=>{
 const h=backend(),d=await options(h);try{
 for(const type of ['dictionary','generate','config','saveConfig','rankWords','onboardingGet']){
  const result=h.optionsListener({type,language:'ja'});
  assert.equal(result,undefined,`Settings claimed ${type} with an empty Promise, racing the background`);
 }
 }finally{d.window.close();}
});

test('Sentence response still reaches a webpage with Settings open',async()=>{
 const h=backend();h.store.settings.consent=true;h.store.apiKey=fakeKey;const d=await options(h);
 try{
  const message={type:'generate',kind:'sentence',requestId:'settings-open-regression',payload:{text:'Helping the homeless.',source:'en',target:'ja'}};
  const replies=[h.optionsListener(message),h.send(message,{id:'lilt-prototype@local.example',url:'https://example.test',tab:{id:7},frameId:0})].filter(r=>r&&typeof r.then==='function');
  const result=await Promise.race(replies);assert.equal(result?.ok,true);assert.ok(result.data.translation);assert.equal(h.calls.length,1);
 }finally{d.window.close();}
});
