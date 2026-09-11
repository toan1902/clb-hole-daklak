const test=require('node:test'),assert=require('node:assert/strict');
const handler=require('../api/stc.js'),CMS=require('../assets/cms-common.js');
const sample=require('../assets/original-posts.json')[0];
const originalFetch=global.fetch;
async function call(action,{method='GET',body,cookie='',origin='https://xn--lbc-vqa.vn'}={}){
 const req={method,query:{action},headers:{origin,cookie,'content-type':'application/json'},body};
 const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(data){this.data=data;return this}};
 await handler(req,res);return res;
}
function setup(){process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='test-publishable';process.env.SITE_ORIGIN='https://xn--lbc-vqa.vn'}
function response(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}})}
test.afterEach(()=>{global.fetch=originalFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_PUBLISHABLE_KEY;delete process.env.SITE_ORIGIN});
test('Missing setup is explicit and no write is acknowledged',async()=>{const h=await call('health');assert.equal(h.data.configured,false);const r=await call('save-post',{method:'POST',body:sample,origin:'http://localhost:4173'});assert.equal(r.statusCode,503)});
test('Anonymous users cannot list drafts, save posts, edit homepage or upload images',async()=>{setup();let count=0;global.fetch=async()=>{count++;throw Error('Unexpected upstream call')};for(const [action,method] of [['posts','GET'],['save-post','POST'],['save-content','POST'],['upload','POST']]){assert.equal((await call(action,{method,body:sample})).statusCode,401)}assert.equal(count,0)});
test('Cross-site write is rejected before login or database requests',async()=>{setup();global.fetch=async()=>{throw Error('Must not call backend')};assert.equal((await call('login',{method:'POST',origin:'https://evil.example',body:{email:'test@example.com',password:'example'}})).statusCode,403)});
test('A valid non-admin account cannot read drafts or save',async()=>{setup();global.fetch=async url=>url.endsWith('/auth/v1/user')?response({id:'user-1'}):response([]);assert.equal((await call('posts',{cookie:'ldbc_access=example'})).statusCode,403);assert.equal((await call('save-post',{method:'POST',body:sample,cookie:'ldbc_access=example'})).statusCode,403)});
test('Wrong password produces clear error, does not set a cookie',async()=>{setup();global.fetch=async()=>response({error:'invalid_grant'},400);const r=await call('login',{method:'POST',body:{email:'test@example.com',password:'wrong'}});assert.equal(r.statusCode,401);assert.match(r.data.message,/mật khẩu/);assert.equal(r.headers['Set-Cookie'],undefined)});
test('Admin login stores tokens only in HttpOnly same-site cookies',async()=>{setup();global.fetch=async url=>url.includes('/token?')?response({access_token:'example-access',refresh_token:'example-refresh',expires_in:3600,user:{id:'id-1',email:'admin@example.com'}}):response([{user_id:'id-1'}]);const r=await call('login',{method:'POST',body:{email:'admin@example.com',password:'example'}});assert.equal(r.statusCode,200);assert.deepEqual(r.data,{email:'admin@example.com'});assert.ok(r.headers['Set-Cookie'].every(c=>c.includes('HttpOnly')&&c.includes('SameSite=Strict')))});
test('Expired access token refreshes and rechecks admin membership',async()=>{setup();let refreshed=false;global.fetch=async(url,opt)=>{if(url.includes('grant_type=refresh_token')){refreshed=true;return response({access_token:'fresh-access',refresh_token:'fresh-refresh',expires_in:3600})}if(url.endsWith('/user'))return opt.headers.Authorization==='Bearer fresh-access'?response({id:'admin-1',email:'admin@example.com'}):response({},401);return response([{user_id:'admin-1'}])};const r=await call('session',{cookie:'ldbc_access=expired; ldbc_refresh=refresh'});assert.equal(r.statusCode,200);assert.ok(refreshed);assert.equal(r.headers['Set-Cookie'].length,2)});
test('Public list always queries published records with anon key and no session',async()=>{setup();const urls=[];global.fetch=async(url,opt)=>{urls.push(url);assert.equal(opt.headers.Authorization,undefined);return response([])};const r=await call('public',{cookie:'ldbc_access=admin-cookie'});assert.equal(r.statusCode,200);assert.ok(urls.some(u=>u.includes('status=eq.published')));assert.deepEqual(r.data,{posts:[],content:[]})});
test('Optimistic locking prevents overwriting a newer article',async()=>{setup();let patch='';global.fetch=async(url,opt)=>{if(url.endsWith('/user'))return response({id:'admin-1'});if(url.includes('ldbc_admins'))return response([{user_id:'admin-1'}]);patch=url;assert.equal(opt.method,'PATCH');return response([])};const r=await call('save-post',{method:'POST',cookie:'ldbc_access=example',body:{...sample,id:'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',updated_at:'2026-09-01T00:00:00.000Z'}});assert.equal(r.statusCode,409);assert.ok(patch.includes('&updated_at=eq.'))});
test('Server validates post structure and accepts existing Vietnamese articles',()=>{for(const p of require('../assets/original-posts.json'))assert.doesNotThrow(()=>CMS.validatePost(p));assert.equal(CMS.slug('Đắk Lắk & Họ Lê'),'dak-lak-ho-le');assert.throws(()=>CMS.validatePost({...sample,slug:'../admin'}));assert.throws(()=>CMS.validatePost({...sample,body:[{type:'script',text:'bad'}]}));assert.throws(()=>CMS.validatePost({...sample,cover_url:'javascript:alert(1)'}));assert.throws(()=>CMS.validatePost({...sample,body:[{type:'img',src:'data:text/html,bad'}]}));assert.throws(()=>CMS.validatePost({...sample,published_at:'2100-01-01'}))});
test('Image validation rejects fake extensions, SVG, and oversized input',()=>{assert.throws(()=>handler.checkImage({type:'image/jpeg',data:Buffer.from('<script>x</script>').toString('base64')}));assert.throws(()=>handler.checkImage({type:'image/svg+xml',data:'aaaa'}));assert.throws(()=>handler.checkImage({type:'image/png',data:'a'.repeat(4194305)}));assert.equal(handler.checkImage({type:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64')}).extension,'png')});
test('Rendering text containing HTML keeps it as text, never executable markup',()=>{const previous=global.document;const nodes=[];global.document={createElement(tag){const n={tag,children:[],append(...items){this.children.push(...items)}};nodes.push(n);return n}};const container={children:[],replaceChildren(){this.children=[]},append(n){this.children.push(n)}};CMS.renderBody(container,[{type:'p',text:'<img src=x onerror=alert(1)>'},{type:'img',src:'javascript:alert(1)'},{type:'script',text:'bad'}]);assert.equal(container.children.length,1);assert.equal(container.children[0].textContent,'<img src=x onerror=alert(1)>');assert.equal(container.children[0].innerHTML,undefined);global.document=previous});
test('Logout clears cookies even when upstream is unavailable',async()=>{setup();global.fetch=async()=>{throw Error('offline')};const r=await call('logout',{method:'POST',body:{},cookie:'ldbc_access=example'});assert.equal(r.statusCode,200);assert.ok(r.headers['Set-Cookie'].every(c=>c.includes('Max-Age=0')))});

test('Member directory is public only for published profiles; news excludes profiles',async()=>{
 setup();const urls=[];global.fetch=async(url,opt)=>{urls.push(new URL(url));assert.equal(opt.headers.Authorization,undefined);return response([])};
 assert.equal((await call('members')).statusCode,200);assert.equal(urls[0].searchParams.get('category'),'eq.Doanh nghiệp thành viên');assert.equal(urls[0].searchParams.get('status'),'eq.published');
 urls.length=0;await call('public');assert.equal(urls[0].searchParams.get('category'),'neq.Doanh nghiệp thành viên');
});
test('Business profile round-trip retains contacts and website; unsafe links are rejected',()=>{
 const profile={type:'profile',representative:'Lê Ví Dụ',sector:'Dịch vụ',phone:'0123456789',address:'Đắk Lắk',website:'https://example.com/'};
 const input={...sample,category:'Doanh nghiệp thành viên',body:[profile,{type:'p',text:'Giới thiệu doanh nghiệp'},{type:'link',text:'Sản phẩm',href:'https://example.com/products'}]};
 assert.deepEqual(CMS.validatePost(input).body,input.body);
 for(const website of ['javascript:alert(1)','data:text/html,test','https://user:password@example.com'])assert.throws(()=>CMS.validatePost({...input,body:[{...profile,website}]}));
 assert.throws(()=>CMS.validatePost({...input,body:[{type:'link',text:'X',href:'javascript:alert(1)'}]}));
 assert.throws(()=>CMS.validatePost({...input,body:[profile,profile]}));
});
test('Unsafe homepage URLs are rejected after administrator authentication',async()=>{
 setup();let writes=0;global.fetch=async(url,opt)=>{if(url.endsWith('/user'))return response({id:'admin-1'});if(url.includes('ldbc_admins'))return response([{user_id:'admin-1'}]);writes++;return response([])};
 const field=require('../assets/content-fields.json').find(f=>f.kind==='href');
 const r=await call('save-content',{method:'POST',cookie:'ldbc_access=example',body:{id:field.id,value:'javascript:alert(1)',updated_at:'2026-09-01T00:00:00Z'}});
 assert.equal(r.statusCode,400);assert.equal(writes,0);
});
test('Business ownership is stable when a member changes display name and supports legacy profiles',()=>{
 const p={...sample,category:'Doanh nghiệp thành viên',body:[{type:'profile',member_id:'le-quang-toan',representative:'Tên hiển thị mới'}]};
 const saved=CMS.validatePost(p);assert.equal(CMS.memberKey(saved),'le-quang-toan');
 assert.equal(CMS.memberKey({body:[{type:'profile',representative:'Lê Văn Vương'}]}),'le-van-vuong');
 assert.notEqual(CMS.memberKey(saved),CMS.memberKey({body:[{type:'profile',member_id:'le-van-vuong'}]}));
 assert.throws(()=>CMS.validatePost({...p,body:[{type:'profile',member_id:'../admin'}]}));
 const catalog=require('../assets/members.json');assert.equal(catalog.length,7);assert.equal(new Set(catalog.map(m=>m.id)).size,7);
});
