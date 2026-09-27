/* First-run setup reuses the actual Settings controls and companion. */
(() => {
 'use strict';
 const by=id=>document.getElementById(id),names=['Your languages','Your connections','Your colors','Try Passport'];
 let current=0,setup=false,progress={step:0,completed:false},saving=false;
 const panels=[['language-card'],['sentence-card','jev-card'],['appearance-card'],['tutorial-card']];
 function render(){
  document.body.classList.toggle('setup',setup);by('setup-nav').hidden=!setup;by('setup-heading').hidden=!setup;
  by('setup-replay').textContent=progress.completed?'Replay setup & tutorial':'Continue setup';
  for(const card of document.querySelectorAll('main > .card'))card.hidden=setup&&!panels[current].includes(card.id);
  by('setup-title').textContent=names[current];by('setup-progress').textContent=`Step ${current+1} of 4`;
  by('setup-back').disabled=current===0||saving;by('setup-next').disabled=saving;by('setup-later').disabled=saving;
  by('setup-next').textContent=current===3?'Finish setup':'Save & continue';
  by('save').hidden=setup;by('setup-status').textContent=progress.completed?'Setup complete. You can change anything here.':'Keys are optional. You can finish with local word suggestions.';
 }
 async function persist(extra={}){const r=await browser.runtime.sendMessage({type:'onboardingSave',step:current,...extra});if(!r?.ok)throw Error(r?.error||'Setup progress could not be saved.');progress=r.onboarding;}
 async function advance(){if(saving)return;saving=true;render();try{await window.PassportSettings.save();if(current===3){await persist({completed:true});setup=false;history.replaceState(null,'',location.pathname);render();}else{current++;await persist();render();window.scrollTo(0,0);}}catch(e){by('setup-status').textContent=e.message;}finally{saving=false;by('setup-next').disabled=false;by('setup-later').disabled=false;by('setup-back').disabled=current===0;}}
 by('setup-next').addEventListener('click',advance);
 by('setup-back').addEventListener('click',async()=>{current=Math.max(0,current-1);render();try{await persist();}catch(e){by('setup-status').textContent=e.message;}});
 by('setup-later').addEventListener('click',async()=>{if(saving)return;try{await window.PassportSettings.save();await persist({deferred:true});setup=false;history.replaceState(null,'',location.pathname);render();}catch(e){by('setup-status').textContent=e.message;}});
 by('setup-replay').addEventListener('click',()=>{setup=true;current=progress.completed?0:progress.step||0;history.replaceState(null,'',location.pathname+'#setup');render();window.scrollTo(0,0);});
 by('tutorial-clear').addEventListener('click',()=>{const field=by('tutorial-field');field.value='';field.focus();field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));});
 const examples={en:['hello','My friend drinks coffee'],es:['hola','Mi amigo bebe café'],fr:['bonjour','Mon ami boit du café'],ja:['こんにちは','友達はコーヒーを飲みます'],zh:['你好','我的朋友喝咖啡']};
 function tutorial(config){
  const c=config.settings,language=c.source==='auto'?'en':c.source,example=examples[language];
  by('tutorial-word').textContent=example[0];by('tutorial-sentence').textContent=example[1];
  const available=c.enabled&&(c.provider==='ollama'?!!c.ollamaModel:config.hasKey&&c.consent);
  by('tutorial-availability').textContent=!c.enabled?'Passport is disabled. Enable it in Your languages to practice.':c.source===c.target&&!c.practice?'Choose two different languages to translate.':available?'Live practice: this field uses your selected sentence provider. Enabled Jev ranking uses TypeSafe. Provider response time is additional to the half-second pause.':'Offline practice: local word suggestions work. Sentence translation is unavailable until you configure Gemini with consent or a local Ollama model.';
 }
 document.addEventListener('passportConfig',e=>tutorial(e.detail));
 window.PassportSettings.ready.then(async()=>{const r=await browser.runtime.sendMessage({type:'onboardingGet'});if(r?.ok)progress=r.onboarding;current=progress.step||0;setup=location.hash==='#setup';render();tutorial(window.PassportSettings.config);}).catch(e=>{by('setup-status').textContent=e.message;});
})();
