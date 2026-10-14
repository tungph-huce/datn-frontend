import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface FileResponse {
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  constructor(private apiService: ApiService, private http: HttpClient) {}

  downloadFile(path: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}${path}`, { responseType: 'blob' });
  }

  /** Lưu vào kho số của hồ sơ; backend đặt tên theo quy cách Điều 9.4. */
  uploadFile(file: File, studentCampaignId: number, documentType: string = 'Baocao'): Observable<FileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('student_campaign_id', String(studentCampaignId));
    formData.append('document_type', documentType);
    return this.apiService.post<FileResponse>('/base/files/upload', formData);
  }
}
