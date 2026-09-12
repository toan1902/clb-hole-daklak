(function(root){
 'use strict';
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
 const aliases={title:['ten doanh nghiep','ten cong ty','company','company name','title','doanh nghiep','cong ty'],representative:['nguoi dai dien','dai dien','thanh vien dai dien','representative','giam doc'],sector:['linh vuc','linh vuc kinh doanh','nganh nghe','sector','industry'],phone:['dien thoai','so dien thoai','sdt','hotline','phone','tel'],address:['dia chi','tru so','dia chi tru so','address'],website:['website','web','trang web','url'],facebook:['facebook','fanpage','trang facebook','fb','fb page'],excerpt:['tom tat','gioi thieu ngan','excerpt','summary'],description:['noi dung','gioi thieu','gioi thieu doanh nghiep','mo ta','description','content']};
 const keyFor=k=>Object.keys(aliases).find(key=>aliases[key].some(a=>normalize(a)===normalize(k)));
 function csvRows(text){
  const first=text.split(/\r?\n/)[0],delimiter=first.includes('\t')?'\t':(first.split(';').length>first.split(',').length?';':',');
  let rows=[],row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){row.push(cell.trim());cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}
  if(quoted)throw Error('Tệp CSV có dấu ngoặc kép chưa đóng.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
 }
 function website(value){let s=String(value||'').trim().replace(/[),.;]+$/,'');if(s&&!/^https?:\/\//i.test(s))s='https://'+s;try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:''}catch{return ''}}
 function analyze(text,format='txt'){
  if(typeof text!=='string'||text.length>100000)throw Error('Nội dung quá dài. Chọn tài liệu dưới 100.000 ký tự.');
  text=text.replace(/^\uFEFF/,'').replace(/\u0000/g,'').trim();if(!text)throw Error('Không tìm thấy văn bản để nhận diện.');
  const data={},sources={},warnings=[];let bodyText=text;
  const put=(key,value,source)=>{if(key&&typeof value==='string'&&value.trim()&&!data[key]){data[key]=value.trim();sources[key]=source}};
  if(format==='json'){
   let obj;try{obj=JSON.parse(text)}catch{throw Error('Tệp JSON không hợp lệ.')}
   if(!obj||Array.isArray(obj)||typeof obj!=='object')throw Error('JSON cần chứa một đối tượng thông tin doanh nghiệp.');
   for(const [key,value]of Object.entries(obj))put(keyFor(key),value,'Trường '+key);
   bodyText=data.description||'';
  }else if(format==='csv'){
   const rows=csvRows(text);
   if(rows.length<2)throw Error('CSV cần có tên trường và dữ liệu.');
   if(rows[0].filter(k=>keyFor(k)).length>=2){if(rows.length>2)throw Error('Mỗi lần nhập một doanh nghiệp. Tệp CSV đang có nhiều dòng doanh nghiệp.');rows[0].forEach((k,i)=>put(keyFor(k),rows[1][i],'Cột '+k))}
   else for(const row of rows)put(keyFor(row[0]),row.slice(1).join(', '),'Dòng '+row[0]);
   bodyText=data.description||'';
  }else{
   const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),unlabeled=[];let continuation='';
   for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^([^:\t]{2,65})\s*[:\t]\s*(.*)$/),key=m&&keyFor(m[1]);
    if(key){continuation=key==='description'?'description':'';put(key,m[2]||lines[++i]||'','Nhãn '+m[1]);continue}
    const nextKey=keyFor(lines[i]);if(nextKey&&lines[i+1]){continuation=nextKey==='description'?'description':'';put(nextKey,lines[++i],'Nhãn trên dòng trước');continue}
    if(continuation){data.description+='\n\n'+lines[i];continue}unlabeled.push(lines[i]);
   }
   if(!data.title){const line=lines.find(s=>/^(công ty|cty|doanh nghiệp|hộ kinh doanh|company)\b/i.test(s));if(line)put('title',line,'Dòng tên doanh nghiệp')}
   if(!data.phone){const m=text.match(/(?:\+84|0[235789])(?:[ .()-]*\d){7,9}\b/);if(m)put('phone',m[0],'Số điện thoại trong văn bản')}
   if(!data.website){const m=text.match(/https?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+/i);if(m)put('website',m[0],'Liên kết trong văn bản')}
   if(!data.facebook){const m=text.match(/https?:\/\/(?:www\.|m\.)?facebook\.com\/[^\s<>"']+/i);if(m)put('facebook',m[0],'Liên kết Facebook trong văn bản')}
   bodyText=data.description||unlabeled.filter(s=>s!==data.title).join('\n\n');
  }
  if(data.website){const url=website(data.website);if(url)data.website=url;else{delete data.website;warnings.push('Không áp dụng địa chỉ website không hợp lệ.')}}
  if(data.facebook){const url=website(data.facebook);if(url)data.facebook=url;else{delete data.facebook;warnings.push('Không áp dụng liên kết Facebook không hợp lệ.')}}
  if(!data.excerpt&&data.description){data.excerpt=data.description.slice(0,600);sources.excerpt='Phần đầu giới thiệu'}
  if(bodyText)data.body=bodyText;delete data.description;
  const limits={title:240,representative:240,sector:240,phone:80,address:500,website:2000,facebook:2000,excerpt:600,body:100000};
  for(const key of Object.keys(data))if(data[key].length>limits[key]){data[key]=data[key].slice(0,limits[key]);warnings.push('Đã rút gọn trường '+key+' theo giới hạn.')}
  if(!Object.keys(data).length)throw Error('Chưa nhận diện được thông tin. Thêm nhãn như “Tên doanh nghiệp:”, “Địa chỉ:”, “Website:”.');
  return {data,sources,warnings};
 }
 const api={analyze,csvRows,website};if(typeof module!=='undefined')module.exports=api;else root.BusinessImport=api;
})(typeof window==='undefined'?globalThis:window);
