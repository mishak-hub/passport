/* global browser, LiltCore */
'use strict';
const inFlight = new Map(), cache = new Map();
let backoffUntil = 0;
const packCache=new Map();
let catalogPromise;
function loadPack(language){
  if(!['es','fr','ja','zh'].includes(language))return Promise.reject(new Error('Unsupported dictionary.'));
  if(!catalogPromise)catalogPromise=fetch(browser.runtime.getURL('data/catalog.json')).then(r=>r.json()).catch(e=>{catalogPromise=null;throw e;});
  if(!packCache.has(language))packCache.set(language,catalogPromise.then(async catalog=>(await Promise.all(catalog[language].files.map(file=>fetch(browser.runtime.getURL(`data/${file}`)).then(r=>{if(!r.ok)throw new Error('Dictionary missing');return r.json();})))).flat()).catch(e=>{packCache.delete(language);throw e;}));
  return packCache.get(language);
}
function isSettings(sender) {
  // An extension options page may itself be open in a tab. Authenticate the
  // extension and exact page URL; tab presence does not identify a content script.
  const page=typeof sender.url==='string'?sender.url.split(/[?#]/,1)[0]:'';
  return sender.id===browser.runtime.id && page===browser.runtime.getURL('options.html');
}
async function settings() { const { settings } = await browser.storage.local.get('settings'); return LiltCore.config(settings); }
const liveRanker=typeof PassportLiveRank==='undefined'?null:PassportLiveRank.create({getSettings:settings,getKey:async()=>(await browser.storage.local.get('jevKey')).jevKey});
function ollamaError(status){return status===403?`Ollama blocked Passport's origin (403). Allow ${browser.runtime.getURL('').replace(/\/$/,'')} in OLLAMA_ORIGINS and restart the Ollama server. This is not a missing-model error.`:status===404?'The selected model was not found in Ollama. Refresh models and choose an installed model.':`Ollama returned ${status}. Check the local server and selected model.`;}
async function theme(windowId) {
  try { const t = await browser.theme.getCurrent(windowId); return { accent: t.colors?.icons_attention || t.colors?.button_background_active || null, background: t.colors?.popup || null, color: t.colors?.popup_text || null, border:t.colors?.popup_border||t.colors?.toolbar_top_separator||null }; } catch { return {}; }
}
function errorText(status) {
  return ({400:'The API rejected this request. Check the key and model in Settings.',401:'This API key was not accepted. Update it in Settings.',402:'The API returned RESOURCE_EXHAUSTED (402). Check this key’s quota and access in Google AI Studio. Passport will not enable billing or change models.',403:'This key cannot access the model. Check its API permissions in Google AI Studio.',404:'This model is not available to your key. Choose another model in Settings.',429:'The API quota is temporarily exhausted. Wait a minute; your text is unchanged.'})[status] || `Translation service unavailable (${status}). Your text is unchanged.`;
}
async function generate(kind, p, sender, requestId) {
  const cfg = await settings();
  if (!cfg.enabled || cfg.provider==='cloud'&&!cfg.consent) throw new Error('Open Passport Settings to enable sentence translation.');
  const { apiKey } = await browser.storage.local.get('apiKey');
  if (cfg.provider==='cloud'&&!apiKey) throw new Error('Add your API key in Passport Settings to reconstruct sentences.');
  if (cfg.provider==='ollama'&&!cfg.ollamaModel)throw new Error('Choose an installed Ollama model in Settings.');
  if (kind!=='sentence' || typeof p?.text !== 'string' || !p.text.trim() || p.text.length > 2000) throw new Error('Only sentence reconstruction uses a model. Use up to 2,000 characters.');
  if (!LiltCore.languages[p.target] || !(p.source === 'auto' || LiltCore.languages[p.source])) throw new Error('Choose a supported language pair.');
  const safe = { text:p.text, context: typeof p.context === 'string' ? p.context.slice(0,2000) : '', visible: typeof p.visible === 'string' ? p.visible.slice(0,2000) : '', selected: Array.isArray(p.selected) ? p.selected.slice(0,60).map(x=>({source:String(x.source).slice(0,100),target:String(x.target).slice(0,100)})) : [], source:p.source, target:p.target, practice:p.practice === true };
  safe.provisional=Array.isArray(p.provisional)?p.provisional.slice(0,60).map(x=>({source:String(x.source).slice(0,100),target:String(x.target).slice(0,100)})):[];
  const cacheKey = JSON.stringify([cfg.provider,cfg.model,cfg.ollamaUrl,cfg.ollamaModel,kind,safe]);
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (cfg.provider==='cloud'&&Date.now() < backoffUntil) throw new Error('API quota reached. Please wait a minute before trying again.');
  if (inFlight.size >= 6) throw new Error('Translation is busy. Pause briefly and try again.');
  const id = `${sender.tab?.id ?? 'settings'}:${sender.frameId ?? 0}:${requestId}`;
  const controller = new AbortController();
  inFlight.set(id, controller);
  const timer = setTimeout(()=>controller.abort(),cfg.provider==='ollama'?60000:25000);
  try {
    const response = cfg.provider==='ollama'?await fetch(cfg.ollamaUrl+'/api/generate',{
      method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,redirect:'error',
      body:JSON.stringify({model:cfg.ollamaModel,prompt:LiltCore.prompt(kind,safe)+` Each tokens[].text MUST be an exact substring of translation in ${LiltCore.languages[safe.target].name}; never tokenize the source sentence. Explain these target words in ${safe.source==='auto'?'the detected source language':LiltCore.languages[safe.source].name}. Keep definitions under eight words, one pronunciation per token. Omit character components and notes. Keep JSON compact.`,stream:false,format:LiltCore.sentenceSchema,keep_alive:'5m',options:{temperature:0.15,num_predict:4096}})
    }):await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`, {
      method:'POST', headers:{'Content-Type':'application/json','x-goog-api-key':apiKey}, signal:controller.signal,
      body:JSON.stringify({ contents:[{role:'user',parts:[{text:LiltCore.prompt(kind,safe)}]}], generationConfig:{temperature:0.15,maxOutputTokens:kind==='sentence'?4096:2048,...(cfg.model.startsWith('gemma-4')?{thinkingConfig:{thinkingLevel:'minimal'}}:cfg.model==='gemini-3.8-flash'?{thinkingConfig:{thinkingLevel:'low'},responseMimeType:'application/json'}:{})} })
    });
    if (!response.ok) { if(cfg.provider==='cloud'&&response.status===429) backoffUntil=Date.now()+60000; throw new Error(cfg.provider==='ollama'?ollamaError(response.status):errorText(response.status)); }
    const body = await response.json();
    const raw = cfg.provider==='ollama'?body.response||'':body.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('') || '';
    const result = LiltCore.normalize(kind,LiltCore.parseJSON(raw));
    if(cfg.provider==='ollama'){
      // Small local models may explain source words or invent character analyses.
      // Only show words actually present in the translated sentence, without
      // unverified local-model character etymologies.
      const latinWords=new Set(result.translation.toLocaleLowerCase().match(/[\p{L}\p{M}'’-]+/gu)||[]);
      result.tokens=result.tokens.filter(t=>['ja','zh'].includes(safe.target)?result.translation.includes(t.text):t.text.toLocaleLowerCase().split(/\s+/).every(w=>latinWords.has(w))).map(t=>({...t,characters:[]}));
    }
    cache.set(cacheKey,result); if(cache.size>150) cache.delete(cache.keys().next().value);
    return result;
  } catch(e) { if(e.name==='AbortError') throw new Error('Translation was cancelled or timed out. Your text is unchanged.'); if(cfg.provider==='ollama'&&e instanceof TypeError)throw new Error('Cannot reach Ollama. Start it locally, check the endpoint and allow this extension’s origin if required.'); throw e; }
  finally { clearTimeout(timer); inFlight.delete(id); }
}
browser.runtime.onMessage.addListener((message,sender)=>{
  if (!message || typeof message !== 'object') return;
  if(message.type==='onboardingGet'||message.type==='onboardingSave')return (async()=>{
    if(!isSettings(sender))return {ok:false,error:'Open Passport Settings to manage setup.'};
    const old=(await browser.storage.local.get('onboarding')).onboarding||{step:0,completed:false};
    if(message.type==='onboardingGet')return {ok:true,onboarding:old};
    const next={...old,step:Number.isInteger(message.step)?Math.max(0,Math.min(3,message.step)):old.step,completed:message.completed===true||old.completed===true,deferred:message.deferred===true};
    await browser.storage.local.set({onboarding:next});return {ok:true,onboarding:next};
  })();
  if (message.type==='config') return Promise.all([settings(),theme(sender.tab?.windowId),browser.storage.local.get('apiKey'),browser.storage.local.get('jevKey')]).then(([settings,theme,key,jev])=>({settings,theme,hasKey:!!key.apiKey,hasJevKey:!!jev.jevKey}));
  if (message.type==='rankWords')return (async()=>{try{return {ok:true,data:await liveRanker?.rank(message.payload,`${sender.tab?.id??'settings'}:${sender.frameId??0}:${message.requestId}`)};}catch(e){return {ok:false,error:e.name==='AbortError'?'Ranking timed out; using local suggestions.':e.message};}})();
  if (message.type==='openSettings') return browser.runtime.openOptionsPage().then(()=>({ok:true}));
  if (message.type==='dictionary')return loadPack(message.language).then(rows=>({ok:true,rows})).catch(()=>({ok:false,error:'The bundled dictionary could not be loaded. Reload Passport.'}));
  if (message.type==='ollamaModels')return (async()=>{
    if(!isSettings(sender))return {ok:false,error:'Open Passport Settings to select local models.'};
    const url=LiltCore.localEndpoint(message.url);if(!url)return {ok:false,error:'Use an HTTP loopback address, such as http://localhost:11434.'};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try{const response=await fetch(url+'/api/tags',{signal:controller.signal,redirect:'error'});if(!response.ok)throw new Error(ollamaError(response.status));const data=await response.json();return {ok:true,models:(data.models||[]).filter(m=>!m.remote_host&&!m.remote_model).map(m=>m.name).filter(n=>typeof n==='string'&&!/[:-]cloud$/i.test(n)).slice(0,100)};}
    catch(e){return {ok:false,error:e.name==='TypeError'?'Cannot reach Ollama. Start the local server and check its endpoint.':e.message};}finally{clearTimeout(timer);}
  })();
  if (message.type==='saveSettings') return (async()=>{
    if(!isSettings(sender))return {ok:false,error:'Open Passport’s own Settings page to save connection details.'};
    const next=LiltCore.config({...await settings(),...message.patch});
    if(message.patch?.ollamaUrl&&!LiltCore.localEndpoint(message.patch.ollamaUrl))throw new Error('Ollama must use an HTTP loopback address.');
    if(/[:-]cloud$/i.test(next.ollamaModel))throw new Error('Choose a locally installed model, not an Ollama cloud model.');
    if(typeof message.patch?.model==='string'&&!/^[a-zA-Z0-9._-]{1,100}$/.test(message.patch.model))throw new Error('Enter a valid model ID.');
    const update={settings:next};
    if(typeof message.jevKey==='string'){const key=message.jevKey.trim();if(key.length>512||/[\r\n]/.test(key))throw new Error('Enter a single-line TypeSafe key.');update.jevKey=key;}
    if(typeof message.key==='string'){
      const key=message.key.trim();if(key.length>512||/[\r\n]/.test(key))throw new Error('Paste the API key as a single line.');
      update.apiKey=key;
    }
    await browser.storage.local.set(update);
    const saved=await settings(),{apiKey}=await browser.storage.local.get('apiKey');
    if(Object.keys(next).some(k=>next[k]!==saved[k])||('apiKey'in update&&update.apiKey!==apiKey))throw new Error('Settings could not be verified in local storage. Please retry.');
    if('apiKey'in update){backoffUntil=0;cache.clear();}
    const {jevKey}=await browser.storage.local.get('jevKey');
    if('jevKey'in update&&update.jevKey!==jevKey)throw new Error('The TypeSafe key could not be verified in storage.');
    liveRanker?.reset();
    return {ok:true,settings:saved,hasKey:!!apiKey,hasJevKey:!!jevKey};
  })();
  if (message.type==='saveConfig') return (async()=>{
    const old=await settings(), allowed={};
    for(const k of ['enabled','source','target','practice','placement']) if(k in (message.patch||{})) allowed[k]=message.patch[k];
    if(isSettings(sender)) for(const k of ['model','consent']) if(k in (message.patch||{})) allowed[k]=message.patch[k];
    const next=LiltCore.config({...old,...allowed});
    await browser.storage.local.set({settings:next}); return {settings:next};
  })();
  if (message.type==='saveKey') return (async()=>{
    if(!isSettings(sender))return {ok:false,error:'Only Passport Settings can change the saved key.'};
    const key=typeof message.key==='string'?message.key.trim():'';
    if(key.length>512) throw new Error('Invalid key length.');
    await browser.storage.local.set({apiKey:key});
    const saved=await browser.storage.local.get('apiKey');
    if(saved.apiKey!==key)throw new Error('The API key could not be verified in local storage.');
    cache.clear();backoffUntil=0;return {ok:true,hasKey:!!key};
  })();
  if (message.type==='cancel') { const id=`${sender.tab?.id ?? 'settings'}:${sender.frameId ?? 0}:${message.requestId}`; inFlight.get(id)?.abort();liveRanker?.cancel(id); return Promise.resolve({ok:true}); }
  if (message.type==='generate') return generate(message.kind,message.payload,sender,message.requestId).then(data=>({ok:true,data})).catch(e=>({ok:false,error:e.message}));
});
browser.storage.onChanged.addListener(changes=>{if(changes.settings||changes.jevKey)liveRanker?.reset(); if(changes.settings || changes.apiKey) { for(const c of inFlight.values()) c.abort(); cache.clear(); } });

// Only fresh installation opens setup. Updates and background reloads stay quiet.
browser.runtime.onInstalled?.addListener(async details=>{
 if(details.reason!=='install')return;
 const old=(await browser.storage.local.get('onboarding')).onboarding;
 if(old?.opened||old?.completed)return;
 await browser.storage.local.set({onboarding:{...old,step:old?.step||0,completed:false,opened:true}});
 await browser.tabs.create({url:browser.runtime.getURL('options.html#setup')});
});
browser.theme.onUpdated?.addListener(async event=>{
 try{const tabs=await browser.tabs.query(Number.isInteger(event.windowId)?{windowId:event.windowId}:{});await Promise.all(tabs.map(tab=>browser.tabs.sendMessage(tab.id,{type:'passportThemeChanged'}).catch(()=>{})));}catch{}
 try{await browser.runtime.sendMessage({type:'passportThemeChanged'});}catch{}
});
