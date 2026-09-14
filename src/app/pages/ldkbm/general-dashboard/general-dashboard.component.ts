import { Component, OnInit } from '@angular/core';
import { CampaignService } from '../../../core/services/campaign.service';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { AuthService } from '../../../core/services/auth.service';
import { CampaignResponse } from '../../../core/models/base.model';

@Component({
  selector: 'app-general-dashboard',
  templateUrl: './general-dashboard.component.html',
  styleUrls: ['./general-dashboard.component.scss']
})
export class GeneralDashboardComponent implements OnInit {
  isLoading = true;
  departmentId: number | null = null;
  
  campaigns: CampaignResponse[] = [];
  selectedCampaignId: number | null = null;

  // Stats
  totalStudents = 0;
  assignedStudents = 0;
  approvedPlans = 0;
  completedStudents = 0;

  // Student lists for progress tracking
  allStudents: any[] = [];
  filteredStudents: any[] = [];
  searchQuery = '';
  statusFilter = '';

  // Pagination for detailed progress table
  tableCurrentPage = 1;
  tablePageSize = 10;

  // Phân phối tiến độ ĐATN
  statusGroups = [
    { key: 'ASSIGNMENT', label: 'Chưa phân công GVHD', count: 0, percentage: 0, color: 'bg-rose-500' },
    { key: 'DECLARE', label: 'Kê khai / Đợi duyệt Nhiệm vụ ĐATN', count: 0, percentage: 0, color: 'bg-orange-500' },
    { key: 'PLAN', label: 'Chuẩn bị / Đang duyệt kế hoạch', count: 0, percentage: 0, color: 'bg-amber-500' },
    { key: 'IN_PROGRESS', label: 'Đang thực hiện ĐATN', count: 0, percentage: 0, color: 'bg-blue-600' },
    { key: 'EVALUATION', label: 'Đang đánh giá mốc M1/M2', count: 0, percentage: 0, color: 'bg-indigo-600' },
    { key: 'COMPLETED', label: 'Đã hoàn thành ĐATN', count: 0, percentage: 0, color: 'bg-emerald-600' }
  ];

  constructor(
    private campaignService: CampaignService,
    private studentCampaignService: StudentCampaignService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user && user.departmentId) {
      this.departmentId = user.departmentId;
    }
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.campaignService.getCampaignOptions().subscribe({
      next: (res) => {
        this.campaigns = res || [];
        if (this.campaigns.length > 0) {
          this.selectedCampaignId = this.campaigns[0].id;
          this.loadStats();
        } else {
          this.isLoading = false;
        }
      },
      error: () => this.isLoading = false
    });
  }

  onCampaignChange(): void {
    this.loadStats();
  }

  loadStats(): void {
    if (!this.selectedCampaignId) return;
    
    if (!this.departmentId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.studentCampaignService.findByCampaignAndDepartment(this.selectedCampaignId, this.departmentId, { page: 1, limit: 10000 }).subscribe({
      next: (res) => {
        const students = res.data || [];
        this.allStudents = students;
        this.totalStudents = res.total || students.length;
        
        this.assignedStudents = students.filter((s: any) => this.hasAssignedGvhd(s)).length;
        this.approvedPlans = students.filter((s: any) => ['DATN_APPROVED', 'IN_PROGRESS', 'M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(s.status)).length;
        this.completedStudents = students.filter((s: any) => s.status === 'COMPLETED' || s.status === 'M2_EVALUATED').length;
        
        // Tính toán phân phối tiến độ
        if (students.length > 0) {
          const unassignedCount = students.filter((s: any) => !this.hasAssignedGvhd(s)).length;
          const companyDeclaredCount = students.filter((s: any) => s.status === 'DATN_DECLARED' || s.status === 'IMPORTED').length;
          const planPendingCount = students.filter((s: any) => s.status === 'DATN_APPROVED').length;
          const inProgressCount = students.filter((s: any) => s.status === 'IN_PROGRESS').length;
          const evaluatingCount = students.filter((s: any) => s.status === 'M1_EVALUATED' || s.status === 'M2_EVALUATED').length;
          const completedCount = students.filter((s: any) => s.status === 'COMPLETED').length;

          this.statusGroups[0].count = unassignedCount;
          this.statusGroups[1].count = companyDeclaredCount;
          this.statusGroups[2].count = planPendingCount;
          this.statusGroups[3].count = inProgressCount;
          this.statusGroups[4].count = evaluatingCount;
          this.statusGroups[5].count = completedCount;

          this.statusGroups.forEach(group => {
            group.percentage = this.totalStudents > 0 ? Math.round((group.count / this.totalStudents) * 100) : 0;
          });
        } else {
          this.statusGroups.forEach(group => {
            group.count = 0;
            group.percentage = 0;
          });
        }

        this.applyFilters();
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  applyFilters(): void {
    let result = [...this.allStudents];

    // Search Query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        (s.full_name && s.full_name.toLowerCase().includes(query)) ||
        (s.student_code && s.student_code.toLowerCase().includes(query)) ||
        (s.class_name && s.class_name.toLowerCase().includes(query)) ||
        (s.gvhd_name && s.gvhd_name.toLowerCase().includes(query))
      );
    }

    // Status Filter
    if (this.statusFilter) {
      result = result.filter(s => s.status === this.statusFilter);
    }

    this.filteredStudents = result;
    this.tableCurrentPage = 1;
  }

  private hasAssignedGvhd(student: any): boolean {
    if (Array.isArray(student.gvhd_ids)) {
      return student.gvhd_ids.length > 0;
    }
    return student.gvhd_id !== null && student.gvhd_id !== undefined;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  get pagedStudents(): any[] {
    const startIndex = (this.tableCurrentPage - 1) * this.tablePageSize;
    return this.filteredStudents.slice(startIndex, startIndex + this.tablePageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredStudents.length / this.tablePageSize) || 1;
  }

  getPages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  onTablePageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.tableCurrentPage = page;
    }
  }

  getStatusStep(studentOrStatus: any, formCode: string): 'success' | 'warning' | 'none' {
    const status = typeof studentOrStatus === 'string' ? studentOrStatus : studentOrStatus?.status;
    const hasDatnInfo = typeof studentOrStatus === 'string' ? true : this.hasDatnInfo(studentOrStatus);
    if (!hasDatnInfo && ['DATN-01', 'DATN-02', 'DATN-03', 'DATN-04', 'DATN-07', 'DATN-08'].includes(formCode)) {
      return 'none';
    }

    switch (formCode) {
      case 'DATN-01':
        if (['DATN_APPROVED', 'IN_PROGRESS', 'M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(status)) {
          return 'success';
        }
        if (status === 'DATN_DECLARED') return 'warning';
        return 'none';

      case 'DATN-02':
        if (['IN_PROGRESS', 'M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(status)) {
          return 'success';
        }
        return 'none';

      case 'DATN-03':
        if (['M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(status)) {
          return 'success';
        }
        return 'none';

      case 'DATN-04':
        if (['M2_EVALUATED', 'COMPLETED'].includes(status)) {
          return 'success';
        }
        return 'none';

      case 'DATN-08':
        if (status === 'COMPLETED') return 'success';
        return 'none';

      default:
        return 'none';
    }
  }

  hasDatnInfo(student: any): boolean {
    return !!student?.datn_info?.thesis_title;
  }

  isMissingDatnInfoAfterProgress(student: any): boolean {
    return !this.hasDatnInfo(student)
      && !['IMPORTED', 'DATN_DECLARED'].includes(student?.status);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'IMPORTED': return 'Mới nhập';
      case 'DATN_DECLARED': return 'Chờ duyệt Nhiệm vụ ĐATN';
      case 'DATN_APPROVED': return 'Đã duyệt ĐATN-01';
      case 'IN_PROGRESS': return 'Đang thực hiện ĐATN';
      case 'M1_EVALUATED': return 'Đã đánh giá mốc M1';
      case 'M2_EVALUATED': return 'Đã đánh giá mốc M2';
      case 'COMPLETED': return 'Hoàn thành';
      case 'SUSPENDED': return 'Bị đình chỉ';
      default: return status || 'Không rõ';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'IMPORTED': return 'bg-slate-100 text-slate-700';
      case 'DATN_DECLARED': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'DATN_APPROVED': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'IN_PROGRESS': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'M1_EVALUATED': return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      case 'M2_EVALUATED': return 'bg-teal-50 text-teal-700 border border-teal-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'SUSPENDED': return 'bg-rose-50 text-rose-700 border border-rose-200';
      default: return 'bg-slate-50 text-slate-700';
    }
  }
}
