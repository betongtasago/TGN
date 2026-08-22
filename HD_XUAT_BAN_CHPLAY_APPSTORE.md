# HƯỚNG DẪN ĐÓNG GÓI & XUẤT BẢN APP LÊN CH PLAY & APPLE APP STORE
**Hệ Thống Quản Lý Tiến Độ Nén Mẫu Bê Tông - Công Ty Cổ Phần Đầu Tư Tasago**

---

## 📱 PHƯƠNG PHÁP 1: CÀI ĐẶT NHANH (PWA - KHÔNG CẦN CHỜ DUYỆT STORE)

Ứng dụng đã được tích hợp chuẩn **Progressive Web App (PWA)**:
1. **Trên Android (Chrome/Cốc Cốc)**: Mở đường link web -> Bấm vào biểu tượng `⋮` (Menu) góc trên cùng -> Chọn **"Cài đặt ứng dụng"** hoặc **"Thêm vào màn hình chính"**.
2. **Trên iPhone / iPad (Safari)**: Mở link trên Safari -> Bấm nút **Chia sẻ** (biểu tượng hình vuông có mũi tên hướng lên) -> Chọn **"Thêm vào MH chính (Add to Home Screen)"**.
3. **Kết quả**: Ứng dụng xuất hiện ngay trên màn hình điện thoại với biểu tượng logo Tasago, mở full màn hình không có thanh địa chỉ duyệt web.

---

## 🤖 PHƯƠNG PHÁP 2: ĐÓNG GÓI & ĐƯA LÊN GOOGLE PLAY STORE (CH PLAY)

### Bước 1: Yêu cầu chuẩn bị trên máy tính
- Đã cài đặt **Node.js** (phiên bản 18 hoặc 20 trở lên).
- Đã cài đặt **Android Studio** (bản mới nhất) kèm Android SDK.
- Tài khoản nhà phát triển **Google Play Console** (phí $25 đóng 1 lần duy nhất cho Google).

### Bước 2: Khởi tạo và đồng bộ mã nguồn Capacitor Android
Mở Terminal / Command Prompt tại thư mục dự án và chạy các lệnh sau:

```bash
# 1. Cài đặt các gói phụ thuộc (nếu chưa có)
npm install

# 2. Build bản dựng web tối ưu hóa
npm run build

# 3. Thêm nền tảng Android (chỉ chạy lần đầu)
npx cap add android

# 4. Đồng bộ mã nguồn mới nhất vào thư mục Android
npx cap sync android

# 5. Mở dự án bằng Android Studio
npx cap open android
```

### Bước 3: Cấu hình phân quyền trong `android/app/src/main/AndroidManifest.xml`
Thêm các quyền cần thiết:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.tasago.concrete">

    <!-- Quyền mạng và thông báo -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <!-- Quyền Camera & Lưu trữ nếu chụp ảnh mẫu bê tông -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
</manifest>
```

### Bước 4: Tạo tệp Ký số (Generate Signed Bundle / APK)
1. Trong Android Studio, vào thanh menu: **Build** -> **Generate Signed Bundle / APK...**
2. Chọn **Android App Bundle (.aab)** (đây là định dạng Google Play bắt buộc từ năm 2021).
3. Tạo file Key store mới (`tasago-release-key.jks`), đặt mật khẩu bảo mật và lưu giữ cẩn thận.
4. Chọn build variant **Release** -> Bấm **Finish**.
5. Tệp `.aab` sẽ được tạo ra tại thư mục `android/app/release/app-release.aab`.

### Bước 5: Đăng tải lên Google Play Console
1. Đăng nhập [Google Play Console](https://play.google.com/console).
2. Bấm **Tạo ứng dụng**:
   - Tên ứng dụng: **Bê Tông Tasago**
   - Ngôn ngữ mặc định: **Tiếng Việt - vi**
   - Loại ứng dụng: **Ứng dụng** (App) / **Miễn phí** (Free)
3. Điền thông tin danh mục:
   - Danh mục: **Doanh nghiệp / Năng suất (Productivity)**
   - Email liên hệ: `hotro@tasago.vn` hoặc `thanh.hocmon@tasago.vn`
   - Số điện thoại hỗ trợ: `0942.320.923`
4. Tải lên hình ảnh:
   - Icon ứng dụng: 512x512 px (PNG 32-bit)
   - Ảnh đồ họa tính năng (Feature Graphic): 1024x500 px
   - Ảnh chụp màn hình điện thoại (ít nhất 2 ảnh chụp giao diện nén mẫu).
5. Tải tệp `app-release.aab` lên mục **Bản phát hành chính thức (Production Release)** hoặc **Thử nghiệm kín (Internal Testing)**.
6. Bấm **Gửi để xem xét**. Google sẽ duyệt trong vòng 1 - 3 ngày làm việc.

---

## 🍎 PHƯƠNG PHÁP 3: ĐÓNG GÓI & ĐƯA LÊN APPLE APP STORE (iOS)

### Bước 1: Yêu cầu chuẩn bị
- Máy tính chạy hệ điều hành **macOS** (MacBook, Mac Mini, Mac Studio).
- Đã cài đặt **Xcode** (từ Mac App Store).
- Đã đăng ký tài khoản **Apple Developer Program** ($99/năm).

### Bước 2: Khởi tạo và đồng bộ mã nguồn Capacitor iOS
```bash
# 1. Build bản web
npm run build

# 2. Thêm nền tảng iOS (chỉ chạy lần đầu)
npx cap add ios

# 3. Đồng bộ
npx cap sync ios

# 4. Mở dự án trong Xcode
npx cap open ios
```

### Bước 3: Cấu hình trong Xcode
1. Chọn target **App** -> tab **Signing & Capabilities**.
2. Chọn Team của công ty Tasago (`Công Ty Cổ Phần Đầu Tư Tasago`).
3. Cấu hình Bundle Identifier: `com.tasago.concrete`.
4. Trong file `Info.plist`, bổ sung mô tả quyền:
   - `NSCameraUsageDescription`: *"Ứng dụng cần sử dụng camera để chụp ảnh mẫu nén bê tông và chứng chỉ thí nghiệm."*
   - `NSPhotoLibraryUsageDescription`: *"Ứng dụng cần truy cập thư viện ảnh để tải lên biên bản nén mẫu."*

### Bước 4: Đóng gói và tải lên App Store Connect
1. Chọn thiết bị đích là **Any iOS Device (arm64)**.
2. Trên thanh menu Xcode: **Product** -> **Archive**.
3. Khi cửa sổ Archives hiện ra -> Bấm **Distribute App** -> **App Store Connect** -> **Upload**.
4. Đăng nhập trang [App Store Connect](https://appstoreconnect.apple.com):
   - Tạo thông tin ứng dụng mới: Tên, Mô tả, Từ khóa tìm kiếm, Ảnh chụp màn hình cho iPhone 6.7" và 6.5".
   - Chọn bản build vừa tải lên từ Xcode.
   - Nhập thông tin tài khoản dùng thử để kiểm duyệt Apple (`admin` / mật khẩu).
   - Bấm **Gửi để phê duyệt (Submit for Review)**. Apple sẽ phản hồi duyệt sau 24 - 48 giờ.

---

## 📋 THÔNG TIN CHUẨN ĐĂNG KÝ CỦA TASAGO
- **Tên app hiển thị**: Bê Tông Tasago
- **Tên đầy đủ**: Bê Tông Tasago - Quản Lý Nén Mẫu Bê Tông & Trialmix
- **Mã gói (Package / Bundle ID)**: `com.tasago.concrete`
- **Số điện thoại hỗ trợ kỹ thuật**: 0942320923 (0942.320.923)
- **Đơn vị chủ quản**: Công Ty Cổ Phần Đầu Tư Tasago
- **Chính sách bảo mật**: `https://tasago.vn/privacy-policy`
