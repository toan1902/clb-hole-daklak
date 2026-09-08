const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
for(const file of ['api/stc.js','assets/cms-common.js','assets/public-cms.js','admin/app.js'])new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
for(const file of ['index.html','admin/index.html','tin-tuc.html','tin-chi-tiet.html']){
 const html=fs.readFileSync(file,'utf8');for(const match of html.matchAll(/(?:src|href)="(\/[^"?#]+)(?:\?[^"#]*)?"/g)){
 const target=match[1];if(target.endsWith('/'))continue;if(!fs.existsSync(path.join('.',target)))throw Error(file+' missing asset '+target)
 }}
for(const p of require('../assets/original-posts.json'))require('../assets/cms-common.js').validatePost(p);
console.log('Build checks passed: JavaScript syntax, page assets, original article data. Static Vercel site requires no compilation.');
