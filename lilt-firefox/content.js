/* global browser, LiltCore, LiltLexicon, LiltEditor */
(() => {
  'use strict';
  if (document.querySelector('[data-lilt-host]')) return;
  const C=LiltCore,E=LiltEditor;
  let cfg=C.config(), hasKey=false, active=null, mode='idle', view=null, mutation=false, composing=false, menuOpen=false, closedByUser=false, requestNumber=0, selectionTimer;
  const states=new WeakMap();
  const loadingPacks=new Map(),packErrors=new Map();
  const host=document.createElement('div');host.dataset.liltHost='';
  host.style.cssText='all:initial!important;position:fixed!important;z-index:2147483646!important;pointer-events:none!important;left:0!important;top:0!important;width:0!important;height:0!important;';
  document.documentElement.append(host);
  const shadow=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');
  style.textContent=`
    :host{color-scheme:light dark;--bg:#faf9fd;--ink:#22202b;--muted:#76717f;--line:#ddd7e8;--accent:#8c5de7;--soft:#eee8fa;--shadow:0 12px 44px #20133322}
    @media(prefers-color-scheme:dark){:host{--bg:#201f24;--ink:#f1edf8;--muted:#a8a1b2;--line:#45404e;--accent:#bc93ff;--soft:#342b44;--shadow:0 12px 44px #0005}}
    *{box-sizing:border-box} [hidden]{display:none!important}
    button,select{font:inherit;color:inherit} button{cursor:pointer} button:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    .bar{position:fixed;pointer-events:auto;width:min(620px,calc(100vw - 32px));border:1px solid var(--accent);border-radius:17px;background:var(--bg);color:var(--ink);box-shadow:var(--shadow);font:14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;transition:opacity .12s;overflow:visible;text-align:left}
    .body{padding:13px 16px 10px;max-height:130px;overflow:auto;scrollbar-width:thin;overflow-wrap:anywhere}
    .content{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:25px}.sentence{gap:3px;font-size:16px;font-weight:500;line-height:1.8}
    .word{background:none;border:0;border-bottom:2px dotted var(--muted);padding:0 2px 1px;color:var(--ink);font-size:inherit;line-height:1.5}.word:hover{color:var(--accent);border-color:var(--accent)}
    .candidate{border:1px solid transparent;border-radius:9px;background:none;padding:6px 10px;font-size:16px}.candidate small{display:block;color:var(--muted);font-size:11px;margin-top:2px}.candidate.selected{background:var(--soft);border-color:var(--line);color:var(--accent)}
    .meaning{font-size:12px;color:var(--muted);margin-top:5px}.footer{border-top:1px solid var(--line);display:flex;align-items:center;gap:4px;padding:5px 9px;min-height:36px;border-radius:0 0 17px 17px}.footer .spacer{flex:1}.hint{font-size:10px;color:var(--muted);white-space:nowrap}.hint kbd{font:inherit;color:var(--ink)}
    .bar.compact .footer{border-top:0;border-radius:17px}
    .content:not(.sentence){flex-wrap:nowrap;overflow-x:auto}.candidate{flex-shrink:0;white-space:nowrap}
    .bar.narrow .footer{gap:0}.bar.narrow .hint{display:none}.bar.narrow .icon{width:26px;padding:4px;flex-shrink:0}.bar.narrow .pair{padding:4px;font-size:10px;white-space:nowrap}.bar.narrow .body{padding:9px 10px}
    .icon,.pair,.textbutton{border:0;background:none;border-radius:8px;height:27px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:4px 7px;font-size:11px}.icon:hover,.pair:hover,.textbutton:hover{background:var(--soft)}.icon svg,.pair svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}.icon[aria-pressed=true]{color:var(--accent);background:var(--soft)}
    .pill{position:fixed;pointer-events:auto;border:1px solid var(--line);border-radius:20px;color:var(--ink);background:var(--bg);box-shadow:0 3px 16px #0002;padding:7px 11px;display:flex;align-items:center;gap:7px;font:11px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.pill svg{width:15px;height:15px;fill:none;stroke:var(--accent);stroke-width:1.6}.dot{width:5px;height:5px;border-radius:100%;background:var(--accent)}
    .menu{padding:13px 16px;display:grid;grid-template-columns:1fr 26px 1fr;gap:10px;border-bottom:1px solid var(--line)}.menu label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.menu select{display:block;width:100%;margin-top:5px;background:var(--bg);border:1px solid var(--line);padding:7px;border-radius:8px;font-size:13px}.menu .swap{align-self:end;height:34px}.menu .wide{grid-column:1/-1;display:flex;gap:10px;align-items:center;font-size:12px}.menu input{accent-color:var(--accent)}
    .bubble{position:fixed;pointer-events:auto;width:min(310px,calc(100vw - 24px));max-height:min(330px,65vh);overflow:auto;border:1px solid var(--line);border-radius:14px;padding:15px;background:var(--bg);color:var(--ink);box-shadow:var(--shadow);font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.bubble .title{display:flex;align-items:center;justify-content:space-between;font-size:23px;font-weight:600}.bubble .reading{color:var(--accent);font-size:13px;margin:2px 0 8px}.bubble .definition{font-size:14px}.bubble .characters{font-size:12px;color:var(--muted);margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}.bubble .credit{margin-top:10px;color:var(--muted);font-size:10px}.error{color:#b85563;font-size:12px}.status{color:var(--muted);font-size:12px}.bar.busy .dot{animation:breathe 1s ease-in-out infinite}@keyframes breathe{50%{opacity:.25}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}@media(max-width:450px){.hint{display:none}.bar{width:calc(100vw - 16px)}}
  `;
  style.textContent+=' :host{--system-fill:#faf9fd;--system-ink:#22202b;--button-fill:var(--system-fill);--button-ink:var(--system-ink);--accent-soft:var(--accent);--surround:var(--accent)} @media(prefers-color-scheme:dark){:host{--system-fill:#201f24;--system-ink:#f1edf8}} .bar{border-color:var(--surround)}';
  if(typeof PassportAppearance!=='undefined')style.textContent+=PassportAppearance.css;
  shadow.append(style);
  const icons={globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',speaker:'<path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',pin:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 15h18"/>',float:'<rect x="3" y="4" width="18" height="16" rx="3"/><rect x="7" y="8" width="10" height="6" rx="1"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',power:'<path d="M12 3v9M7 5a9 9 0 1 0 10 0"/>',practice:'<path d="m4 17 1-5L15 2l5 5L10 17l-6 1ZM13 4l5 5M3 22h18"/>',undo:'<path d="M8 5 3 10l5 5M3 10h10a7 7 0 0 1 0 14"/>',settings:'<path d="m9 3 .6-1h4.8l.6 3 2 .9 2.8-.9 2.4 4.2-2.2 2v2l2.2 2-2.4 4.2-2.8-.9-2 .9-.6 3H9.6L9 19.4l-2-.9-2.8.9L1.8 15.2l2.2-2v-2l-2.2-2L4.2 5 7 5.9 9 5z"/><circle cx="12" cy="12" r="3"/>',swap:'<path d="M3 8h18l-4-4M21 16H3l4 4"/>'};
  function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  function icon(name){
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    // These are private, static icon shapes, never model or webpage markup.
    for(const shape of (icons[name]||'').matchAll(/<(path|circle|ellipse|rect)\b([^>]*?)\/>/g)){
      const node=document.createElementNS(ns,shape[1]);for(const attribute of shape[2].matchAll(/([a-zA-Z-]+)="([^"]*)"/g))node.setAttribute(attribute[1],attribute[2]);svg.append(node);
    }
    return svg;
  }
  function button(name,label,fn){const b=el('button','icon passport-control');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.append(icon(name));b.addEventListener('click',fn);return b;}
  const bar=el('section','bar');bar.setAttribute('aria-label','Passport translation companion');bar.hidden=true;
  const menu=el('div','menu');menu.hidden=true;
  const body=el('div','body'),content=el('div','content'),meaning=el('div','meaning');
  body.append(content,meaning);
  const footer=el('div','footer'),pair=el('button','pair passport-control');pair.type='button';pair.title='Choose languages';pair.setAttribute('aria-label','Choose languages');
  pair.addEventListener('click',()=>{menuOpen=!menuOpen;renderMenu();position();});
  const speaker=button('speaker','Hear pronunciation',()=>speak(mode==='sentence'||mode==='review'?view?.data.translation:view?.data.candidates?.[view.index]?.text,view?.targetLang||cfg.target));
  const practice=button('practice','Toggle phonetic practice',()=>change({practice:!cfg.practice}));
  const placement=button('float','Switch fixed / floating placement',()=>change({placement:cfg.placement==='fixed'?'floating':'fixed'}));
  const undoButton=button('undo','Restore original text',undo);
  icons.accept='<path d="m5 12 4 4L19 6"/>';
  const acceptButton=button('accept','Accept sentence suggestion',()=>acceptSentence(true));acceptButton.hidden=true;
  const spacer=el('span','spacer'),hint=el('span','hint');
  const settingsButton=button('settings','Passport settings',()=>browser.runtime.sendMessage({type:'openSettings'}));
  const off=button('power','Turn Passport off',()=>change({enabled:false}));
  footer.append(pair,speaker,practice,placement,undoButton,acceptButton,spacer,hint,settingsButton,off,button('close','Dismiss companion',()=>{dismiss(true,true);}));
  bar.append(menu,body,footer);
  const pill=el('button','pill');pill.type='button';pill.title='Open Passport';pill.setAttribute('aria-label','Open Passport language companion');pill.hidden=true;pill.addEventListener('click',()=>{closedByUser=false;show('idle',null);});
  const bubble=el('aside','bubble');bubble.hidden=true;bubble.setAttribute('aria-label','Word meaning and pronunciation');
  const live=el('div');live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
  shadow.append(bar,pill,bubble,live);
  // Clicking our controls must not move the caret out of the webpage editor.
  shadow.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
  function state(field){
    if(!states.has(field)){const r=E.read(field);states.set(field,{field,text:r.text,version:0,spans:[],records:[],undo:[],jobs:new Set(),timer:null,lastTyped:0,lastCaret:r.start,detected:null});}
    return states.get(field);
  }
  function cancel(s){if(!s)return;clearTimeout(s.timer);clearTimeout(s.rankTimer);s.version++;for(const id of s.jobs) browser.runtime.sendMessage({type:'cancel',requestId:id}).catch(()=>{});s.jobs.clear();}
  function sync(s){const r=E.read(s.field);if(r.text!==s.text){const diff=C.editBetween(s.text,r.text);s.spans=C.rebase(s.spans,diff);s.records=C.rebase(s.records,diff);s.text=r.text;cancel(s);}return r;}
  function valid(s,v,text,caret){const r=E.read(s.field);return cfg.enabled&&active===s.field&&E.eligible(document.activeElement)===s.field&&s.field.isConnected&&!composing&&s.version===v&&r.text===text&&(caret===undefined||r.start===caret&&r.end===caret);}
  async function request(s,kind,payload){
    const requestId=`${Date.now()}-${++requestNumber}`;s.jobs.add(requestId);
    try{const result=await browser.runtime.sendMessage({type:'generate',kind,payload,requestId});if(!result?.ok)throw new Error(result?.error||'Cannot reach Passport. Reload this page after reloading the extension.');return result.data;}finally{s.jobs.delete(requestId);}
  }
  function payload(s,text,extra={}){return {text,source:cfg.source,target:cfg.target,practice:cfg.practice,...extra};}
  function remember(s){s.undo.push({text:s.text,spans:s.spans.map(x=>({...x})),records:s.records.map(x=>({...x}))});if(s.undo.length>30)s.undo.shift();}
  function replace(s,start,end,text,source,kind,data,save=true,explicit=false){
    const r=E.read(s.field);if(r.text!==s.text)return false;
    if(save)remember(s);
    const delta=text.length-(end-start),diff={start,end,text,delta};
    const caret=r.start>=end?r.start+delta:start+text.length;
    mutation=true;let ok=false;try{ok=E.replace(s.field,start,end,text,caret);}finally{mutation=false;}
    if(!ok){s.text=E.read(s.field).text;s.spans=[];s.records=[];showError('This editor rejected the change. Your original is available with Undo.');return false;}
    s.spans=C.rebase(s.spans,diff);s.records=C.rebase(s.records,diff);
    s.spans.push({start,end:start+text.length,source,target:text,explicit});
    if(kind==='sentence')s.records.push({start,end:start+text.length,source,target:text,data,sourceLang:s.detected||cfg.source,targetLang:cfg.target});
    s.text=E.read(s.field).text;cancel(s);s.lastCaret=caret;return true;
  }
  function undo(){if(!active)return;const s=state(active),last=s.undo.pop();if(!last)return;cancel(s);mutation=true;try{E.replace(active,0,E.read(active).text.length,last.text);}finally{mutation=false;}s.text=E.read(active).text;if(s.text===last.text){s.spans=last.spans;s.records=last.records;}else{s.spans=[];s.records=[];}show('idle',null);live.textContent='Original wording restored.';}
  function sentenceRange(s,r){return C.sentenceAt(r.text,r.start);}
  function schedule(s){clearTimeout(s.timer);const r=E.read(s.field);s.timer=setTimeout(()=>sentence(s,false),C.sentenceEnd(r.text,r.start-1)?0:Math.max(0,500-(Date.now()-s.lastTyped)));}
  function phraseRange(s,r,range){
    if(cfg.practice||!LiltLexicon.phrase)return null;
    const sr=C.sentenceAt(r.text,Math.max(0,range.end-1)),context=C.sourceFor(r.text,sr.start,range.end,s.spans);
    const starts=new Set([sr.start,...s.spans.filter(x=>x.start>=sr.start&&x.end<=range.end).map(x=>x.start)]);
    for(const m of r.text.slice(sr.start,range.end).matchAll(/\s+/gu))starts.add(sr.start+m.index+m[0].length);
    for(const start of [...starts].sort((a,b)=>a-b)){
      if(start>range.start||s.spans.some(x=>start>x.start&&start<x.end))continue;
      const source=C.sourceFor(r.text,start,range.end,s.spans);
      if(source.length>80||source.trim().split(/\s+/u).length>4)continue;
      const data=LiltLexicon.phrase(source,s.detected||cfg.source,cfg.target,context);
      if(data)return {start,end:range.end,text:source,data,locked:s.spans.some(x=>x.explicit&&x.start<range.end&&x.end>start)};
    }
    return null;
  }
  function word(s,range,partial=false){
    const r=E.read(s.field),v=s.version;
    if(s.spans.some(x=>range.start>=x.start&&range.end<=x.end))return;
    const phrase=phraseRange(s,r,range);if(phrase)range=phrase;
    const full=phrase?.data||(cfg.liveJev?LiltLexicon.pool(range.text,cfg.source,cfg.target,cfg.practice,partial):LiltLexicon.lookup(range.text,cfg.source,cfg.target,cfg.practice,partial));
    if(!full)return;
    const data={...full,candidates:full.candidates.slice(0,5),rankingCandidates:full.candidates};
    if(!valid(s,v,r.text,r.start))return;
    s.detected=data.detectedSource;
    const chosen=data.candidates[0];
    if(phrase?.locked)partial=true;
    if(!partial){if(!replace(s,range.start,range.end,chosen.text,range.text,'word',null))return;}
    const end=partial?range.end:range.start+chosen.text.length;
    show('word',{s,data,index:0,start:range.start,end,source:range.text,partial,locked:phrase?.locked,version:s.version,snapshot:s.text});
    if(partial)rankView(view,r.start);
    if(!partial)schedule(s);
  }
  function rankView(x,caret){
    if(!cfg.liveJev||!x||x.source.length<2)return;
    const s=x.s;clearTimeout(s.rankTimer);
    s.rankTimer=setTimeout(async()=>{
      if(view!==x||x.selected||!valid(s,x.version,x.snapshot,caret))return;
      const requestId=`rank-${Date.now()}-${++requestNumber}`;s.jobs.add(requestId);
      try{
        const sr=C.sentenceAt(x.snapshot,caret),context=C.sourceFor(x.snapshot,sr.start,sr.end,s.spans);
        const pool=x.data.rankingCandidates||x.data.candidates;
        const result=await browser.runtime.sendMessage({type:'rankWords',requestId,payload:{word:x.source,source:s.detected||cfg.source,target:cfg.target,practice:cfg.practice,context,candidates:pool}});
        if(!cfg.liveJev||view!==x||x.selected||!valid(s,x.version,x.snapshot,caret))return;
        if(!result?.ok){hint.textContent='Jev unavailable';hint.title=result?.error||'Using local suggestions.';return;}
        if(result.data?.abstain){x.abstain=true;hint.textContent='Keep original';x.data={...x.data,candidates:[{text:x.source,meaning:'Keep original',reading:''}]};x.index=0;renderBody();return;}
        const order=result.data?.order;
        if(!Array.isArray(order)||order.length!==pool.length||new Set(order).size!==order.length||order.some(i=>!Number.isInteger(i)||i<0||i>=order.length))return;
        x.data={...x.data,candidates:order.slice(0,5).map(i=>pool[i])};x.index=0;renderBody();
      }catch{/* Offline choices remain available. */}finally{s.jobs.delete(requestId);}
    },220);
  }
  async function sentence(s,force){
    if(active!==s.field||!cfg.enabled||composing||!s.field.isConnected)return;
    if(closedByUser&&!force)return;
    if(force)closedByUser=false;
    const r=sync(s);if(r.start!==r.end)return;
    const sr=sentenceRange(s,r);if(!sr.text.trim())return;
    const accepted=s.records.find(x=>r.start>=x.start&&r.start<=x.end+1&&r.text.slice(x.start,x.end)===x.target);
    if(accepted&&!force)return;
    if(cfg.provider==='cloud'&&(!cfg.consent||!hasKey)||cfg.provider==='ollama'&&!cfg.ollamaModel)return;
    const original=C.sourceFor(r.text,sr.start,sr.end,s.spans);
    const v=s.version;show('busy',{s});
    try{
      const spans=s.spans.filter(x=>x.start>=sr.start&&x.end<=sr.end);
      const selected=spans.filter(x=>x.explicit).map(x=>({source:x.source,target:x.target}));
      const provisional=spans.filter(x=>!x.explicit).map(x=>({source:x.source,target:x.target}));
      const data=await request(s,'sentence',payload(s,original,{visible:sr.text,selected,provisional}));
      if(!valid(s,v,r.text,r.start))return;
      s.detected=data.detectedSource;
      if(!data.complete){show('incomplete',{s});return;}
      const conflict=!C.preservesChoices(data.translation,selected);
      const boundary=/\s/u.test(r.text[r.start-1]||'')||C.sentenceEnd(r.text,r.start-1);
      if(!boundary||conflict){show('sentence',{s,data,start:sr.start,end:sr.end,source:original,snapshot:r.text,version:v,caret:r.start,conflict});return;}
      if(replace(s,sr.start,sr.end,data.translation,original,'sentence',data)){
        show('review',{s,data,start:sr.start,end:sr.start+data.translation.length,source:original,snapshot:s.text,version:s.version});live.textContent='Sentence translated. Undo restores the previous wording.';
      }
    }catch(e){if(valid(s,v,r.text,r.start))showError(e.message);}
  }
  function acceptSentence(explicit=false){const x=view;if(mode!=='sentence'||!x||!valid(x.s,x.version,x.snapshot,x.caret)||x.conflict&&!explicit)return false;
    if(!replace(x.s,x.start,x.end,x.data.translation,x.source,'sentence',x.data,true,explicit))return false;
    show('review',{...x,end:x.start+x.data.translation.length,snapshot:x.s.text,version:x.s.version});return true;
  }
  function selectCandidate(index,explicit=true){const x=view;if(mode!=='word'||!x||!valid(x.s,x.version,x.snapshot)||x.locked&&!explicit)return;const item=x.data.candidates[index];if(!item)return;
    if(x.abstain&&item.text===x.source){showTyping();return;}
    if(!replace(x.s,x.start,x.end,item.text,x.source,'word',null,true,explicit))return;
    x.end=x.start+item.text.length;x.version=x.s.version;x.snapshot=x.s.text;x.index=index;x.partial=false;show('word',x);schedule(x.s);
  }
  function previewCandidate(index){if(mode!=='word'||!view)return;view.index=index;view.selected=true;renderBody();if(view.data.uncertain||view.partial){const b=content.querySelectorAll('.candidate')[index];showBubble(view.data.candidates[index],b,false);}}
  function sentenceWords(data){
    const items=[];let offset=0;
    for(const token of data.tokens||[]){const i=data.translation.indexOf(token.text,offset);if(i<offset)continue;if(i>offset)items.push(data.translation.slice(offset,i));items.push(token);offset=i+token.text.length;}
    if(offset<data.translation.length){
      const tail=data.translation.slice(offset);
      for(const part of new Intl.Segmenter(cfg.target,{granularity:'word'}).segment(tail))items.push(part.isWordLike?{text:part.segment,meaning:'',reading:'',characters:[]}:part.segment);
    }
    return items;
  }
  function renderBody(){
    content.replaceChildren();meaning.textContent='';body.hidden=false;content.className='content';
    bar.dataset.mode=mode;
    acceptButton.hidden=mode!=='sentence';
    hint.textContent='';bar.classList.toggle('busy',mode==='busy');bar.classList.toggle('compact',['typing','idle','incomplete'].includes(mode));
    if(['typing','idle','incomplete'].includes(mode)){
      const failed=neededLanguages().some(l=>packErrors.has(l));
      if(failed){bar.classList.remove('compact');content.append(el('span','error','Dictionary unavailable.'));
        const retry=el('button','textbutton','Retry dictionary');retry.type='button';retry.addEventListener('click',()=>{packErrors.clear();loadDictionaries().catch(()=>{});renderBody();});content.append(retry);
      }else{body.hidden=true;if(neededLanguages().some(l=>loadingPacks.has(l)))hint.textContent='Loading words…';}return;
    }
    if(mode==='word'&&view){view.data.candidates.forEach((c,i)=>{const b=el('button','candidate'+(i===view.index?' selected':''));b.type='button';b.setAttribute('aria-label',`${c.text}, ${c.meaning}`);b.append(document.createTextNode(c.text));if(c.reading)b.append(el('small','',c.reading));b.addEventListener('click',()=>{selectCandidate(i);if(mode==='word'&&view)showBubble(view.data.candidates[i],content.querySelectorAll('.candidate')[i],true);});b.addEventListener('mouseenter',()=>{if(view?.data.uncertain||view?.partial)showBubble(c,b,false);});b.addEventListener('focus',()=>{if(view?.data.uncertain||view?.partial)showBubble(c,b,false);});content.append(b);});hint.textContent=view.abstain?'Keep original':'Tab ↹';}
    else if((mode==='sentence'||mode==='review')&&view){content.classList.add('sentence');for(const item of sentenceWords(view.data)){if(typeof item==='string'){content.append(document.createTextNode(item));continue;}const b=el('button','word',item.text);b.type='button';b.title=item.meaning||'Explore this word';b.addEventListener('mouseenter',()=>showBubble(item,b,false));b.addEventListener('focus',()=>showBubble(item,b,false));b.addEventListener('click',()=>showBubble(item,b,true));content.append(b);}meaning.textContent=view.data.meaning||view.source;hint.textContent=mode==='sentence'?(view.conflict?'Review choice':'Space ↵'):'';}
    else if(mode==='busy'){content.append(el('span','dot'),el('span','status','Translating…'));}
    else if(mode==='error'){content.append(el('span','error',view.message));}
  }
  function renderMenu(){menu.hidden=!menuOpen;if(!menuOpen){menu.replaceChildren();delete menu.dataset.signature;return;}
    const signature=JSON.stringify([cfg.source,cfg.target,cfg.practice]);if(menu.childElementCount){const selects=menu.querySelectorAll('select');selects[0].value=cfg.source;selects[1].value=cfg.target;menu.querySelector('input').checked=cfg.practice;menu.dataset.signature=signature;return;}menu.dataset.signature=signature;menu.replaceChildren();
    const source=el('label','', 'You type'),target=el('label','','You’re learning');
    function selectLang(value,auto,onchange){const select=el('select');if(auto){const o=el('option','','Detect language');o.value='auto';select.append(o);}for(const [code,lang]of Object.entries(C.languages)){const o=el('option','',lang.local);o.value=code;select.append(o);}select.value=value;select.addEventListener('change',()=>onchange(select.value));return select;}
    source.append(selectLang(cfg.source,true,v=>change({source:v})));target.append(selectLang(cfg.target,false,v=>change({target:v})));
    const swap=button('swap','Swap languages',()=>{if(cfg.source!=='auto')change({source:cfg.target,target:cfg.source});});swap.classList.add('swap');
    menu.append(source,swap,target);const p=el('label','wide'),input=el('input');input.type='checkbox';input.checked=cfg.practice;input.addEventListener('change',()=>change({practice:input.checked}));p.append(input,document.createTextNode('Practice · type how the word sounds'));menu.append(p);
  }
  function renderControls(){pair.replaceChildren(icon('globe'),document.createTextNode(`${cfg.source==='auto'?'Auto':cfg.source.toUpperCase()} → ${cfg.target.toUpperCase()}`));practice.setAttribute('aria-pressed',String(cfg.practice));placement.replaceChildren(icon(cfg.placement==='fixed'?'pin':'float'));placement.title=cfg.placement==='fixed'?'Fixed · switch to floating':'Floating · switch to fixed';undoButton.hidden=!active||!state(active).undo.length;pill.replaceChildren(icon('globe'),document.createTextNode(cfg.target.toUpperCase()));renderMenu();}
  function show(next,data){if(closedByUser)return;mode=next;view=data;bubble.hidden=true;bar.hidden=false;pill.hidden=true;renderBody();renderControls();position();}
  function showTyping(){
    // Discard stale candidates, not the controls the user is interacting with.
    mode='typing';view=null;bubble.hidden=true;
    if(!cfg.enabled||closedByUser){bar.hidden=true;pill.hidden=!active||!cfg.enabled;position();return;}
    show('typing',null);
  }
  function showError(message){show('error',{message});live.textContent=message;}
  function dismiss(cancelRequests,manual=false){if(cancelRequests&&active)cancel(state(active));if(manual)closedByUser=true;mode='idle';view=null;menuOpen=false;bar.hidden=true;bubble.hidden=true;pill.hidden=!active||!cfg.enabled;position();}
  function position(){if(!active)return;const rect=active.getBoundingClientRect();
    const viewport={width:innerWidth,height:innerHeight},initial=C.placement(rect,0,bar.offsetHeight||48,cfg,viewport);
    bar.style.width=`${initial.width}px`;
    bar.classList.toggle('narrow',initial.width<420);
    const height=bar.offsetHeight||48,{left,top}=C.placement(rect,initial.width,height,cfg,viewport);
    bar.style.left=`${left}px`;bar.style.top=`${top}px`;
    pill.style.left=`${Math.max(8,Math.min(cfg.placement==='fixed'?innerWidth-95:rect.right-58,innerWidth-80))}px`;pill.style.top=`${Math.max(8,Math.min(cfg.placement==='fixed'?innerHeight-48:rect.bottom+5,innerHeight-40))}px`;
    // Add an isolated spacer at the document end; avoid rewriting page styles or
    // shifting the editor on every keystroke. Sticky page controls remain site-specific.
    reserve.style.height=!bar.hidden&&cfg.placement==='fixed'?`${height+24}px`:'0px';
  }
  const reserve=el('div');reserve.setAttribute('aria-hidden','true');reserve.dataset.liltIgnore='';reserve.style.cssText='display:block!important;width:1px!important;height:0;pointer-events:none!important;';document.body?.append(reserve);
  async function showBubble(token,anchor,details){
    if(!anchor||!active)return;const owner=view,s=state(active),source=owner?.sourceLang||s.detected||cfg.source,target=owner?.targetLang||cfg.target;
    bubble.hidden=false;bubble.replaceChildren();
    if(!token.meaning||!token.reading){const local=LiltLexicon.lookup(token.text,source==='auto'?'en':source,target,true);const exact=local?.candidates.find(c=>c.text===token.text);if(exact){token.meaning||=exact.meaning;token.reading||=exact.reading;}}
    const title=el('div','title',token.text);title.append(button('speaker','Hear '+token.text,()=>speak(token.text,target)));bubble.append(title,el('div','reading',token.reading||'Reading unavailable in this dictionary'),el('div','definition',token.meaning||'No local definition for this word.'));
    if(details&&token.characters?.length){const chars=el('div','characters');for(const c of token.characters)chars.append(el('div','',`${c.character} · ${c.reading}\n${c.components}`));bubble.append(chars);}
    if(details&&token.characters?.length){bubble.append(el('div','credit','Sentence-model explanation · check unfamiliar character details'));}
    const r=anchor.getBoundingClientRect(),bw=bubble.offsetWidth,bh=bubble.offsetHeight;bubble.style.left=`${Math.max(10,Math.min(r.left,innerWidth-bw-10))}px`;bubble.style.top=`${Math.max(10,r.top-bh-10>=10?r.top-bh-10:Math.min(innerHeight-bh-10,r.bottom+10))}px`;
  }
  function speak(text,target=cfg.target){if(!text)return;const voices=speechSynthesis.getVoices();const voice=voices.find(v=>v.localService&&v.lang.toLowerCase().startsWith(target));if(!voice){live.textContent='No local voice is installed for this language.';bubble.hidden=false;bubble.replaceChildren(el('div','definition','No local voice is installed for this language. Add the language’s speech voice in your system settings.'));bubble.style.left=bar.style.left||'16px';bubble.style.top=`${Math.max(12,(parseFloat(bar.style.top)||innerHeight-110)-90)}px`;return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.voice=voice;u.lang=C.languages[target].voice;u.rate=.85;speechSynthesis.speak(u);}
  function resetActive(){if(active)cancel(state(active));view=null;mode='idle';bubble.hidden=true;}
  async function change(patch){resetActive();let result;try{result=await browser.runtime.sendMessage({type:'saveConfig',patch});if(!result?.settings)throw Error('Language change was not saved. Reload this webpage and try again.');}catch(e){showError(e.message);return;}cfg=C.config(result.settings);loadDictionaries().catch(()=>{});if(!cfg.enabled){bar.hidden=true;pill.hidden=true;reserve.style.height='0px';}else{show('idle',null);}renderControls();}
  function activate(field){loadDictionaries().catch(()=>{});if(active!==field){if(active)cancel(state(active));active=field;sync(state(field));view=null;mode='idle';closedByUser=false;bar.hidden=true;bubble.hidden=true;}pill.hidden=!cfg.enabled||!bar.hidden;position();}
  document.addEventListener('focusin',e=>{const field=E.eligible(e.composedPath()[0]);if(field){closedByUser=false;activate(field);}else if(!e.composedPath().includes(host)){if(active)cancel(state(active));active=null;bar.hidden=true;pill.hidden=true;bubble.hidden=true;reserve.style.height='0px';}},true);
  document.addEventListener('pointerdown',e=>{if(e.composedPath().includes(host))return;const field=E.eligible(e.composedPath()[0]);if(!field){dismiss(true);pill.hidden=true;}},true);
  document.addEventListener('compositionstart',e=>{if(E.eligible(e.target)===active){composing=true;cancel(state(active));showTyping();}},true);
  document.addEventListener('compositionend',e=>{if(E.eligible(e.target)===active){composing=false;onInput(e);}},true);
  function onInput(e){if(mutation||composing||!cfg.enabled)return;const field=E.eligible(e.target);if(!field)return;activate(field);const s=state(field);cancel(s);const r=sync(s);s.lastTyped=Date.now();s.lastCaret=r.start;view=null;bubble.hidden=true;
    if(cfg.source===cfg.target&&!cfg.practice){dismiss(false);return;}
    if(r.start!==r.end)return;
    showTyping();
    const keep=s.keepOriginal===r.text;delete s.keepOriginal;
    const done=C.completedWord(r.text,r.start);if(done&&!keep)word(s,done);
    else {const range=C.currentWord(r.text,r.start);if(range)word(s,range,true);}
    schedule(s);
  }
  document.addEventListener('input',onInput,true);
  document.addEventListener('keydown',e=>{
    if(!cfg.enabled||!active||E.eligible(e.target)!==active||composing||e.isComposing||e.keyCode===229)return;
    const s=state(active);sync(s);
    // Enter belongs to the website, including while a model is still working.
    if(e.key==='Enter'){cancel(s);showTyping();return;}
    if(e.key==='Escape'){cancel(s);dismiss(false,true);return;}
    if(e.ctrlKey||e.metaKey||e.altKey){cancel(s);showTyping();return;}
    if(e.key==='Tab'&&mode==='word'&&view){e.preventDefault();e.stopImmediatePropagation();const i=(view.index+(e.shiftKey?-1:1)+view.data.candidates.length)%view.data.candidates.length;if(view.partial)previewCandidate(i);else{selectCandidate(i);previewCandidate(i);}return;}
    if(e.key===' '&&mode==='sentence'){acceptSentence(false);return;}
    if(e.key===' '&&mode==='word'&&view?.partial){const x=view;if(x.abstain){const r=E.read(s.field);s.keepOriginal=r.text.slice(0,r.start)+' '+r.text.slice(r.end);}selectCandidate(x.index,!!x.selected);return;}
    if(mode==='busy'){cancel(s);showTyping();}
    if(!['Shift','Control','Alt','Meta'].includes(e.key)){bubble.hidden=true;if(mode==='word'||mode==='review'||mode==='sentence')showTyping();cancel(s);}
  },true);
  document.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))reviewCaret();},true);
  document.addEventListener('click',e=>{if(E.eligible(e.target)===active)reviewCaret();},true);
  document.addEventListener('selectionchange',()=>{clearTimeout(selectionTimer);selectionTimer=setTimeout(reviewCaret,90);});
  function reviewCaret(){if(!active||!cfg.enabled||mutation||composing)return;const s=state(active),r=sync(s);if(r.start===s.lastCaret)return;s.lastCaret=r.start;cancel(s);if(mode==='sentence')showTyping();const record=s.records.find(x=>r.start>=x.start&&r.start<=x.end&&r.text.slice(x.start,x.end)===x.target);if(record)show('review',{s,data:record.data,source:record.source,sourceLang:record.sourceLang,targetLang:record.targetLang,start:record.start,end:record.end});else if(mode==='review')showTyping();}
  addEventListener('resize',position);addEventListener('scroll',()=>{bubble.hidden=true;position();},true);
  addEventListener('blur',()=>{if(active)cancel(state(active));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)cancel(state(active));});
  function neededLanguages(){return [...new Set(cfg.source==='auto'?['es','fr','ja','zh']:[cfg.source,cfg.target])].filter(l=>l!=='en');}
  function refreshLoadedWords(){
    if(!active||closedByUser||composing||menuOpen||!cfg.enabled||!['idle','typing','word'].includes(mode)||view?.selected)return;
    const s=state(active),r=E.read(active);
    if(r.text!==s.text||!valid(s,s.version,r.text,r.start)||r.start!==r.end)return;
    // Refresh suggestions only. Loading a pack must never commit text or replace a sentence.
    const range=C.currentWord(r.text,r.start);if(range)word(s,range,true);
    if(['idle','typing'].includes(mode)){renderBody();position();}
  }
  async function loadDictionaries(){
    if(typeof PassportDictionary==='undefined')return;
    await Promise.all(neededLanguages().map(l=>{
      if(PassportDictionary.has(l))return;
      if(packErrors.has(l))return;
      if(!loadingPacks.has(l))loadingPacks.set(l,browser.runtime.sendMessage({type:'dictionary',language:l}).then(result=>{
        if(!result?.ok||!Array.isArray(result.rows))throw Error('Dictionary unavailable');
        return PassportDictionary.installAsync(l,result.rows);
      }).catch(()=>{packErrors.set(l,true);}).finally(()=>{
        loadingPacks.delete(l);refreshLoadedWords();
      }));
      return loadingPacks.get(l);
    }));
  }
  async function load(){const result=await browser.runtime.sendMessage({type:'config'});cfg=C.config(result.settings);hasKey=result.hasKey;if(typeof PassportAppearance!=='undefined')PassportAppearance.apply(host,cfg,result.theme);renderControls();if(active)loadDictionaries().catch(()=>{});const focused=E.eligible(document.activeElement);if(focused)activate(focused);}
  browser.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.settings||changes.apiKey){const wasOpen=!bar.hidden,usingControls=document.activeElement===host;if(active)cancel(state(active));load().then(()=>{if(!cfg.enabled){bar.hidden=true;pill.hidden=true;bubble.hidden=true;reserve.style.height='0px';}else if(wasOpen&&active&&(usingControls||E.eligible(document.activeElement)===active)){if(usingControls){bar.hidden=false;renderBody();position();}else showTyping();}else dismiss(false);}).catch(()=>{});}});
  browser.runtime.onMessage?.addListener(message=>{if(message?.type==='passportThemeChanged')load().catch(()=>{});});
  load().catch(()=>{});
})();
