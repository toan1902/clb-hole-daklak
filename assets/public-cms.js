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
    const [health,legacy,catalog]=await Promise.all([request('health'),asset('/assets/legacy-layout.json?v=2'),asset('/assets/members.json?v=4')]);
    let posts=[],content=[];
    if(!health.configured)posts=await asset('/assets/original-posts.json');
    if(location.pathname==='/thanh-vien.html'){
      const id=new URLSearchParams(location.search).get('id');
      const [businesses,homepage]=health.configured?await Promise.all([request('members'),request('public')]):[[],{content:[]}];
      const owned=businesses.filter(p=>CMS.memberKey(p)===id),original=catalog.find(m=>m.id===id);
      const profile=owned[0]?.body?.find(b=>b.type==='profile');
      if(!original&&!profile)throw Error('Không tìm thấy hồ sơ thành viên.');
      const field=(key,fallback='')=>homepage.content.find(c=>c.id===original?.fields?.[key])?.value??original?.[key]??fallback;
      const name=field('name',profile?.representative||'Thành viên');
      title.textContent=name;document.title=name+' · Hồ sơ thành viên LĐBC';
      document.getElementById('tag').textContent=field('role','Thành viên');
      document.getElementById('date').textContent='';
      const banner=document.getElementById('banner');banner.textContent=original?.initials||'Lê';
      const avatar=CMS.imageURL(field('avatar'));
      if(avatar){const img=el('img');img.src=avatar;img.alt=name;img.style.cssText='width:160px;height:160px;object-fit:cover;border-radius:50%';banner.replaceChildren(img)}
      const container=document.getElementById('content');container.replaceChildren();
      if(field('bio'))container.append(el('p',field('bio')));
      const phone=field('phone');if(/^tel:\+?[\d ()-]+$/.test(phone)){const a=el('a','Điện thoại: '+phone.slice(4));a.href=phone;container.append(a)}
      container.append(el('h2','Doanh nghiệp của thành viên'));
      if(!owned.length){container.append(el('p','Thông tin doanh nghiệp đang được cập nhật.'))}
      else{
        const grid=el('div',undefined,'biz-grid');
        for(const business of owned){
          const profileBlock=business.body?.find(b=>b.type==='profile');
          const card=el('a',undefined,'biz-card');card.href='/doanh-nghiep.html?id='+encodeURIComponent(business.slug);
          const thumb=el('div',undefined,'biz-thumb');const cover=CMS.imageURL(business.cover_url);
          if(cover){const img=el('img');img.src=cover;img.alt=business.title;img.loading='lazy';thumb.append(img)}else thumb.textContent='🏢';
          const info=el('div',undefined,'biz-info');info.append(el('h3',business.title));
          if(profileBlock?.sector)info.append(el('span',profileBlock.sector,'biz-sector'));
          if(business.excerpt)info.append(el('p',business.excerpt,'biz-excerpt'));
          info.append(el('span','Xem chi tiết →','biz-link'));
          card.append(thumb,info);grid.append(card);
        }
        container.append(grid);
      }
      return;
    }
    if(title){
      const slug=new URLSearchParams(location.search).get('id')||new URLSearchParams(location.search).get('slug');
      const p=health.configured?await request('article&slug='+encodeURIComponent(slug||'')):posts.find(p=>p.slug===slug);
      if(!p)throw Error('Bài viết không tồn tại hoặc chưa được xuất bản.');
      const display=CMS.presentation(p,legacy);
      document.title=p.title+' - CLB Doanh Nhan Ho Le Dak Lak';
      title.textContent=p.title;
      const profileBlock=p.category==='Doanh nghiệp thành viên'?p.body?.find(b=>b.type==='profile'):null;
      document.getElementById('tag').textContent=profileBlock?.sector||display.detailTag;
      document.getElementById('date').textContent=display.detailDate;
      const description=document.querySelector('meta[name="description"]');if(description)description.content=p.excerpt||p.title;
      const banner=document.getElementById('banner');const bizLogo=profileBlock?CMS.imageURL(p.cover_url):'';
      if(bizLogo){const img=el('img');img.src=bizLogo;img.alt=p.title;img.style.cssText='width:140px;height:140px;object-fit:cover;border-radius:50%';banner.replaceChildren(img)}
      else banner.textContent=p.category==='Doanh nghiệp thành viên'?'🏢':display.emoji;
      CMS.renderBody(document.getElementById('content'),p.body);
      if(!profileBlock&&CMS.imageURL(p.cover_url)){
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
    document.querySelectorAll('.leader-card').forEach((card,i)=>{
      const member=catalog[i];if(!member)return;
      const href='/thanh-vien.html?id='+encodeURIComponent(member.id);
      card.style.cursor='pointer';card.tabIndex=0;card.setAttribute('role','link');card.setAttribute('aria-label','Hồ sơ '+card.querySelector('h3').textContent);
      card.onclick=e=>{if(!e.target.closest('a,button'))location.href=href};
      card.onkeydown=e=>{if(e.target===card&&e.key==='Enter'){e.preventDefault();location.href=href}};
    });
    if(memberSection&&health.configured){
      try{
        const members=await request('members');
        const people=new Map();
        for(const business of members){const key=CMS.memberKey(business),profile=business.body?.find(b=>b.type==='profile');if(key&&!catalog.some(m=>m.id===key)&&!people.has(key))people.set(key,{profile,cover:business.cover_url})}
        if(people.size){
          const grid=el('div',undefined,'members-grid');
          for(const [id,member] of people){
            const card=el('a',undefined,'member-card');card.href='/thanh-vien.html?id='+encodeURIComponent(id);card.style.cssText='text-decoration:none;color:inherit';
            const avatar=el('div',undefined,'member-avatar');
            const photo=CMS.imageURL(member.cover);
            if(photo){const img=el('img');img.src=photo;img.alt=member.profile.representative||'';img.loading='lazy';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';avatar.append(img)}
            else avatar.textContent='Lê';
            card.append(avatar,el('h4',member.profile.representative),el('p','Xem hồ sơ và doanh nghiệp','biz'));grid.append(card);
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
