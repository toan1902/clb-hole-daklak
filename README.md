# Quản trị website LĐBC

Website: https://xn--lbc-vqa.vn/ — CLB Doanh nhân Họ Lê Đắk Lắk.
Giữ website HTML hiện tại trên GitHub/Vercel. Thêm `/admin/` và Supabase để lưu dữ liệu thật.

Giao diện trang chủ và trang chi tiết bài viết giữ nguyên từ bản đang công khai `b26c9b7`: HTML, CSS, Google Fonts, điều hướng, biểu tượng, kích thước thẻ tin và định dạng ngày. Không thêm nút hay liên kết vào bố cục cũ. Truy cập quản trị trực tiếp bằng `/admin/`. Các bài cũ giữ nguyên tiêu đề/tóm tắt riêng trên thẻ trang chủ cho đến khi quản trị viên chỉnh trường tương ứng; dữ liệu bài đầy đủ vẫn được giữ nguyên. Bộ kiểm thử `public-layout.test.cjs` đối chiếu mã giao diện và cách trình bày bài cũ với bản gốc.

## Có thể làm gì?

- Thêm, sửa, xem trước bài viết; lưu nháp hoặc xuất bản.
- Thêm đoạn văn, tiêu đề mục, ảnh và chú thích; sắp xếp thứ tự nội dung.
- Tải ảnh bìa và ảnh trong bài (JPG/PNG/WEBP, tối đa 3 MB).
- Chuyển bài vào thùng rác và khôi phục; không xóa dữ liệu vĩnh viễn.
- Sửa 208 trường trang chủ theo nhóm: tiêu đề, giới thiệu, số liệu, ban điều hành (tên, chức vụ, giới thiệu, điện thoại, ảnh), khuyến học, cội nguồn, danh nhân, liên hệ và liên kết.
- Thêm/sửa hồ sơ doanh nghiệp thành viên: tên, tóm tắt, ảnh đại diện/logo, người đại diện, lĩnh vực, điện thoại, địa chỉ, website; nội dung chi tiết nhiều đoạn, ảnh và liên kết. Lưu nháp, xuất bản, đưa vào thùng rác và khôi phục.
- Hồ sơ đã xuất bản hiện trong mục Thành viên và mở trang riêng `doanh-nghiep.html?id=...`. Dữ liệu hồ sơ dùng cùng bảng bài viết, với chuyên mục riêng và khối `profile`; được loại khỏi danh sách tin tức. Không cần thay đổi schema để lưu hồ sơ.
- Tìm và lọc bài theo trạng thái; tải bản sao JSON của bài và nội dung trang chủ.
- Giữ 4 bài cũ, ngày đăng, ảnh và đường dẫn `tin-chi-tiet.html?id=...`.

## Kích hoạt lần đầu

1. Trong Supabase, tạo/chọn dự án dành cho website. Mở **SQL Editor**, chạy `supabase-setup.sql`, sau đó `supabase-seed.sql`. Các bảng dùng tiền tố `ldbc_`; không đụng dữ liệu STC CROP. Seed không ghi đè các bài đã chỉnh.
2. Trong **Authentication → Users**, tạo tài khoản quản trị bằng email của bạn và xác nhận email. Tự nhập mật khẩu trong Supabase; không đưa vào mã nguồn hoặc chat.
3. Cấp quyền cho đúng email bằng SQL sau (thay email trước khi chạy):

   ```sql
   insert into public.ldbc_admins(user_id)
   select id from auth.users where email='EMAIL_QUAN_TRI_CUA_BAN'
   on conflict do nothing;
   ```

   Kiểm tra đã có một dòng trong `ldbc_admins`. Tài khoản đăng nhập chưa có dòng này sẽ bị từ chối. Tắt đăng ký công khai trong cấu hình Auth nếu không sử dụng.
4. Lấy **Project URL** và **publishable key** của dự án Supabase. Không dùng secret/service_role key.
5. Trong dự án Vercel nối với `toan1902/clb-hole-daklak`, thêm ba biến môi trường cho **Production** và **Preview**:

   | Tên | Giá trị |
   |---|---|
   | `SUPABASE_URL` | Project URL của Supabase |
   | `SUPABASE_PUBLISHABLE_KEY` | Publishable key của dự án |
   | `SITE_ORIGIN` | `https://xn--lbc-vqa.vn` |

6. Triển khai nhánh có thay đổi, hoặc redeploy sau khi thêm biến môi trường. `vercel.json` cấu hình build, thư mục `dist` và API. Giữ framework **Other** và root directory trỏ đúng repository.
7. Kiểm thử trên Preview: đăng nhập sai/đúng; lưu nháp; xác nhận khách không thấy nháp; tải ảnh; xuất bản; xem và sửa bài; đưa vào thùng rác; khôi phục; cập nhật trang chủ; đăng xuất. Sau khi đạt, hợp nhất nhánh vào `main` và kiểm tra miền thật.

## Dùng hằng ngày

**Nâng cấp dữ liệu trang chủ:** chạy thêm `supabase-content-expanded.sql` trong SQL Editor của dự án `udxnpxtffsmenwhnajeb`. Tệp chỉ thêm những mục còn thiếu bằng `ON CONFLICT DO NOTHING`, không ghi đè nội dung đã sửa hoặc thay đổi quyền. Nếu chưa chạy, các mục mới trong quản trị sẽ báo chưa khởi tạo và chưa cho lưu. Các con số, tên và thông tin nạp vào được lấy từ website cũ, không phải dữ liệu mới đã được xác minh.

**Doanh nghiệp:** chọn **Doanh nghiệp thành viên → Thêm doanh nghiệp**, điền hồ sơ và nội dung chi tiết; dùng **Xem trước**, **Lưu bản nháp**, hoặc **Xuất bản**. Website được hiển thị dưới dạng liên kết mở trong tab mới. Ảnh đại diện có thể tải lên và thay/gỡ; không nhúng mã HTML tùy ý. Chưa có hồ sơ doanh nghiệp thực tế được tự tạo; quản trị viên nhập dữ liệu đã được thành viên cung cấp.

Mở `/admin/` → đăng nhập → **Thêm bài viết**. Điền tiêu đề, chuyên mục, tóm tắt và các đoạn nội dung. **Xem trước** không lưu. **Lưu bản nháp** chỉ cho quản trị viên xem. **Xuất bản** đưa bài lên trang tin và mục hoạt động ở trang chủ.

Để sửa bài, chọn **Chỉnh sửa** trong danh sách. Giữ đường dẫn nếu bài đã được chia sẻ. **Nội dung trang chủ** cho phép sửa từng mục; bấm **Lưu mục này** để công khai thay đổi. Lưu trước khi đóng trình duyệt.

## Kiểm tra cục bộ

Node.js 22; không cần thư viện bên ngoài.

```text
npm run dev
npm test
npm run build
```

Mở `http://localhost:4173/admin/`. Muốn dùng dữ liệu thật tại máy, sao chép `.env.example` thành `.env`, điền Supabase và đổi `SITE_ORIGIN` thành `http://localhost:4173`, rồi khởi động lại máy chủ. `.env` không được đưa lên GitHub.

Chưa cấu hình Supabase: trang quản trị thông báo chưa kết nối và khóa đăng nhập; trang công khai đọc 4 bài cũ từ dữ liệu đã chuyển đổi. Sau khi có cấu hình, chỉ dùng kết quả API; lỗi máy chủ không làm xuất hiện lại bài đã gỡ.

## Quyền truy cập và dữ liệu

- Mật khẩu chỉ gửi đến Supabase Auth; token lưu trong cookie HttpOnly, SameSite=Strict (Secure trên HTTPS), không trong localStorage.
- API kiểm tra thành viên `ldbc_admins`; RLS trong database kiểm tra lại. Khách chỉ đọc bài published đã đến ngày đăng.
- Nội dung là các khối văn bản/ảnh/liên kết/hồ sơ và hiển thị bằng `textContent`; không chạy HTML, script hay iframe người viết nhập vào. Liên kết chỉ nhận HTTP/HTTPS và từ chối URL chứa thông tin đăng nhập.
- Upload kiểm tra loại, kích thước và chữ ký tệp, chuyển byte gốc vào Storage; tối đa 3 MB để phù hợp giới hạn request của Vercel.
- Khi hai người cùng sửa, phiên bản cũ bị từ chối ghi đè. Tải lại và đối chiếu thay đổi trước khi lưu tiếp.
- Bản sao JSON chứa nội dung và đường dẫn ảnh, không chứa tệp ảnh. Cần sao lưu bucket `ldbc-post-images` riêng nếu muốn bản sao hoàn chỉnh. Khôi phục JSON hiện cần người quản trị kỹ thuật nhập lại; chưa có nút nhập bản sao trong giao diện.
- Tối đa 100 khối/bài; danh sách quản trị tối đa 1.000 bài, danh sách công khai tối đa 500 bài. Chưa có hẹn giờ đăng.

## Trạng thái kiểm thử

Các bài kiểm thử tự động dùng Supabase giả lập: kiểm tra xác thực, quyền, cookie, xung đột phiên bản, upload và hiển thị văn bản an toàn. Đây không phải kiểm thử RLS trên một dự án Supabase thật. Bước nghiệm thu Preview/Production cần tài khoản và cấu hình triển khai.

`scripts/prepare-content.cjs` là công cụ chuyển đổi nguồn ban đầu, đã chạy một lần; không chạy lại trên nguồn hiện tại. `supabase-seed.sql` mới là tệp cần dùng để nạp dữ liệu gốc vào database.

Tài liệu nền tảng: [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Doanh nghiệp nằm trong hồ sơ thành viên

Bấm một trong 7 thẻ Ban điều hành để mở `thanh-vien.html?id=...`. Hồ sơ giữ tên, chức vụ, giới thiệu, điện thoại và ảnh đã sửa trong Nội dung trang chủ; bên dưới là tất cả doanh nghiệp đã xuất bản của người đó. Trong quản trị doanh nghiệp, chọn **Thuộc hồ sơ thành viên** trước khi lưu. Mã thành viên giữ nguyên khi thay đổi tên hiển thị. Với thành viên khác, nhập tên đại diện; trang chủ nhóm doanh nghiệp theo thành viên thay vì tạo một thẻ cho mỗi doanh nghiệp. Không cần nâng cấp schema cho liên kết này.

Đã kiểm thử cục bộ bấm thẻ mở đúng hồ sơ, tách doanh nghiệp của hai thành viên, trạng thái chưa có doanh nghiệp, cùng 21 kiểm thử tự động và build. Tệp nạp 208 trường trang chủ vẫn là bước độc lập.

## Hồ sơ dạng landing page và ảnh đại diện

Trang `thanh-vien.html` dùng giao diện landing page gọn, giữ màu đỏ/vàng và font của CLB; ảnh đại diện và giới thiệu bên trên, nút liên hệ, các doanh nghiệp bên dưới. Giao diện trang chủ không đổi.

Trong **Doanh nghiệp thành viên**, mỗi thẻ có ô **Đổi ảnh đại diện**: chọn JPG/PNG/WEBP tối đa 3 MB rồi **Lưu ảnh**. Ảnh lưu vào Storage và trường nội dung hiện có, đồng bộ với thẻ Ban điều hành và trang hồ sơ. **Gỡ ảnh** đưa thẻ về ký tự viết tắt, không xóa tệp gốc khỏi Storage. Không cần chạy SQL mới. Đã kiểm thử API cập nhật/gỡ ảnh và chống ghi đè; kiểm tra trực quan phiên bản này bị gián đoạn bởi giới hạn công cụ trình duyệt.
