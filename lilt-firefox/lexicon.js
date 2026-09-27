(function(root){
  'use strict';
  // Curated common words take precedence over the larger licensed offline packs.
  const entries = [
    [['hello','hello'],['hola','OH-lah'],['bonjour','bohn-ZHOOR'],['こんにちは','konnichiwa'],['你好','nǐ hǎo']],
    [['thanks','thanks'],['gracias','GRAH-syahs'],['merci','mehr-SEE'],['ありがとう','arigatō'],['谢谢','xièxie']],
    [['train','train'],['tren','tren'],['train','trɛ̃ · nasal tran'],['電車','densha'],['火车','huǒchē']],
    [['station','STAY-shun'],['estación','eh-stah-SYON'],['gare','gahr'],['駅','eki'],['车站','chēzhàn']],
    [['water','WAW-ter'],['agua','AH-gwah'],['eau','oh'],['水','mizu'],['水','shuǐ']],
    [['coffee','KAW-fee'],['café','kah-FEH'],['café','kah-FEH'],['コーヒー','kōhī'],['咖啡','kāfēi']],
    [['cat','kat'],['gato','GAH-toh'],['chat','shah'],['猫','neko'],['猫','māo']],
    [['dog','dog'],['perro','PEH-rroh'],['chien','shyɛ̃ · nasal shyan'],['犬','inu'],['狗','gǒu']],
    [['friend','frend'],['amigo','ah-MEE-goh'],['ami','ah-MEE'],['友達','tomodachi'],['朋友','péngyou']],
    [['book','book'],['libro','LEE-broh'],['livre','leevr'],['本','hon'],['书','shū']],
    [['music','MYOO-zik'],['música','MOO-see-kah'],['musique','mew-ZEEK'],['音楽','ongaku'],['音乐','yīnyuè']],
    [['yes','yes'],['sí','see'],['oui','wee'],['はい','hai'],['是','shì']],
    [['no','noh'],['no','noh'],['non','nɔ̃ · nasal no'],['いいえ','iie'],['不','bù']],
    [['goodbye','good-BYE'],['adiós','ah-DYOS'],['au revoir','oh ruh-VWAHR'],['さようなら','sayōnara'],['再见','zàijiàn']],
    [['today','tuh-DAY'],['hoy','oy'],["aujourd’hui",'oh-zhoor-DWEE'],['今日','kyō'],['今天','jīntiān']]
  ];
  const codes=['en','es','fr','ja','zh'];
  const aliases={en:{hellow:'hello',helo:'hello',thnaks:'thanks'},es:{ola:'hola',grasias:'gracias'},fr:{bonjoor:'bonjour',bonjur:'bonjour',mersee:'merci'},ja:{konnichiwa:'こんにちは',arigato:'ありがとう',arigatou:'ありがとう',eki:'駅',densha:'電車',mizu:'水',neko:'猫',inu:'犬',tomodachi:'友達',hon:'本',ongaku:'音楽',hai:'はい',iie:'いいえ',sayonara:'さようなら',kyou:'今日'},zh:{nihao:'你好',xiexie:'谢谢',huoche:'火车',chezhan:'车站',shui:'水',kafei:'咖啡',mao:'猫',gou:'狗',pengyou:'朋友',shu:'书',yinyue:'音乐',shi:'是',bu:'不',zaijian:'再见',jintian:'今天'}};
  function key(s){return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'').replace(/[\s1-5]/g,'');}
  // Reviewed everyday senses. These context-dependent words offer choices but
  // deliberately wait for a choice or sentence reconstruction before insertion.
  const reviewed={
    es:{the:[['el','el','the · masculine singular'],['la','la','the · feminine singular'],['los','los','the · masculine plural'],['las','las','the · feminine plural']],a:[['un','un','a/an · masculine'],['una','OO-nah','a/an · feminine']],an:[['un','un','a/an · masculine'],['una','OO-nah','a/an · feminine']]},
    ja:{best:[['最高','saikō','best; highest quality'],['一番','ichiban','best; number one'],['最良','sairyō','best; most suitable'],['ベスト','besuto','best; optimal; English-derived loanword']],first:[['最初','saisho','first; the beginning'],['第一','daiichi','first; number one'],['一番目','ichibanme','first in order'],['ファースト','fāsuto','first; loanword used in compounds and sports']],computer:[['コンピューター','konpyūtā','computer'],['コンピュータ','konpyūta','computer']]}
  };
  function lookup(text,source,target,practice,partial=false,limit=5){
    const ordinary=source==='en'&&!practice?reviewed[target]?.[key(text)]:null;
    const packed=root.PassportDictionary?.lookup(text,source,target,practice,partial,limit);
    if(ordinary){
      const candidates=ordinary.map(([text,reading,meaning])=>({text,reading,meaning,characters:[],dictionary:true}));
      // Reviewed defaults are a fast fallback, not an exclusion list. Japanese
      // borrowed forms and other dictionary alternatives remain eligible for Jev.
      if(target==='ja')for(const c of packed?.candidates||[])if(!candidates.some(x=>x.text===c.text))candidates.push(c);
      return {candidates:candidates.slice(0,limit),exact:true,autoCommit:false,uncertain:true,corrected:'',detectedSource:source};
    }
    if(source==='auto' || !codes.includes(source) || !codes.includes(target)) return packed||null;
    const index=codes.indexOf(practice?target:source), ti=codes.indexOf(target), si=codes.indexOf(source);
    const normalized=key(text), alias=aliases[practice?target:source]?.[normalized];
    const entry=entries.find(e=>key(e[index][0])===normalized || (alias&&e[index][0]===alias));
    if(!entry){
      if(packed)return packed;
      if(!partial||normalized.length<2)return null;
      const matches=entries.filter(e=>key(e[index][0]).startsWith(normalized)||(practice&&key(e[index][1]).startsWith(normalized)));
      return matches.length?{candidates:matches.slice(0,limit).map(e=>({text:e[ti][0],reading:e[ti][1],meaning:e[si][0],characters:[],dictionary:true})),uncertain:true,exact:false,autoCommit:false,detectedSource:source}:null;
    }
    const first={text:entry[ti][0],reading:entry[ti][1],meaning:entry[si][0],characters:[],dictionary:true};
    const ambiguousPractice=practice&&(packed?.candidates||[]).some(c=>c.exact&&c.text!==first.text);
    return {candidates:[first,...(packed?.candidates||[]).filter(c=>c.text!==first.text)].slice(0,limit),exact:true,autoCommit:!ambiguousPractice,uncertain:!!alias||ambiguousPractice,corrected:alias||'',detectedSource:source};
  }
  function ranked(text,source,target,practice,partial=false,limit=5){
    const result=lookup(text,source,target,practice,partial,limit);
    return root.PassportRanking?.apply(text,result?.detectedSource||source,target,result,practice)||result;
  }
  function phrase(text,source,target,context=''){
    const title={en:'One Piece',es:'One Piece',fr:'One Piece',ja:'ワンピース',zh:'海贼王'};
    const label={en:'One Piece · manga/anime title',es:'One Piece · título de manga/anime',fr:'One Piece · titre de manga/anime',ja:'作品名「ワンピース」',zh:'漫画／动画作品《海贼王》'};
    if(title[source]&&text.trim().toLocaleLowerCase()===title[source].toLocaleLowerCase()&&title[target]){
      const named={text:title[target],reading:target==='ja'?'wan pīsu':target==='zh'?'hǎi zéi wáng':'',meaning:label[source],characters:[],exact:true,dictionary:true};
      const candidates=[named];
      if(source==='en'&&target==='ja'){
        const literal={text:'一切れ',reading:'hitokire',meaning:'one piece; one slice',characters:[],exact:true,dictionary:true};
        if(/\b(?:eat|want|give|cake|bread|slice)\b/i.test(context))candidates.unshift(literal);else candidates.push(literal);
      }
      return {candidates,exact:true,uncertain:candidates.length>1,detectedSource:source,phrase:true};
    }
    if(text.trim().split(/\s+/u).length<2)return null;
    const result=ranked(text,source,target,false,false,10);
    const candidates=result?.candidates.filter(c=>c.exact)||[];
    return candidates.length?{...result,candidates,phrase:true}:null;
  }
  root.LiltLexicon={lookup:ranked,phrase,pool:(text,source,target,practice,partial=false)=>ranked(text,source,target,practice,partial,10)};
  if(typeof module!=='undefined'&&module.exports) module.exports=root.LiltLexicon;
})(globalThis);
