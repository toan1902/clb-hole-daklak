// Apps Script gắn với Google Sheet "LĐBC – Đơn đăng ký tham gia CLB".
// Nhận đơn từ lđbc.vn (api/stc.js gọi khi có đơn mới), ghi thêm 1 dòng và gửi email báo.
// Cài đặt: Sheet → Tiện ích mở rộng → Apps Script → dán mã → Triển khai → Ứng dụng web
// (Thực thi với tư cách: Tôi; Người có quyền truy cập: Bất kỳ ai) → copy URL /exec.
// SECRET phải trùng biến môi trường GSHEET_SECRET trên Vercel.
const SECRET = 'THAY_BANG_GSHEET_SECRET';
const NOTIFY_TO = 'doanhnhanholedaklak@gmail.com';
const ADMIN_URL = 'https://xn--lbc-vqa.vn/admin/dang-ky.html';

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false }); }
  if (!d || d.secret !== SECRET) return reply({ ok: false });
  const sheet = SpreadsheetApp.openById('11bzYMVBLjtjOTycZjBSYP47sznYS5nQOxArNiTHG-MA').getSheets()[0];
  const text = v => {
    v = String(v == null ? '' : v);
    return /^[=+\-@]/.test(v) ? "'" + v : v;
  };
  const keepZero = v => (v ? "'" + String(v) : '');
  sheet.appendRow([
    new Date(d.created_at || Date.now()), text(d.full_name), text(d.birth_date), text(d.occupation),
    text(d.address), keepZero(d.id_number), text(d.id_place), keepZero(d.phone), text(d.email),
    text(d.company), text(d.company_address), text(d.business_license), keepZero(d.company_phone),
    keepZero(d.fax), text(d.website), text(d.note), 'Mới'
  ]);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = [
    ['Họ và tên', d.full_name], ['Điện thoại', d.phone], ['Email', d.email], ['Ngày sinh', d.birth_date],
    ['Nghề nghiệp', d.occupation], ['Địa chỉ', d.address], ['Doanh nghiệp', d.company],
    ['Địa chỉ trụ sở', d.company_address], ['Giấy phép ĐKKD', d.business_license], ['Ghi chú', d.note]
  ].filter(r => r[1]).map(r => '<tr><td style="padding:4px 12px 4px 0;color:#666">' + esc(r[0]) + '</td><td style="padding:4px 0"><b>' + esc(r[1]) + '</b></td></tr>').join('');
  try {
    MailApp.sendEmail({
      to: NOTIFY_TO,
      subject: '[LĐBC] Đơn đăng ký tham gia mới: ' + String(d.full_name || '').slice(0, 80),
      htmlBody: '<p>Có đơn đăng ký tham gia CLB mới từ lđbc.vn:</p><table>' + rows + '</table>' +
        '<p><a href="' + SpreadsheetApp.openById('11bzYMVBLjtjOTycZjBSYP47sznYS5nQOxArNiTHG-MA').getUrl() + '">Mở Google Sheet</a> · <a href="' + ADMIN_URL + '">Mở trang quản trị</a></p>'
    });
  } catch (err) {}
  return reply({ ok: true });
}

function reply(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
