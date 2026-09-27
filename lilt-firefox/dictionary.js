/* Offline, bounded prefix/fuzzy search. No network or model calls. */
(function(root){
  'use strict';
  const packs=new Map(), K=s=>s.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[\s1-5'’\-]/g,'').replace(/u:/g,'v');
  // A spelling match is not a translation-confidence score. Raw dictionary
  // senses are suggestions only; automatic insertion is opt-in in the curated layer.
  function surface(text,language){
    if(typeof text!=='string'||!text.trim()||text.length>80||text.trim().split(/\s+/).length>6)return false;
    if(!/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s'’・ー-]*[\p{L}\p{M}\p{N}ー]$|^[\p{L}\p{M}]$/u.test(text.trim()))return false;
    if(/\b(?:comp|compar|sb|sth|someone|something)\b/i.test(text)&&language!=='en')return false;
    if(language==='ja'&&!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text))return false;
    if(language==='zh'&&!/\p{Script=Han}/u.test(text))return false;
    return true;
  }
  function usable(row,lang){return surface(row[0],'en')&&surface(row[1],lang)&&!/(?:\b(?:archaic|obsolete|nonstandard|misspelling|suffix|prefix|historical)\b|\bvariant of\b)/i.test(row[3]||'');}
  function quality(row,target){
    let score=(row[5]||0)*10;
    if(/\b(?:rare|dialectal|chiefly|surname|abbreviation|initialism|letter|baseball|first base)\b/i.test(row[3]||''))score-=40;
    // Katakana is legitimate everyday Japanese (e.g. computer, coffee). Only
    // reviewed pair preferences demote particular borrowed senses, not the script.
    return score;
  }
  function add(map,key,row){if(!key)return;let a=map.get(key);if(!a)map.set(key,a=[]);if(a.length<24)a.push(row);}
  function install(lang,rows){
    if(packs.has(lang))return;
    const en=new Map(),native=new Map(),phonetic=new Map();
    for(const row of rows){if(!usable(row,lang))continue;add(en,K(row[0]),row);add(native,K(row[1]),row);if(row[2])add(phonetic,K(row[2]),row);}
    packs.set(lang,{en,native,phonetic,keys:{en:[...en.keys()].sort(),native:[...native.keys()].sort(),phonetic:[...phonetic.keys()].sort()}});
  }
  const pending=new Map();
  function installAsync(lang,rows){
    if(packs.has(lang))return Promise.resolve();if(pending.has(lang))return pending.get(lang);
    const run=(async()=>{
      const pack={en:new Map(),native:new Map(),phonetic:new Map(),keys:{}};
      // Yield during one-time indexing so an initial dictionary load does not freeze the editor.
      for(let offset=0;offset<rows.length;offset+=800){for(const row of rows.slice(offset,offset+800)){if(!usable(row,lang))continue;add(pack.en,K(row[0]),row);add(pack.native,K(row[1]),row);if(row[2])add(pack.phonetic,K(row[2]),row);}await new Promise(resolve=>setTimeout(resolve,0));}
      for(const index of ['en','native','phonetic']){pack.keys[index]=[...pack[index].keys()].sort();await new Promise(resolve=>setTimeout(resolve,0));}
      packs.set(lang,pack);
    })().finally(()=>pending.delete(lang));pending.set(lang,run);return run;
  }
  function distance(a,b){
    if(Math.abs(a.length-b.length)>2)return 3;
    let prev=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]!==b[j-1]));if(Math.min(...next)>2)return 3;prev=next;}
    return prev[b.length];
  }
  function find(pack,index,q,partial){
    const map=pack[index],keys=pack.keys[index],result=[],seen=new Set();
    function push(key,rank){if(seen.has(key))return;seen.add(key);for(const row of map.get(key)||[])result.push({row,rank,key});}
    push(q,0);
    if(partial&&q.length>=2){let lo=0,hi=keys.length;while(lo<hi){const mid=(lo+hi)>>1;if(keys[mid]<q)lo=mid+1;else hi=mid;}for(let i=lo;i<Math.min(lo+60,keys.length)&&keys[i].startsWith(q);i++)push(keys[i],2+(keys[i].length-q.length)/100);}
    if(!map.has(q)&&q.length>=3&&q.length<=35){
      const alphabet='abcdefghijklmnopqrstuvwxyz';
      for(let i=0;i<=q.length;i++){
        push(q.slice(0,i)+q.slice(i+1),1);
        if(i+1<q.length)push(q.slice(0,i)+q[i+1]+q[i]+q.slice(i+2),1);
        for(const ch of alphabet){push(q.slice(0,i)+ch+q.slice(i+1),1);push(q.slice(0,i)+ch+q.slice(i),1);}
      }
      // Bounded two-edit fallback supports approximate Latin spelling without scanning the dictionary.
      if(!result.length){const prefix=q.slice(0,2);let lo=0,hi=keys.length;while(lo<hi){const m=(lo+hi)>>1;if(keys[m]<prefix)lo=m+1;else hi=m;}for(let i=lo;i<Math.min(lo+250,keys.length)&&keys[i].startsWith(prefix);i++){const d=distance(q,keys[i]);if(d<=2)push(keys[i],d);}}
    }
    return result.sort((a,b)=>a.rank-b.rank||(b.row[5]||0)-(a.row[5]||0)).slice(0,70);
  }
  function englishHits(pack,q,partial){
    // Only a missing exact English word may use this bounded regular -ing
    // fallback. Keep nouns such as building, ring and thing intact; phonetic
    // practice still uses its own approximate target-language search.
    if(!pack.en.has(q)&&/^[a-z]{4,}ing$/.test(q)){
      const stem=q.slice(0,-3),rows=pack.en.get(stem);
      if(rows?.length)return rows.map(row=>({row,rank:.25,key:stem}));
    }
    return find(pack,'en',q,partial);
  }
  function lookup(text,source,target,practice=false,partial=false,limit=5){
    limit=limit===10?10:5;
    const q=K(text);if(!q||q.length>80)return null;
    if(source==='auto'){
      // Avoid silently guessing shared Latin words. Sentence reconstruction handles ambiguous detection.
      if(practice)source='en';else {const languages=[];for(const l of ['en','es','fr','ja','zh']){if(l==='en'?[...packs.values()].some(p=>p.en.has(q)):packs.get(l)?.native.has(q))languages.push(l);}if(languages.length!==1)return null;source=languages[0];}
    }
    const hits=[];
    if(practice){const p=packs.get(target);if(p){const idx=['ja','zh'].includes(target)?'phonetic':'native';hits.push(...find(p,idx,q,partial));if(idx==='phonetic')hits.push(...find(p,'native',q,partial));}else if(target==='en')for(const p of packs.values())hits.push(...find(p,'en',q,partial));}
    else if(source==='en'){const p=packs.get(target);if(p)hits.push(...englishHits(p,q,partial));}
    else {const p=packs.get(source);if(p)hits.push(...find(p,'native',q,partial));}
    hits.sort((a,b)=>a.rank-b.rank||quality(b.row,practice?'':target)-quality(a.row,practice?'':target)||a.row[1].localeCompare(b.row[1]));
    const candidates=[],seen=new Set();let exact=false;
    for(const hit of hits){const row=hit.row;
      let outputs;
      if(target==='en')outputs=[[row[0],row[4]||'']];
      else if(practice||source==='en')outputs=[[row[1],row[2]||'']];
      else outputs=(packs.get(target)?.en.get(K(row[0]))||[]).slice(0,limit).map(r=>[r[1],r[2]]);
      for(const [word,reading]of outputs){if(!surface(word,target)||seen.has(word))continue;seen.add(word);
        let meaning=source==='en'?row[0]+(row[3]?' · '+row[3]:''):practice?(source===target?word:packs.get(source)?.en.get(K(row[0]))?.[0]?.[1]||row[0]+' (English)'):row[1];
        candidates.push({text:word,reading,meaning,characters:[],dictionary:true,pivot:source!=='en'&&target!=='en',exact:hit.rank===0});if(hit.rank===0)exact=true;
        if(candidates.length===limit)break;
      }if(candidates.length===limit)break;
    }
    return candidates.length?{candidates,uncertain:!exact||candidates.length>1,exact,autoCommit:false,corrected:'',detectedSource:source}:null;
  }
  root.PassportDictionary={install,installAsync,lookup,has:lang=>packs.has(lang),key:K,distance,surface};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.PassportDictionary;
})(globalThis);
