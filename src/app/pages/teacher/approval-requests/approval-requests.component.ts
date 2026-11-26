import { Component, OnInit } from '@angular/core';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { StudentCampaignResponse, WeeklyLogResponse } from '../../../core/models/base.model';
import { WeeklyLogService } from '../../../core/services/weekly-log.service';
import { forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';
import { CampaignService } from '../../../core/services/campaign.service';
import { hasPendingDatnInfo, hasPendingDatnPlan } from '../../../core/utils/teacher-approval';

type RequestType = 'DATN' | 'PLAN' | 'WEEKLY_LOG';
interface ApprovalRequest extends StudentCampaignResponse { weekly_log?: WeeklyLogResponse; }

@Component({
  selector: 'app-approval-requests',
  templateUrl: './approval-requests.component.html',
  styleUrls: ['./approval-requests.component.scss']
})
export class ApprovalRequestsComponent implements OnInit {
  isLoading = true;
  isProcessing = false;
  loadError = false;
  requests: ApprovalRequest[] = [];
  filteredRequests: ApprovalRequest[] = [];
  
  selectedRequest: ApprovalRequest | null = null;
  requestType: RequestType | null = null;
  filterType: RequestType | 'ALL' = 'ALL';
  supervisorComment = '';
  showModal = false;
  campaigns: any[] = [];
  activeCampaignIds = new Set<number>();
  activeCampaignsLoaded = false;
  activeCampaignsError = false;
  
  selectedCampaignId: number | null = null;
  searchQuery = '';
  
  constructor(
    private studentCampaignService: StudentCampaignService,
    private toastService: ToastService,
    private campaignService: CampaignService,
    private weeklyLogService: WeeklyLogService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const type = this.route.snapshot.queryParamMap.get('type');
    if (type === 'DATN' || type === 'PLAN' || type === 'WEEKLY_LOG') this.filterType = type;
    this.loadCampaigns();
    this.loadRequests();
  }

  loadCampaigns(): void {
    // 1. Lấy tất cả các đợt để hiển thị tên và dropdown bộ lọc
    this.campaignService.getCampaignOptions().subscribe({
      next: (res) => {
        this.campaigns = res || [];
      }
    });

    // 2. Lấy danh sách đợt đang ACTIVE để kiểm tra trạng thái hoạt động
    this.campaignService.getCampaignOptions('ACTIVE').subscribe({
      next: (res) => {
        const activeList = res || [];
        this.activeCampaignIds = new Set(activeList.map((c: any) => Number(c.id)));
        this.activeCampaignsLoaded = true;
      },
      error: () => { this.activeCampaignsError = true; }
    });
  }

  isCampaignActive(campaignId: number): boolean {
    return this.activeCampaignsLoaded && this.activeCampaignIds.has(Number(campaignId));
  }

  getCampaignName(campaignId?: number): string {
    if (!campaignId) return 'Chưa gán';
    const camp = this.campaigns.find(c => Number(c.id) === Number(campaignId));
    return camp ? (camp.name || camp.code || `Đợt ${campaignId}`) : `Đợt ${campaignId}`;
  }

  loadRequests(): void {
    this.isLoading = true;
    this.loadError = false;
    forkJoin({ students: this.studentCampaignService.getMyAssignedStudents(), logs: this.weeklyLogService.getPending() }).subscribe({
      next: ({ students: res, logs }) => {
        const allStudents = Array.isArray(res) ? res : (res.data || res.payload || []);
        this.requests = allStudents.filter((s: StudentCampaignResponse) => hasPendingDatnInfo(s) || hasPendingDatnPlan(s));
        this.requests.push(...logs.map(entry => ({
          id: entry.student_campaign_id, student_code: entry.student_code, full_name: entry.full_name,
          class_name: entry.class_name, campaign_id: entry.campaign_id, department_id: entry.department_id,
          status: '', datn_info: { thesis_title: entry.thesis_title || '' }, weekly_log: entry.weekly_log
        })));
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.loadError = true;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let result = [...this.requests];
    if (this.filterType !== 'ALL') result = result.filter(r => this.getRequestType(r) === this.filterType);

    if (this.selectedCampaignId !== null) {
      result = result.filter(r => Number(r.campaign_id) === Number(this.selectedCampaignId));
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        (r.full_name && r.full_name.toLowerCase().includes(query)) ||
        (r.student_code && r.student_code.toLowerCase().includes(query)) ||
        (r.class_name && r.class_name.toLowerCase().includes(query)) ||
        (r.weekly_log?.content && r.weekly_log.content.toLowerCase().includes(query)) ||
        (r.datn_info?.thesis_title && r.datn_info.thesis_title.toLowerCase().includes(query))
      );
    }

    this.filteredRequests = result;
  }

  openRequest(req: ApprovalRequest) {
    this.selectedRequest = req;
    this.requestType = this.getRequestType(req);
    this.supervisorComment = req.weekly_log?.supervisor_comment || '';
    this.showModal = true;
  }

  getRequestType(req: ApprovalRequest): RequestType {
    return req.weekly_log ? 'WEEKLY_LOG' : hasPendingDatnInfo(req) ? 'DATN' : 'PLAN';
  }

  getRequestLabel(req: ApprovalRequest): string {
    return req.weekly_log ? `Nhật ký ĐATN-02 — Tuần ${req.weekly_log.week_number}`
      : this.isPlanRequest(req) ? 'Kế hoạch thực hiện ĐATN' : 'ĐATN-01 (Nhiệm vụ ĐATN)';
  }

  isPlanRequest(req: ApprovalRequest): boolean {
    if (req.weekly_log) return false;
    return !hasPendingDatnInfo(req) && hasPendingDatnPlan(req);
  }

  closeModal() {
    if (this.isProcessing) return;
    this.showModal = false;
    this.selectedRequest = null;
    this.requestType = null;
    this.supervisorComment = '';
  }

  approve() {
    if (!this.selectedRequest || !this.requestType || this.isProcessing || !this.isCampaignActive(this.selectedRequest.campaign_id)) return;
    
    this.isProcessing = true;
    const selected = this.selectedRequest;
    const type = this.requestType;
    const approval = type === 'WEEKLY_LOG' && selected.weekly_log
      ? this.weeklyLogService.approveWeeklyLog(selected.weekly_log.id, this.supervisorComment.trim())
      : type === 'PLAN'
      ? this.studentCampaignService.approveDatnPlan(this.selectedRequest.id)
      : this.studentCampaignService.approveDatnInfo(this.selectedRequest.id);
    approval.subscribe({
      next: () => {
        this.toastService.success(type === 'WEEKLY_LOG' ? 'Đã xác nhận nhật ký tuần ' + selected.weekly_log!.week_number
          : type === 'PLAN' ? 'Đã duyệt kế hoạch thực hiện ĐATN thành công!' : 'Đã duyệt Nhiệm vụ ĐATN (ĐATN-01) thành công!');
        this.isProcessing = false;
        
        // Loại bỏ khỏi danh sách chờ
        this.requests = this.requests.filter(r => r !== selected);
        this.applyFilters();
        
        this.closeModal();
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Có lỗi xảy ra khi phê duyệt.';
        this.toastService.error(msg);
        this.isProcessing = false;
      }
    });
  }

  reject() {
    // Backend chưa hỗ trợ reject, tạm thời chỉ báo lỗi UI
    const msg = 'Tính năng từ chối đang được phát triển.';
    this.toastService.warning(msg);
  }
}
