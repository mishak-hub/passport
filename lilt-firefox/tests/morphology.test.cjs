const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'..');
function dictionary(){const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(base,'dictionary.js'),'utf8'),ctx);return ctx.PassportDictionary;}
test('English helping finds help before unrelated fuzzy heating or healing in shipped Japanese pack',()=>{
 const d=dictionary(),catalog=require('../data/catalog.json');d.install('ja',catalog.ja.files.flatMap(file=>JSON.parse(fs.readFileSync(path.join(base,'data',file),'utf8'))));
 for(const partial of [false,true]){const result=d.lookup('helping','en','ja',false,partial);assert.ok(result?.candidates.length);assert.ok(result.candidates.every(c=>/^help(?: ·|$)/.test(c.meaning)),JSON.stringify(result?.candidates));assert.equal(result.exact,false);}
});
test('English inflection fallback preserves exact nouns and is not applied in phonetic practice',()=>{
 const d=dictionary();d.install('ja',[
 ['help','助け','tasuke','','',0],['healing','治癒','helping','','',0],['build','建てる','tateru','','',0],['building','建物','tatemono','','',0],['ring','指輪','yubiwa','','',0],['thing','物','mono','','',0],['king','王','ou','','',0]
 ]);
 for(const [word,target]of [['ring','指輪'],['thing','物'],['king','王'],['building','建物']])assert.equal(d.lookup(word,'en','ja').candidates[0].text,target);
 assert.equal(d.lookup('helping','en','ja',true).candidates[0].text,'治癒');
});
test('Actual lexicon and ranking path keeps helping stem candidates for partial words',()=>{
 const ctx=vm.createContext({});for(const file of ['ranking.js','rankings-data.js','dictionary.js','lexicon.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),ctx);
 const catalog=require('../data/catalog.json');ctx.PassportDictionary.install('ja',catalog.ja.files.flatMap(file=>JSON.parse(fs.readFileSync(path.join(base,'data',file),'utf8'))));
 for(const method of ['lookup','pool']){const result=ctx.LiltLexicon[method]('helping','en','ja',false,true);assert.ok(result?.candidates.length);assert.ok(result.candidates.every(c=>/^help(?: ·|$)/.test(c.meaning)),JSON.stringify(result?.candidates));}
});
