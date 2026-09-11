const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
const CMS=require('../assets/cms-common.js'),legacy=require('../assets/legacy-layout.json'),posts=require('../assets/original-posts.json');
const original=file=>cp.execFileSync('git',['show','b26c9b75b65483370140552631dd194fe655c433:'+file],{encoding:'utf8'}).replace(/\r/g,'');
const current=file=>fs.readFileSync(file,'utf8').replace(/\r/g,'');
const removeCms=s=>s.replace(/<script src="\/(?:stc-config\.js|assets\/(?:cms-common|public-cms)\.js)\?v=4"><\/script>/g,'').replace(/ data-cms="[^"]+"/g,'').replace(' id="cmsNews"','');
test('Homepage preserves every original public element, style, font and link',()=>{
 const normalized=removeCms(current('index.html')).replace(/\n+(?=<\/body>)/,'\n');
 assert.equal(normalized,original('index.html').replace(/\n+(?=<\/body>)/,'\n'));
});
test('Existing article template and CSS remain identical; only data-loading script changes',()=>{
 const clean=s=>s.replace(/<script[\s\S]*?<\/script>/g,'').replace(/\n+(?=<\/body>)/,'\n');
 assert.equal(clean(current('tin-chi-tiet.html')),clean(original('tin-chi-tiet.html')));
});
test('Migrated articles retain original homepage titles, excerpts, emojis and dates',()=>{
 for(const p of posts){const display=CMS.presentation({...p,published_at:new Date(p.published_at).toISOString()},legacy),old=legacy[p.slug];
 for(const name of ['title','excerpt','category','date','emoji','imageStyle','detailTag','detailDate'])assert.equal(display[name],old[name],p.slug+' '+name);
 }
});
test('Admin content edits are reflected instead of being hidden by legacy presentation',()=>{
 const p={...posts[0],title:'Tiêu đề vừa chỉnh',excerpt:'Tóm tắt vừa chỉnh',category:'Thông báo',published_at:'2026-09-09T00:00:00+07:00'};
 const display=CMS.presentation(p,legacy);
 assert.equal(display.title,p.title);assert.equal(display.excerpt,p.excerpt);assert.equal(display.category,p.category);assert.equal(display.detailTag,p.category);
 assert.equal(display.date,'📅 09 tháng 9, 2026');
});
