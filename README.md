<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CHEM WARE - Ứng dụng Quản lý Kho Hóa chất & Vật tư (GAS Web App)

CHEM WARE là ứng dụng Web Single-Page (SPA) quản lý kho hóa chất và vật tư tiêu hao, được xây dựng trên nền tảng Angular (Zoneless + Signals) chạy trực tiếp trong môi trường Google Apps Script (GAS) và lưu trữ dữ liệu trên Google Sheets.

---

## 1. Hướng Dẫn Chạy Dự Án Cục Bộ (Local Mode)

### Yêu cầu hệ thống:
*   Đã cài đặt **Node.js** (Khuyến nghị phiên bản LTS 18 hoặc mới hơn).

### Các bước khởi chạy:
1.  **Cài đặt các gói phụ thuộc (Dependencies)**:
    ```bash
    npm install
    ```
2.  **Khởi chạy Server Development**:
    ```bash
    npm run dev
    ```
    *Ứng dụng sẽ được chạy tại địa chỉ: [http://localhost:3000/](http://localhost:3000/)*

---

## 2. Hướng Dẫn Đăng Nhập & Cấu Hình CSDL Local

Khi chạy ở Local, ứng dụng sử dụng cơ chế **Offline-First** (lưu trữ và đồng bộ qua LocalStorage của trình duyệt) và hỗ trợ nạp CSDL mô phỏng từ tệp Excel.

### Bước 1: Đăng nhập lần đầu bằng tài khoản mặc định
*   **Tài khoản**: `ADMIN`
*   **Mật khẩu**: `123`

### Bước 2: Nạp dữ liệu chuẩn từ tệp Excel
Hệ thống đi kèm một CSDL mô phỏng sẵn tại thư mục `database/mock_data.xlsx`. Để nạp dữ liệu này vào trình duyệt:
1.  Sau khi đăng nhập thành công với tài khoản `ADMIN` / `123`.
2.  Truy cập menu **Cài đặt hệ thống** (ở sidebar bên trái) -> Chọn tab **Cấu hình chung**.
3.  Cuộn xuống phần **Môi trường Cục bộ (Local Dev)**.
4.  Bấm nút **"Khôi phục từ Excel"**. Hệ thống sẽ tự động phân tích tệp `database/mock_data.xlsx`, ghi nhớ vào bộ nhớ trình duyệt và tải lại trang.

### Bước 3: Đăng nhập bằng dữ liệu mới sau khi nạp Excel
Sau khi nạp tệp Excel thành công, thông tin tài khoản đăng nhập của bạn sẽ đổi thành:
*   **Tài khoản Quản trị viên (Admin)**: 
    *   Tài khoản: `ADMIN`
    *   Mật khẩu: `123456`
*   **Tài khoản Nhân viên (User)**:
    *   Danh sách tài khoản: `TTP` (Trịnh Tuấn Phú), `LHN` (Lê Hoàng Nam), `HTT` (Huỳnh Thị Tám), `TUANANH` (Lê Tuấn Anh), v.v.
    *   Mật khẩu chung: `123`

*Lưu ý: Nếu bạn muốn làm mới hoàn toàn dữ liệu local về trạng thái ban đầu, hãy bấm nút **"Reset CSDL Local"** trong tab Cấu hình chung.*

---

## 3. Hướng Dẫn Đóng Gói Triển Khai (Deploy GAS)

Để đóng gói ứng dụng thành một tệp HTML duy nhất tương thích với `HtmlService` của Google Apps Script:

1.  Chạy lệnh build:
    ```bash
    npm run build:gas
    ```
2.  Quá trình này sẽ biên dịch ứng dụng Angular và chạy script `build-gas.js` để inline toàn bộ mã CSS, Javascript vào tệp `dist/index.html`.
3.  Sao chép nội dung tệp `dist/index.html` và tệp `gas-backend/Code.gs` đưa lên dự án Google Apps Script của bạn.
