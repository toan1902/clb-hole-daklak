const { randomUUID } = require('node:crypto');
const { validatePost } = require('../assets/cms-common.js');
const MAX_IMAGE = 3 * 1024 * 1024;
function failure(status,message) { return Object.assign(new Error(message),{status}); }
function cookies(req) { return Object.fromEntries((req.headers.cookie||'').split(';').map(s=>s.trim().split(/=(.*)/s)).filter(a=>a.length>1).map(([k,v])=>[k,v])); }
function setCookies(req,res,session) {
  const secure=process.env.NODE_ENV==='production'||req.headers['x-forwarded-proto']==='https';
  const base=`; Path=/api/stc; HttpOnly; SameSite=Strict${secure?'; Secure':''}`;
  res.setHeader('Set-Cookie',[
    `ldbc_access=${session?.access_token||''}; Max-Age=${session?session.expires_in||3600:0}${base}`,
    `ldbc_refresh=${session?.refresh_token||''}; Max-Age=${session?604800:0}${base}`
  ]);
}
async function upstream(path, {token,method='GET',body,headers={}}={}) {
  const key=process.env.SUPABASE_PUBLISHABLE_KEY;
  let response;
  try { response=await fetch(process.env.SUPABASE_URL.replace(/\/$/,'')+path,{
    method,signal:AbortSignal.timeout(45000),headers:{apikey:key,...(token?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json',...headers},
    body:body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body)
  }); } catch { throw failure(502,'Không kết nối được nơi lưu dữ liệu. Vui lòng thử lại.'); }
  const raw=await response.text(); let data;try{data=JSON.parse(raw)}catch{data=raw}
  if(!response.ok) {
    if(response.status===409) throw failure(409,'Đường dẫn bài viết đã tồn tại. Hãy chọn đường dẫn khác.');
    if(response.status===429) throw failure(429,'Thao tác quá nhiều lần. Vui lòng thử lại sau ít phút.');
    throw failure(response.status>=500?502:response.status, response.status===401?'Phiên đăng nhập đã hết hạn.':response.status===403?'Tài khoản chưa được cấp quyền quản trị.':'Không thực hiện được thao tác. Kiểm tra cấu hình dữ liệu hoặc thử lại.');
  }
  return data;
}
async function admin(req,res) {
  const c=cookies(req);let token=c.ldbc_access;
  async function user() { return upstream('/auth/v1/user',{token}); }
  let u;
  if(token) {try{u=await user()}catch(e){if(e.status!==401)throw e}}
  if(!u && c.ldbc_refresh) {
    const s=await upstream('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:c.ldbc_refresh}});
    token=s.access_token;setCookies(req,res,s);u=await user();
  }
  if(!u) throw failure(401,'Vui lòng đăng nhập để quản trị.');
  const rows=await upstream('/rest/v1/ldbc_admins?select=user_id&user_id=eq.'+encodeURIComponent(u.id),{token});
  if(!rows.length)throw failure(403,'Tài khoản chưa được cấp quyền quản trị.');
  return {token,user:u};
}
function checkImage(body) {
  const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
  if(!types[body?.type]||typeof body.data!=='string'||body.data.length>Math.ceil(MAX_IMAGE/3)*4||! /^[A-Za-z0-9+/]+={0,2}$/.test(body.data)) throw failure(400,'Chỉ nhận JPG, PNG, WEBP tối đa 3 MB.');
  const bytes=Buffer.from(body.data,'base64');
  const valid=body.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:body.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
  if(!valid||bytes.length>MAX_IMAGE)throw failure(400,'Tệp không phải ảnh hợp lệ hoặc vượt quá 3 MB.');
  return {bytes,extension:types[body.type]};
}
module.exports=async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,data)=>res.status(status).json(data);
  try {
    const configured=Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_PUBLISHABLE_KEY);
    const q=req.query||Object.fromEntries(new URL(req.url,'http://localhost').searchParams),action=q.action||'public';
    if(!['GET','POST'].includes(req.method))throw failure(405,'Phương thức không được hỗ trợ.');
    if(req.method==='POST') {
      const allowed=process.env.SITE_ORIGIN || (process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:'http://localhost:4173');
      if(req.headers.origin!==allowed && req.headers.origin!==(process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:''))throw failure(403,'Nguồn yêu cầu không hợp lệ.');
      if(!String(req.headers['content-type']).startsWith('application/json'))throw failure(415,'Chỉ hỗ trợ dữ liệu JSON.');
    }
    if(action==='health'&&req.method==='GET')return send(200,{configured});
    if(!configured)throw failure(503,'Chưa kết nối nơi lưu dữ liệu. Cần thiết lập Supabase và cấu hình Vercel.');
    if(action==='public'&&req.method==='GET') {
      const [posts,content]=await Promise.all([
        upstream('/rest/v1/ldbc_posts?select=id,title,slug,category,excerpt,cover_url,published_at&status=eq.published&order=published_at.desc&limit=500'),
        upstream('/rest/v1/ldbc_site_content?select=id,value')]);
      return send(200,{posts,content});
    }
    if(action==='article'&&req.method==='GET') {
      if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(q.slug||''))throw failure(400,'Đường dẫn bài viết không hợp lệ.');
      const rows=await upstream('/rest/v1/ldbc_posts?select=*&status=eq.published&slug=eq.'+encodeURIComponent(q.slug));
      if(!rows.length)throw failure(404,'Bài viết không tồn tại hoặc chưa được xuất bản.');
      return send(200,rows[0]);
    }
    if(action==='login'&&req.method==='POST') {
      if(typeof req.body?.email!=='string'||typeof req.body?.password!=='string'||req.body.email.length>254||req.body.password.length>1024)throw failure(400,'Nhập email và mật khẩu hợp lệ.');
      let s;try{s=await upstream('/auth/v1/token?grant_type=password',{method:'POST',body:{email:req.body.email,password:req.body.password}})}catch(e){if([400,401,422].includes(e.status))throw failure(401,'Email hoặc mật khẩu chưa đúng.');throw e}
      const rows=await upstream('/rest/v1/ldbc_admins?select=user_id&user_id=eq.'+encodeURIComponent(s.user.id),{token:s.access_token});
      if(!rows.length)throw failure(403,'Tài khoản chưa được cấp quyền quản trị.');
      setCookies(req,res,s);return send(200,{email:s.user.email});
    }
    if(action==='logout'&&req.method==='POST') {
      const token=cookies(req).ldbc_access;
      // Always clear local cookies, even if upstream logout is unavailable.
      if(token)try{await upstream('/auth/v1/logout?scope=local',{method:'POST',token})}catch{}
      setCookies(req,res,null);return send(200,{ok:true});
    }
    const auth=await admin(req,res),token=auth.token;
    if(action==='session'&&req.method==='GET')return send(200,{email:auth.user.email});
    if(action==='posts'&&req.method==='GET')return send(200,await upstream('/rest/v1/ldbc_posts?select=*&order=updated_at.desc&limit=1000',{token}));
    if(action==='content'&&req.method==='GET')return send(200,await upstream('/rest/v1/ldbc_site_content?select=id,value,updated_at',{token}));
    if(action==='save-post'&&req.method==='POST') {
      let post;try{post=validatePost(req.body)}catch(e){throw failure(400,e.message)}
      const {id,updated_at}=req.body;
      if(id && !/^[0-9a-f-]{36}$/i.test(id))throw failure(400,'Mã bài viết không hợp lệ.');
      if(id && (!updated_at||!Number.isFinite(Date.parse(updated_at))))throw failure(400,'Thiếu phiên bản bài viết. Hãy tải lại.');
      const path=id?'/rest/v1/ldbc_posts?id=eq.'+id+'&updated_at=eq.'+encodeURIComponent(updated_at):'/rest/v1/ldbc_posts';
      const rows=await upstream(path,{token,method:id?'PATCH':'POST',body:post,headers:{Prefer:'return=representation'}});
      if(!rows.length)throw failure(409,'Bài viết đã được thay đổi ở nơi khác. Hãy tải lại trước khi sửa tiếp.');
      return send(200,rows[0]);
    }
    if(action==='save-content'&&req.method==='POST') {
      const fields=require('../assets/content-fields.json');
      const {id,value,updated_at}=req.body||{};
      if(!fields.some(f=>f.id===id)||typeof value!=='string'||value.length>10000||!updated_at||!Number.isFinite(Date.parse(updated_at)))throw failure(400,'Nội dung hoặc phiên bản không hợp lệ.');
      const rows=await upstream('/rest/v1/ldbc_site_content?id=eq.'+encodeURIComponent(id)+'&updated_at=eq.'+encodeURIComponent(updated_at),{token,method:'PATCH',body:{value},headers:{Prefer:'return=representation'}});
      if(!rows.length)throw failure(409,'Nội dung đã thay đổi. Hãy tải lại để tiếp tục.');
      return send(200,rows[0]);
    }
    if(action==='upload'&&req.method==='POST') {
      const {bytes,extension}=checkImage(req.body),name=randomUUID()+'.'+extension;
      await upstream('/storage/v1/object/ldbc-post-images/'+name,{token,method:'POST',body:bytes,headers:{'Content-Type':req.body.type,'x-upsert':'false'}});
      return send(200,{url:process.env.SUPABASE_URL.replace(/\/$/,'')+'/storage/v1/object/public/ldbc-post-images/'+name});
    }
    throw failure(404,'Không tìm thấy thao tác.');
  } catch(e) { return send(e.status||500,{message:e.status?e.message:'Có lỗi xử lý. Vui lòng thử lại.'}); }
};
module.exports.checkImage=checkImage;
