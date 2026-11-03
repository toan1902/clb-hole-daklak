(function(){
  'use strict';
  // Đọc danh sách công khai từ công cụ quản lý thành viên (thanhvien-ldbc.vercel.app).
  // Sửa thông tin ở công cụ đó, trang này tự hiện bản mới.
  var SOURCE='/api/stc?action=club-members';
  var $=function(id){return document.getElementById(id);};
  var all=[];
  function el(tag,text,cls){var n=document.createElement(tag);if(text!=null&&text!=='')n.textContent=text;if(cls)n.className=cls;return n;}
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function url(v){v=clean(v);if(!v)return '';if(!/^https?:\/\//i.test(v))v='https://'+v;try{var u=new URL(v);return /^https?:$/.test(u.protocol)&&!u.username?u.href:'';}catch(e){return '';}}
  function photo(v){v=String(v||'');return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)||/^https:\/\//.test(v)?v:'';}
  function initials(n){var p=clean(n).split(' ');return (p.length>1?p[p.length-2][0]+p[p.length-1][0]:p[0][0]||'L').toUpperCase();}
  function rank(r){r=clean(r).toLowerCase();if(/^chủ tịch/.test(r))return 0;if(/phó chủ tịch/.test(r))return 1;if(/chánh văn phòng/.test(r))return 2;if(/ủy viên|uỷ viên/.test(r))return 3;return 4;}
  function tel(v){return clean(v).replace(/[^0-9+]/g,'');}
  function card(m){
    var c=el('article',null,'ml-card'),h=el('div',null,'ml-head'),av=el('div',null,'ml-avatar'),p=photo(m.photo);
    if(p){var img=document.createElement('img');img.src=p;img.alt='Ảnh '+clean(m.name);img.loading='lazy';av.appendChild(img);}else av.textContent=initials(m.name);
    var t=el('div');t.appendChild(el('h2',clean(m.name),'ml-name'));if(clean(m.role))t.appendChild(el('span',clean(m.role),'ml-role'));
    h.appendChild(av);h.appendChild(t);c.appendChild(h);
    if(clean(m.company)){var co=el('div',clean(m.company),'ml-company');if(clean(m.position))co.appendChild(el('small',clean(m.position)));c.appendChild(co);}
    var dl=el('dl',null,'ml-info');
    [['Lĩnh vực',m.industry],['Địa chỉ',m.address],['Chi nhánh',m.branches],['Điện thoại',m.phone],['Email',m.email]].forEach(function(r){if(!clean(r[1]))return;var d=el('div');d.appendChild(el('dt',r[0]));d.appendChild(el('dd',clean(r[1])));dl.appendChild(d);});
    if(dl.childNodes.length)c.appendChild(dl);
    var intro=String(m.intro||'').trim();if(intro&&clean(intro)!==clean(m.industry))c.appendChild(el('p',intro,'ml-intro'));
    var a=el('div',null,'ml-actions');
    function link(text,href,primary){if(!href)return;var x=el('a',text,'btn '+(primary?'primary':'ghost'));x.href=href;if(/^https?:/.test(href)){x.target='_blank';x.rel='noopener';}a.appendChild(x);}
    if(tel(m.phone))link('Gọi '+clean(m.phone),'tel:'+tel(m.phone),true);
    if(tel(m.zalo))link('Zalo','https://zalo.me/'+tel(m.zalo));
    link('Website',url(m.website));
    var fb=url(m.facebook);if(fb&&!/facebook\.com\/?$/.test(fb))link('Facebook',fb);
    if(clean(m.email))link('Email','mailto:'+clean(m.email));
    if(a.childNodes.length)c.appendChild(a);
    return c;
  }
  function render(){
    var q=clean($('mlSearch').value).toLowerCase(),list=all.filter(function(m){return !q||[m.name,m.company,m.industry,m.role,m.position,m.address].join(' ').toLowerCase().indexOf(q)>=0;});
    $('mlList').replaceChildren.apply($('mlList'),list.map(card));
    $('mlCount').textContent=list.length+' / '+all.length+' thành viên';
    $('mlStatus').textContent=list.length?'':'Không tìm thấy thành viên phù hợp.';
  }
  $('mlSearch').addEventListener('input',render);
  fetch(SOURCE,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error();return r.json();}).then(function(d){
    all=(d.members||[]).filter(function(m){return m&&clean(m.name);}).sort(function(a,b){return rank(a.role)-rank(b.role)||clean(a.name).localeCompare(clean(b.name),'vi');});
    $('mlStatus').textContent='';render();
  }).catch(function(){var s=$('mlStatus');s.textContent='Chưa tải được danh sách. Vui lòng tải lại trang sau ít phút.';s.className='ml-status err';});
})();
