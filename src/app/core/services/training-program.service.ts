import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface TrainingProgramRequest {
  code: string;
  name: string;
  description: string;
  grading_type: 'STANDARD' | 'STEM';
}

export interface TrainingProgram extends TrainingProgramRequest {
  id: number;
  in_use: boolean;
}

@Injectable({ providedIn: 'root' })
export class TrainingProgramService {
  constructor(private api: ApiService) {}

  getAll(): Observable<TrainingProgram[]> {
    return this.api.get<TrainingProgram[]>('/base/programs');
  }

  create(request: TrainingProgramRequest): Observable<TrainingProgram> {
    return this.api.post<TrainingProgram>('/base/programs', request);
  }

  update(id: number, request: TrainingProgramRequest): Observable<TrainingProgram> {
    return this.api.put<TrainingProgram>(`/base/programs/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`/base/programs/${id}`);
  }
}
