(function(root){
 'use strict';
 // Register once per document; registration also animates properties inside our shadow root.
 for(const property of [
  {name:'--passport-angle',syntax:'<angle>',inherits:false,initialValue:'0deg'},
  {name:'--passport-arc',syntax:'<percentage>',inherits:false,initialValue:'5%'},
  {name:'--passport-offset',syntax:'<angle>',inherits:false,initialValue:'0deg'}
 ]){try{root.CSS?.registerProperty?.(property);}catch{ /* Another frame script may already have registered it. */ }}
 const css=`
 .passport-control,.candidate{
  --passport-angle:0deg;--passport-arc:5%;--passport-offset:0deg;
  position:relative;isolation:isolate;overflow:hidden;color:var(--button-ink)!important;
  border:1px solid transparent!important;
  background:linear-gradient(var(--button-fill),var(--button-fill)) padding-box,
   conic-gradient(from calc(var(--passport-angle) - var(--passport-offset)),transparent,var(--accent) var(--passport-arc),var(--accent-soft) calc(var(--passport-arc)*2),var(--accent) calc(var(--passport-arc)*3),transparent calc(var(--passport-arc)*4)) border-box!important;
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--button-ink) 10%,transparent);
  animation:passport-edge 3s linear infinite;
  transition:--passport-arc .8s cubic-bezier(.25,1,.5,1),--passport-offset .8s cubic-bezier(.25,1,.5,1),box-shadow .3s;
 }
 .passport-control::before,.candidate::before{content:'';position:absolute;inset:3px;pointer-events:none;border-radius:inherit;background:radial-gradient(circle at 2px 2px,var(--button-ink) .5px,transparent .6px);background-size:4px 4px;mask-image:conic-gradient(from calc(var(--passport-angle) + 45deg),black,transparent 10% 90%,black);opacity:.24;z-index:-1}
 .passport-control::after,.candidate::after{content:'';position:absolute;left:50%;top:50%;width:140%;aspect-ratio:1;translate:-50% -50%;pointer-events:none;z-index:-1;background:linear-gradient(-50deg,transparent 35%,var(--accent) 50%,transparent 65%);mask-image:radial-gradient(circle at bottom,transparent 40%,black);opacity:.35;animation:passport-shimmer 3s linear infinite}
 .passport-control:is(:hover,:focus-visible),.candidate:is(:hover,:focus-visible){--passport-arc:20%;--passport-offset:95deg;box-shadow:inset 0 -7px 16px -9px var(--accent),inset 0 0 0 1px color-mix(in srgb,var(--accent-soft) 45%,transparent),0 0 12px color-mix(in srgb,var(--accent) 18%,transparent)}
 .candidate.selected{--passport-arc:18%;box-shadow:inset 0 -8px 18px -9px var(--accent),inset 0 0 0 1px color-mix(in srgb,var(--accent-soft) 60%,transparent),0 0 12px color-mix(in srgb,var(--accent) 22%,transparent)}
 .candidate small{color:var(--button-ink);opacity:.75}.passport-control[aria-pressed=true]{box-shadow:inset 0 -2px var(--accent)}
 .passport-control:active,.candidate:active{transform:translateY(1px)}
 @keyframes passport-edge{to{--passport-angle:360deg}}
 @keyframes passport-shimmer{to{rotate:360deg}}
 @media(prefers-reduced-motion:reduce){.passport-control,.candidate{animation:none!important;transition:none!important;transform:none!important}.passport-control::before,.candidate::before,.passport-control::after,.candidate::after{animation:none!important}.passport-control::after,.candidate::after{opacity:.12}}
 @media(forced-colors:active){.passport-control,.candidate{background:ButtonFace!important;color:ButtonText!important;border-color:ButtonText!important;animation:none!important}.candidate.selected{outline:2px solid Highlight}.passport-control::before,.candidate::before,.passport-control::after,.candidate::after{display:none}}
 `;
 function apply(host,cfg,theme={}){
  const valid=c=>typeof c==='string'&&root.CSS?.supports('color',c);
  const set=(name,value)=>{if(valid(value))host.style.setProperty(name,value);else host.style.removeProperty(name);};
  set('--bg',theme.background);set('--ink',theme.color);set('--surround',theme.border||theme.accent);
  set('--accent',cfg.accentColor||theme.accent);set('--accent-soft',cfg.accentSoftColor||theme.accent);
  host.dataset.appearance=cfg.appearance||'auto';
  host.style.setProperty('--button-fill',cfg.appearance==='light'?'#faf9fd':cfg.appearance==='dark'?'#201f24':'var(--system-fill)');
  host.style.setProperty('--button-ink',cfg.appearance==='light'?'#22202b':cfg.appearance==='dark'?'#f1edf8':'var(--system-ink)');
 }
 root.PassportAppearance={css,apply};
})(globalThis);
