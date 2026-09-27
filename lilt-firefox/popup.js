/* global browser,LiltCore */
'use strict';
const $=id=>document.getElementById(id);
for(const id of ['source','target']){if(id==='source')$(id).add(new Option('Detect','auto'));for(const [code,lang]of Object.entries(LiltCore.languages))$(id).add(new Option(lang.local,code));}
async function load(){const {settings,hasKey}=await browser.runtime.sendMessage({type:'config'});for(const id of ['source','target','placement'])$(id).value=settings[id];for(const id of ['enabled','practice'])$(id).checked=settings[id];$('connection').textContent=settings.provider==='ollama'?`Local · ${settings.ollamaModel||'choose a model in Settings'}`:!hasKey?'Offline words ready · add a sentence model in Settings.':!settings.consent?'Finish cloud consent in Settings.':'Sentence model configured · local voices';}
for(const id of ['source','target','placement','enabled','practice'])$(id).addEventListener('change',async()=>{const value=['enabled','practice'].includes(id)?$(id).checked:$(id).value;await browser.runtime.sendMessage({type:'saveConfig',patch:{[id]:value}});await load();});
$('settings').addEventListener('click',()=>browser.runtime.openOptionsPage());load();
