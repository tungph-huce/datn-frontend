import { Component, OnInit } from '@angular/core';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { AuthService } from '../../../core/services/auth.service';
import { hasPendingDatnInfo, hasPendingDatnPlan } from '../../../core/utils/teacher-approval';
import { WeeklyLogService } from '../../../core/services/weekly-log.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.scss']
})
export class TeacherDashboardComponent implements OnInit {
  teacherName = 'Giảng viên';
  isLoading = true;
  loadError = false;
  
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
    datnPlan: 0,  // Chờ duyệt kế hoạch thực hiện ĐATN
    weeklyLogs: 0
  };

  // Cảnh báo tiến độ sinh viên
  studentAlerts: any[] = [];

  constructor(
    private studentCampaignService: StudentCampaignService,
    private authService: AuthService,
    private weeklyLogService: WeeklyLogService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.teacherName = user?.fullName || 'Giảng viên';
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.loadError = false;
    forkJoin({ students: this.studentCampaignService.getMyAssignedStudents(), logs: this.weeklyLogService.getPending() }).subscribe({
      next: ({ students: res, logs }) => {
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
        this.pendingRequests.datn01 = data.filter(hasPendingDatnInfo).length;
        this.pendingRequests.datnPlan = data.filter(hasPendingDatnPlan).length;
        this.pendingRequests.weeklyLogs = logs.length;

        // 3. Cảnh báo tiến độ sinh viên
        this.studentAlerts = data
          .filter((s: any) => ['IMPORTED', 'DATN_DECLARED', 'DATN_APPROVED', 'IN_PROGRESS'].includes(s.status)
            || logs.some(entry => entry.student_campaign_id === s.id))
          .map((s: any) => {
            let issue = '';
            let type = 'warning';
            if (s.status === 'IMPORTED') {
              issue = 'Chưa kê khai Nhiệm vụ ĐATN';
            } else if (s.status === 'DATN_DECLARED') {
              issue = 'Chờ duyệt Nhiệm vụ ĐATN (ĐATN-01)';
            } else if (hasPendingDatnPlan(s)) {
              issue = 'Đã nộp kế hoạch thực hiện ĐATN, chờ GVHD phê duyệt';
            } else if (logs.some(entry => entry.student_campaign_id === s.id)) {
              const weeks = logs.filter(entry => entry.student_campaign_id === s.id).map(entry => entry.weekly_log.week_number).join(', ');
              issue = `Nhật ký tuần ${weeks} đang chờ GVHD xác nhận`;
            } else if (!(s.datn_plans || []).length) {
              issue = 'Chưa nộp kế hoạch thực hiện ĐATN';
            } else if (s.status === 'IN_PROGRESS' || s.status === 'DATN_APPROVED') {
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
        this.loadError = true;
        this.isLoading = false;
      }
    });
  }
}
