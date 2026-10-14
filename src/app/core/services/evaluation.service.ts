import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScoreItem {
  clo_code: string;
  score_level: number;
  comment?: string;
}

export interface EvaluationRequest {
  conclusion: 'PASSED' | 'REVISION_REQUIRED' | 'FAILED';
  revision_resolved?: boolean;
  reassessment?: boolean;
  student_campaign_id: number;
  evaluator_type: 'GVHD';
  evaluator_id: number;
  stage: 'M1' | 'M2';
  general_comment?: string;
  scores: ScoreItem[];
}

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  studentClos(id:number): Observable<any[]> { return this.apiService.get<any[]>(`/base/academic/students/${id}/clos`); }

  submitEvaluation(request: EvaluationRequest): Observable<any> {
    return this.apiService.post<any>('/base/evaluations', request);
  }

  findEvaluations(studentCampaignId: number): Observable<any> {
    return this.apiService.get<any>(`/base/evaluations?student_campaign_id=${studentCampaignId}`);
  }

  findEvaluationsByStudents(studentCampaignIds: number[]): Observable<any> {
    return this.apiService.post<any>('/base/evaluations/statuses', studentCampaignIds);
  }

  getFinalResult(studentCampaignId: number): Observable<any> {
    return this.apiService.get<any>(`/base/evaluations/final-result/${studentCampaignId}`);
  }

  calculateFinalResult(studentCampaignId: number): Observable<any> {
    return this.apiService.post<any>(`/base/evaluations/final-result/${studentCampaignId}`, {});
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

  exportM1Datn03(studentCampaignId: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/base/evaluations/m1/${studentCampaignId}/datn-03`,
      { responseType: 'blob' }
    );
  }

  exportStageDatn07(studentCampaignId: number, stage: 'M1' | 'M2' | 'M3'): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/base/evaluations/stage/${stage}/${studentCampaignId}/datn-07`, { responseType: 'blob' });
  }

  exportM2Datn04(studentCampaignId: number): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/base/evaluations/m2/${studentCampaignId}/datn-04`,
      { responseType: 'blob' }
    );
  }

  exportDatn07Zip(campaignId: number, studentCampaignIds: number[]): Observable<Blob> {
    return this.http.post(
      `${environment.apiUrl}/base/evaluations/datn-08/export`,
      {
        campaign_id: campaignId,
        student_campaign_ids: studentCampaignIds
      },
      { responseType: 'blob' }
    );
  }

  unlockCampaignGrade(campaignId: number, req: { stage: string; reason?: string }): Observable<any> {
    return this.apiService.patch<any>(`/base/evaluations/campaign/${campaignId}/unlock-grade`, req);
  }
}
