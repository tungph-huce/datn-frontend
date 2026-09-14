import { Component, OnInit } from '@angular/core';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { StudentCampaignResponse } from '../../../core/models/base.model';
import { ToastService } from '../../../core/services/toast.service';
import { CampaignService } from '../../../core/services/campaign.service';

@Component({
  selector: 'app-manage-students',
  templateUrl: './manage-students.component.html',
  styleUrls: ['./manage-students.component.scss']
})
export class ManageStudentsComponent implements OnInit {
  isLoading = true;
  isApproving = false;
  students: StudentCampaignResponse[] = [];

  selectedStudent: StudentCampaignResponse | null = null;
  showModal = false;

  activeTab = 'company';

  isLoadingTimeline = false;
  milestones: any[] = [];
  progressPercent = 0;
  currentWeek = 1;
  totalWeeks = 8;

  searchQuery = '';
  selectedStatus = '';
  selectedCampaignId: number | null = null;
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  campaigns: any[] = [];
  filteredStudents: StudentCampaignResponse[] = [];
  paginatedStudents: StudentCampaignResponse[] = [];

  columns = [
    { key: 'STT', label: 'STT', width: '64px', align: 'center' },
    { key: 'student_code', label: 'Mã SV', width: '120px' },
    { key: 'full_name', label: 'Họ và tên' },
    { key: 'first_name', label: 'Tên', width: '110px' },
    { key: 'class_name', label: 'Lớp', width: '100px' },
    { key: 'thesis', label: 'Đề tài ĐATN' },
    { key: 'status', label: 'Trạng thái', width: '180px' },
    { key: 'actions', label: 'Hành động', align: 'center', width: '150px' }
  ];

  statusOptions = [
    { value: 'CHUAKHAIBAO', label: 'Chưa khai báo / Đợi duyệt ĐATN-01' },
    { value: 'DANGKY', label: 'Đang nộp/Duyệt kế hoạch' },
    { value: 'THUCHIEN', label: 'Đang thực hiện ĐATN' },
    { value: 'M1', label: 'Đã đánh giá mốc M1' },
    { value: 'M2', label: 'Đã đánh giá mốc M2' },
    { value: 'HOANTHANH', label: 'Hoàn thành' },
    { value: 'SUSPENDED', label: 'Tạm ngưng' }
  ];

  constructor(
    private studentCampaignService: StudentCampaignService,
    private toastService: ToastService,
    private campaignService: CampaignService
  ) { }

  ngOnInit(): void {
    this.loadCampaigns();
    this.loadMyStudents();
  }

  loadCampaigns(): void {
    this.campaignService.getCampaignOptions('ACTIVE').subscribe({
      next: (res) => {
        this.campaigns = res || [];
        this.applyFilters();
      }
    });
  }

  loadMyStudents(): void {
    this.isLoading = true;
    this.studentCampaignService.getMyAssignedStudents().subscribe({
      next: (res) => {
        const data = Array.isArray(res) ? res : (res.data || res.payload || []);
        this.students = data.sort((a: StudentCampaignResponse, b: StudentCampaignResponse) => this.compareStudentsByName(a, b));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.students];

    if (this.selectedCampaignId !== null) {
      result = result.filter(s => Number(s.campaign_id) === Number(this.selectedCampaignId));
    } else if (this.campaigns.length > 0) {
      const activeCampaignIds = new Set(this.campaigns.map(c => Number(c.id)));
      result = result.filter(s => activeCampaignIds.has(Number(s.campaign_id)));
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(s => 
        (s.full_name && s.full_name.toLowerCase().includes(query)) ||
        (this.getStudentFirstName(s).toLowerCase().includes(query)) ||
        (s.student_code && s.student_code.toLowerCase().includes(query)) ||
        (s.class_name && s.class_name.toLowerCase().includes(query)) ||
        (s.datn_info?.thesis_title && s.datn_info.thesis_title.toLowerCase().includes(query))
      );
    }

    if (this.selectedStatus) {
      switch (this.selectedStatus) {
        case 'CHUAKHAIBAO':
          result = result.filter(s => ['IMPORTED', 'DATN_DECLARED'].includes(s.status));
          break;
        case 'DANGKY':
          result = result.filter(s => ['DATN_APPROVED'].includes(s.status));
          break;
        case 'THUCHIEN':
          result = result.filter(s => ['IN_PROGRESS', 'DATN_APPROVED'].includes(s.status));
          break;
        case 'M1':
          result = result.filter(s => s.status === 'M1_EVALUATED');
          break;
        case 'M2':
          result = result.filter(s => s.status === 'M2_EVALUATED');
          break;
        case 'HOANTHANH':
          result = result.filter(s => s.status === 'COMPLETED');
          break;
        case 'SUSPENDED':
          result = result.filter(s => s.status === 'SUSPENDED');
          break;
      }
    }

    result = result.sort((a, b) => this.compareStudentsByName(a, b));

    this.filteredStudents = result;
    this.totalItems = result.length;

    const totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }

    this.paginate();
  }

  isCampaignActive(campaignId: number): boolean {
    if (!campaignId) return true;
    if (this.campaigns.length > 0) {
      return this.campaigns.some(c => Number(c.id) === Number(campaignId));
    }
    return true;
  }

  paginate(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedStudents = this.filteredStudents.slice(startIndex, endIndex);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.paginate();
  }

  getStudentFirstName(student: StudentCampaignResponse): string {
    if (student.first_name) return student.first_name;
    return this.splitFullName(student.full_name || '').firstName;
  }

  private getStudentLastName(student: StudentCampaignResponse): string {
    if (student.last_name) return student.last_name;
    return this.splitFullName(student.full_name || '').lastName;
  }

  private compareStudentsByName(a: StudentCampaignResponse, b: StudentCampaignResponse): number {
    const firstNameCompare = this.getStudentFirstName(a).localeCompare(this.getStudentFirstName(b), 'vi', { sensitivity: 'base' });
    if (firstNameCompare !== 0) return firstNameCompare;

    const lastNameCompare = this.getStudentLastName(a).localeCompare(this.getStudentLastName(b), 'vi', { sensitivity: 'base' });
    if (lastNameCompare !== 0) return lastNameCompare;

    return (a.student_code || '').localeCompare(b.student_code || '', 'vi', { numeric: true });
  }

  private splitFullName(fullName: string): { lastName: string; firstName: string } {
    const normalized = (fullName || '').trim().replace(/\s+/g, ' ');
    if (!normalized) return { lastName: '', firstName: '' };
    const lastSpace = normalized.lastIndexOf(' ');
    if (lastSpace < 0) return { lastName: '', firstName: normalized };
    return {
      lastName: normalized.slice(0, lastSpace).trim(),
      firstName: normalized.slice(lastSpace + 1).trim()
    };
  }

  openReviewModal(student: StudentCampaignResponse): void {
    this.selectedStudent = student;
    this.showModal = true;
    this.activeTab = 'company';
    this.milestones = [];
    this.progressPercent = 0;
    this.currentWeek = 1;
    this.isLoadingTimeline = true;

    this.campaignService.getById(student.campaign_id).subscribe({
      next: (camp) => {
        this.calculateTimelineMilestones(camp, student);

        let start: Date;
        let end: Date;
        if (camp.start_date && camp.end_date) {
          const normalizedStart = camp.start_date.includes(' ') ? camp.start_date.replace(' ', 'T') : camp.start_date;
          const normalizedEnd = camp.end_date.includes(' ') ? camp.end_date.replace(' ', 'T') : camp.end_date;
          start = new Date(normalizedStart);
          end = new Date(normalizedEnd);
        } else {
          const createdStr = student.created_at || new Date().toISOString();
          const normalizedCreated = createdStr.includes(' ') ? createdStr.replace(' ', 'T') : createdStr;
          start = new Date(normalizedCreated);
          end = new Date(start.getTime() + 8 * 7 * 24 * 60 * 60 * 1000);
        }

        const now = new Date();
        if (now < start) {
          this.progressPercent = 0;
          this.currentWeek = 1;
        } else if (now > end) {
          this.progressPercent = 100;
          this.currentWeek = this.totalWeeks;
        } else {
          const totalMs = end.getTime() - start.getTime();
          const elapsedMs = now.getTime() - start.getTime();
          this.progressPercent = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

          const msInWeek = 7 * 24 * 60 * 60 * 1000;
          this.currentWeek = Math.min(this.totalWeeks, Math.floor(elapsedMs / msInWeek) + 1);
        }
        this.isLoadingTimeline = false;
      },
      error: () => {
        this.isLoadingTimeline = false;
      }
    });
  }

  calculateTimelineMilestones(camp: any, studentCampaign: any) {
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return null;
      const norm = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
      return new Date(norm);
    };

    const formatDateRange = (start: Date | null, end: Date | null): string => {
      if (!start || !end) return 'Chưa cấu hình';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(start.getDate())}/${pad(start.getMonth() + 1)} - ${pad(end.getDate())}/${pad(end.getMonth() + 1)}`;
    };

    const now = new Date();
    const status = studentCampaign.status;

    const mConfigs = [
      {
        key: 'datn01',
        title: 'Kê khai Nhiệm vụ ĐATN',
        code: 'ĐATN-01',
        description: 'Sinh viên kê khai đề tài, mục tiêu, phạm vi và sản phẩm ĐATN; GVHD xác nhận.',
        startDate: parseDate(camp.m1_start_date),
        deadline: parseDate(camp.m1_deadline),
        isCompleted: ['DATN_APPROVED', 'IN_PROGRESS', 'M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(status),
        isPending: status === 'DATN_DECLARED',
        icon: 'assignment'
      },
      {
        key: 'm1',
        title: 'Đánh giá mốc M1 (đầu kỳ)',
        code: 'M1',
        description: 'GVHD đánh giá tiến độ đầu kỳ theo CLO/Rubric, lập phiếu đánh giá mốc M1 (ĐATN-03).',
        startDate: parseDate(camp.m1_start_date),
        deadline: parseDate(camp.m1_deadline),
        isCompleted: ['M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(status),
        isPending: status === 'IN_PROGRESS' || status === 'DATN_APPROVED',
        icon: 'rate_review'
      },
      {
        key: 'm2',
        title: 'Đánh giá mốc M2 (giữa kỳ)',
        code: 'M2',
        description: 'GVHD đánh giá tiến độ giữa kỳ theo CLO/Rubric, lập phiếu đánh giá mốc M2 (ĐATN-04).',
        startDate: parseDate(camp.m2_start_date),
        deadline: parseDate(camp.m2_deadline),
        isCompleted: ['M2_EVALUATED', 'COMPLETED'].includes(status),
        isPending: status === 'M1_EVALUATED',
        icon: 'rate_review'
      },
      {
        key: 'final',
        title: 'Nộp Báo cáo & Tổng hợp điểm',
        code: 'ĐATN-08',
        description: 'Sinh viên nộp báo cáo tổng kết; Khoa tổng hợp điểm CLO và duyệt kết quả ĐATN.',
        startDate: parseDate(camp.m2_deadline),
        deadline: parseDate(camp.end_date),
        isCompleted: ['COMPLETED'].includes(status),
        isPending: status === 'M2_EVALUATED',
        icon: 'description'
      }
    ];

    this.milestones = mConfigs.map(m => {
      let state: 'LOCKED' | 'UPCOMING' | 'IN_PROGRESS' | 'OVERDUE' | 'PENDING' | 'COMPLETED' = 'LOCKED';
      let stateLabel = 'Chưa mở';
      let warningMessage = '';

      if (m.isCompleted) {
        state = 'COMPLETED';
        stateLabel = 'Đã hoàn thành';
      } else if (m.isPending) {
        state = 'PENDING';
        stateLabel = 'Đang chờ duyệt';
      } else {
        const start = m.startDate;
        const deadline = m.deadline;

        if (start && now < start) {
          state = 'UPCOMING';
          stateLabel = 'Sắp diễn ra';
        } else if (start && deadline && now >= start && now <= deadline) {
          state = 'IN_PROGRESS';
          stateLabel = 'Đang diễn ra';
          
          const diffMs = deadline.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
          if (diffDays <= 3 && diffDays >= 0) {
            warningMessage = `Sắp hết hạn! Còn lại ${diffDays} ngày.`;
          }
        } else if (deadline && now > deadline) {
          state = 'OVERDUE';
          stateLabel = 'Đã quá hạn nộp';
          warningMessage = 'Đã trễ hạn nộp!';
        }
      }

      return {
        ...m,
        dateLabel: formatDateRange(m.startDate, m.deadline),
        state,
        stateLabel,
        warningMessage
      };
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedStudent = null;
  }

  approveDatn(): void {
    if (!this.selectedStudent) return;

    this.isApproving = true;
    this.studentCampaignService.approveDatnInfo(this.selectedStudent.id).subscribe({
      next: () => {
        this.toastService.success('Đã duyệt Nhiệm vụ ĐATN (ĐATN-01) thành công!');
        this.isApproving = false;

        // Update local status
        if (this.selectedStudent) {
          this.selectedStudent.status = 'DATN_APPROVED';
        }

        setTimeout(() => this.closeModal(), 1500);
      },
      error: (err: any) => {
        const msg = err.error?.message || 'Có lỗi xảy ra khi duyệt.';
        this.toastService.error(msg);
        this.isApproving = false;
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'IMPORTED': return 'bg-slate-100 text-slate-600';
      case 'DATN_DECLARED': return 'bg-amber-100 text-amber-700';
      case 'DATN_APPROVED': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-emerald-100 text-[#008A5E] border border-emerald-200';
      case 'M1_EVALUATED': return 'bg-indigo-100 text-indigo-700';
      case 'M2_EVALUATED': return 'bg-cyan-100 text-cyan-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'SUSPENDED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'IMPORTED': return 'Chưa kê khai';
      case 'DATN_DECLARED': return 'Chờ duyệt ĐATN-01';
      case 'DATN_APPROVED': return 'Đã duyệt ĐATN-01';
      case 'IN_PROGRESS': return 'Đang thực hiện ĐATN';
      case 'M1_EVALUATED': return 'Đã đánh giá M1';
      case 'M2_EVALUATED': return 'Đã đánh giá M2';
      case 'COMPLETED': return 'Hoàn thành';
      case 'SUSPENDED': return 'Tạm ngưng';
      default: return status;
    }
  }
}
