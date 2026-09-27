/* Scripted provider ONLY for the labeled playground. Never included in the XPI. */
(() => {
  const listeners=[],requests=[];
  const demo={settings:{...LiltCore.defaults,source:'en',target:'fr',consent:true},delay:70,requests,notify(){for(const f of listeners)f({settings:{newValue:this.settings}},'local');},set(p){Object.assign(this.settings,p);this.notify();},root:null};
  window.LiltDemo=demo;
  const attach=Element.prototype.attachShadow;
  Element.prototype.attachShadow=function(options){const r=attach.call(this,options);if(this.hasAttribute('data-lilt-host'))demo.root=r;return r;};
  const words={my:['mon','my'],neighbor:['voisin','neighbor'],is:['est','is'],funny:['amusant','funny'],bank:['banque','financial institution']};
  const sentences={en:'My neighbor is funny.',fr:'Mon voisin est amusant.',es:'Mi vecino es divertido.',ja:'隣人は面白いです。',zh:'我的邻居很有趣。'};
  const tokens={fr:[['Mon','mɔ̃','My'],['voisin','vwa.zɛ̃','neighbor'],['est','ɛ','is'],['amusant','a.my.zɑ̃','funny; amusing']],es:[['Mi','mee','My'],['vecino','beh-SEE-noh','neighbor'],['es','es','is'],['divertido','dee-behr-TEE-doh','funny']],ja:[['隣人','rinjin','neighbor'],['は','wa','topic particle'],['面白い','omoshiroi','funny; interesting'],['です','desu','polite ending']],zh:[['我的','wǒ de','my'],['邻居','línjū','neighbor'],['很','hěn','very / adjective linking'],['有趣','yǒuqù','interesting; funny']]};
  window.browser={storage:{onChanged:{addListener:f=>listeners.push(f)}},runtime:{async sendMessage(m){
    if(m.type==='dictionary')return {ok:true,rows:m.language==='fr'?[['my','mon','','','',0],['neighbor','voisin','vwa.zɛ̃','','',0],['is','est','ɛ','','',0],['funny','amusant','a.my.zɑ̃','','',0],['bank','banque','bɑ̃k','financial institution','',0],['bank','rive','ʁiv','river bank','',0]]:[]};
    if(m.type==='config')return {settings:{...demo.settings},hasKey:true,theme:{}};
    if(m.type==='saveConfig'){demo.set(m.patch);return {settings:{...demo.settings}};}
    if(m.type==='openSettings'){alert('This is the scripted playground. Install the Firefox extension for live settings.');return;}
    if(m.type==='cancel')return {ok:true};
    if(m.type!=='generate')return;
    requests.push({...m,time:Date.now()});await new Promise(r=>setTimeout(r,demo.delay));
    const p=m.payload,target=p.target;
    if(m.kind!=='sentence')throw new Error('Word-level model calls are forbidden.');
    const text=p.text.toLowerCase();if(!/neighbor|voisin|hello|coffee|train|bonjour/.test(text))return {ok:false,error:'Scripted demo: use “My neighbor is funny.” for the full sentence flow.'};
    const translation=sentences[target];return {ok:true,data:{translation,complete:!text.includes('because'),tokens:(tokens[target]||[]).map(t=>({text:t[0],reading:t[1],meaning:t[2],characters:[]})),meaning:'My neighbor is funny.',note:'The sentence preserves the original meaning.',detectedSource:'en'}};
  }}};
})();
