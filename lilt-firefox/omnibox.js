/* global browser,LiltCore,LiltLexicon,PassportDictionary,settings,generate,loadPack */
'use strict';
if(browser.omnibox){
  let revision=0,timer,rankTimer,lastInput='',lastQuery='',currentRequest=null,rankRequest=null,sentenceReadyRevision=-1;
  const sender={tab:{id:-1},frameId:0};
  function stop(){revision++;clearTimeout(timer);clearTimeout(rankTimer);if(currentRequest)inFlight.get(`-1:0:${currentRequest}`)?.abort();if(rankRequest&&typeof liveRanker!=='undefined')liveRanker?.cancel(rankRequest);currentRequest=null;rankRequest=null;}
  async function ready(cfg){const langs=cfg.source==='auto'?['es','fr','ja','zh']:[cfg.source,cfg.target];await Promise.all([...new Set(langs)].filter(l=>l!=='en').map(async l=>{if(!PassportDictionary.has(l))await PassportDictionary.installAsync(l,await loadPack(l));}));}
  function direct(text,cfg){if(!cfg.enabled||cfg.source===cfg.target&&!cfg.practice)return text;return text.replace(/\S+/gu,chunk=>{const range=LiltCore.completedWord(chunk+' ',chunk.length+1);if(!range)return chunk;const found=LiltLexicon.lookup(range.text,cfg.source,cfg.target,cfg.practice);return found?.autoCommit?chunk.slice(0,range.start)+found.candidates[0].text+chunk.slice(range.end):chunk;});}
  browser.omnibox.setDefaultSuggestion({description:'Passport · translate and search'});
  browser.omnibox.onInputChanged.addListener(async(text,suggest)=>{
    stop();const rev=revision;lastInput=text;lastQuery=text;
    const cfg=await settings();if(rev!==revision)return;
    lastQuery=direct(text,cfg);browser.omnibox.setDefaultSuggestion({description:`Search: ${lastQuery||text}`});
    try{if(cfg.enabled)await ready(cfg);}catch{/* Starter vocabulary remains available. */}
    if(rev!==revision)return;
    const query=direct(text,cfg);lastQuery=query;
    browser.omnibox.setDefaultSuggestion({description:`Search: ${query||text}`});
    const tail=text.match(/[\p{L}\p{M}'’\-]+$/u),choices=[];
    if(cfg.enabled&&tail){const found=LiltLexicon.lookup(tail[0],cfg.source,cfg.target,cfg.practice,true);for(const candidate of found?.candidates||[]){const prefix=direct(text.slice(0,-tail[0].length),cfg),content=prefix+candidate.text;if(content!==query)choices.push({content,description:`${content} — ${candidate.meaning}`});}}
    const unique=[...new Map(choices.map(c=>[c.content,c])).values()].slice(0,5);suggest(unique);
    if(cfg.enabled&&cfg.liveJev&&tail&&typeof liveRanker!=='undefined'&&liveRanker){
      const found=LiltLexicon.pool(tail[0],cfg.source,cfg.target,cfg.practice,true);
      if(found)rankTimer=setTimeout(async()=>{
        if(rev!==revision)return;rankRequest=`omnibox-rank-${rev}`;
        try{const result=await liveRanker.rank({word:tail[0],source:found.detectedSource||cfg.source,target:cfg.target,practice:cfg.practice,context:text,candidates:found.candidates},rankRequest);
          if(rev!==revision||sentenceReadyRevision===rev||!result)return;if(result.abstain){suggest([]);lastQuery=text;browser.omnibox.setDefaultSuggestion({description:`Search: ${text}`});return;}const prefix=direct(text.slice(0,-tail[0].length),cfg);
          suggest(result.order.slice(0,5).map(i=>({content:prefix+found.candidates[i].text,description:`${prefix+found.candidates[i].text} — ${found.candidates[i].meaning}`})));
        }catch{/* Keep immediate local suggestions. */}
      },220);
    }
    if(!cfg.enabled||!text.trim())return;
    timer=setTimeout(async()=>{
      if(rev!==revision)return;const id=`omnibox-${rev}`;currentRequest=id;
      try{const data=await generate('sentence',{text,visible:query,source:cfg.source,target:cfg.target,practice:cfg.practice},sender,id);if(rev!==revision||!data.complete)return;sentenceReadyRevision=rev;lastQuery=data.translation;browser.omnibox.setDefaultSuggestion({description:`Search: ${data.translation}`});suggest([{content:data.translation,description:`${data.translation} — ${data.meaning}`}]);}catch{/* Immediate dictionary translation is still searchable. */}
    },LiltCore.sentenceEnd(text,text.length-1)?0:500);
  });
  browser.omnibox.onInputCancelled.addListener(stop);
  browser.omnibox.onInputEntered.addListener(async(text,disposition)=>{
    const visibleQuery=text===lastInput?lastQuery:text;stop();
    const cfg=await settings(),query=cfg.enabled?visibleQuery:text;
    if(disposition==='newBackgroundTab'){const tab=await browser.tabs.create({active:false});await browser.search.search({query,tabId:tab.id});}
    else await browser.search.search({query,disposition:disposition==='currentTab'?'CURRENT_TAB':'NEW_TAB'});
  });
  browser.storage.onChanged.addListener(changes=>{if(changes.settings||changes.apiKey||changes.jevKey){stop();lastQuery=lastInput;}});
}
