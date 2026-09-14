import { ToastService } from '../../../core/services/toast.service';
import { Component, OnInit } from '@angular/core';
import { CampaignService, CampaignRequest, CampaignTimelinePreviewResponse } from '../../../core/services/campaign.service';
import { CampaignResponse, PaginationRequest } from '../../../core/models/base.model';
import { EvaluationService } from '../../../core/services/evaluation.service';

@Component({
  selector: 'app-campaign-management',
  templateUrl: './campaign-management.component.html',
  styleUrls: ['./campaign-management.component.scss']
})
export class CampaignManagementComponent implements OnInit {
  isModalOpen = false;
  isLoading = false;

  // Unlock Grade Modal State
  isUnlockModalOpen = false;
  selectedCampaignForUnlock: CampaignResponse | null = null;
  unlockStage: 'M1' | 'M2' | 'ALL' = 'M1';
  unlockReason = '';
  isUnlocking = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  // Data
  campaigns: CampaignResponse[] = [];

  // Modal form state
  isEditMode = false;
  editingId: number | null = null;
  formCode = '';
  formName = '';
  formAcademicYear = '';
  formSemester: number | null = null;
  formDescription = '';
  formWeekCount = 10;
  formStartDate = '';
  formEndDate = '';

  // Detailed timeline form state
  formM1StartDate = '';
  formM1Deadline = '';
  formM2StartDate = '';
  formM2Deadline = '';
  formAutoGenerateTimeline = true;
  isTimelinePreviewLoading = false;
  private timelineEditedManually = false;
  private isApplyingTimelinePreview = false;

  // Dropdown options
  academicYears: string[] = [];
  semesters = [
    { value: 1, label: 'Học kỳ 1' },
    { value: 2, label: 'Học kỳ 2' },
    { value: 3, label: 'Học kỳ Hè' },
  ];

  constructor(
    private toastService: ToastService, 
    private campaignService: CampaignService,
    private evaluationService: EvaluationService
  ) {
    // Sinh danh sách năm học (5 năm gần đây)
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      const y = currentYear - i;
      this.academicYears.push(`${y}-${y + 1}`);
    }
  }

  searchQuery = '';
  selectedStatus = '';
  selectedAcademicYear = '';

  ngOnInit(): void {
    this.loadCampaigns();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.isLoading = true;
    const request: PaginationRequest = {
      page: this.currentPage,
      limit: this.pageSize,
      searchText: this.searchQuery ? this.searchQuery.trim() : undefined
    };

    this.campaignService.getCampaigns(
      request,
      this.selectedStatus || undefined,
      this.selectedAcademicYear || undefined
    ).subscribe({
      next: (pagination) => {
        this.campaigns = pagination.data || [];
        this.totalItems = pagination.total || 0;
        this.currentPage = pagination.current_page || 1;
        this.isLoading = false;
      },
      error: (err) => {
        this.toastService.error(err?.message || 'Không thể tải danh sách đợt ĐATN');
        this.isLoading = false;
      }
    });
  }

  // ── Modal ─────────────────────────────────────ĐATN

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.resetForm();
    this.isModalOpen = true;
  }

  openEditModal(campaign: CampaignResponse): void {
    this.isEditMode = true;
    this.editingId = campaign.id;
    this.formAutoGenerateTimeline = false;
    this.timelineEditedManually = true;
    this.formCode = campaign.code || '';
    this.formName = campaign.name || '';
    this.formAcademicYear = campaign.academic_year || '';
    this.formSemester = campaign.semester;
    this.formDescription = campaign.description || '';
    // Backend trả "yyyy-MM-dd HH:mm:ss", input[date] cần "yyyy-MM-dd"
    this.formStartDate = campaign.start_date ? campaign.start_date.substring(0, 10) : '';
    this.formEndDate = campaign.end_date ? campaign.end_date.substring(0, 10) : '';
    this.formWeekCount = campaign.week_count || 10;
    
    this.formM1StartDate = campaign.m1_start_date ? campaign.m1_start_date.substring(0, 10) : '';
    this.formM1Deadline = campaign.m1_deadline ? campaign.m1_deadline.substring(0, 10) : '';
    this.formM2StartDate = campaign.m2_start_date ? campaign.m2_start_date.substring(0, 10) : '';
    this.formM2Deadline = campaign.m2_deadline ? campaign.m2_deadline.substring(0, 10) : '';
    
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  resetForm(): void {
    this.formCode = '';
    this.formName = '';
    this.formAcademicYear = this.academicYears[0] || '';
    this.formSemester = 1;
    this.formDescription = '';
    this.formStartDate = '';
    this.formEndDate = '';
    this.formWeekCount = 10;
    
    this.formM1StartDate = '';
    this.formM1Deadline = '';
    this.formM2StartDate = '';
    this.formM2Deadline = '';
    this.formAutoGenerateTimeline = true;
    this.timelineEditedManually = false;
    this.isTimelinePreviewLoading = false;
  }

  onCampaignDateChange(): void {
    if (this.formAutoGenerateTimeline && !this.timelineEditedManually) {
      this.fillTimelineFromDates(false);
    }
  }

  onAutoGenerateTimelineChange(): void {
    if (this.formAutoGenerateTimeline) {
      this.timelineEditedManually = false;
      this.fillTimelineFromDates(true);
    }
  }

  markTimelineEdited(): void {
    if (this.isApplyingTimelinePreview) {
      return;
    }
    this.timelineEditedManually = true;
    this.formAutoGenerateTimeline = false;
  }

  fillTimelineFromDates(showError: boolean = true): void {
    if (!this.formStartDate || !this.formEndDate) {
      if (showError) {
        this.toastService.error('Vui lòng chọn ngày bắt đầu và ngày kết thúc trước');
      }
      return;
    }
    if (this.formStartDate >= this.formEndDate) {
      if (showError) {
        this.toastService.error('Ngày kết thúc phải sau ngày bắt đầu');
      }
      return;
    }
    if (!this.isAtLeastOneMonthRange(this.formStartDate, this.formEndDate)) {
      if (showError) {
        this.toastService.error('Thời gian đợt ĐATN phải tối thiểu 1 tháng');
      }
      return;
    }

    this.isTimelinePreviewLoading = true;
    this.campaignService.previewTimeline({
      start_date: this.formStartDate + 'T00:00:00',
      end_date: this.formEndDate + 'T23:59:59',
      week_count: this.formWeekCount
    }).subscribe({
      next: (timeline) => {
        this.applyTimelinePreview(timeline);
        this.isTimelinePreviewLoading = false;
        if (showError) {
          this.toastService.success('Đã tự động chia timeline các mốc M1, M2 theo tuần');
        }
      },
      error: (err) => {
        this.isTimelinePreviewLoading = false;
        if (showError) {
          this.toastService.error(err?.message || 'Không thể tự động chia timeline');
        }
      }
    });
  }

  private applyTimelinePreview(timeline: CampaignTimelinePreviewResponse): void {
    this.isApplyingTimelinePreview = true;
    this.formM1StartDate = this.toDateInput(timeline.m1_start_date);
    this.formM1Deadline = this.toDateInput(timeline.m1_deadline);
    this.formM2StartDate = this.toDateInput(timeline.m2_start_date);
    this.formM2Deadline = this.toDateInput(timeline.m2_deadline);
    this.isApplyingTimelinePreview = false;
  }

  private toDateInput(value?: string | null): string {
    return value ? value.substring(0, 10) : '';
  }

  private isAtLeastOneMonthRange(startDate: string, endDate: string): boolean {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    const minimumEnd = new Date(start);
    minimumEnd.setMonth(minimumEnd.getMonth() + 1);
    return end >= minimumEnd;
  }

  saveCampaign(): void {
    // Validate
    if (!this.formName.trim()) {
      this.toastService.error('Vui lòng nhập tên đợt ĐATN');
      return;
    }
    if (!this.formStartDate) {
      this.toastService.error('Vui lòng chọn ngày bắt đầu');
      return;
    }
    if (!this.formEndDate) {
      this.toastService.error('Vui lòng chọn ngày kết thúc');
      return;
    }
    if (this.formStartDate >= this.formEndDate) {
      this.toastService.error('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }
    if (!this.isAtLeastOneMonthRange(this.formStartDate, this.formEndDate)) {
      this.toastService.error('Thời gian đợt ĐATN phải tối thiểu 1 tháng');
      return;
    }
    const request: CampaignRequest = {
      code: this.formCode.trim() || undefined,
      name: this.formName.trim(),
      academic_year: this.formAcademicYear || undefined,
      semester: this.formSemester,
      description: this.formDescription.trim() || undefined,
      start_date: this.formStartDate + 'T00:00:00',
      end_date: this.formEndDate + 'T23:59:59',
      week_count: this.formWeekCount,
      m1_start_date: this.formM1StartDate ? this.formM1StartDate + 'T00:00:00' : undefined,
      m1_deadline: this.formM1Deadline ? this.formM1Deadline + 'T23:59:59' : undefined,
      m2_start_date: this.formM2StartDate ? this.formM2StartDate + 'T00:00:00' : undefined,
      m2_deadline: this.formM2Deadline ? this.formM2Deadline + 'T23:59:59' : undefined
    };

    this.isLoading = true;

    if (this.isEditMode && this.editingId) {
      this.campaignService.update(this.editingId, request).subscribe({
        next: () => {
          this.closeModal();
          this.loadCampaigns();
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Cập nhật thất bại');
          this.isLoading = false;
        }
      });
    } else {
      this.campaignService.create(request).subscribe({
        next: () => {
          this.closeModal();
          this.loadCampaigns();
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Tạo mới thất bại');
          this.isLoading = false;
        }
      });
    }
  }

  // ── Actions ───────────────────────────────────

  toggleStatus(campaign: CampaignResponse): void {
    this.campaignService.toggleStatus(campaign.id).subscribe({
      next: () => {
        this.loadCampaigns();
      },
      error: (err) => {
        this.toastService.error(err?.message || 'Đổi trạng thái thất bại');
      }
    });
  }

  deleteCampaign(campaign: CampaignResponse): void {
    if ((campaign.student_count || 0) > 0) {
      this.toastService.error('Chỉ được xóa đợt ĐATN khi chưa có sinh viên nào trong đợt.');
      return;
    }
    const confirmed = window.confirm(`Xóa đợt ĐATN "${campaign.name}"? Thao tác này không thể hoàn tác.`);
    if (!confirmed) {
      return;
    }

    this.campaignService.delete(campaign.id).subscribe({
      next: () => {
        this.toastService.success('Đã xóa đợt ĐATN');
        this.loadCampaigns();
      },
      error: (err) => {
        this.toastService.error(err?.message || 'Xóa đợt ĐATN thất bại');
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadCampaigns();
  }

  // ── Helpers ───────────────────────────────────

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  getStatusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Đang hoạt động' : 'Kết thúc';
  }

  getSemesterLabel(semester: number | null): string {
    if (!semester) return '—';
    const found = this.semesters.find(s => s.value === semester);
    return found ? found.label : `HK${semester}`;
  }

  // ── Unlock Grade Actions ───────────────────────

  openUnlockModal(campaign: CampaignResponse): void {
    this.selectedCampaignForUnlock = campaign;
    this.unlockStage = 'M1';
    this.unlockReason = '';
    this.isUnlockModalOpen = true;
  }

  closeUnlockModal(): void {
    this.isUnlockModalOpen = false;
    this.selectedCampaignForUnlock = null;
    this.isUnlocking = false;
  }

  confirmUnlockGrade(): void {
    if (!this.selectedCampaignForUnlock) {
      return;
    }
    this.isUnlocking = true;
    this.evaluationService.unlockCampaignGrade(this.selectedCampaignForUnlock.id, {
      stage: this.unlockStage,
      reason: this.unlockReason.trim() || undefined
    }).subscribe({
      next: (res) => {
        this.isUnlocking = false;
        this.toastService.success(res?.message || 'Mở khóa điểm thành công');
        this.closeUnlockModal();
      },
      error: (err) => {
        this.isUnlocking = false;
        this.toastService.error(err?.message || 'Mở khóa điểm thất bại');
      }
    });
  }
}
