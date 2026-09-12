const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','tin-chi-tiet.html','tin-tuc.html','doanh-nghiep.html','thanh-vien.html','stc-config.js','anh-giao-luu-1.jpg','anh-giao-luu-2.jpg'])fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const dir of ['admin','assets'])fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true});
require('./import-vendor.cjs').copy(out);
console.log('Public assets copied to dist. SQL, tests and server source are excluded.');
