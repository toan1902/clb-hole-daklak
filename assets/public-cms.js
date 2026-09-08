(async function(){
  'use strict';
  const base=window.STC_CONFIG.API_BASE;
  async function request(action){const r=await fetch(base+'?action='+action,{signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok)throw Error(data.message||'Không tải được nội dung.');return data}
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
  const news=document.getElementById('cmsNews');
  const title=document.getElementById('title');
  try{
    const health=await request('health');
    let posts=[],content=[];
    if(!health.configured){const r=await fetch('/assets/original-posts.json');if(!r.ok)throw Error('Không tải được bài viết.');posts=await r.json()}
    if(title){
      const slug=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('slug');
      const p=health.configured?await request('article&slug='+encodeURIComponent(slug||'')):posts.find(p=>p.slug===slug);
      if(!p)throw Error('Bài viết không tồn tại hoặc chưa được xuất bản.');
      document.title=p.title+' · CLB Doanh Nhân Họ Lê Đắk Lắk';title.textContent=p.title;document.getElementById('tag').textContent=p.category;document.getElementById('date').textContent=new Date(p.published_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok',day:'numeric',month:'long',year:'numeric'});document.querySelector('meta[name="description"]').content=p.excerpt||p.title;
      const banner=document.getElementById('banner');if(CMS.imageURL(p.cover_url)){const img=el('img');img.src=CMS.imageURL(p.cover_url);img.alt=p.title;banner.replaceChildren(img);banner.hidden=false}else banner.hidden=true;CMS.renderBody(document.getElementById('content'),p.body);return;
    }
    if(health.configured)({posts,content}=await request('public'));
    if(content.length){const r=await fetch('/assets/content-fields.json');if(!r.ok)throw Error('Không tải được cấu hình nội dung.');const fields=await r.json();for(const c of content){const field=fields.find(f=>f.id===c.id),target=field&&document.querySelector('[data-cms="'+field.id+'"]');if(target&&c.value!==field.default){target.textContent=c.value;target.style.whiteSpace='pre-line'}}}
    if(!news)return;
    let category='',term='';
    function render(){const found=posts.filter(p=>(!category||p.category===category)&&(!term||(p.title+' '+p.excerpt).toLocaleLowerCase('vi').includes(term)));news.replaceChildren();if(!found.length){news.append(el('p','Chưa có bài viết trong mục này.'));return}for(const p of found){const card=el('a',undefined,'news-card');card.href='/tin-chi-tiet.html?id='+encodeURIComponent(p.slug);const visual=el('div',undefined,'news-img-placeholder');if(CMS.imageURL(p.cover_url)){const img=el('img');img.src=CMS.imageURL(p.cover_url);img.alt='';img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover';visual.append(img)}else visual.textContent='Lê';const body=el('div',undefined,'news-body');body.append(el('div',p.category,'news-tag'),el('h3',p.title),el('p',p.excerpt),el('div',new Date(p.published_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok'}),'news-date'));card.append(visual,body);news.append(card)}}
    for(const button of document.querySelectorAll('.tab-btn'))button.onclick=()=>{category=button.textContent.trim()==='Tất cả'?'':button.textContent.trim();document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b===button));render()};
    const search=document.getElementById('newsSearch');if(search)search.oninput=()=>{term=search.value.toLocaleLowerCase('vi');render()};render();
  }catch(e){if(news){news.replaceChildren(el('p','Chưa tải được tin tức. Vui lòng tải lại trang sau ít phút.'))}if(title){title.textContent='Chưa mở được bài viết';document.getElementById('content').textContent=e.message}}
})();
