import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { WeeklyLogRequest } from '../models/request.model';
import { WeeklyLogApprovalResponse } from '../models/base.model';

@Injectable({
  providedIn: 'root'
})
export class WeeklyLogService {
  constructor(private apiService: ApiService) {}

  getPending(): Observable<WeeklyLogApprovalResponse[]> {
    return this.apiService.get<WeeklyLogApprovalResponse[]>('/base/weekly-logs/pending');
  }

  findByStudentCampaign(studentCampaignId: number): Observable<any> {
    return this.apiService.get<any>(`/base/weekly-logs?student_campaign_id=${studentCampaignId}`);
  }

  createOrUpdate(request: WeeklyLogRequest): Observable<any> {
    return this.apiService.post<any>('/base/weekly-logs', request);
  }

  approveWeeklyLog(id: number, comment?: string): Observable<any> {
    return this.apiService.patch<any>(`/base/weekly-logs/${id}/approve`, { comment: comment || '' });
  }
}
