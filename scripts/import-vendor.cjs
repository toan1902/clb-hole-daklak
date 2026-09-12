const path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const files={
 '/assets/vendor/fflate.mjs':'node_modules/fflate/esm/browser.js',
 '/assets/vendor/pdf.mjs':'node_modules/pdfjs-dist/build/pdf.min.mjs',
 '/assets/vendor/pdf.worker.mjs':'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
 '/assets/vendor/fflate-LICENSE.txt':'node_modules/fflate/LICENSE',
 '/assets/vendor/pdfjs-LICENSE.txt':'node_modules/pdfjs-dist/LICENSE'
};
exports.resolve=url=>files[url]?path.join(root,files[url]):null;
exports.copy=out=>{for(const [url,source]of Object.entries(files)){const target=path.join(out,url);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,source),target)}};
