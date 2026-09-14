# Internship Report Module (Hồ sơ ĐATN tổng hợp)

## Architecture Overview
Module này (`InternshipReportComponent`) được thiết kế theo dạng **Wizard / Stepper Pattern**.
Thay vì tạo ra nhiều menu độc lập (ĐATN-01, ĐATN-02, ĐATN-03, ĐATN-08) trên Sidebar khiến sinh viên bị rối, toàn bộ các luồng Hồ sơ ĐATN được gộp vào duy nhất 1 Tab: `/student/internship-report`.

## How it works
1. **State Management**:
   - Component cha (`InternshipReportComponent`) sẽ gọi `StudentCampaignService.getMyCampaigns()` để kiểm tra trạng thái (`status`) hiện tại của đợt ĐATN.
   - Dựa vào `status`, hệ thống sẽ tính toán ra `maxUnlockedStep` (Bước tối đa sinh viên được phép truy cập). Ví dụ: Nếu `status` là `DATN_APPROVED`, sinh viên được phép truy cập tới `ĐATN-02`.

2. **Stepper UI**:
   - Thanh Stepper ở trên cùng hiển thị 4 bước (ĐATN-01, ĐATN-02, ĐATN-03, ĐATN-08).
   - Nếu bước nào `> maxUnlockedStep`, bước đó sẽ bị **disabled (khóa mờ)** và không click được.

3. **Dynamic Rendering (`ngSwitch`)**:
   - Sử dụng thẻ `<ng-container [ngSwitch]="currentStep">`.
   - Ứng với mỗi `currentStep`, component con tương ứng sẽ được nhúng vào (ví dụ: `<app-datn-declaration>` hoặc `<app-internship-plan>`).
   - Các Component Con vẫn tự maintain trạng thái riêng biệt của nó (ví dụ: ĐATN-01 tự load API lấy thông tin Nhiệm vụ ĐATN, tự xử lý form submit), giảm thiểu sự cồng kềnh cho component cha.

## For AI Agents
Nếu bạn cần thêm một bước ĐATN mới (ví dụ ĐATN-04):
1. Thêm ĐATN-04 vào mảng `steps` trong `setStep()` và `isUnlocked()` tại `internship-report.component.ts`.
2. Bổ sung `ngSwitchCase="'ĐATN-04'"` vào file HTML.
3. Thiết kế Component ĐATN-04 như bình thường, **nhưng đừng thêm `<router-outlet>`** vào đó. Component con chỉ nên là presentational container.

*Note: Component này đã thay thế cơ chế routing tĩnh ban đầu.*

