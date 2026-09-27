const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../dictionary.js'),L=require('../lexicon.js'),catalog=require('../data/catalog.json');
for(const lang of ['es','ja'])D.install(lang,catalog[lang].files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',f),'utf8'))));
test('Spanish articles never suggest grammar notation or auto-commit an arbitrary gender',()=>{
 const result=L.lookup('the','en','es',false,true);assert.ok(result);assert.ok(['el','la'].includes(result.candidates[0].text),JSON.stringify(result.candidates));assert.equal(result.autoCommit,false);assert.ok(result.candidates.every(c=>!/[+]/.test(c.text)));
});
test('Japanese best prioritizes a natural translation over an English loanword',()=>{const r=L.lookup('best','en','ja',false,true);assert.equal(r.candidates[0].text,'最高',JSON.stringify(r.candidates));});
test('Japanese first prioritizes ordinary meaning over a transliteration',()=>{const r=L.lookup('first','en','ja',false,true);assert.ok(['最初','第一'].includes(r.candidates[0].text),JSON.stringify(r.candidates));});
test('An article is not interpreted as the adjectival suffix an',()=>{const r=L.lookup('an','en','es');assert.deepEqual(r.candidates.map(c=>c.text),['un','una']);assert.equal(r.autoCommit,false);});
test('Legitimate everyday Japanese loanwords remain available and naturally ranked',()=>{assert.equal(L.lookup('computer','en','ja').candidates[0].text,'コンピューター');assert.equal(L.lookup('coffee','en','ja').candidates[0].text,'コーヒー');});
test('Unreviewed and cross-language dictionary matches never auto-commit',()=>{assert.equal(D.lookup('neighbor','en','es')?.autoCommit,false);assert.equal(D.lookup('agua','es','ja')?.autoCommit,false);});
test('Grammar notation, placeholders and Latin-only Japanese surfaces are rejected',()=>{for(const [text,lang]of [['cuanto + comp., comp.','es'],['el/la','es'],['(masc.)','es'],['algo ...','es'],['saikou','ja'],['best','ja'],['sth','es']])assert.equal(D.surface(text,lang),false,text);assert.equal(D.surface('コーヒー','ja'),true);});
test('All returned candidates in a common-word audit are insertable surfaces',()=>{
 for(const text of ['the','a','an','to','of','in','on','by','with','is','be','can','will','like','right','light','bank','best','first','last','new','old','good','great','fast','computer','coffee','car','home','run','work','love','friend','language','learn','hello','phone','book','read','write'])for(const target of ['es','ja']){
   const r=L.lookup(text,'en',target,false,true);for(const c of r?.candidates||[])assert.equal(D.surface(c.text,target),true,`${text} → ${c.text}`);
 }
});
