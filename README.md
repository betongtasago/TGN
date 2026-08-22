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
   - Trung tâm cảnh báo gửi thông báo lịch nén mẫu tự động qua **Bot Zalo (Webhook API)** và **Email** với đầy đủ thông tin: Công trình, trạm trộn, mác bê tông, hạng mục, số điện thoại liên hệ.

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
- **Lưu trữ:** LocalStorage với khả năng sao lưu/phục hồi qua JSON Backup

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


### Cấu hình gửi Email trên Vercel

Khai báo trong **Project Settings → Environment Variables** (Production): `SMTP_HOST`, `SMTP_PORT` (`465` hoặc `587`), `SMTP_SECURE` (`true` cho 465, `false` cho 587), `SMTP_USER`, `SMTP_PASS` (Gmail cần App Password), `SMTP_FROM` và `EMAIL_RECIPIENTS` (danh sách phân cách bằng dấu phẩy cho Vercel Cron). Nếu không có SMTP hoặc `RESEND_API_KEY`, endpoint trả lỗi rõ ràng thay vì báo gửi thành công giả.
