const fs=require('fs'),vm=require('vm'),path=require('path'),{JSDOM}=require('jsdom');
const {test}=require('node:test');const assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function harness({failPacks=false,delay=0,withSettings=false}={}){
 const root=path.resolve(__dirname,'../..'), C=require(path.join(root,'core.js'));let listener,shadow;const watchers=[],store={settings:{...C.defaults,consent:false,source:'en',target:'ja'}};let fetches=0;
 const runtime={id:'lilt-prototype@local.example',getURL:p=>'moz-extension://fixture/'+p,onMessage:{addListener:f=>listener=f},onInstalled:{addListener(){}},openOptionsPage:async()=>{}};
 const storage={local:{get:async k=>({[k]:store[k]}),set:async p=>{Object.assign(store,p);for(const f of watchers)f(Object.fromEntries(Object.entries(p).map(([k,value])=>[k,{newValue:value}])),'local');}},onChanged:{addListener:f=>watchers.push(f)}};
 const browser={runtime,storage,theme:{getCurrent:async()=>({}),onUpdated:{addListener(){}}}};
 const ctx=vm.createContext({LiltCore:C,browser,setTimeout,clearTimeout,AbortController,fetch:async url=>{fetches++;if(delay)await sleep(delay); if(!url.startsWith('moz-extension://fixture/'))throw Error('Cloud forbidden');return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.slice('moz-extension://fixture/'.length)),'utf8'))};}});
 vm.runInContext(fs.readFileSync(path.join(root,'background.js'),'utf8'),ctx);
 let optionsDom,optionsListener;
 if(withSettings){optionsDom=new JSDOM(fs.readFileSync(path.join(root,'options.html'),'utf8'),{url:'moz-extension://fixture/options.html',runScripts:'outside-only'});optionsDom.window.browser={runtime:{sendMessage:m=>listener(m,{id:runtime.id,url:'moz-extension://fixture/options.html'}),onMessage:{addListener:f=>optionsListener=f}}};for(const f of ['core.js','options.js'])optionsDom.window.eval(fs.readFileSync(path.join(root,f),'utf8'));await optionsDom.window.PassportSettings.ready;}
 const dispatch=m=>{const background=listener(m,{id:runtime.id,url:'https://example.test',tab:{id:1},frameId:0});if(!optionsListener)return background;const responses=[optionsListener(m),background].filter(r=>r&&typeof r.then==='function');return Promise.race(responses);};
 const d=new JSDOM('<textarea id="field"></textarea>',{url:'https://example.test',pretendToBeVisual:true,runScripts:'outside-only'}),w=d.window;
 w.CSS={supports:()=>true};w.speechSynthesis={getVoices:()=>[],cancel(){}};const attach=w.Element.prototype.attachShadow;w.Element.prototype.attachShadow=function(o){shadow=attach.call(this,o);return shadow};
 w.browser={storage:{onChanged:{addListener:f=>watchers.push(f)}},runtime:{sendMessage:m=>m.type==='dictionary'&&failPacks?Promise.resolve({ok:false,error:'The bundled dictionary could not be loaded. Reload Passport.'}):dispatch(m),onMessage:{addListener(){}}}};
 for(const f of JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')).content_scripts[0].js)w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 await sleep(30);const field=w.document.querySelector('textarea');
 const set=text=>{field.value=text;field.setSelectionRange(text.length,text.length);field.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));};
 return {w,d,field,shadow,store,set,optionsDom,setFailPacks:value=>{failPacks=value;}};
}
async function ready(h,lang){for(let i=0;i<1000&&!h.w.PassportDictionary.has(lang);i++)await sleep(10);assert.ok(h.w.PassportDictionary.has(lang),'Real packaged dictionary installed');}
test('Language change preserves companion while a native shadow select owns focus',async()=>{
 const h=await harness();try{h.field.focus();await ready(h,'ja');h.set('hello');h.shadow.querySelector('.pair').click();const select=h.shadow.querySelectorAll('select')[1];select.focus();select.value='es';select.dispatchEvent(new h.w.Event('change',{bubbles:true}));await sleep(80);assert.equal(h.store.settings.target,'es');assert.equal(h.shadow.querySelector('.bar').hidden,false,'The storage refresh hid the language menu');}finally{h.d.window.close();}
});
test('A completed local pack refreshes the unchanged current word without editing native text',async()=>{
 const h=await harness({delay:60});try{h.field.focus();h.set('homeless');await ready(h,'ja');await sleep(80);assert.notEqual(h.shadow.querySelector('.content').textContent,'','No suggestions arrived after the dictionary finished');assert.equal(h.field.value,'homeless');}finally{h.d.window.close();}
});
test('Bundled dictionary failure is visible beyond the small curated fallback',async()=>{
 const h=await harness({failPacks:true});try{h.field.focus();h.set('homeless');await sleep(100);assert.match(h.shadow.querySelector('.bar').textContent,/dictionary.{0,50}(?:unavailable|failed|could not|reload|retry)|(?:unable|could not|failed).{0,50}dictionary/i,'Pack failure silently looks like an unsupported word');}finally{h.d.window.close();}
});

test('Dictionary retry restores nonstarter words without a page reload',async()=>{
 const h=await harness({failPacks:true});try{h.field.focus();h.set('homeless');await sleep(50);h.setFailPacks(false);const retry=[...h.shadow.querySelectorAll('button')].find(b=>b.textContent==='Retry dictionary');assert.ok(retry);retry.click();await ready(h,'ja');await sleep(50);assert.ok(h.shadow.querySelector('.candidate'));assert.equal(h.field.value,'homeless');}finally{h.d.window.close();}
});
test('Late dictionary completion never adopts a word after Space',async()=>{
 const h=await harness({delay:60});try{h.field.focus();h.set('homeless ');await ready(h,'ja');await sleep(60);assert.equal(h.field.value,'homeless ');}finally{h.d.window.close();}
});

test('Open Settings cannot steal the real packaged dictionary response',async()=>{
 const h=await harness({withSettings:true});try{h.field.focus();h.set('homeless');await ready(h,'ja');await sleep(50);assert.ok(h.shadow.querySelector('.candidate'));assert.doesNotMatch(h.shadow.querySelector('.bar').textContent,/Dictionary unavailable/);}finally{h.d.window.close();h.optionsDom.window.close();}
});
