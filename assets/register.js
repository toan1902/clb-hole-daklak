(function(){
  'use strict';
  var form=document.getElementById('regForm'),msg=document.getElementById('formMessage'),btn=document.getElementById('submitButton'),thanks=document.getElementById('thanks');
  if(!form)return;
  var api=(window.STC_CONFIG&&window.STC_CONFIG.API_BASE)||'/api/stc';
  var fields=['full_name','birth_date','occupation','address','id_number','id_place','phone','company','company_address','business_license','company_phone','fax','website','email','note','hp'];
  function fail(name,text){var el=form.elements[name];msg.textContent=text;if(el){el.setAttribute('aria-invalid','true');el.focus();}return false;}
  function check(d){
    if(d.full_name.length<2)return fail('full_name','Vui lòng nhập họ và tên đầy đủ.');
    if(!/^\+?[0-9 .()-]{8,20}$/.test(d.phone)||d.phone.replace(/\D/g,'').length<9)return fail('phone','Số điện thoại chưa đúng.');
    if(d.id_number&&!/^[0-9]{9,12}$/.test(d.id_number))return fail('id_number','Số CCCD gồm 12 chữ số.');
    if(d.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))return fail('email','Email chưa đúng.');
    if(!d.agreed_rules)return fail('agreed_rules','Vui lòng xác nhận đã đọc và tán thành Quy chế LĐBC.');
    if(!d.agreed_data)return fail('agreed_data','Vui lòng đồng ý cho CLB sử dụng thông tin để xét đơn.');
    return true;
  }
  form.addEventListener('input',function(e){if(e.target.getAttribute('aria-invalid'))e.target.removeAttribute('aria-invalid');});
  form.addEventListener('submit',function(e){
    e.preventDefault();msg.textContent='';
    var d={};fields.forEach(function(f){d[f]=(form.elements[f]&&form.elements[f].value||'').trim();});
    d.agreed_rules=form.elements.agreed_rules.checked;d.agreed_data=form.elements.agreed_data.checked;
    if(!check(d))return;
    btn.disabled=true;btn.textContent='Đang gửi…';
    fetch(api+'?action=register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(j){if(!r.ok)throw new Error(j.message||'Chưa gửi được đơn. Vui lòng thử lại.');});})
      .then(function(){form.hidden=true;thanks.hidden=false;thanks.focus();thanks.scrollIntoView({behavior:'smooth',block:'start'});})
      .catch(function(err){msg.textContent=(err&&err.message)||'Chưa gửi được đơn. Vui lòng thử lại hoặc gọi 0823 047 047.';btn.disabled=false;btn.textContent='Gửi đơn đăng ký';});
  });
})();
