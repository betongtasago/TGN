# Hệ thống quản lý lịch và kết quả nén mẫu bê tông

## CÔNG TY CP VLXD THẾ GIỚI NHÀ

**THẾ GIỚI NHÀ – VẬT LIỆU XÂY DỰNG CHO MỌI CÔNG TRÌNH**

TGN là ứng dụng quản lý lịch nén mẫu, kết quả thí nghiệm và tiến độ kiểm soát chất lượng bê tông cho **CÔNG TY CP VLXD THẾ GIỚI NHÀ**. Giao diện sử dụng nhận diện vàng–cam theo logo TGN; logo được dùng thống nhất trong website, email nhắc lịch và báo cáo xuất file.

## Chức năng chính

Ứng dụng hỗ trợ quản lý nhiều trạm trộn, công trình, hạng mục, mác bê tông, lịch nén mẫu và kết quả thử nghiệm. Biểu mẫu lịch nén không bắt buộc nhập mã số mẫu hiện trường; trường **Tên phòng LAS nén mẫu** được hỗ trợ cho các lịch mới, trong khi dữ liệu cũ vẫn được giữ tương thích.

Hệ thống có phân quyền đăng nhập cho Ban Giám đốc/Super Admin, Admin hoặc Trưởng phòng QC, kỹ thuật viên thí nghiệm và nhân viên trạm. Thành viên chỉ nhìn thấy các thao tác và dữ liệu phù hợp với quyền được cấp. Người dùng có thể lọc, xem chi tiết, in phiếu kết quả, xuất báo cáo Excel và theo dõi trạng thái đến hạn, quá hạn, đã nén đạt hoặc không đạt.

Trung tâm thông báo Email hỗ trợ gửi nhắc lịch thông qua Gmail HTTPS relay. Email có logo TGN, màu nhận diện, thông tin công trình và nút **Mở đúng lịch mẫu này**. Nút này mở đúng lịch nén thông qua tham số `sampleId` sau khi người nhận đăng nhập.

## Kiến trúc triển khai

| Thành phần | Vai trò | Nơi cấu hình |
|---|---|---|
| React 19, TypeScript, Vite | Frontend responsive cho máy tính và điện thoại | Vercel |
| Express, Node.js | API xác thực, CRUD, đồng bộ trạng thái và gửi thông báo | Render |
| Supabase PostgreSQL | Nguồn dữ liệu trung tâm cho `app_state` dạng JSONB | Supabase |
| Vercel Function/Cron | Chạy `/api/cron-notify` để kiểm tra lịch đến hạn | Vercel |
| Google Apps Script | Gmail HTTPS relay, tránh kết nối SMTP trực tiếp từ Render Free | Gmail/Apps Script |

Supabase là nguồn lưu trữ chính trong production. LocalStorage chỉ giữ cache offline và lựa chọn giao diện; không được xem là cơ sở dữ liệu lâu dài.

## Chạy local

Yêu cầu Node.js 18 trở lên và npm. Cài thư viện rồi khởi động máy chủ phát triển:

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Để kiểm tra bản production:

```bash
npm run lint
npm run build
npm start
```

Các biến local được khai báo trong `.env`; dùng `.env.example` làm mẫu và không commit khóa bí mật. Khi chạy production, backend yêu cầu `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` và `AUTH_SECRET`.

## Cấu hình Supabase

Tạo hoặc chọn **một project Supabase riêng cho TGN**, không dùng nhầm project của ứng dụng khác nếu không muốn trộn dữ liệu. Trong **SQL Editor**, chạy toàn bộ migration [`supabase/migrations/202608230001_create_app_state.sql`](./supabase/migrations/202608230001_create_app_state.sql). Migration tạo `public.app_state`, bật Row Level Security, chỉ cho phép backend dùng service role truy cập và đăng ký bảng cho Realtime.

Lấy Project URL và service-role/secret key trong phần API của project. Chỉ đặt chúng ở biến môi trường server của Render và Vercel Function; tuyệt đối không đặt service-role key trong biến `VITE_*`, mã frontend, trình duyệt hoặc GitHub.

Ở lần khởi động đầu tiên, backend tạo trạng thái mặc định hoặc nhập dữ liệu mẫu từ `data/server-state.json` nếu `app_state` chưa có bản ghi. Sau đó các thao tác CRUD, cấu hình trung tâm Email và lịch sử thông báo được ghi vào Supabase.

## Biến môi trường production

Không ghi giá trị thật của secret vào repository hoặc tin nhắn. Tạo các biến sau trong Render và Vercel theo đúng phạm vi cần dùng:

| Biến | Render API | Vercel/Cron | Nội dung |
|---|---:|---:|---|
| `NODE_ENV` | Có | Không bắt buộc | `production` |
| `AUTH_SECRET` | Có | Không bắt buộc | Chuỗi bí mật dùng cho phiên đăng nhập |
| `SUPABASE_URL` | Có | Có | URL project Supabase TGN |
| `SUPABASE_SERVICE_ROLE_KEY` | Có | Có | Service-role key của Supabase TGN |
| `GMAIL_RELAY_URL` | Có | Có | URL Web App Apps Script kết thúc bằng `/exec` |
| `GMAIL_RELAY_SECRET` | Có | Có | Trùng với `RELAY_SECRET` trong Apps Script |
| `CRON_SECRET` | Có | Có | Chuỗi bảo vệ endpoint cron, hai nơi phải giống nhau |
| `FRONTEND_ORIGIN` | Có | Không | URL Vercel production, dùng để kiểm soát CORS |
| `APP_URL` | Có | Có | URL website production để tạo deep-link và URL logo |
| `VITE_API_URL` | Không | Có | URL public của backend Render |

Project Vercel hiện dùng domain production `https://nenmautgn.vercel.app`. Khi đổi domain, cập nhật đồng thời `APP_URL` trên Render/Vercel và `FRONTEND_ORIGIN` trên Render. `VITE_API_URL` phải trỏ tới URL Render public và cần redeploy frontend sau khi thay đổi.

## Deploy frontend lên Vercel

Project Vercel `tgn` liên kết với repository [`betongtasago/TGN`](https://github.com/betongtasago/TGN), nhánh `main`, và tự tạo deployment khi có commit mới. Trong **Project Settings → Environment Variables → Production**, khai báo các biến Supabase, Gmail relay, `CRON_SECRET`, `APP_URL` và `VITE_API_URL` như bảng trên. Sau khi lưu hoặc thay đổi biến, chọn **Redeploy** để build frontend nhận giá trị mới.

File [`vercel.json`](./vercel.json) cấu hình build Vite và cron `0 0 * * *`. Lịch này tương ứng 07:00 theo giờ Việt Nam (UTC+7). Cron chỉ gửi được email khi Vercel có đủ biến môi trường, Supabase đã có migration và Gmail relay đang hoạt động.

## Deploy backend lên Render

File [`render.yaml`](./render.yaml) mô tả service Node.js `tgn-nenmau-api`, health check `/api/health`, lệnh build `npm install --include=dev --legacy-peer-deps && npm run build` và lệnh chạy `npm start`. Tạo Web Service từ repository TGN hoặc dùng Blueprint này, sau đó nhập các biến secret có `sync: false` trong Render Environment.

Sau khi lưu biến, chạy **Manual Deploy → Deploy latest commit**. Kiểm tra `https://<TGN_RENDER_SERVICE>.onrender.com/api/health`; endpoint phải trả trạng thái health trước khi đặt URL đó vào `VITE_API_URL` trên Vercel.

## Gmail HTTPS relay

Render Free không phù hợp với việc mở kết nối SMTP trực tiếp. TGN vì vậy gửi HTTPS tới Google Apps Script, rồi `GmailApp` gửi thư bằng tài khoản Gmail của công ty.

Mở [Google Apps Script](https://script.google.com/) bằng tài khoản Gmail gửi thư, tạo project mới và sao chép [`scripts/gmail-relay/Code.gs`](./scripts/gmail-relay/Code.gs). Đặt một `RELAY_SECRET` dài tối thiểu 32 ký tự, giữ bí mật chuỗi này, rồi chọn **Deploy → New deployment → Web app**. Ứng dụng phải chạy dưới tài khoản gửi thư và quyền truy cập là **Anyone with the link**. Dùng URL `/exec` của deployment trong `GMAIL_RELAY_URL`.

`GMAIL_RELAY_SECRET` trên Render và Vercel phải trùng với `RELAY_SECRET` trong Apps Script. `CRON_SECRET` trên Render và Vercel cũng phải giống nhau nhưng không cần trùng relay secret. Không nhập SMTP host, port hoặc App Password vào website.

Trong website, tài khoản `admin` mở **Trung tâm thông báo Email**, nhập người nhận, tên hiển thị và lịch gửi, sau đó bấm kiểm tra relay rồi lưu cấu hình. Chức năng gửi thử và lịch sử gửi giúp xác nhận email trước khi bật tự động hằng ngày.

## Kiểm tra sự cố

Nếu website báo `Failed to fetch`, kiểm tra backend Render còn hoạt động, `VITE_API_URL` có đúng URL public hay không và `FRONTEND_ORIGIN` có khớp chính xác domain Vercel hay không. Nếu báo thiếu `GMAIL_RELAY_URL`, kiểm tra biến đã có trên cả Vercel và Render rồi redeploy. Nếu nhận `Unauthorized`, secret giữa server và Apps Script không trùng. Nếu Apps Script trả HTTP 403, xác nhận URL dùng `/exec`, deployment là Web app và quyền truy cập cho phép người có đường dẫn.

Nếu backend production từ chối khởi động, kiểm tra tối thiểu `AUTH_SECRET`, `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`. Không dùng service-role key ở frontend. Khi thay đổi schema, luôn chạy migration trên đúng project Supabase TGN và kiểm tra bản ghi `app_state` trước khi đưa vào vận hành.

## Repository và kiểm thử

Mã nguồn chính nằm tại [`betongtasago/TGN`](https://github.com/betongtasago/TGN). Trước mỗi lần push lên `main`, chạy:

```bash
npm run lint
npm run build
git diff --check
```

Không commit `.env`, service-role key, Gmail relay secret, cron secret hoặc dữ liệu vận hành thật.

## Bản quyền và vận hành

**CÔNG TY CP VLXD THẾ GIỚI NHÀ**

Phòng Quản lý Kỹ thuật và Kiểm định Chất lượng Bê tông (QA/QC)

[1]: https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports
[2]: https://developers.google.com/apps-script/guides/web
[3]: https://developers.google.com/apps-script/reference/gmail/gmail-app
