const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Shipped Jev rankings match real dictionary candidates and apply before Space',()=>{
 const base=path.join(__dirname,'..'),ctx=vm.createContext({});
 for(const name of ['ranking.js','rankings-data.js','dictionary.js','lexicon.js'])vm.runInContext(fs.readFileSync(path.join(base,name),'utf8'),ctx);
 const catalog=require('../data/catalog.json');
 for(const [lang,pack]of Object.entries(catalog))ctx.PassportDictionary.install(lang,pack.files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(base,'data',f),'utf8'))));
 const approved=require('../dictionary-sources/jev-review.json').filter(r=>r.approved);
 assert.equal(approved.length,38);
 for(const row of approved){
   const selected=row.candidates[Number(row.answer.choice.slice(10))].text;
   for(const partial of [false,true]){
     const r=ctx.LiltLexicon.lookup(row.word,row.source,row.target,false,partial);
     assert.equal(r.rankingSource,'jev-reviewed',`${row.source}/${row.target}/${row.word} partial=${partial}`);
     assert.equal(r.candidates[0].text,selected);
   }
 }
 assert.equal(ctx.LiltLexicon.lookup('on','en','es',false,true).candidates[0].text,'en');
 assert.equal(ctx.LiltLexicon.lookup('best','en','es',false,true).candidates[0].text,'mejor');
 assert.equal(ctx.LiltLexicon.lookup('in','en','ja',false,true).rankingSource,undefined);
});
