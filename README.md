# Quản trị website LĐBC

Website: https://xn--lbc-vqa.vn/ — CLB Doanh nhân Họ Lê Đắk Lắk.
Giữ website HTML hiện tại trên GitHub/Vercel. Thêm `/admin/` và Supabase để lưu dữ liệu thật.

## Có thể làm gì?

- Thêm, sửa, xem trước bài viết; lưu nháp hoặc xuất bản.
- Thêm đoạn văn, tiêu đề mục, ảnh và chú thích; sắp xếp thứ tự nội dung.
- Tải ảnh bìa và ảnh trong bài (JPG/PNG/WEBP, tối đa 3 MB).
- Chuyển bài vào thùng rác và khôi phục; không xóa dữ liệu vĩnh viễn.
- Sửa 10 mục trang chủ: tiêu đề, khẩu hiệu, giới thiệu, lời mời tham gia, liên hệ và dòng tin chạy.
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
- Nội dung là các khối văn bản/ảnh và hiển thị bằng `textContent`; không chạy HTML, script hay iframe người viết nhập vào.
- Upload kiểm tra loại, kích thước và chữ ký tệp, chuyển byte gốc vào Storage; tối đa 3 MB để phù hợp giới hạn request của Vercel.
- Khi hai người cùng sửa, phiên bản cũ bị từ chối ghi đè. Tải lại và đối chiếu thay đổi trước khi lưu tiếp.
- Bản sao JSON chứa nội dung và đường dẫn ảnh, không chứa tệp ảnh. Cần sao lưu bucket `ldbc-post-images` riêng nếu muốn bản sao hoàn chỉnh. Khôi phục JSON hiện cần người quản trị kỹ thuật nhập lại; chưa có nút nhập bản sao trong giao diện.
- Tối đa 100 khối/bài; danh sách quản trị tối đa 1.000 bài, danh sách công khai tối đa 500 bài. Chưa có hẹn giờ đăng.

## Trạng thái kiểm thử

Các bài kiểm thử tự động dùng Supabase giả lập: kiểm tra xác thực, quyền, cookie, xung đột phiên bản, upload và hiển thị văn bản an toàn. Đây không phải kiểm thử RLS trên một dự án Supabase thật. Bước nghiệm thu Preview/Production cần tài khoản và cấu hình triển khai.

`scripts/prepare-content.cjs` là công cụ chuyển đổi nguồn ban đầu, đã chạy một lần; không chạy lại trên nguồn hiện tại. `supabase-seed.sql` mới là tệp cần dùng để nạp dữ liệu gốc vào database.

Tài liệu nền tảng: [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
