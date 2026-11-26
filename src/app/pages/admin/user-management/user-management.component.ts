import { ToastService } from '../../../core/services/toast.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserService, UserRequest, UserAccountType } from '../../../core/services/user.service';
import { DepartmentService } from '../../../core/services/department.service';
import { CampaignService } from '../../../core/services/campaign.service';
import { ApiService } from '../../../core/services/api.service';
import { UserResponse, PaginationRequest, DepartmentResponse, StudentEnrollment } from '../../../core/models/base.model';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  readonly defaultPassword = 'Abc@1234';
  accountType: UserAccountType = 'STAFF';
  private userLoad?: Subscription;
  private campaignLoad?: Subscription;
  private majorLoad?: Subscription;
  private departmentLoad?: Subscription;
  private detailLoad?: Subscription;
  private departmentLookup?: Subscription;
  studentEnrollments: StudentEnrollment[] = [];
  isLoadingDetail = false;
  detailLoadError = false;
  enrollmentConflict = false;
  private accountDepartmentId: number | null = null;
  isSaving = false;
  isModalOpen = false;
  isDeleteConfirmOpen = false;
  isLoading = false;
  isDeleting = false;
    currentPage = 1;
  pageSize = 10;
  totalItems = 0;

  users: UserResponse[] = [];
  departments: DepartmentResponse[] = [];

  isEditMode = false;
  editingId: number | null = null;
  deletingUser: UserResponse | null = null;
  
  formEmail = '';
  formPassword = '';
  formFullName = '';
  formStudentCode = '';
  formClassName = '';
  formPhone = '';
  formRole = '';
  formAcademicDegree: string | null = null;
  readonly academicDegrees = [
    { value: 'DAI_HOC', label: 'Đại học' },
    { value: 'THAC_SI', label: 'Thạc sĩ' },
    { value: 'TIEN_SI', label: 'Tiến sĩ (PGS/GS)' }
  ];
  formFacultyId: number | null = null;
  formSubDepartmentId: number | null = null;
  formCampaignId: number | null = null;
  formMajorId: number | null = null;
  campaignOptions: { id: number; name: string }[] = [];
  academicMajors: { id: number; name: string; code: string }[] = [];
  isLoadingCampaigns = false;
  isLoadingMajors = false;
  campaignLoadError = false;
  majorLoadError = false;

  faculties: DepartmentResponse[] = [];
  subDepartments: DepartmentResponse[] = [];

  readonly allRoles = [
    { value: 'ADMIN', label: 'Quản trị viên (Admin)' },
    { value: 'LDKBM', label: 'Lãnh đạo Khoa/Bộ môn' },
    { value: 'GVHD', label: 'Giáo viên hướng dẫn' },
    { value: 'STUDENT', label: 'Sinh viên' }
  ];

  get isStudentManagement(): boolean {
    return this.accountType === 'STUDENT';
  }

  get isCreatingStudent(): boolean {
    return this.isStudentManagement && !this.isEditMode;
  }

  get isEnrollingStudent(): boolean {
    return this.isStudentManagement && (!this.isEditMode || (this.studentEnrollments.length === 0 && this.formCampaignId !== null));
  }

  get selectedEnrollment(): StudentEnrollment | undefined {
    return this.studentEnrollments.find(e => e.campaign_id === this.formCampaignId);
  }

  get pageTitle(): string {
    return this.isStudentManagement ? 'Tài khoản sinh viên' : 'Tài khoản cán bộ';
  }

  get roles(): { value: string; label: string }[] {
    return this.allRoles.filter(role => this.isStudentManagement ? role.value === 'STUDENT' : role.value !== 'STUDENT');
  }

  searchQuery = '';
  selectedRole = '';
  selectedFacultyId: number | null = null;

  constructor(private toastService: ToastService, private userService: UserService,
    private departmentService: DepartmentService, private route: ActivatedRoute,
    private campaignService: CampaignService, private api: ApiService) {}

  ngOnInit(): void {
    this.accountType = this.route.snapshot.data['accountType'] === 'STUDENT' ? 'STUDENT' : 'STAFF';
    this.resetForm();
    this.loadUsers();
    this.loadFaculties();
  }

  ngOnDestroy(): void {
    this.userLoad?.unsubscribe();
    this.campaignLoad?.unsubscribe();
    this.majorLoad?.unsubscribe();
    this.departmentLoad?.unsubscribe();
    this.detailLoad?.unsubscribe();
    this.departmentLookup?.unsubscribe();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  loadUsers(): void {
    this.userLoad?.unsubscribe();
    this.isLoading = true;
    const request: PaginationRequest = {
      page: this.currentPage,
      limit: this.pageSize,
      searchText: this.searchQuery ? this.searchQuery.trim() : undefined
    };

    this.userLoad = this.userService.getUsers(
      request,
      this.isStudentManagement ? 'STUDENT' : this.selectedRole || undefined,
      this.selectedFacultyId || undefined,
      this.accountType
    ).subscribe({
      next: (pagination) => {
        this.users = pagination.data || [];
        this.totalItems = pagination.total || 0;
        this.currentPage = pagination.current_page || 1;
        this.isLoading = false;
      },
      error: (err) => {
        this.toastService.error(err?.message || 'Không thể tải danh sách tài khoản');
        this.isLoading = false;
      }
    });
  }

  loadFaculties(): void {
    this.departmentService.getDepartments({ page: 1, limit: 1000 }).subscribe({
      next: (res) => {
        this.faculties = res.data.filter(d => d.status === 'ACTIVE') || [];
      }
    });
  }

  onFacultyChange(resetSubDept = true): void {
    if (resetSubDept) this.departmentLookup?.unsubscribe();
    this.departmentLoad?.unsubscribe();
    if (resetSubDept) {
      this.formSubDepartmentId = null;
      this.onSubDepartmentChange();
    }
    this.subDepartments = [];
    if (this.formFacultyId) {
      this.departmentLoad = this.departmentService.getChildren(this.formFacultyId).subscribe({
        next: (res) => {
          this.subDepartments = res.filter(d => d.status === 'ACTIVE') || [];
        }
      });
    }
  }

  loadCampaignOptions(): void {
    this.campaignLoad?.unsubscribe();
    this.campaignOptions = [];
    this.campaignLoadError = false;
    this.isLoadingCampaigns = true;
    this.campaignLoad = this.campaignService.getCampaignOptions('ACTIVE').subscribe({
      next: (options) => {
        this.campaignOptions = options || [];
        this.mergeAssignedCampaigns();
        this.isLoadingCampaigns = false;
      },
      error: () => {
        this.campaignLoadError = true;
        this.isLoadingCampaigns = false;
      }
    });
  }

  onSubDepartmentChange(): void {
    this.majorLoad?.unsubscribe();
    this.formMajorId = null;
    this.academicMajors = [];
    this.majorLoadError = false;
    this.isLoadingMajors = false;
    if (!this.isStudentManagement || !this.formSubDepartmentId) return;
    this.isLoadingMajors = true;
    this.majorLoad = this.api.get<{ id: number; name: string; code: string }[]>(
      `/base/academic/majors?department_id=${this.formSubDepartmentId}`
    ).subscribe({
      next: (majors) => {
        this.academicMajors = majors || [];
        this.isLoadingMajors = false;
      },
      error: () => {
        this.majorLoadError = true;
        this.isLoadingMajors = false;
      }
    });
  }

  onRoleChange(): void {
    if (!this.requiresDepartmentSelection()) {
      this.formFacultyId = null;
      this.formSubDepartmentId = null;
      this.subDepartments = [];
    }
  }

  requiresDepartmentSelection(): boolean {
    return this.formRole === 'LDKBM' || this.formRole === 'GVHD' || this.isEnrollingStudent;
  }

  requiresSubDepartmentSelection(): boolean {
    return this.formRole === 'GVHD' || this.isEnrollingStudent;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.resetForm();
    if (this.isStudentManagement) this.loadCampaignOptions();
    this.isModalOpen = true;
  }

  openEditModal(user: UserResponse): void {
    this.isEditMode = true;
    this.editingId = user.id;
    this.resetForm();
    if (this.isStudentManagement) this.loadCampaignOptions();
    this.applyEditAccount(user);
    this.isModalOpen = true;
    if (this.isStudentManagement) this.loadStudentDetail();
  }

  loadStudentDetail(): void {
    if (!this.editingId) return;
    this.detailLoad?.unsubscribe();
    this.isLoadingDetail = true;
    this.detailLoadError = false;
    this.detailLoad = this.userService.getById(this.editingId).subscribe({
      next: user => {
        this.departmentLookup?.unsubscribe();
        this.applyEditAccount(user);
        this.studentEnrollments = user.student_campaign ? [user.student_campaign] : user.student_campaigns || [];
        this.enrollmentConflict = !!user.enrollment_conflict || this.studentEnrollments.length > 1;
        this.mergeAssignedCampaigns();
        const selected = !this.enrollmentConflict ? this.studentEnrollments[0] : undefined;
        this.formCampaignId = selected?.campaign_id ?? null;
        if (selected) this.onCampaignChange();
        this.isLoadingDetail = false;
      },
      error: () => {
        this.detailLoadError = true;
        this.isLoadingDetail = false;
      }
    });
  }

  private mergeAssignedCampaigns(): void {
    for (const enrollment of this.studentEnrollments) {
      if (!this.campaignOptions.some(c => c.id === enrollment.campaign_id)) {
        this.campaignOptions.push({ id: enrollment.campaign_id, name: enrollment.campaign_name });
      }
    }
  }

  onCampaignChange(): void {
    const enrollment = this.selectedEnrollment;
    if (enrollment) {
      this.departmentLookup?.unsubscribe();
      this.departmentLoad?.unsubscribe();
      this.majorLoad?.unsubscribe();
      this.isLoadingMajors = false;
      this.majorLoadError = false;
      this.formFacultyId = enrollment.faculty_id;
      this.formSubDepartmentId = enrollment.department_id;
      this.formMajorId = enrollment.major_id;
    } else {
      this.onFacultyChange(false);
      this.onSubDepartmentChange();
    }
  }

  private applyEditAccount(user: UserResponse): void {
    this.accountDepartmentId = user.department_id;
    this.formEmail = user.email || '';
    this.formFullName = user.full_name || '';
    this.formRole = user.role || '';
    this.formAcademicDegree = user.academic_degree || null;
    this.formStudentCode = user.student_code || '';
    this.formClassName = user.class_name || '';
    this.formPhone = user.phone || '';
    
    // Determine faculty and sub-department from single department_id
    this.formFacultyId = null;
    this.formSubDepartmentId = null;
    this.subDepartments = [];
    
    if (user.department_id) {
      this.departmentLookup = this.departmentService.getById(user.department_id).subscribe({
        next: (dept) => {
          if (dept.parent_id) {
             this.formFacultyId = dept.parent_id;
             this.formSubDepartmentId = user.department_id;
             this.onFacultyChange(false); // load subs but don't reset formSubDepartmentId
             this.onSubDepartmentChange();
          } else {
             this.formFacultyId = user.department_id;
             this.onFacultyChange(false); // load subs for this faculty so user can select them
          }
        }
      });
    }

    this.formPassword = ''; // Không hiển thị password cũ
  }

  closeModal(): void {
    if (!this.isSaving) this.isModalOpen = false;
  }

  resetForm(): void {
    this.detailLoad?.unsubscribe();
    this.departmentLookup?.unsubscribe();
    this.isLoadingDetail = false;
    this.detailLoadError = false;
    this.studentEnrollments = [];
    this.enrollmentConflict = false;
    this.accountDepartmentId = null;
    this.majorLoad?.unsubscribe();
    this.departmentLoad?.unsubscribe();
    this.formEmail = '';
    this.formPassword = '';
    this.formFullName = '';
    this.formRole = this.isStudentManagement ? 'STUDENT' : 'GVHD';
    this.formStudentCode = '';
    this.formClassName = '';
    this.formPhone = '';
    this.formAcademicDegree = null;
    this.formFacultyId = null;
    this.formSubDepartmentId = null;
    this.subDepartments = [];
    this.formCampaignId = null;
    this.formMajorId = null;
    this.academicMajors = [];
    this.isLoadingMajors = false;
    this.majorLoadError = false;
  }

  saveUser(): void {
    if (this.isSaving) return;
    if (this.enrollmentConflict) {
      this.toastService.error('Sinh viên đang có nhiều hồ sơ đợt. Cần đối chiếu dữ liệu để chỉ giữ một đợt ĐATN.');
      return;
    }
    if (this.isLoadingDetail || this.detailLoadError) {
      this.toastService.error('Cần tải đầy đủ hồ sơ đợt ĐATN trước khi cập nhật.');
      return;
    }
    if (!this.formEmail.trim()) {
      this.toastService.error('Vui lòng nhập Email');
      return;
    }
    if (!this.formFullName.trim()) {
      this.toastService.error('Vui lòng nhập Họ và tên');
      return;
    }
    if (!this.roles.some(role => role.value === this.formRole)) {
      this.toastService.error('Vui lòng chọn vai trò thuộc đúng nhóm tài khoản.');
      return;
    }

    if (this.isEnrollingStudent) {
      if (!/[0-9]{2}$/.test(this.formStudentCode.trim())) {
        this.toastService.error('Mã sinh viên phải kết thúc bằng hai chữ số khóa.');
        return;
      }
      if (this.isLoadingCampaigns || this.campaignLoadError || !this.campaignOptions.some(c => c.id === this.formCampaignId)) {
        this.toastService.error('Vui lòng chọn đợt ĐATN đang hoạt động.');
        return;
      }
      if (this.isLoadingMajors || this.majorLoadError || !this.academicMajors.some(m => m.id === this.formMajorId)) {
        this.toastService.error('Vui lòng chọn ngành thuộc Bộ môn đã chọn.');
        return;
      }
    }

    if (this.requiresDepartmentSelection()) {
      if (!this.formFacultyId) {
        this.toastService.error('Vui lòng chọn Khoa cho tài khoản này.');
        return;
      }
      if (this.requiresSubDepartmentSelection() && !this.formSubDepartmentId) {
        this.toastService.error('Vui lòng chọn Bộ môn cho tài khoản này.');
        return;
      }
    }

    const finalDepartmentId = this.selectedEnrollment ? this.accountDepartmentId : this.formSubDepartmentId || this.formFacultyId || null;

    const request: UserRequest = {
      email: this.formEmail.trim(),
      password: this.isEditMode ? this.formPassword.trim() || undefined : undefined,
      full_name: this.formFullName.trim(),
      role: this.formRole,
      department_id: finalDepartmentId,
      student_code: this.formStudentCode.trim() || null,
      class_name: this.formClassName.trim() || null,
      phone: this.formPhone.trim(),
      academic_degree: this.formRole === 'GVHD' ? this.formAcademicDegree : null
    };
    if (this.isEnrollingStudent) {
      request.campaign_id = this.formCampaignId!;
      request.major_id = this.formMajorId!;
    }

    this.isSaving = true;

    if (this.isEditMode && this.editingId) {
      this.userService.update(this.editingId, request).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success('Cập nhật tài khoản thành công');
          this.loadUsers();
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Cập nhật thất bại');
          this.isSaving = false;
        }
      });
    } else {
      this.userService.create(request).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.toastService.success(this.isStudentManagement ? 'Đã tạo tài khoản và thêm sinh viên vào đợt ĐATN.' : 'Tạo tài khoản thành công');
          this.currentPage = 1;
          this.loadUsers();
        },
        error: (err) => {
          this.toastService.error(err?.message || 'Tạo mới thất bại');
          this.isSaving = false;
        }
      });
    }
  }

  toggleStatus(user: UserResponse): void {
    this.userService.toggleStatus(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        this.toastService.error(err?.message || 'Đổi trạng thái thất bại');
      }
    });
  }

  openDeleteConfirm(user: UserResponse): void {
    this.deletingUser = user;
    this.isDeleteConfirmOpen = true;
  }

  closeDeleteConfirm(): void {
    if (this.isDeleting) {
      return;
    }
    this.isDeleteConfirmOpen = false;
    this.deletingUser = null;
  }

  confirmDeleteUser(): void {
    if (!this.deletingUser) {
      return;
    }
    this.isDeleting = true;
    this.userService.delete(this.deletingUser.id).subscribe({
      next: () => {
        this.toastService.success('Xóa tài khoản thành công');
        this.isDeleting = false;
        this.isDeleteConfirmOpen = false;
        this.deletingUser = null;
        this.loadUsers();
      },
      error: (err) => {
        this.toastService.error(err?.message || 'Xóa tài khoản thất bại');
        this.isDeleting = false;
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadUsers();
  }

  getStatusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Đang hoạt động' : 'Bị khóa';
  }

  getRoleLabel(role: string): string {
    const found = this.allRoles.find(r => r.value === role);
    return found ? found.label : role;
  }
}
