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

  uploadFile(file: File): Observable<FileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.apiService.post<FileResponse>('/base/files/upload', formData);
  }
}
