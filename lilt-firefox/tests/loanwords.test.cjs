const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const D=require('../dictionary.js'),L=require('../lexicon.js'),catalog=require('../data/catalog.json');
D.install('ja',catalog.ja.files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(__dirname,'../data',f),'utf8'))));
test('Loanwords remain available alongside reviewed Japanese alternatives',()=>{
 for(const [word,loan]of [['best','ベスト'],['first','ファースト']]){
  const pool=L.pool(word,'en','ja',false,true);
  assert.ok(pool.candidates.some(c=>c.text===loan),word);
  assert.ok(pool.candidates.length<=10);assert.ok(L.lookup(word,'en','ja',false,true).candidates.length<=5);
 }
 assert.equal(L.lookup('coffee','en','ja').candidates[0].text,'コーヒー');
});
