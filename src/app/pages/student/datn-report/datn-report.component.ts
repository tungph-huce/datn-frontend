import { Component, OnInit } from '@angular/core';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { ActivatedRoute } from '@angular/router';
import { WeeklyLogService } from '../../../core/services/weekly-log.service';
import { FinalReportService } from '../../../core/services/final-report.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-datn-report',
  templateUrl: './datn-report.component.html',
  styleUrls: ['./datn-report.component.scss']
})
export class DatnReportComponent implements OnInit {
  isLoading = true;
  campaign: any = null;
  weeklyLogs: any[] = [];
  finalReports: any[] = [];
  
  // Các bước có thể: 'ĐATN-01', 'KE_HOACH', 'ĐATN-02', 'BAO_CAO'
  currentStep: string = 'ĐATN-01';
  maxUnlockedStep: string = 'ĐATN-01';
  private requestedStep: string | null = null;

  constructor(
    private campaignService: StudentCampaignService,
    private route: ActivatedRoute,
    private weeklyLogService: WeeklyLogService,
    private finalReportService: FinalReportService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.requestedStep = params['step'] || null;
      this.applyRequestedStep();
    });
    this.loadCampaign();
  }

  loadCampaign() {
    this.isLoading = true;
    this.campaignService.getMyCampaigns().subscribe({
      next: (res) => {
        const campaigns = Array.isArray(res) ? res : (res.data || res.payload || []);
        if (campaigns.length > 0) {
          this.campaign = campaigns[0];
          this.loadWorkflowArtifacts();
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadWorkflowArtifacts(): void {
    if (!this.campaign) return;
    forkJoin({
      weeklyLogs: this.weeklyLogService.findByStudentCampaign(this.campaign.id).pipe(catchError(() => of([]))),
      finalReports: this.finalReportService.getFinalReports(this.campaign.id).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ weeklyLogs, finalReports }) => {
        this.weeklyLogs = this.unwrapList(weeklyLogs);
        this.finalReports = this.unwrapList(finalReports);
        this.determineUnlock();
        this.applyRequestedStep();
        this.isLoading = false;
      },
      error: () => {
        this.weeklyLogs = [];
        this.finalReports = [];
        this.determineUnlock();
        this.applyRequestedStep();
        this.isLoading = false;
      }
    });
  }

  determineUnlock() {
    if (!this.isDatn01Approved()) {
      this.maxUnlockedStep = 'ĐATN-01';
      this.currentStep = 'ĐATN-01';
    } else if (!this.hasDatn02Plan() || !this.isDatn02Approved()) {
      this.maxUnlockedStep = 'KE_HOACH';
      this.currentStep = 'KE_HOACH';
    } else if (!this.isDatn03Approved()) {
      this.maxUnlockedStep = 'ĐATN-02';
      this.currentStep = 'ĐATN-02';
    } else {
      this.maxUnlockedStep = 'BAO_CAO';
      this.currentStep = 'BAO_CAO';
    }
  }

  setStep(step: string) {
    // Chỉ cho phép chuyển tới bước nếu nó <= maxUnlockedStep
    const steps = ['ĐATN-01', 'KE_HOACH', 'ĐATN-02', 'BAO_CAO'];
    const reqIdx = steps.indexOf(step);
    const maxIdx = steps.indexOf(this.maxUnlockedStep);
    
    if (reqIdx <= maxIdx) {
      this.currentStep = step;
    }
  }

  isUnlocked(step: string): boolean {
    const steps = ['ĐATN-01', 'KE_HOACH', 'ĐATN-02', 'BAO_CAO'];
    return steps.indexOf(step) <= steps.indexOf(this.maxUnlockedStep);
  }

  getDatn01Status(): string {
    if (!this.campaign) return 'Chưa gửi';
    if (this.isDatn01Approved()) return 'Đã duyệt';
    const s = this.campaign.status;
    if (s === 'IMPORTED' || s === 'ACTIVE') return 'Chưa kê khai';
    if (s === 'DATN_DECLARED') return 'Chờ duyệt';
    if (s === 'DRAFT') return 'Chưa kê khai';
    if (s === 'DATN_REJECTED') return 'Bị từ chối';
    return 'Đã duyệt'; // DATN_APPROVED and beyond
  }

  getDatn02Status(): string {
    if (!this.campaign) return '';
    if (!this.hasDatn02Plan()) return 'Chưa lập';
    if (this.isDatn02Approved()) return 'Đã duyệt';
    return 'Chờ duyệt';
  }

  getDatn03Status(): string {
    if (!this.campaign) return '';
    if (this.isDatn03Approved()) return 'Đã duyệt';
    if (this.weeklyLogs.length > 0) return 'Chờ xác nhận';
    return 'Chưa nhập';
  }

  private applyRequestedStep(): void {
    if (this.requestedStep && this.isUnlocked(this.requestedStep)) {
      this.currentStep = this.requestedStep;
    }
  }

  private isDatn01Approved(): boolean {
    return this.campaign?.datn_info?.datn_status === 'APPROVED';
  }

  private hasDatn02Plan(): boolean {
    return Array.isArray(this.campaign?.datn_plans) && this.campaign.datn_plans.length > 0;
  }

  private isDatn02Approved(): boolean {
    return this.hasDatn02Plan() && this.campaign.datn_plans.every((plan: any) =>
      plan.gvhd_status === 'APPROVED'
    );
  }

  private isDatn03Approved(): boolean {
    return this.weeklyLogs.length >= 8 && this.weeklyLogs.every((log: any) => log.supervisor_status === 'APPROVED');
  }

  private unwrapList(value: any): any[] {
    return Array.isArray(value) ? value : (value?.data || value?.payload || []);
  }
}
