// Restore the published site's markup and styles; add only invisible CMS hooks.
const fs=require('node:fs'),cp=require('node:child_process'),vm=require('node:vm');
const ref='b26c9b75b65483370140552631dd194fe655c433';
const original=file=>cp.execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}).replace(/\r/g,'');
let home=original('index.html'),detail=original('tin-chi-tiet.html');
const ctx={};vm.runInNewContext(detail.match(/var IMG1[\s\S]*?(?=var params =)/)[0],ctx,{timeout:1000});
const seeded=require('../assets/original-posts.json'),legacy={};
const cardStart=[...home.matchAll(/<div class="news-card" onclick="window.location.href='tin-chi-tiet.html\?id=([^']+)'">/g)];
for(let i=0;i<cardStart.length;i++){
 const match=cardStart[i],chunk=home.slice(match.index,cardStart[i+1]?.index||home.indexOf('</section>',match.index));
 const text=rx=>chunk.match(rx)[1].trim(),slug=match[1],p=seeded.find(p=>p.slug===slug),a=ctx.ARTICLES[slug];
 legacy[slug]={title:text(/<h3>([\s\S]*?)<\/h3>/),excerpt:text(/<p>([\s\S]*?)<\/p>/),category:text(/<div class="news-tag">([\s\S]*?)<\/div>/),date:text(/<div class="news-date">([\s\S]*?)<\/div>/),emoji:a.emoji,imageStyle:chunk.match(/class="news-img-placeholder" style="([^"]*)"/)?.[1]||'',detailTag:a.tag,detailDate:a.date,baseline:{title:p.title,excerpt:p.excerpt,category:p.category,published_at:p.published_at}};
}
if(Object.keys(legacy).length!==4)throw Error('Expected four original cards');
fs.writeFileSync('assets/legacy-layout.json',JSON.stringify(legacy,null,2)+'\n');
const hooks=[['hero-title','<h1>Câu Lạc Bộ'],['hero-motto','<div class="hero-motto">'],['hero-intro','<p>Nơi kết nối,'],['about-title','<h2 class="section-title">Đoàn kết dòng họ'],['about-quote','<p>"Với tinh thần'],['about-intro','<p class="section-sub" style="margin-bottom:20px;">'],['join-title','<h2>Trở Thành Thành Viên'],['join-intro','<p>Cùng chúng tôi xây dựng'],['contact','<p>\n        Địa chỉ:'],['ticker','<span class="ticker-content">']];
for(const [id,start] of hooks){const at=home.indexOf(start);if(at<0)throw Error('Missing '+id);const end=home.indexOf('>',at);home=home.slice(0,end)+' data-cms="'+id+'"'+home.slice(end)}
home=home.replace('<div class="news-grid">','<div class="news-grid" id="cmsNews">');
const scripts='<script src="/stc-config.js?v=2"></script><script src="/assets/cms-common.js?v=2"></script><script src="/assets/public-cms.js?v=2"></script>\n';
home=home.replace('</body>',scripts+'</body>');
// Keep the original article template, font imports, navigation, banner and CSS.
detail=detail.replace(/<script>\nvar IMG1[\s\S]*?<\/script>/,scripts.trimEnd());
fs.writeFileSync('index.html',home);fs.writeFileSync('tin-chi-tiet.html',detail);
console.log('Restored original public markup/styles and recorded all four original card presentations.');
