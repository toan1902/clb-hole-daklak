const MAX_TEXT=100000,MAX_FILE=5*1024*1024;
function xml(text){if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Tệp XML chứa khai báo không được hỗ trợ.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw Error('Cấu trúc tài liệu không hợp lệ.');return doc}
const elements=(doc,name)=>[...doc.getElementsByTagNameNS('*',name)];
export async function readBusinessFile(file,onProgress=()=>{}){
 if(!file||file.size>MAX_FILE)throw Error('Chọn tệp tối đa 5 MB.');
 const ext=file.name.split('.').pop().toLowerCase();
 if(!['txt','csv','json','docx','xlsx','pdf'].includes(ext))throw Error('Hỗ trợ Word DOCX, PDF có văn bản, Excel XLSX, TXT, CSV và JSON.');
 onProgress('Đang đọc '+file.name+'…');
 const bytes=new Uint8Array(await file.arrayBuffer());let text='',format='txt';
 if(['txt','csv','json'].includes(ext)){text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);format=ext}
 else if(ext==='docx'||ext==='xlsx'){
  const {unzipSync,strFromU8}=await import('/assets/vendor/fflate.mjs');
  const wanted=ext==='docx'?['word/document.xml']:['xl/sharedStrings.xml','xl/worksheets/sheet1.xml'];let total=0;
  const files=unzipSync(bytes,{filter:f=>{if(!wanted.includes(f.name))return false;total+=f.originalSize;if(f.originalSize>5*1024*1024||total>10*1024*1024)throw Error('Nội dung giải nén quá lớn. Hãy dùng tệp rút gọn.');return true}});
  if(ext==='docx'){
   if(!files['word/document.xml'])throw Error('Không tìm thấy nội dung trong tệp Word.');
   const doc=xml(strFromU8(files['word/document.xml']));
   text=elements(doc,'p').map(p=>elements(p,'t').map(t=>t.textContent).join('')).join('\n');
  }else{
   if(!files['xl/worksheets/sheet1.xml'])throw Error('Không tìm thấy trang tính đầu tiên.');
   const shared=files['xl/sharedStrings.xml']?elements(xml(strFromU8(files['xl/sharedStrings.xml'])),'si').map(si=>elements(si,'t').map(t=>t.textContent).join('')):[];
   const sheet=xml(strFromU8(files['xl/worksheets/sheet1.xml']));
   const rows=elements(sheet,'row');if(rows.length>1000)throw Error('Trang tính quá dài. Chọn tệp chỉ chứa một doanh nghiệp.');
   text=rows.map(row=>{const values=[];for(const c of elements(row,'c')){const letters=(c.getAttribute('r')||'A').match(/^[A-Z]+/)[0];let index=0;for(const l of letters)index=index*26+l.charCodeAt(0)-64;if(index>50)throw Error('Chỉ hỗ trợ tối đa 50 cột.');const raw=elements(c,'v')[0]?.textContent||'';values[index-1]=c.getAttribute('t')==='s'?(shared[Number(raw)]||''):c.getAttribute('t')==='inlineStr'?elements(c,'t').map(t=>t.textContent).join(''):raw;}return Array.from({length:values.length},(_,i)=>'"'+(values[i]||'').replaceAll('"','""')+'"').join('\t')}).join('\n');format='csv';
  }
 }else{
  const pdfjs=await import('/assets/vendor/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/assets/vendor/pdf.worker.mjs';
  const task=pdfjs.getDocument({data:bytes,isEvalSupported:false,useSystemFonts:false,disableFontFace:true});
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;task.destroy()},30000);
  try{const pdf=await task.promise;if(pdf.numPages>30)throw Error('PDF tối đa 30 trang. Chọn phần hồ sơ cần nhập.');const pages=[];for(let i=1;i<=pdf.numPages;i++){onProgress('Đang đọc PDF: trang '+i+'/'+pdf.numPages);const page=await pdf.getPage(i),content=await page.getTextContent();pages.push(content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join(''));if(pages.join('\n').length>MAX_TEXT)throw Error('Tài liệu vượt 100.000 ký tự.');page.cleanup()}text=pages.join('\n')}
  catch(e){if(timedOut)throw Error('Đọc PDF quá 30 giây. Hãy chọn tệp nhỏ hơn.');if(e.name==='PasswordException')throw Error('PDF có mật khẩu. Hãy dùng bản không khóa.');throw e}
  finally{clearTimeout(timer);await task.destroy()}
  if(text.trim().length<10)throw Error('PDF này có thể là ảnh quét, chưa có lớp văn bản. Hãy dùng Word/PDF có văn bản hoặc dán nội dung vào biểu mẫu.');
 }
 if(text.length>MAX_TEXT)throw Error('Nội dung vượt 100.000 ký tự. Hãy rút gọn tài liệu.');
 return {text,format};
}
