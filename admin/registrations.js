(function(){
  'use strict';
  var API=(window.STC_CONFIG&&window.STC_CONFIG.API_BASE)||'/api/stc';
  var $=function(id){return document.getElementById(id);};
  var rows=[];
  var LABELS={new:'Mới',contacted:'Đã liên hệ',approved:'Đã chấp thuận',rejected:'Không chấp thuận'};
  var COLS=[['created_at','Ngày gửi'],['full_name','Họ và tên'],['birth_date','Ngày sinh'],['occupation','Nghề nghiệp'],['address','Địa chỉ thường trú'],['id_number','Số CCCD'],['id_place','Nơi cấp'],['phone','Điện thoại'],['email','Email'],['company','Tên doanh nghiệp'],['company_address','Địa chỉ trụ sở'],['business_license','Giấy phép ĐKKD'],['company_phone','Điện thoại DN'],['fax','Fax'],['website','Website'],['note','Ghi chú'],['status','Trạng thái']];
  function api(action,body){
    return fetch(API+'?action='+action,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok){var e=new Error(j.message||'Có lỗi xử lý.');e.status=r.status;throw e;}return j;});});
  }
  function fmt(d){var t=new Date(d);return isNaN(t)?'':t.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
  function el(tag,text,cls){var n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
  function lines(parent,items){items.filter(function(x){return x[1];}).forEach(function(x){var d=el('div');d.appendChild(el('strong',x[0]+': '));d.appendChild(document.createTextNode(x[1]));parent.appendChild(d);});}
  function render(){
    var f=$('statusFilter').value,list=rows.filter(function(r){return !f||r.status===f;}),body=$('regBody');
    body.replaceChildren();
    $('regCount').textContent=list.length+' đơn'+(f?' ('+LABELS[f]+')':'')+' · '+rows.filter(function(r){return r.status==='new';}).length+' đơn mới';
    if(!list.length){var tr=el('tr'),td=el('td','Chưa có đơn đăng ký.','reg-empty');td.colSpan=6;tr.appendChild(td);body.appendChild(tr);return;}
    list.forEach(function(r){
      var tr=el('tr',undefined,'status-'+r.status);
      tr.appendChild(el('td',fmt(r.created_at)));
      tr.appendChild(el('td',r.full_name));
      var c=el('td');var a=el('a',r.phone);a.href='tel:'+r.phone.replace(/[^0-9+]/g,'');c.appendChild(a);if(r.email){c.appendChild(el('br'));c.appendChild(document.createTextNode(r.email));}tr.appendChild(c);
      tr.appendChild(el('td',r.company||'—'));
      var d=el('td',undefined,'detail');lines(d,[['Ngày sinh',r.birth_date],['Nghề nghiệp',r.occupation],['Địa chỉ',r.address],['CCCD',r.id_number&&(r.id_number+(r.id_place?' – '+r.id_place:''))],['Trụ sở',r.company_address],['ĐKKD',r.business_license],['ĐT DN',r.company_phone],['Fax',r.fax],['Website',r.website],['Ghi chú',r.note]]);tr.appendChild(d);
      var s=el('td'),sel=document.createElement('select');sel.setAttribute('aria-label','Trạng thái đơn của '+r.full_name);
      Object.keys(LABELS).forEach(function(k){var o=el('option',LABELS[k]);o.value=k;if(k===r.status)o.selected=true;sel.appendChild(o);});
      sel.onchange=function(){var prev=r.status;sel.disabled=true;api('registration-status',{id:r.id,status:sel.value}).then(function(u){r.status=u.status;$('regMessage').textContent='Đã cập nhật trạng thái đơn của '+r.full_name+'.';render();}).catch(function(e){sel.value=prev;sel.disabled=false;$('regMessage').textContent=e.message;});};
      s.appendChild(sel);tr.appendChild(s);body.appendChild(tr);
    });
  }
  function csv(){
    var esc=function(v){v=String(v==null?'':v);return /[",\n;]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    var out=[COLS.map(function(c){return c[1];}).join(',')].concat(rows.map(function(r){return COLS.map(function(c){var v=r[c[0]];if(c[0]==='created_at')v=fmt(v);if(c[0]==='status')v=LABELS[v]||v;if(c[0]==='id_number'||c[0]==='phone')v=v?'="'+v+'"':'';return esc(v);}).join(',');}));
    var blob=new Blob(['﻿'+out.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');
    a.href=url;a.download='don-dang-ky-ldbc-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  $('statusFilter').onchange=render;
  $('csvButton').onclick=csv;
  api('registrations').then(function(list){rows=list;$('regMessage').textContent='';$('csvButton').disabled=false;render();})
    .catch(function(e){
      if(e.status===401||e.status===403){$('regMessage').textContent='';var p=$('regMessage');p.appendChild(document.createTextNode('Vui lòng đăng nhập trang quản trị trước. '));var a=el('a','Mở trang đăng nhập →');a.href='/admin/';p.appendChild(a);}
      else $('regMessage').textContent=e.message;
    });
})();
