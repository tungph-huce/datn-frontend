# Hệ thống Quản lý Đồ án Tốt nghiệp (ĐATN) — Frontend Web Application

> Cập nhật 20/09/2026: đã bổ sung M3 do hội đồng chấm, chuyên ngành/khóa, CLO riêng từng SV và GVHD ngoài trường. Xem [luồng hiện hành, seed và tài khoản demo](../docs/M3-ACADEMIC-DEMO.md). Các nội dung chỉ có M1/M2 bên dưới mô tả phạm vi cũ.

Giao diện Frontend (Client-side) của **Hệ thống Quản lý Đồ án Tốt nghiệp (ĐATN)** HUCE. Ứng dụng cung cấp các Web Portal chuyên biệt theo vai trò: **Admin**, **LDKBM** (Lãnh đạo Khoa/Bộ môn), **GVHD** (Giảng viên hướng dẫn) và **Sinh viên**.

> Dự án này là phiên bản **Đồ án Tốt nghiệp (ĐATN)**, được chuyển đổi từ hệ thống Thực tập Tốt nghiệp của HUCE. Tài liệu tổng quan và lịch sử chuyển đổi nằm tại thư mục [`../docs/`](../docs/).

---

## 🎨 Công nghệ sử dụng (Tech Stack)

- **Framework chính:** Angular 15
- **Ngôn ngữ:** TypeScript 4.9
- **Styling:** Tailwind CSS 3.4 + SCSS
- **Icons:** Google Material Symbols
- **Reactivity:** RxJS 7.8
- **Xuất Excel:** xlsx / xlsx-js-style

---

## 📁 Cấu trúc thư mục cốt lõi

```
src/app/
├── core/     # Services dùng chung (ApiService, AuthService...), guards, interceptors, models, config (menu.config.ts)
├── shared/   # Components tái sử dụng (Modal, Pagination, StatusBadge, MetricCard, WelcomeHeader...)
├── layout/   # Khung giao diện theo role: admin-layout, ldkbm-layout, teacher-layout, student-layout, auth-layout, main-layout
└── pages/
    ├── admin/    # Campaign management (Đợt ĐATN), dashboard, user, notification, system settings
    ├── ldkbm/    # Student assignment (import + phân công GVHD), CLO/Rubric config, score summary, survey, dashboard
    ├── teacher/  # Manage students, approval requests, rubric evaluation (M1/M2), score summary, dashboard
    └── student/  # Datn declaration (ĐATN-01), datn report (stepper), plan, weekly log, final report, survey, dashboard
```

---

## 🚀 Hướng dẫn cài đặt & chạy

### Yêu cầu
- **Node.js** 18+ (đã test với Node 24)
- **Angular CLI** 15.x

### Cài đặt & chạy Dev
```bash
npm install
# Windows + Node 24: bắt buộc bật legacy OpenSSL
$env:NODE_OPTIONS="--openssl-legacy-provider"
ng serve
```
Mở `http://localhost:4200/` (hot-reload).

### Build Production
```bash
$env:NODE_OPTIONS="--openssl-legacy-provider"
ng build
```
Thư mục build: `dist/datn-frontend/`.

> Khi build dev để kiểm tra lỗi: `ng build --configuration development` (strictTemplates bật).

---

## 🌐 Môi trường API

Cấu hình tại `src/environments/`:
- `environment.ts`: local → `http://localhost:8081`
- `environment.prod.ts`: production → `/api` (proxy qua `vercel.json` → backend)

---

## 👥 Vai trò & Routing (RBAC)

Navigation menu và route tự động thay đổi theo vai trò người đăng nhập, cấu hình tập trung tại `core/config/menu.config.ts` và `app-routing.module.ts`.

| Vai trò | Việc chính |
|---|---|
| **ADMIN** | Tạo/quản lý đợt ĐATN, tài khoản, thông báo, cài đặt |
| **LDKBM** | Import SV, phân công GVHD, cấu hình CLO/Rubric, chốt điểm, khảo sát |
| **GVHD** | Duyệt Nhiệm vụ ĐATN, chấm mốc M1/M2, xuất điểm |
| **STUDENT** | Kê khai ĐATN-01, kế hoạch, nhật ký, nộp báo cáo, khảo sát, xem điểm |

Trang sinh viên chính: `/student/datn-report` (stepper ĐATN-01 → 02 → 03 → 08), `/student/datn-declaration`, `/student/student-dashboard`.

---

## ✅ Build status
- `ng build` — **BUILD SUCCESS**

---
*Developed for HUCE ĐATN (Đồ án Tốt nghiệp) Management System.*
