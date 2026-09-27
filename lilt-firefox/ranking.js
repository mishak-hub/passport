/* Offline Jev decisions. No credentials or network access in the typing path. */
(function(root){
  'use strict';
  let records=new Map();
  const key=(source,target,word)=>JSON.stringify([source,target,word.normalize('NFC').toLowerCase().trim()]);
  const fingerprint=candidates=>JSON.stringify(candidates.map(c=>[c.text,c.meaning||'',c.reading||'']).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  function validate(job,answer){
    const ids=job.candidates.map((_,i)=>'candidate_'+i).concat('none');
    if(!answer||answer.type!=='choice'||!ids.includes(answer.choice)||!Number.isFinite(answer.confidence)||answer.confidence<0||answer.confidence>1)throw Error('Invalid Jev choice');
    const p=answer.probabilities;
    if(!p||Object.keys(p).length!==ids.length||ids.some(id=>!Number.isFinite(p[id])||p[id]<0||p[id]>1)||Math.abs(ids.reduce((n,id)=>n+p[id],0)-1)>0.02)throw Error('Invalid Jev probabilities');
    return answer;
  }
  function install(rows){
    records=new Map();
    for(const r of rows||[]){
      if(r.approved!==true||!['en','es','fr','ja','zh'].includes(r.source)||!['en','es','fr','ja','zh'].includes(r.target)||typeof r.word!=='string'||!Array.isArray(r.candidates)||r.candidates.some(c=>!c||typeof c.text!=='string'))continue;
      try{validate(r,r.answer);}catch{continue;}
      if(r.answer.confidence<0.8||r.answer.choice==='none')continue;
      records.set(key(r.source,r.target,r.word),r);
    }
  }
  function apply(word,source,target,result,practice){
    if(practice||!result)return result;
    const r=records.get(key(source,target,word));
    if(!r)return result;
    // Prefix lookup can append completions to an exact-word shortlist. Review
    // still applies only if every original candidate and sense is unchanged.
    const reviewedTexts=new Set(r.candidates.map(c=>c.text));
    const current=result.candidates.filter(c=>reviewedTexts.has(c.text));
    if(fingerprint(r.candidates)!==fingerprint(current))return result;
    const weights=new Map(r.candidates.map((c,i)=>[c.text,r.answer.probabilities['candidate_'+i]]));
    const chosen=r.candidates[Number(r.answer.choice.slice(10))]?.text;
    const candidates=result.candidates.slice().sort((a,b)=>(b.text===chosen)-(a.text===chosen)||(weights.get(b.text)??-1)-(weights.get(a.text)??-1));
    return {...result,candidates,rankingSource:'jev-reviewed'};
  }
  root.PassportRanking={key,fingerprint,validate,install,apply};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PassportRanking;
})(globalThis);
