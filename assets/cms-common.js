(function(root) {
  'use strict';
  const categories = ['Kết nối · Giao thương', 'Sự kiện quốc gia', 'Khuyến học', 'Tri ân tiên tổ', 'Tương thân tương ái', 'Thông báo', 'Doanh nghiệp thành viên'];
  function websiteURL(value) {
    try { const u=new URL(value); return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:''; } catch { return ''; }
  }
  function slug(value) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
  function imageURL(value) {
    if (typeof value !== 'string') return '';
    if (/^\/[a-zA-Z0-9_./-]+$/.test(value) && !value.startsWith('//') && !value.includes('..')) return value;
    try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; }
  }
  function validatePost(input) {
    if (!input || typeof input !== 'object') throw Error('Dữ liệu bài viết không hợp lệ.');
    const limit = (v, n, required=false) => { if (typeof v !== 'string' || v.length > n || (required && !v.trim())) throw Error('Nội dung trống hoặc vượt giới hạn.'); return v.trim(); };
    const title=limit(input.title,240,true), s=limit(input.slug,180,true);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) throw Error('Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch ngang.');
    if (!categories.includes(input.category)) throw Error('Chuyên mục không hợp lệ.');
    if (!['draft','published','trash'].includes(input.status)) throw Error('Trạng thái không hợp lệ.');
    if (!Array.isArray(input.body) || !input.body.length || input.body.length > 100) throw Error('Bài viết cần từ 1 đến 100 đoạn nội dung.');
    const body=input.body.map(b=> {
      if(b.type==='profile') {
        if(input.category!=='Doanh nghiệp thành viên')throw Error('Thông tin doanh nghiệp chỉ dùng trong hồ sơ thành viên.');
        const website=b.website?websiteURL(b.website):'';
        if(b.website&&!website)throw Error('Website doanh nghiệp không hợp lệ.');
        return {type:'profile',representative:limit(b.representative||'',240),sector:limit(b.sector||'',240),phone:limit(b.phone||'',80),address:limit(b.address||'',500),website};
      }
      if (b.type === 'link') { const href=websiteURL(b.href); if(!href) throw Error('Liên kết website phải bắt đầu bằng https:// hoặc http://.'); return {type:'link',href,text:limit(b.text,240,true)}; }
      if (b.type === 'img') { const src=imageURL(b.src); if(!src) throw Error('Địa chỉ ảnh không hợp lệ.'); return {type:'img',src,caption:limit(b.caption || '',500)}; }
      if (!['p','h2'].includes(b.type)) throw Error('Loại đoạn nội dung không hợp lệ.');
      return {type:b.type,text:limit(b.text,20000,true)};
    });
    if(body.filter(b=>b.type==='profile').length>1)throw Error('Hồ sơ chỉ có một phần thông tin doanh nghiệp.');
    let published_at=input.published_at || null;
    if (published_at && !Number.isFinite(Date.parse(published_at))) throw Error('Ngày đăng không hợp lệ.');
    if (input.status==='published' && !published_at) published_at=new Date().toISOString();
    if (published_at && Date.parse(published_at)>Date.now()+60000) throw Error('Chưa hỗ trợ hẹn giờ. Chọn ngày hiện tại hoặc trước đó.');
    const cover_url=input.cover_url ? imageURL(input.cover_url) : '';
    if(input.cover_url && !cover_url) throw Error('Ảnh bìa không hợp lệ.');
    return {title,slug:s,category:input.category,excerpt:limit(input.excerpt||'',600),body,status:input.status,cover_url,published_at};
  }
  function renderBody(container, body) {
    container.replaceChildren();
    for(const b of body || []) {
      if(b.type==='profile') {
        for(const [key,label] of [['representative','Thành viên đại diện'],['sector','Lĩnh vực'],['phone','Điện thoại'],['address','Địa chỉ']])if(b[key]){const p=document.createElement('p');p.textContent=label+': '+b[key];container.append(p)}
        if(websiteURL(b.website)){const p=document.createElement('p'),a=document.createElement('a');a.href=websiteURL(b.website);a.textContent='Truy cập website doanh nghiệp ↗';a.target='_blank';a.rel='noopener noreferrer';p.append(a);container.append(p)}
      }
      if(b.type==='img') { const src=imageURL(b.src); if(!src) continue; const fig=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption'); img.src=src;img.alt=b.caption||'';img.loading='lazy';cap.textContent=b.caption||'';fig.append(img,cap);container.append(fig); }
      else if(b.type==='link') { const href=websiteURL(b.href);if(!href)continue;const p=document.createElement('p'),a=document.createElement('a');a.href=href;a.textContent=b.text;a.target='_blank';a.rel='noopener noreferrer';p.append(a);container.append(p); }
      else if(['p','h2'].includes(b.type)) { const el=document.createElement(b.type);el.textContent=b.text;container.append(el); }
    }
  }
  function presentation(post, legacy={}) {
    const old=legacy[post.slug], baseline=old?.baseline;
    const unchangedDate=baseline && Date.parse(post.published_at)===Date.parse(baseline.published_at);
    const day=new Date(post.published_at);
    const parts=Number.isFinite(day.getTime())?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',day:'2-digit',month:'numeric',year:'numeric'}).formatToParts(day):[];
    const part=name=>parts.find(p=>p.type===name)?.value||'';
    const date=parts.length?`📅 ${part('day')} tháng ${Number(part('month'))}, ${part('year')}`:'';
    return {
      title:baseline&&post.title===baseline.title?old.title:post.title,
      excerpt:baseline&&post.excerpt===baseline.excerpt?old.excerpt:post.excerpt,
      category:baseline&&post.category===baseline.category?old.category:post.category,
      date:unchangedDate?old.date:date,
      detailTag:baseline&&post.category===baseline.category?old.detailTag:post.category,
      detailDate:unchangedDate?old.detailDate:date,
      emoji:old?.emoji||({'Kết nối · Giao thương':'☕','Sự kiện quốc gia':'🏆','Khuyến học':'🎓','Tri ân tiên tổ':'🌿','Tương thân tương ái':'🤝'})[post.category]||'📰',
      imageStyle:old?.imageStyle||''
    };
  }
  const api={categories,slug,imageURL,websiteURL,validatePost,renderBody,presentation};
  if(typeof module!=='undefined') module.exports=api; else root.CMS=api;
})(typeof window==='undefined'?globalThis:window);
