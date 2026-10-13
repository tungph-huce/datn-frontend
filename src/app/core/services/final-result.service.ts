import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { BaseResponse } from '../models/base.model';
import { HttpParams } from '@angular/common/http';

export interface FinalResultResponse {
  m3_score?: number | null; m3_locked?: boolean;
  clo_outcomes?: Array<{ code: string; score: number | null; rawScore: number | null; achieved: boolean; required: boolean; description: string; m1: number | null; m2: number | null; alphaWeight: number; m1Weight: number; m2Weight: number; m3?: number | null; m3Weight?: number }>;
  id?: number;
  student_campaign_id: number;
  student_code: string;
  full_name: string;
  class_name: string;
  campaign_id?: number;
  department_id?: number;
  committee_id?: number;
  thesis_title?: string;
  gvhd_name?: string;
  m1_score?: number;
  m2_score?: number;
  final_hp_score: number | null;
  grade_level: string;
  is_paralyzed: boolean;
  is_approved: boolean;
  m1_locked?: boolean;
  m2_locked?: boolean;
  m1_gvhd_locked?: boolean;
  m2_gvhd_locked?: boolean;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinalResultService {

  constructor(private apiService: ApiService) {}

  approveFinalResult(studentCampaignId: number, integrity: boolean, evidence: boolean): Observable<any> {
    return this.apiService.patch<any>(`/base/final-results/${studentCampaignId}/approve`, { integrity_confirmed: integrity, evidence_confirmed: evidence });
  }

  lockFinalResultStage(
    studentCampaignId: number,
    stage: 'M1' | 'M2',
    evaluatorType: 'GVHD'
  ): Observable<any> {
    return this.apiService.patch<any>(
      `/base/evaluations/final-result/${studentCampaignId}/lock?stage=${stage}&evaluator_type=${evaluatorType}`,
      {}
    );
  }

  getFinalResultsByCampaign(departmentCampaignId: number): Observable<FinalResultResponse[]> {
    return this.apiService.get<FinalResultResponse[]>(`/base/final-results?department_campaign_id=${departmentCampaignId}`);
  }

  getMyStudentFinalResults(campaignId?: number | null): Observable<FinalResultResponse[]> {
    let params = new HttpParams();
    if (campaignId) {
      params = params.set('campaign_id', campaignId.toString());
    }
    return this.apiService.get<FinalResultResponse[]>('/base/final-results/my-students', params);
  }

  getMyFinalResult(): Observable<FinalResultResponse> {
    return this.apiService.get<FinalResultResponse>('/base/final-results/my-result');
  }
}
