const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const handler=require('../api/stc.js');const root=path.resolve(__dirname,'..');
try{process.loadEnvFile(path.join(root,'.env'))}catch(e){if(e.code!=='ENOENT')throw e}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
http.createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://localhost:4173');
  if(u.pathname==='/api/stc'){
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4.3*1024*1024){res.writeHead(413);return res.end('Too large')}chunks.push(chunk)}
    req.query=Object.fromEntries(u.searchParams);try{req.body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):undefined}catch{res.writeHead(400);return res.end('{}')}
    res.status=n=>{res.statusCode=n;return res};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return res};return await handler(req,res);
  }
  const decoded=decodeURIComponent(u.pathname);let name=decoded.endsWith('/')?decoded+'index.html':decoded;
  if(name==='/admin')name='/admin/index.html';
  if(!/^\/(?:index\.html|(?:doanh-nghiep|thanh-vien)\.html|tin-(?:tuc|chi-tiet)\.html|stc-config\.js|anh-giao-luu-[12]\.jpg|admin\/(?:index\.html|app\.js|style\.css)|assets\/[a-z0-9.-]+)$/.test(name)){res.writeHead(404);return res.end('Not found')}
  const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  const data=await fs.promises.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end('Not found')}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://localhost:4173/admin/'));
