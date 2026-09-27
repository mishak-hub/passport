const fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const base=path.resolve(__dirname,'..'),D=require('../dictionary.js'),catalog=require('../data/catalog.json');
const initialization={};
for(const lang of ['fr','es','ja','zh']){const start=performance.now();const rows=catalog[lang].files.flatMap(f=>JSON.parse(fs.readFileSync(path.join(base,'data',f),'utf8')));const indexed=performance.now();D.install(lang,rows);initialization[lang]={readParseMs:+(indexed-start).toFixed(1),indexMs:+(performance.now()-indexed).toFixed(1)};}
const samples=[['neigh','en','fr',false,true],['neigbor','en','fr',false,true],['water','en','es',false,false],['taberu','en','ja',true,true],['xuexiao','en','zh',true,true],['agua','es','ja',false,true],['bonjour','fr','zh',false,true],['zxqvplmnzz','en','es',false,true]];
for(let i=0;i<100;i++)D.lookup(...samples[i%samples.length]);
const times=[];for(let i=0;i<1600;i++){const start=performance.now();D.lookup(...samples[i%samples.length]);times.push(performance.now()-start);}times.sort((a,b)=>a-b);
const result={environment:'Node.js on this computer; dictionary engine only, not browser layout or model/network latency',entries:Object.values(catalog).reduce((n,p)=>n+p.entries,0),initialization,samples:times.length,p50Ms:+times[Math.floor(times.length*.5)].toFixed(3),p95Ms:+times[Math.floor(times.length*.95)].toFixed(3),p99Ms:+times[Math.floor(times.length*.99)].toFixed(3),maxMs:+times.at(-1).toFixed(3)};
fs.writeFileSync(path.join(__dirname,'performance-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
