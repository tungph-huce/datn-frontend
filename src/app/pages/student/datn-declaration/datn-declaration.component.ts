import { ToastService } from '../../../core/services/toast.service';
import { Component, OnInit } from '@angular/core';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { DatnInfoRequest } from '../../../core/models/request.model';
import { StudentCampaignResponse } from '../../../core/models/base.model';

@Component({
  selector: 'app-datn-declaration',
  templateUrl: './datn-declaration.component.html',
  styleUrls: ['./datn-declaration.component.scss']
})
export class DatnDeclarationComponent implements OnInit {
  isLoading = true;
  isSaving = false;
  campaigns: StudentCampaignResponse[] = [];
  selectedCampaign: StudentCampaignResponse | null = null;

  formData: DatnInfoRequest = {
    thesis_title: '',
    objectives: '',
    scope: '',
    deliverables: '',
    inputs: '',
    expected_results: ''
  };

  constructor(private toastService: ToastService, private studentCampaignService: StudentCampaignService) {}

  ngOnInit(): void {
    this.loadMyCampaigns();
  }

  loadMyCampaigns(): void {
    this.isLoading = true;
    this.studentCampaignService.getMyCampaigns().subscribe({
      next: (res) => {
        this.campaigns = Array.isArray(res) ? res : (res.data || res.payload || []);
        if (this.campaigns.length > 0) {
          this.selectedCampaign = this.campaigns[0];
          this.populateForm();
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.toastService.error('Không thể tải thông tin đợt ĐATN.');
        this.isLoading = false;
      }
    });
  }

  populateForm(): void {
    if (this.selectedCampaign && this.selectedCampaign.datn_info?.thesis_title) {
      const info = this.selectedCampaign.datn_info;
      this.formData = {
        thesis_title: info.thesis_title || '',
        objectives: info.objectives || '',
        scope: info.scope || '',
        deliverables: info.deliverables || '',
        inputs: info.inputs || '',
        expected_results: info.expected_results || ''
      };
    }
  }

  onSubmit(): void {
    if (!this.selectedCampaign) return;

    if (!this.isFormValid()) {
      this.toastService.error('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      return;
    }

    this.isSaving = true;
    this.studentCampaignService.submitDatnInfo(this.selectedCampaign.id, this.formData).subscribe({
      next: () => {
        this.toastService.success('Nộp kê khai Nhiệm vụ ĐATN (ĐATN-01) thành công!');
        this.isSaving = false;
        if (this.selectedCampaign) {
          this.selectedCampaign.status = 'DATN_DECLARED';
        }
      },
      error: (err: any) => {
        this.toastService.error(err.error?.message || 'Có lỗi xảy ra khi nộp thông tin.');
        this.isSaving = false;
      }
    });
  }

  isFormValid(): boolean {
    return !!this.formData.thesis_title?.trim()
      && !!this.formData.objectives?.trim()
      && !!this.formData.scope?.trim();
  }

  get statusLabel(): string {
    if (!this.selectedCampaign) return '';
    switch (this.selectedCampaign.status) {
      case 'IMPORTED': return 'Chưa kê khai Nhiệm vụ ĐATN';
      case 'DATN_DECLARED': return 'Chờ GVHD duyệt ĐATN-01';
      case 'DATN_APPROVED': return 'Đã duyệt ĐATN-01';
      case 'IN_PROGRESS': return 'Đang thực hiện ĐATN';
      case 'M1_EVALUATED': return 'Đã đánh giá mốc M1';
      case 'M2_EVALUATED': return 'Đã đánh giá mốc M2';
      case 'COMPLETED': return 'Đã hoàn thành';
      default: return this.selectedCampaign.status;
    }
  }
}
