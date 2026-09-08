(function(root) {
  'use strict';
  const categories = ['Kết nối · Giao thương', 'Sự kiện quốc gia', 'Khuyến học', 'Tri ân tiên tổ', 'Tương thân tương ái', 'Thông báo'];
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
      if (b.type === 'img') { const src=imageURL(b.src); if(!src) throw Error('Địa chỉ ảnh không hợp lệ.'); return {type:'img',src,caption:limit(b.caption || '',500)}; }
      if (!['p','h2'].includes(b.type)) throw Error('Loại đoạn nội dung không hợp lệ.');
      return {type:b.type,text:limit(b.text,20000,true)};
    });
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
      if(b.type==='img') { const src=imageURL(b.src); if(!src) continue; const fig=document.createElement('figure'),img=document.createElement('img'),cap=document.createElement('figcaption'); img.src=src;img.alt=b.caption||'';img.loading='lazy';cap.textContent=b.caption||'';fig.append(img,cap);container.append(fig); }
      else if(['p','h2'].includes(b.type)) { const el=document.createElement(b.type);el.textContent=b.text;container.append(el); }
    }
  }
  const api={categories,slug,imageURL,validatePost,renderBody};
  if(typeof module!=='undefined') module.exports=api; else root.CMS=api;
})(typeof window==='undefined'?globalThis:window);
