import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ToastService } from '../../../core/services/toast.service';
import { TrainingProgram, TrainingProgramRequest, TrainingProgramService } from '../../../core/services/training-program.service';

@Component({
  selector: 'app-program-management',
  templateUrl: './program-management.component.html'
})
export class ProgramManagementComponent implements OnInit {
  programs: TrainingProgram[] = [];
  query = '';
  isLoading = false;
  loadError = false;
  isSaving = false;
  isDeleting = false;
  isModalOpen = false;
  editingProgram: TrainingProgram | null = null;
  deletingProgram: TrainingProgram | null = null;
  form: TrainingProgramRequest = this.emptyForm();
  columns = [
    { key: 'code', label: 'Mã chương trình', width: '160px' },
    { key: 'name', label: 'Tên chương trình' },
    { key: 'grading_type', label: 'Ngưỡng đánh giá CLO', width: '190px' },
    { key: 'in_use', label: 'Sử dụng', width: '130px' },
    { key: 'actions', label: 'Thao tác', width: '130px', align: 'center' }
  ];

  constructor(private programService: TrainingProgramService, private toast: ToastService) {}

  ngOnInit(): void {
    this.loadPrograms();
  }

  get filteredPrograms(): TrainingProgram[] {
    const term = this.query.trim().toLocaleLowerCase('vi');
    return this.programs.filter(p => `${p.code} ${p.name} ${p.description || ''}`.toLocaleLowerCase('vi').includes(term));
  }

  loadPrograms(): void {
    this.isLoading = true;
    this.loadError = false;
    this.programService.getAll().pipe(finalize(() => this.isLoading = false)).subscribe({
      next: programs => this.programs = programs,
      error: err => {
        this.loadError = true;
        this.toast.error(err.message || 'Không thể tải danh sách chương trình.');
      }
    });
  }

  openCreate(): void {
    this.editingProgram = null;
    this.form = this.emptyForm();
    this.isModalOpen = true;
  }

  openEdit(program: TrainingProgram): void {
    this.editingProgram = program;
    this.form = { code: program.code, name: program.name, description: program.description || '', grading_type: program.grading_type };
    this.isModalOpen = true;
  }

  closeModal(): void {
    if (!this.isSaving) this.isModalOpen = false;
  }

  save(): void {
    if (this.isSaving) return;
    const request = { ...this.form, code: this.form.code.trim().toUpperCase(), name: this.form.name.trim(), description: this.form.description.trim() };
    if (!/^[A-Z0-9][A-Z0-9_-]{0,49}$/.test(request.code)) {
      this.toast.error('Mã chương trình tối đa 50 ký tự, chỉ gồm chữ không dấu, số, dấu gạch dưới hoặc gạch ngang.');
      return;
    }
    if (!request.name || request.name.length > 255 || request.description.length > 1000) {
      this.toast.error('Vui lòng nhập tên tối đa 255 ký tự và mô tả tối đa 1000 ký tự.');
      return;
    }
    this.isSaving = true;
    const action = this.editingProgram ? this.programService.update(this.editingProgram.id, request) : this.programService.create(request);
    action.pipe(finalize(() => this.isSaving = false)).subscribe({
      next: () => {
        this.isModalOpen = false;
        this.toast.success(this.editingProgram ? 'Cập nhật chương trình thành công.' : 'Thêm chương trình thành công.');
        this.loadPrograms();
      },
      error: err => this.toast.error(err.message || 'Không thể lưu chương trình.')
    });
  }

  closeDelete(): void {
    if (!this.isDeleting) this.deletingProgram = null;
  }

  deleteProgram(): void {
    if (!this.deletingProgram || this.isDeleting || this.deletingProgram.in_use) return;
    this.isDeleting = true;
    this.programService.delete(this.deletingProgram.id).pipe(finalize(() => this.isDeleting = false)).subscribe({
      next: () => {
        this.deletingProgram = null;
        this.toast.success('Xóa chương trình thành công.');
        this.loadPrograms();
      },
      error: err => this.toast.error(err.message || 'Không thể xóa chương trình.')
    });
  }

  private emptyForm(): TrainingProgramRequest {
    return { code: '', name: '', description: '', grading_type: 'STANDARD' };
  }
}
