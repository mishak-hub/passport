const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../ranking.js'),J=require('../dictionary-sources/jev-rank.cjs');
const job={source:'en',target:'ja',word:'best',candidates:[{text:'ベスト',meaning:'best',reading:'besuto'},{text:'最高',meaning:'best',reading:'saikō'}]};
const answer={type:'choice',choice:'candidate_1',confidence:0.95,probabilities:{candidate_0:0.1,candidate_1:0.85,none:0.05}};
test('Jev request is closed-choice with abstention, no invented words',()=>{
 const q=J.request(job);assert.equal(q.model,'jev-latest');assert.deepEqual(Object.keys(q.questions.best.criteria),['candidate_0','candidate_1','none']);assert.equal(JSON.parse(q.state).sourceWord,'best');
});
test('Jev transport uses documented endpoint and rejects unrecognized choices',async()=>{
 const result=await J.evaluate(job,{key:'test-key',fetchImpl:async(url,options)=>{assert.equal(url,'https://api.typesafe.ai/v1/systemone');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer test-key');return {ok:true,json:async()=>({answers:{best:answer},model:'test'})};}});
 assert.equal(result.approved,false);assert.equal(result.answer.choice,'candidate_1');
 await assert.rejects(J.evaluate(job,{key:'test-key',fetchImpl:async()=>({ok:true,json:async()=>({answers:{best:{...answer,choice:'invented'}}})})}),/Invalid Jev choice/);
 await assert.rejects(J.evaluate(job,{key:'test-key',fetchImpl:async()=>({ok:false,status:429})}),/429/);
 await assert.rejects(J.evaluate(job,{}),/TYPESAFE_API_KEY/);
});
test('Only approved high-confidence decisions affect ranking; practice and stale senses stay unchanged',()=>{
 const original={candidates:job.candidates,autoCommit:false};
 R.install([{...job,answer,approved:false}]);assert.equal(R.apply('best','en','ja',original,false),original);
 R.install([{...job,answer,approved:true}]);const r=R.apply('best','en','ja',original,false);assert.equal(r.candidates[0].text,'最高');assert.equal(r.autoCommit,false);assert.equal(original.candidates[0].text,'ベスト');
 assert.equal(R.apply('best','en','ja',original,true),original);
 const changed={candidates:[...job.candidates.slice(0,1),{...job.candidates[1],meaning:'changed sense'}]};assert.equal(R.apply('best','en','ja',changed,false),changed);
 for(const a of [{...answer,confidence:0.2},{...answer,choice:'none'},{...answer,probabilities:{candidate_0:1,candidate_1:1,none:1}}]){R.install([{...job,answer:a,approved:true}]);assert.equal(R.apply('best','en','ja',original,false),original);}
 R.install([]);
});
test('All twenty language directions can produce requests',()=>{
 for(const source of ['en','es','fr','ja','zh'])for(const target of ['en','es','fr','ja','zh'])if(source!==target)assert.equal(J.request({...job,source,target}).questions.best.type,'choice');
});
test('Lexicon consumes installed rankings and keeps the original automatic-insertion policy',()=>{
 const L=require('../lexicon.js');R.install([]);
 const original=L.lookup('the','en','es',false);
 const r={source:'en',target:'es',word:'the',candidates:original.candidates,approved:true,answer:{type:'choice',choice:'candidate_1',confidence:0.9,probabilities:{candidate_0:0.1,candidate_1:0.8,candidate_2:0.03,candidate_3:0.02,none:0.05}}};
 R.install([r]);const result=L.lookup('the','en','es',false);assert.equal(result.candidates[0].text,'la');assert.equal(result.rankingSource,'jev-reviewed');assert.equal(result.autoCommit,original.autoCommit);R.install([]);
});
