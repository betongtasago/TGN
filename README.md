# HỆ THỐNG QUẢN LÝ TIẾN ĐỘ & KẾT QUẢ NÉN MẪU BÊ TÔNG
### CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO
**Khẩu hiệu:** *BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH*

---

## 📌 Giới Thiệu Dự Án
Hệ thống phần mềm chuyên dụng hỗ trợ theo dõi, cảnh báo tiến độ và quản lý kết quả nén mẫu bê tông thương phẩm & cấp phối thí nghiệm Trialmix dành cho các trạm trộn bê tông của **Công Ty Cổ Phần Đầu Tư Tasago**.

Ứng dụng đáp ứng các tiêu chuẩn kỹ thuật xây dựng hiện hành:
- **TCVN 3118:2022**: Bê tông nặng - Phương pháp xác định cường độ nén.
- **TCVN 3116:2022**: Bê tông - Phương pháp xác định độ chống thấm nước.

---

## 🌟 Các Tính Năng Nổi Bật

1. **Quản Lý Đa Trạm Trộn Bê Tông:**
   - Trạm Tasago Hóc Môn (Hóc Môn, TP.HCM)
   - Trạm Tasago Xuyên Á (Kcn Xuyên Á, Tây Ninh)
   - Trạm Tasago Hóa An
   - Trạm Tasago-Tnt1 Tây Ninh (Kcn Thành Thành Công)
   - Trạm Tasago-Tnt2 Tây Ninh (Kcn Phước Đông)

2. **Quản Lý Mẫu Nén Chi Tiết:**
   - Hỗ trợ bê tông thương phẩm đã cấp cho công trình và mẫu cấp phối thí nghiệm Trialmix.
   - Các mác thiết kế: M150 đến M600, Bê tông chống thấm (B6, B8, B10, B12), Bê tông bù co ngót, R3, R7, R14, R28.
   - Nhập số lượng tổ mẫu, số viên, độ sụt, khối lượng, KTV lấy mẫu, người liên hệ công trình.

3. **Cảnh Báo & Nhắc Nhở Tự Động:**
   - Đánh dấu trạng thái tự động theo thời gian thực: *Đến hạn hôm nay*, *Quá hạn chưa nén*, *Chưa đến hạn*, *Đã nén đạt / không đạt*.
   - Trung tâm cảnh báo gửi thông báo lịch nén mẫu tự động qua **Gmail HTTPS relay** với đầy đủ thông tin: Công trình, trạm trộn, mác bê tông, hạng mục, số điện thoại liên hệ.

4. **Xuất Báo Cáo Excel Chuyên Nghiệp (.xlsx):**
   - Xuất bảng theo dõi tiến độ nén mẫu theo từng công trình của từng trạm với đầy đủ thông tin doanh nghiệp Tasago, tên khách hàng, tên dự án công trình và danh sách chi tiết các hạng mục, mác, khối lượng, số tổ mẫu, cường độ nén (MPa), % đạt và khung chữ ký xác nhận 3 bên.
   - Xuất báo cáo tổng hợp theo bộ lọc đa tiêu chí.

5. **Phân Quyền & Bảo Mật:**
   - Đăng nhập bảo mật (Không hiển thị thông tin tài khoản ngoài màn hình đăng nhập).
   - Phân quyền: Ban Giám Đốc (Super Admin), Trưởng phòng QC / Admin, Kỹ thuật viên thí nghiệm, Nhân viên trạm.

6. **In Ấn & Chứng Nhận:**
   - In phiếu kết quả thử nghiệm nén mẫu (Test Certificate) chuẩn A4.
   - In bảng báo cáo tiến độ nén mẫu toàn trạm.

---

## 🛠️ Công Nghệ Sử Dụng
- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, Lucide Icons, Motion
- **Biểu đồ & Xử lý dữ liệu:** Recharts, XLSX (SheetJS)
- **Lưu trữ:** Supabase PostgreSQL (bản ghi `app_state` với JSONB) làm nguồn dữ liệu trung tâm; LocalStorage chỉ giữ cache offline và tùy chọn giao diện

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Trên Máy Tính (Local)

### 1. Yêu cầu môi trường
- [Node.js](https://nodejs.org/) phiên bản 18.0 trở lên.
- Trình quản lý gói `npm` hoặc `yarn`.

### 2. Cài đặt các thư viện phụ thuộc
```bash
npm install
```

### 3. Khởi chạy máy chủ phát triển (Development Server)
```bash
npm run dev
```
Sau đó mở trình duyệt truy cập: `http://localhost:3000`

### 4. Đóng gói mã nguồn cho Production
```bash
npm run build
```

---

## Cấu hình Supabase (bắt buộc cho production)

Tạo một project trên [Supabase](https://supabase.com/dashboard), mở **SQL Editor** và chạy toàn bộ file [`supabase/migrations/202608230001_create_app_state.sql`](./supabase/migrations/202608230001_create_app_state.sql). Migration tạo bảng `public.app_state`, bật RLS, chỉ cấp quyền cho `service_role` và đăng ký bảng với Realtime.

Lấy **Project URL** cùng **service-role/secret key** trong phần API của project rồi khai báo `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trên Render cùng với `AUTH_SECRET`. Không đưa service-role key vào biến `VITE_*`, mã frontend, trình duyệt hoặc GitHub. Khi `NODE_ENV=production`, backend sẽ từ chối khởi động nếu thiếu hai biến Supabase thay vì âm thầm ghi vào filesystem tạm.

Ở lần khởi động đầu tiên, backend tạo bản ghi mặc định từ dữ liệu mẫu hoặc nhập `data/server-state.json` hiện có nếu bản ghi Supabase chưa tồn tại. Sau đó mọi thao tác CRUD, cấu hình và nhật ký thông báo đều được ghi qua Supabase; LocalStorage chỉ là cache offline.

## 📦 Hướng Dẫn Đẩy Lên GitHub

```bash
# Khởi tạo kho lưu trữ git cục bộ
git init

# Thêm toàn bộ mã nguồn
git add .

# Tạo commit đầu tiên
git commit -m "Initial commit: He thong quan ly tien do nen mau be tong Tasago"

# Đặt nhánh chính là main
git branch -M main

# Liên kết với repository trên GitHub của bạn (thay YOUR_USERNAME và REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/tasago-concrete-lab.git

# Đẩy code lên GitHub
git push -u origin main
```

---

## 🏢 Bản Quyền & Phát Triển
**CÔNG TY CỔ PHẦN ĐẦU TƯ TASAGO**  
*BÊ TÔNG XANH SÀI GÒN - BÊ TÔNG CỦA MỌI CÔNG TRÌNH*  
Phòng Quản Lý Kỹ Thuật & Kiểm Định Chất Lượng Bê Tông (QA/QC)


### Cấu hình gửi Email tự động qua Gmail HTTPS relay

Trung tâm thông báo chỉ hiển thị và hoạt động với tài khoản `admin`. Bản production mới **không còn gửi trực tiếp đến Gmail SMTP**, vì Render Free đã chặn outbound TCP đến các cổng SMTP `25`, `465` và `587`.[1] Email được chuyển qua một Google Apps Script HTTPS relay, rồi `GmailApp` gửi bằng chính tài khoản Gmail của công ty.

#### Bước 1: Tạo Gmail HTTPS relay

Mở [script.google.com](https://script.google.com/) bằng tài khoản Gmail dùng để gửi báo cáo, tạo một project mới và sao chép nội dung file `scripts/gmail-relay/Code.gs` trong repository vào trình soạn thảo. Thay:

```javascript
const RELAY_SECRET = 'THAY_BANG_CHUOI_BI_MAT_DAI';
```

bằng một chuỗi bí mật dài tối thiểu 32 ký tự. Giữ nguyên chuỗi này để nhập vào Render và Vercel.

Bấm **Deploy → New deployment → Web app**, chọn chạy dưới tài khoản Gmail của bạn và chọn **Anyone with the link**. Bấm **Deploy**, cấp các quyền Gmail được yêu cầu, sau đó sao chép **Web app URL** có dạng `https://script.google.com/macros/s/.../exec`.

#### Bước 2: Cấu hình Render

Trong **Render → Service → Environment**, thêm:

```env
GMAIL_RELAY_URL=https://script.google.com/macros/s/MA_ID_CUA_BAN/exec
GMAIL_RELAY_SECRET=chuoi-bi-mat-giong-trong-Code.gs
CRON_SECRET=mot-chuoi-bi-mat-dai
```

Giữ nguyên các biến Supabase và xác thực hiện có: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` và `FRONTEND_ORIGIN`. Không cần đặt `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` nữa. Sau khi lưu biến, chọn **Manual Deploy → Deploy latest commit**.

#### Bước 3: Cấu hình Vercel Cron

Trong **Vercel → Project Settings → Environment Variables → Production**, thêm:

```env
SUPABASE_URL=https://mqzampgzppxeppyuqvxm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=service-role-key-cua-Supabase
GMAIL_RELAY_URL=https://script.google.com/macros/s/MA_ID_CUA_BAN/exec
GMAIL_RELAY_SECRET=chuoi-bi-mat-giong-trong-Code.gs
CRON_SECRET=mot-chuoi-bi-mat-dai
VITE_API_URL=https://nenmauv2-u9xx.onrender.com
```

`CRON_SECRET` trên Vercel phải giống hệt `CRON_SECRET` trên Render. `GMAIL_RELAY_URL` và `GMAIL_RELAY_SECRET` cũng phải giống cấu hình Render. Vercel Cron chạy `/api/cron-notify` lúc `00:00 UTC`, tương ứng khoảng 07:00 giờ Việt Nam, đọc mẫu đến hạn từ Supabase rồi gọi Gmail relay qua HTTPS. Sau khi thêm biến Vercel, chọn **Redeploy**.

#### Bước 4: Cấu hình trong website

Mở `https://nenmauv2.vercel.app`, đăng nhập bằng tài khoản `admin`, mở **Trung tâm thông báo Email** và nhập tên hiển thị người gửi, ví dụ `Bê Tông Tasago`. Không nhập SMTP Host, SMTP Port hoặc App Password vào website nữa. Thêm danh sách người nhận báo cáo, bấm **Kiểm tra Gmail relay**, rồi bấm **Lưu cấu hình**. Website chỉ lưu người nhận, lịch gửi và tên hiển thị vào Supabase; secret relay chỉ nằm trong biến môi trường server.

#### Bước 5: Gửi thử và bật tự động

Trong Trung tâm Email, chuyển sang **Gửi Email**, chọn một mẫu nhỏ và bấm **Gửi email ngay**. Nếu email đến hộp thư, kiểm tra tiếp tab **Lịch sử** và bật **Email tự động hằng ngày**. Nút **Chạy thử cron** giúp kiểm tra luồng đọc dữ liệu Supabase và gửi báo cáo trước khi chờ lịch 07:00.

Nếu báo `Chưa cấu hình GMAIL_RELAY_URL`, kiểm tra Render và Vercel đã có đúng hai biến `GMAIL_RELAY_URL` và `GMAIL_RELAY_SECRET`, rồi redeploy. Nếu báo `Unauthorized`, chuỗi `GMAIL_RELAY_SECRET` không trùng với `RELAY_SECRET` trong Google Apps Script. Nếu báo HTTP `403`, hãy vào **Deploy → Manage deployments**, xác nhận loại là **Web app**, URL đang dùng kết thúc bằng `/exec` (không phải `/dev`), ứng dụng chạy dưới tài khoản Gmail gửi thư và quyền truy cập là **Anyone with the link**; sau khi đổi mã hoặc quyền, hãy tạo deployment/version mới rồi cập nhật lại `GMAIL_RELAY_URL`. Nếu báo `GmailApp lỗi`, mở Apps Script bằng đúng tài khoản Gmail gửi thư và cấp lại quyền gửi email.

Không đưa `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_RELAY_SECRET` hoặc `CRON_SECRET` vào GitHub/frontend. Kênh nhắn tin khác chưa được bật trong phiên bản hiện tại.

## Tài liệu tham khảo

[1]: https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports "Render: Free web services and SMTP ports"

[2]: https://developers.google.com/apps-script/guides/web "Google: Apps Script Web Apps"

[3]: https://developers.google.com/apps-script/reference/gmail/gmail-app "Google: GmailApp reference"
