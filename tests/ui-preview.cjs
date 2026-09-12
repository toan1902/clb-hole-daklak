// Isolated browser test server. In-memory fixtures only; never loads .env or Supabase.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const root=path.resolve(__dirname,'..'),CMS=require('../assets/cms-common.js');
let posts=require('../assets/original-posts.json').map(p=>({...p,id:randomUUID(),updated_at:new Date().toISOString()}));
const content=require('../assets/content-fields.json').map(f=>({id:f.id,value:f.default,updated_at:new Date().toISOString()}));
let testImage=null;
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost:4174');res.setHeader('Cache-Control','no-store');
  if(u.pathname==='/assets/test-avatar.png'&&testImage){res.setHeader('Content-Type',testImage.type);return res.end(testImage.bytes)}
  if(u.pathname==='/api/stc'){
   const chunks=[];for await(const c of req)chunks.push(c);const body=chunks.length?JSON.parse(Buffer.concat(chunks)):{};
   const action=u.searchParams.get('action');let data;
   if(action==='health')data={configured:true};
   else if(action==='session')data={email:'KIỂM THỬ CỤC BỘ · Không lưu dữ liệu thật'};
   else if(action==='posts')data=posts;
   else if(action==='content')data=content;
   else if(action==='public')data={posts:posts.filter(p=>p.status==='published'&&p.category!=='Doanh nghiệp thành viên'),content};
   else if(action==='members')data=posts.filter(p=>p.status==='published'&&p.category==='Doanh nghiệp thành viên');
   else if(action==='article')data=posts.find(p=>p.slug===u.searchParams.get('slug')&&p.status==='published');
   else if(action==='save-post'){data={...CMS.validatePost(body),id:body.id||randomUUID(),updated_at:new Date().toISOString()};posts=posts.filter(p=>p.id!==data.id);posts.push(data)}
   else if(action==='save-content'){data=content.find(c=>c.id===body.id);Object.assign(data,{value:body.value,updated_at:new Date().toISOString()})}
   else if(action==='upload'){testImage={...require('../api/stc.js').checkImage(body),type:body.type};data={url:'/assets/test-avatar.png'}}
   else throw Error('Test action not implemented');
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(data));
  }
  const name=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname;
  if(!/^\/(?:index\.html|(?:doanh-nghiep|thanh-vien)\.html|tin-(?:tuc|chi-tiet)\.html|stc-config\.js|admin\/(?:index\.html|app\.js|style\.css)|assets\/[a-z0-9.-]+)$/.test(name))throw Error('Not found');
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'})[path.extname(name)]||'application/octet-stream');res.end(fs.readFileSync(path.join(root,name)));
 }catch(e){res.statusCode=400;res.end(JSON.stringify({message:e.message}))}
}).listen(4174,'127.0.0.1',()=>console.log('Isolated UI fixture: http://localhost:4174/admin/'));
