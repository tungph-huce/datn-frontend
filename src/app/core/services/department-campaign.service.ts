import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface RubricItem {
  score_level: number;
  description: string;
}

export interface CloItem {
  m3_weight?: number;
  required_for_completion?: boolean;
  clo_code: string;
  description: string;
  alpha_weight: number;
  m1_weight: number;
  m2_weight: number;
  gvhd_beta: number;
  rubrics: RubricItem[];
}

export interface CloConfigRequest {
  major_id?: number; cohort?: string; m3_weight?: number;
  program_type?: string;
  completion_rule?: string;
  department_campaign_id: number;
  m1_weight: number;
  m2_weight: number;
  clo_set_name: string;
  clos: CloItem[];
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentCampaignService {
  constructor(private apiService: ApiService) {}

  // Lấy hoặc tạo mới cấu hình department_campaign (trả về { id, department_id, campaign_id, ... })
  findOrCreate(campaignId: number, departmentId: number): Observable<any> {
    return this.apiService.get<any>(`/base/department-campaigns/find?campaign_id=${campaignId}&department_id=${departmentId}`);
  }

  // Lấy danh sách CLO configs (đã mapping rubrics) theo departmentCampaignId
  getCloConfigs(departmentCampaignId: number): Observable<any> {
    return this.apiService.get<any>(`/base/department-campaigns/${departmentCampaignId}/clo-configs`);
  }

  // Lưu cấu hình CLO & Rubric
  saveCloConfigs(request: CloConfigRequest): Observable<any> {
    return this.apiService.post<any>('/base/department-campaigns/clo-configs', request);
  }

  // Lấy danh sách bộ CLO đã lưu của khoa
  getCloSets(departmentId: number): Observable<any> {
    return this.apiService.get<any>(`/base/department-campaigns/clo-sets?department_id=${departmentId}`);
  }

  // Áp dụng bộ CLO có sẵn vào đợt ĐATN
  applyCloSet(departmentCampaignId: number, cloSetId: number): Observable<any> {
    return this.apiService.post<any>(`/base/department-campaigns/${departmentCampaignId}/apply-clo-set/${cloSetId}`, {});
  }
}
