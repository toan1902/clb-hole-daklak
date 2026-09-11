(async function(){
  'use strict';
  const base=window.STC_CONFIG.API_BASE;
  async function request(action){
    const r=await fetch(base+'?action='+action,{signal:AbortSignal.timeout(15000)});
    const data=await r.json();if(!r.ok)throw Error(data.message||'Không tải được nội dung.');return data;
  }
  async function asset(path){const r=await fetch(path);if(!r.ok)throw Error('Không tải được cấu hình nội dung.');return r.json()}
  function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
  const news=document.getElementById('cmsNews'),title=document.getElementById('title');
  const originalCards=new Map();
  if(news)for(const card of news.querySelectorAll('.news-card')){
    const slug=(card.getAttribute('onclick')||'').match(/\?id=([a-z0-9-]+)/)?.[1];
    if(slug)originalCards.set(slug,card.cloneNode(true));
  }
  try{
    const [health,legacy]=await Promise.all([request('health'),asset('/assets/legacy-layout.json?v=2')]);
    let posts=[],content=[];
    if(!health.configured)posts=await asset('/assets/original-posts.json');
    if(title){
      const slug=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('slug');
      const p=health.configured?await request('article&slug='+encodeURIComponent(slug||'')):posts.find(p=>p.slug===slug);
      if(!p)throw Error('Bài viết không tồn tại hoặc chưa được xuất bản.');
      const display=CMS.presentation(p,legacy);
      document.title=p.title+' - CLB Doanh Nhan Ho Le Dak Lak';
      title.textContent=p.title;document.getElementById('tag').textContent=display.detailTag;
      document.getElementById('date').textContent=display.detailDate;
      const description=document.querySelector('meta[name="description"]');if(description)description.content=p.excerpt||p.title;
      const banner=document.getElementById('banner');banner.textContent=p.category==='Doanh nghiệp thành viên'?'🏢':display.emoji;
      CMS.renderBody(document.getElementById('content'),p.body);
      if(CMS.imageURL(p.cover_url)){
        const cover=el('figure'),img=el('img');img.src=CMS.imageURL(p.cover_url);img.alt=p.title;
        cover.append(img);document.getElementById('content').prepend(cover);
      }
      return;
    }
    if(health.configured)({posts,content}=await request('public'));
    if(content.length){
      const fields=await asset('/assets/content-fields.json');
      for(const c of content){
        const field=fields.find(f=>f.id===c.id),target=field&&document.querySelector(field.selector||'[data-cms="'+field.id+'"]');
        if(target&&c.value!==field.default){
          if(field.kind==='href'){
            if(CMS.websiteURL(c.value)||/^(#[a-zA-Z][\w-]*|tel:\+?[\d ()-]+|mailto:[^\s@]+@[^\s@]+|\/(?!\/)[\w./?#=&%-]*)$/.test(c.value)){target.setAttribute('href',c.value);target.setAttribute('rel','noopener noreferrer')}
          }else if(field.kind==='src'){if(CMS.imageURL(c.value))target.src=CMS.imageURL(c.value);
          }else if(field.kind==='image'){
            if(CMS.imageURL(c.value)){const img=el('img');img.src=CMS.imageURL(c.value);img.alt='Ảnh đại diện';img.style.cssText='width:100%;height:100%;object-fit:cover';target.replaceChildren(img)}
          }else if(field.id==='hero-title'){
            const lines=c.value.split('\n'),em=el('em',lines[1]||'');
            target.replaceChildren(document.createTextNode(lines[0]||''));
            if(lines.length>1)target.append(el('br'),em);
            for(const line of lines.slice(2))target.append(el('br'),document.createTextNode(line));
          }else{target.textContent=c.value;target.style.whiteSpace='pre-line'}
        }
      }
    }
    const memberSection=document.getElementById('thanhVien');
    if(memberSection&&health.configured){
      try{
        const members=await request('members');
        if(members.length){
          const grid=el('div',undefined,'members-grid');
          for(const member of members){
            const card=el('a',undefined,'member-card');card.href='/doanh-nghiep.html?id='+encodeURIComponent(member.slug);card.style.cssText='text-decoration:none;color:inherit';
            const avatar=el('div','Lê','member-avatar');
            if(CMS.imageURL(member.cover_url)){const img=el('img');img.src=CMS.imageURL(member.cover_url);img.alt=member.title;img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:inherit';avatar.replaceChildren(img)}
            card.append(avatar,el('h4',member.title),el('p',member.excerpt,'biz'));grid.append(card);
          }
          memberSection.lastElementChild.replaceWith(grid);
        }
      }catch{ /* Keep the existing member placeholder when the directory cannot load. */ }
    }
    if(!news)return;
    let category='',term='';
    function render(){
      const found=posts.filter(p=>(!category||p.category===category)&&(!term||(p.title+' '+p.excerpt).toLocaleLowerCase('vi').includes(term)));
      const cards=found.map(p=>{
        const display=CMS.presentation(p,legacy),template=originalCards.get(p.slug);
        let card;
        if(template){
          card=template.cloneNode(true);
          for(const [selector,text] of [['.news-tag',display.category],['h3',display.title],['p',display.excerpt],['.news-date',display.date]]){
            const target=card.querySelector(selector);if(target.textContent.trim()!==text)target.textContent=text;
          }
        }else{
          card=el('a',undefined,'news-card');card.href='/tin-chi-tiet.html?id='+encodeURIComponent(p.slug);
          const visual=el('div',display.emoji,'news-img-placeholder');if(display.imageStyle)visual.setAttribute('style',display.imageStyle);
          const body=el('div',undefined,'news-body');
          body.append(el('div',display.category,'news-tag'),el('h3',display.title),el('p',display.excerpt),el('div',display.date,'news-date'));
          card.append(visual,body);
        }
        if(CMS.imageURL(p.cover_url)){
          const img=el('img');img.src=CMS.imageURL(p.cover_url);img.alt='';img.loading='lazy';
          img.style.cssText='width:100%;height:100%;object-fit:cover';card.querySelector('.news-img-placeholder').replaceChildren(img);
        }
        return card;
      });
      news.replaceChildren(...cards);if(!cards.length)news.append(el('p','Chưa có bài viết trong mục này.'));
    }
    for(const button of document.querySelectorAll('.tab-btn'))button.onclick=()=>{
      category=button.textContent.trim()==='Tất cả'?'':button.textContent.trim();
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b===button));render();
    };
    const search=document.getElementById('newsSearch');if(search)search.oninput=()=>{term=search.value.toLocaleLowerCase('vi');render()};render();
  }catch(e){
    if(news)news.replaceChildren(el('p','Chưa tải được tin tức. Vui lòng tải lại trang sau ít phút.'));
    if(title){title.textContent='Chưa mở được bài viết';document.getElementById('content').textContent=e.message}
  }
})();
