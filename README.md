# 🏯 Gia Phả Dòng Tộc – Frontend

Giao diện cây gia phả tương tác, dùng **React 19 + Tailwind CSS 4 + D3.js 7 + Vite**.
Backend (Express + PostgreSQL) nằm ở repo riêng (`giapha-backend`).

```
src/
├── components/   # FamilyTree (D3), MemberDrawer, KinshipModal, ExportModal, MemorialPanel, MemberFormModal…
├── lib/          # treeModel (dựng cây), treeRender (vẽ SVG thuần), exportTree (PNG/PDF/SVG), format
├── shared/       # lunar.js, kinship.js – BẢN SAO từ repo backend, giữ đồng bộ
└── api.js        # gọi API, đọc VITE_API_URL
```

## Chạy ở máy local

```bash
npm install
npm run dev        # http://localhost:5173
```

Khi chạy local, mọi request `/api` được Vite proxy sang `http://127.0.0.1:4100` (backend chạy local). Muốn trỏ sang backend khác: `API_URL=http://host:port npm run dev`.

## Deploy lên Vercel

1. **Add New → Project**, chọn repo frontend (để trống Root Directory). Framework tự nhận là Vite; cấu hình nằm trong [vercel.json](vercel.json).
2. Trong **Environment Variables**, thêm `VITE_API_URL = https://giapha-api.up.railway.app` (URL backend, không có `/api`). Biến này được nhúng vào lúc build, nên **mỗi lần đổi phải Redeploy**. Nếu quên biến này, build trên Vercel sẽ **dừng với thông báo lỗi rõ ràng** thay vì tạo ra một bản chạy không được.
3. Sau khi có domain Vercel, cập nhật biến `CORS_ORIGIN` bên backend cho khớp, vd `https://<ten-app>.vercel.app,https://<ten-app>-*.vercel.app`.

## Tính năng

- **Thẻ thành viên**: viền và dải tiêu đề xanh cho Nam, hồng cho Nữ. Người đã mất có thẻ tông trầm và **băng tang đen chéo góc**. Mỗi thẻ ghi rõ "ĐỜI THỨ X", tên tự/tên hiệu, năm sinh–mất, ngày giỗ Âm lịch, vợ/chồng. Con nuôi được nối bằng nét đứt.
- **Tương tác**: zoom, kéo thả, thu gọn/mở rộng từng nhánh (badge "N hậu duệ"), thu gọn/mở rộng tất cả, nút vừa màn hình. Cây có trên 150 người sẽ tự thu gọn từ tầng thứ 4.
- **Drawer chi tiết**: tiểu sử, ngày sinh/mất Âm và Dương (có Can Chi), ngày giỗ sắp tới, vợ/chồng (vợ cả/vợ hai/vợ kế), các con nhóm theo mẹ, anh chị em, dòng dõi.
- **Tìm kiếm và lọc**: tìm không dấu → tự mở nhánh, zoom tới và nhấp nháy người cần tìm. Lọc theo chi/nhánh, làm nổi bật một đời, hoặc chỉ hiện tới đời X.
- **Lịch giỗ**: danh sách giỗ trong 30 ngày tới, thông báo trình duyệt, link `.ics` để đăng ký lịch trên điện thoại.
- **Tính xưng hô**: chọn 2 người → cách gọi theo 3 miền, kèm giải thích và tô sáng đường quan hệ trên cây.
- **Xuất file in**: PDF, PNG hoặc **SVG vector**; toàn bộ cây hoặc một nhánh; khổ A0–A4 hoặc "Tự động"; 150/200/300 DPI; có khung viền trang trí và tiêu đề.

## Thư mục `src/shared`

`lunar.js` và `kinship.js` là **bản sao** từ repo backend (`src/shared`). Đừng sửa trực tiếp ở đây: hãy sửa bên backend, chạy test, rồi chép sang (hoặc chạy `sync-shared.bat` ở thư mục chứa cả hai repo).
