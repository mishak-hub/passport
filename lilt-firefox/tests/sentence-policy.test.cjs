const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../core.js'),L=require('../lexicon.js');
test('Sentence endings ignore decimals, abbreviations, URLs and email in both trigger and ranges',()=>{
 for(const text of ['It costs 3.50 euros.','Ask Dr. Smith today.','See https://example.com/page now.','Email a@example.com tomorrow.','Use e.g. a pen.']){
  assert.equal(C.sentenceAt(text,text.length).text,text);
  for(let i=0;i<text.length-1;i++)if(text[i]==='.')assert.equal(C.sentenceEnd(text,i),false,text);
  assert.equal(C.sentenceEnd(text,text.length-1),true,text);
 }
 assert.equal(C.sentenceEnd('3.',1),false);
 for(const text of ['Hello!','Ready?','こんにちは。','你好！','是吗？'])assert.equal(C.sentenceEnd(text,text.length-1),true);
 assert.equal(C.sentenceAt('First. Second!',14).text,'Second!');
});
test('Explicit choices compare whole words, allowing case but not a different embedded word',()=>{
 assert.ok(C.preservesChoices('La banque est ici.',[{target:'banque'}]));
 assert.ok(!C.preservesChoices('The catcher.',[{target:'cat'}]));
 assert.ok(C.preservesChoices('ワンピースを見ます。',[{target:'ワンピース'}]));
});
test('Phrase candidates recognize title versus a literal piece without removing either meaning',()=>{
 assert.equal(L.phrase('One Piece','en','ja','watch One Piece').candidates[0].text,'ワンピース');
 assert.equal(L.phrase('one piece','en','ja','I want one piece').candidates[0].text,'一切れ');
 assert.equal(L.phrase('海贼王','zh','ja','我想看海贼王').candidates[0].text,'ワンピース');
 assert.equal(L.phrase('ワンピース','ja','en').candidates[0].text,'One Piece');
});
