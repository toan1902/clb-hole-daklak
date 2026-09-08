// One-time migration generator for the original b26c9b7 static website.
const fs=require('node:fs'),vm=require('node:vm');
const detail=fs.readFileSync('tin-chi-tiet.html','utf8');
const declarations=detail.match(/var IMG1[\s\S]*?(?=var params =)/)?.[0];
if(!declarations)throw Error('Original article data not found; do not run migration generator again.');
const context={};vm.runInNewContext(declarations,context,{timeout:1000});
const dates={'giao-luu-ca-phe':'2026-09-06','dai-hoi-clb-vn-i':'2025-10-12','le-dang-huong-lam-kinh':'2025-10-11','hoc-bong-2024':'2024-10-20'};
const categories={'giao-luu-ca-phe':'Kết nối · Giao thương','dai-hoi-clb-vn-i':'Sự kiện quốc gia','le-dang-huong-lam-kinh':'Tri ân tiên tổ','hoc-bong-2024':'Khuyến học'};
const posts=Object.entries(context.ARTICLES).map(([slug,a])=>({slug,title:a.title,category:categories[slug],excerpt:a.body.find(b=>b.type==='p').text.slice(0,600),body:a.body.map(b=>b.type==='img'?{...b,src:'/'+b.src}:b),cover_url:'',status:'published',published_at:dates[slug]+'T00:00:00+07:00'}));
fs.mkdirSync('assets',{recursive:true});fs.writeFileSync('assets/original-posts.json',JSON.stringify(posts,null,2)+'\n');
let homepage=fs.readFileSync('index.html','utf8');
const specs=[
  ['hero-title','Tiêu đề đầu trang','<h1>Câu Lạc Bộ'],
  ['hero-motto','Khẩu hiệu','<div class="hero-motto">'],
  ['hero-intro','Mô tả đầu trang','<p>Nơi kết nối,'],
  ['about-title','Tiêu đề giới thiệu','<h2 class="section-title">Đoàn kết dòng họ'],
  ['about-quote','Lời giới thiệu của Ban Chủ nhiệm','<p>"Với tinh thần'],
  ['about-intro','Nội dung giới thiệu','<p class="section-sub" style="margin-bottom:20px;">'],
  ['join-title','Tiêu đề tham gia CLB','<h2>Trở Thành Thành Viên'],
  ['join-intro','Lời mời tham gia CLB','<p>Cùng chúng tôi xây dựng'],
  ['contact','Thông tin liên hệ cuối trang','<p>\n        Địa chỉ:'],
  ['ticker','Dòng tin chạy','<span class="ticker-content">']
];
const fields=[];
homepage=homepage.replace(/\r/g,'');
for(const [id,label,prefix] of specs){const start=homepage.indexOf(prefix);if(start<0)throw Error('Missing '+id);const tag=prefix.match(/^<(\w+)/)[1],openEnd=homepage.indexOf('>',start),end=homepage.indexOf('</'+tag+'>',openEnd);const inner=homepage.slice(openEnd+1,end);const plain=inner.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim().replace(/[ \t]+/g,' ').replace(/\n\s+/g,'\n');fields.push({id,label,default:plain,rows:id==='contact'||id==='ticker'?5:3});homepage=homepage.slice(0,openEnd)+' data-cms="'+id+'"'+homepage.slice(openEnd)}
fs.writeFileSync('assets/content-fields.json',JSON.stringify(fields,null,2)+'\n');
homepage=homepage.replace(/  <div class="news-grid">[\s\S]*?(?=\n<\/section>\n\n<!-- KHUYẾN HỌC)/,'  <div class="news-grid" id="cmsNews" aria-live="polite"><p>Đang tải tin hoạt động…</p></div>\n  <p><a href="/tin-tuc.html" class="btn-gold" style="margin-top:24px">Xem tất cả bài viết →</a></p>');
if(!homepage.includes('id="cmsNews"'))throw Error('News replacement did not match');
homepage=homepage.replace('</body>','<script src="/stc-config.js?v=1"></script><script src="/assets/cms-common.js?v=1"></script><script src="/assets/public-cms.js?v=1"></script>\n</body>');
homepage=homepage.replace('<li><a href="#join">Liên hệ & Đăng ký</a></li>','<li><a href="#join">Liên hệ & Đăng ký</a></li><li><a href="/admin/">Quản trị website</a></li>');
fs.writeFileSync('index.html',homepage);
const quote=s=>"'"+String(s).replace(/'/g,"''")+"'";
const postSQL=posts.map(p=>`insert into public.ldbc_posts (slug,title,category,excerpt,body,cover_url,status,published_at) values (${[p.slug,p.title,p.category,p.excerpt].map(quote).join(',')},${quote(JSON.stringify(p.body))}::jsonb,${quote(p.cover_url)},'published',${quote(p.published_at)}) on conflict (slug) do nothing;`).join('\n');
const contentSQL=fields.map(f=>`insert into public.ldbc_site_content (id,value) values (${quote(f.id)},${quote(f.default)}) on conflict (id) do nothing;`).join('\n');
fs.writeFileSync('supabase-seed.sql','-- Import existing public content only; existing edited records are preserved.\nBEGIN;\n'+postSQL+'\n'+contentSQL+'\nCOMMIT;\n');
console.log(`Prepared ${posts.length} existing articles and ${fields.length} homepage fields.`);
