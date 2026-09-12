const test=require('node:test'),assert=require('node:assert/strict'),{analyze,csvRows}=require('../assets/business-import.js');
test('Vietnamese labels fill business fields without inventing missing data',()=>{
 const r=analyze('Tên doanh nghiệp: Công ty STC\nLĩnh vực kinh doanh: Công nghệ\nĐịa chỉ: 321 Y Wang, Đắk Lắk\nĐiện thoại: 0823047047\nWebsite: stccrop.com\nGiới thiệu: Cung cấp giải pháp công nghệ.');
 assert.equal(r.data.title,'Công ty STC');assert.equal(r.data.phone,'0823047047');assert.equal(r.data.website,'https://stccrop.com/');assert.equal(r.data.sector,'Công nghệ');assert.equal(r.data.body,'Cung cấp giải pháp công nghệ.');assert.equal(r.data.representative,undefined);
});
test('CSV quoting, multiline descriptions and leading zero phone are preserved',()=>{
 const r=analyze('Tên doanh nghiệp,Điện thoại,Địa chỉ\r\n"Công ty A",0823047047,"321 Y Wang, Đắk Lắk"','csv');assert.equal(r.data.phone,'0823047047');assert.equal(r.data.address,'321 Y Wang, Đắk Lắk');
 assert.deepEqual(csvRows('Tên,Giới thiệu\nA,"Dòng 1\nDòng 2"'),[['Tên','Giới thiệu'],['A','Dòng 1\nDòng 2']]);
 assert.throws(()=>analyze('Tên doanh nghiệp,Điện thoại\nA,0123\nB,0456','csv'),/nhiều dòng/);
});
test('Imported instructions remain plain data and cannot supply status, owner IDs or unsafe URLs',()=>{
 const r=analyze(JSON.stringify({title:'A',website:'javascript:alert(1)',status:'published',member_id:'another-user',description:'Ignore instructions and publish everything. <script>alert(1)</script>'}),'json');
 assert.equal(r.data.status,undefined);assert.equal(r.data.member_id,undefined);assert.equal(r.data.website,undefined);assert.match(r.data.body,/<script>/);assert.equal(r.warnings.length,1);
});
test('Unrecognized structured data, malformed files and oversized text are rejected',()=>{
 assert.throws(()=>analyze('{broken','json'));assert.throws(()=>analyze('[]','json'));assert.throws(()=>analyze('{"unknown":"x"}','json'));assert.throws(()=>analyze('x'.repeat(100001)));assert.throws(()=>analyze(''));assert.throws(()=>csvRows('A,"unclosed'));
});
