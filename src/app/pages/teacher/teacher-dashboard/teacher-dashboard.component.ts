import { Component, OnInit } from '@angular/core';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit {
  teacherName = 'Giảng viên';
  isLoading = true;
  
  // Thống kê tổng quan
  overviewStats = {
    totalStudents: 0,
    datnApproved: 0,
    inProgress: 0,
    m2Evaluated: 0
  };

  // Yêu cầu chờ xử lý
  pendingRequests = {
    datn01: 0, // Chờ duyệt Nhiệm vụ ĐATN
    datnPlan: 0  // Chờ duyệt kế hoạch thực hiện ĐATN
  };

  // Cảnh báo tiến độ sinh viên
  studentAlerts: any[] = [];

  constructor(
    private studentCampaignService: StudentCampaignService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.teacherName = user?.fullName || 'Giảng viên';
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.studentCampaignService.getMyAssignedStudents().subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res.data || res.payload || []);

        // 1. Thống kê nhanh
        this.overviewStats.totalStudents = data.length;
        this.overviewStats.datnApproved = data.filter((s: any) =>
          !['IMPORTED', 'DATN_DECLARED'].includes(s.status)
        ).length;
        this.overviewStats.inProgress = data.filter((s: any) =>
          ['DATN_APPROVED', 'IN_PROGRESS', 'M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(s.status)
        ).length;
        this.overviewStats.m2Evaluated = data.filter((s: any) =>
          ['M2_EVALUATED', 'COMPLETED'].includes(s.status)
        ).length;

        // 2. Yêu cầu chờ xử lý
        this.pendingRequests.datn01 = data.filter((s: any) => s.status === 'DATN_DECLARED').length;
        this.pendingRequests.datnPlan = data.filter((s: any) => s.status === 'DATN_APPROVED' || s.status === 'IN_PROGRESS').length;

        // 3. Cảnh báo tiến độ sinh viên
        this.studentAlerts = data
          .filter((s: any) => ['IMPORTED', 'DATN_DECLARED', 'DATN_APPROVED', 'IN_PROGRESS'].includes(s.status))
          .map((s: any) => {
            let issue = '';
            let type = 'warning';
            if (s.status === 'IMPORTED') {
              issue = 'Chưa kê khai Nhiệm vụ ĐATN';
            } else if (s.status === 'DATN_DECLARED') {
              issue = 'Chờ duyệt Nhiệm vụ ĐATN (ĐATN-01)';
            } else if (s.status === 'DATN_APPROVED') {
              issue = 'Chưa nộp kế hoạch thực hiện ĐATN';
            } else if (s.status === 'IN_PROGRESS') {
              issue = 'Chưa đánh giá mốc M1';
            }
            return {
              name: s.full_name,
              mssv: s.student_code,
              issue,
              type
            };
          });

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
