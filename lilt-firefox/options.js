/* global browser,LiltCore */
'use strict';
const $=id=>document.getElementById(id);
function fill(id,auto){if(auto){const opt=new Option('Detect language','auto');$(id).add(opt);}for(const [code,lang]of Object.entries(LiltCore.languages))$(id).add(new Option(lang.local,code));}
fill('source',true);fill('target',false);
const fields=['source','target','placement','side','gap','provider','model','ollamaUrl','ollamaModel','appearance'];
function providerView(){$('cloud-fields').hidden=$('provider').value!=='cloud';$('local-fields').hidden=$('provider').value!=='ollama';}
function modelOption(name){if(name&&![...$('ollamaModel').options].some(o=>o.value===name))$('ollamaModel').add(new Option(name,name));}
$('provider').addEventListener('change',providerView);
if(browser.runtime.getURL)$('extension-origin').textContent=browser.runtime.getURL('').replace(/\/$/,'');
function status(text,error=false){$('status').textContent=text;$('status').className='status '+(error?'error':'success');}
let configSnapshot=null,themeSnapshot={};
function populate({settings,hasKey,hasJevKey,theme}){
  if(theme)themeSnapshot=theme;
  configSnapshot={settings,hasKey,hasJevKey,theme:themeSnapshot};
  if(!settings)throw new Error('Cannot reach Passport. Reload the extension, then reopen Settings.');
  modelOption(settings.ollamaModel);for(const id of fields)$(id).value=settings[id];providerView();
  for(const id of ['enabled','practice','consent'])$(id).checked=settings[id];
  $('liveJev').checked=settings.liveJev;
  $('custom-colors').checked=!!(settings.accentColor||settings.accentSoftColor);
  $('accentColor').value=settings.accentColor||'#bc93ff';$('accentSoftColor').value=settings.accentSoftColor||'#dbc7ff';previewAppearance();
  document.dispatchEvent(new CustomEvent('passportConfig',{detail:configSnapshot}));
  $('jev-key-state').textContent=hasJevKey?'TypeSafe key saved. Leave blank to keep it.':'No TypeSafe key saved.';
  $('key-state').textContent=hasKey?'✓ API key saved in this browser. Leave the field blank to keep it.':'No API key saved yet.';
  $('key-state').className=hasKey?'small success':'small';
  $('key').placeholder=hasKey?'•••••••• · saved key':'Paste a Gemini API key';
}
async function load(){const result=await browser.runtime.sendMessage({type:'config'});if(!result)throw new Error('Cannot reach Passport. Reopen Settings after reloading the extension.');populate(result);}
async function save(){
  const patch={};for(const id of fields)patch[id]=$(id).value;for(const id of ['enabled','practice','consent'])patch[id]=$(id).checked;
  patch.liveJev=$('liveJev').checked;
  patch.accentColor=$('custom-colors').checked?$('accentColor').value:'';patch.accentSoftColor=$('custom-colors').checked?$('accentSoftColor').value:'';
  if(!LiltCore.localEndpoint(patch.ollamaUrl))throw new Error('Use an HTTP loopback address, such as http://localhost:11434.');
  if(!/^[a-zA-Z0-9._-]{1,100}$/.test(patch.model)){throw new Error('Enter a valid model ID.');}
  const key=$('key').value.trim();
  const jevKey=$('jev-key').value.trim();
  const result=await browser.runtime.sendMessage({type:'saveSettings',patch,...(key?{key}:{}),...(jevKey?{jevKey}:{})});
  if(!result?.ok)throw new Error(result?.error||'Passport did not confirm the save. Your entered key is still here; reload the extension and retry.');
  if(key&&!result.hasKey)throw new Error('Passport did not confirm that the key was saved. Please retry.');
  populate(result);$('key').value='';
  $('jev-key').value='';
  status(result.settings.provider==='ollama'?'Local settings saved. Test a sentence to check your selected model.':result.hasKey?'Key and settings saved. Test a sentence to check API access.':'Settings saved. Offline word suggestions are ready.');
  return result;
}
function busy(on){for(const id of ['save','test','forget','refresh','jev-test','jev-forget'])$(id).disabled=on;}
$('save').addEventListener('click',async()=>{busy(true);try{await save();}catch(e){status(e.message,true);}finally{busy(false);}});
$('test').addEventListener('click',async()=>{busy(true);try{
  const saved=await save(),local=saved.settings.provider==='ollama';
  if(!local&&!saved.hasKey)throw new Error('Add an API key before testing.');
  if(!local&&!saved.settings.consent)throw new Error('Your key is saved. Enable the cloud-processing checkbox to test it.');
  if(local&&!saved.settings.ollamaModel)throw new Error('Select an installed Ollama model first.');
  if(!saved.settings.enabled)throw new Error('Enable Passport before testing.');
  status('Settings saved · checking a short sentence…');const start=performance.now();
  const result=await browser.runtime.sendMessage({type:'generate',kind:'sentence',requestId:'settings-test',payload:{text:'Hello, my friend.',source:'en',target:'ja',practice:false}});
  if(!result?.ok)throw new Error('Settings saved, but the test failed: '+(result?.error||'No response.'));
  status(`Connected · ${result.data.translation} · ${((performance.now()-start)/1000).toFixed(1)}s`);
}catch(e){status(e.message,true);}finally{busy(false);}});
$('refresh').addEventListener('click',async()=>{busy(true);try{
  const selected=$('ollamaModel').value,result=await browser.runtime.sendMessage({type:'ollamaModels',url:$('ollamaUrl').value});
  if(!result?.ok)throw new Error(result?.error||'No response from Ollama.');
  $('ollamaModel').replaceChildren(new Option('Select a model',''));for(const name of result.models)modelOption(name);
  if(result.models.includes(selected))$('ollamaModel').value=selected;else if(result.models.length===1)$('ollamaModel').value=result.models[0];
  status(result.models.length?`${result.models.length} installed model(s). Select one and save.`:'No local models found. Install one in Ollama, then refresh.');
}catch(e){status(e.message,true);}finally{busy(false);}});
$('forget').addEventListener('click',async()=>{busy(true);try{const result=await browser.runtime.sendMessage({type:'saveKey',key:''});if(!result?.ok)throw new Error(result?.error||'Passport did not confirm key removal.');$('key').value='';await load();status('Saved key removed.');}catch(e){status(e.message,true);}finally{busy(false);}});
const settingsReady=load();settingsReady.catch(e=>status(e.message,true));
window.PassportSettings={save,ready:settingsReady,get config(){return configSnapshot;}};
$('jev-forget').addEventListener('click',async()=>{try{const r=await browser.runtime.sendMessage({type:'saveSettings',patch:{liveJev:false},jevKey:''});if(!r?.ok)throw Error(r?.error||'Could not remove key.');populate(r);$('jev-key').value='';status('TypeSafe key removed; live ranking disabled.');}catch(e){status(e.message,true);}});
$('jev-test').addEventListener('click',async()=>{busy(true);try{await save();if(!$('liveJev').checked)throw Error('Enable live Jev ranking first.');const r=await browser.runtime.sendMessage({type:'rankWords',requestId:'settings-rank-test',payload:{word:'on',source:'en',target:'es',context:'The book is on the table.',candidates:[{text:'encendido',meaning:'on; switched on'},{text:'en',meaning:'on; located on a surface'}]}});if(!r?.ok)throw Error(r?.error||'Jev did not respond.');status(r.data?.abstain?'Jev connected. None of these candidates fits; Passport will keep the original.':r.data?'Jev connected. Best candidate: '+['encendido','en'][r.data.order[0]]:'Jev responded without a confident ranking, or the request limit was reached. Local choices remain available.');}catch(e){status(e.message,true);}finally{busy(false);}});

function previewAppearance(){
 const custom=$('custom-colors').checked;
 for(const id of ['accentColor','accentSoftColor'])$(id).disabled=!custom;
 const cfg={appearance:$('appearance').value,accentColor:custom?$('accentColor').value:'',accentSoftColor:custom?$('accentSoftColor').value:''};
 if(typeof PassportAppearance!=='undefined'){PassportAppearance.apply($('appearance-preview'),cfg,themeSnapshot);PassportAppearance.apply(document.documentElement,cfg,{accent:themeSnapshot.accent});}
}
if(typeof PassportAppearance!=='undefined'){const style=document.createElement('style');style.textContent=PassportAppearance.css;document.head.append(style);}
for(const id of ['appearance','custom-colors','accentColor','accentSoftColor'])$(id).addEventListener('input',previewAppearance);
$('reset-colors').addEventListener('click',()=>{$('custom-colors').checked=false;previewAppearance();});
for(const b of document.querySelectorAll('button'))b.classList.add('passport-control');
// Notifications must not claim other extension pages' response channels.
// An async listener returns a Promise even for messages it ignores.
browser.runtime.onMessage?.addListener(message=>{
 if(message?.type!=='passportThemeChanged')return;
 browser.runtime.sendMessage({type:'config'}).then(r=>{themeSnapshot=r.theme||{};previewAppearance();}).catch(()=>{});
});
