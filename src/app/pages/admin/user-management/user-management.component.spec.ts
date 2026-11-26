import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { UserManagementComponent } from './user-management.component';
import { UserService, UserAccountType } from '../../../core/services/user.service';
import { DepartmentService } from '../../../core/services/department.service';
import { CampaignService } from '../../../core/services/campaign.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { UserResponse, BasePagination } from '../../../core/models/base.model';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

describe('UserManagementComponent account groups', () => {
  let fixture: ComponentFixture<UserManagementComponent>;
  let component: UserManagementComponent;
  let users: jasmine.SpyObj<UserService>;
  let departments: jasmine.SpyObj<DepartmentService>;
  let toast: jasmine.SpyObj<ToastService>;
  let campaigns: jasmine.SpyObj<CampaignService>;
  let api: jasmine.SpyObj<ApiService>;
  const majors = [{ id: 31, code: 'CNTT', name: 'Công nghệ thông tin' }];
  const route = { snapshot: { data: { accountType: 'STAFF' as UserAccountType } } };
  const emptyPage = { data: [], total: 0, current_page: 1, last_page: 1 };
  const student: UserResponse = {
    id: 7, email: 'student@test.invalid', full_name: 'Sinh viên', role: 'STUDENT', status: 'ACTIVE',
    department_id: null, department_name: null, created_at: '', student_code: '00000168', class_name: '68A', phone: '0900000000'
  };

  beforeEach(async () => {
    users = jasmine.createSpyObj('UserService', ['getUsers', 'getById', 'create', 'update', 'toggleStatus', 'delete']);
    users.getById.and.returnValue(of({ ...student, student_campaigns: [] }));
    departments = jasmine.createSpyObj('DepartmentService', ['getDepartments', 'getChildren', 'getById']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error']);
    campaigns = jasmine.createSpyObj('CampaignService', ['getCampaignOptions']);
    api = jasmine.createSpyObj('ApiService', ['get']);
    campaigns.getCampaignOptions.and.returnValue(of([{ id: 21, name: 'Đợt ĐATN 2026' }]));
    api.get.and.returnValue(of(majors));
    users.getUsers.and.returnValue(of(emptyPage));
    users.create.and.returnValue(of(student));
    users.update.and.returnValue(of(student));
    users.toggleStatus.and.returnValue(of({}));
    users.delete.and.returnValue(of({}));
    departments.getDepartments.and.returnValue(of(emptyPage));
    departments.getChildren.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [UserManagementComponent, ModalComponent, PaginationComponent],
      providers: [
        { provide: UserService, useValue: users }, { provide: DepartmentService, useValue: departments },
        { provide: CampaignService, useValue: campaigns }, { provide: ApiService, useValue: api },
        { provide: ToastService, useValue: toast }, { provide: ActivatedRoute, useValue: route }
      ]
    }).compileComponents();
  });

  async function openPage(accountType: UserAccountType): Promise<void> {
    route.snapshot.data.accountType = accountType;
    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function selectStudentEnrollment(): void {
    component.formFacultyId = 10;
    component.formSubDepartmentId = 11;
    component.onSubDepartmentChange();
    component.formMajorId = 31;
    component.formCampaignId = 21;
  }

  it('loads only students and displays their student code and class', async () => {
    users.getUsers.and.returnValue(of({ ...emptyPage, data: [student], total: 1 }));
    await openPage('STUDENT');
    expect(users.getUsers).toHaveBeenCalledWith(jasmine.any(Object), 'STUDENT', undefined, 'STUDENT');
    const html = fixture.nativeElement as HTMLElement;
    expect(html.querySelector('h2')!.textContent).toContain('Tài khoản sinh viên');
    expect(html.querySelector('table')!.textContent).toContain('00000168');
    expect(html.querySelector('table')!.textContent).toContain('68A');
    component.selectedRole = 'ADMIN';
    component.loadUsers();
    expect(users.getUsers.calls.mostRecent().args[1]).toBe('STUDENT');
  });

  it('loads staff as a separate server-side group and excludes students from role selection', async () => {
    await openPage('STAFF');
    expect(users.getUsers).toHaveBeenCalledWith(jasmine.any(Object), undefined, undefined, 'STAFF');
    expect(component.roles.map(role => role.value)).toEqual(['ADMIN', 'LDKBM', 'GVHD']);
    component.openCreateModal();
    fixture.detectChanges();
    expect(component.formRole).toBe('GVHD');
    expect((fixture.nativeElement as HTMLElement).querySelector('option[value="STUDENT"]')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('input[type="password"]')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Abc@1234');
  });

  it('creates a student with the correct role and identity fields without requiring a staff password', async () => {
    await openPage('STUDENT');
    component.openCreateModal();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('input[type="password"]')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Abc@1234');
    component.formFullName = 'Sinh viên mới';
    component.formEmail = 'new@student.test';
    component.formStudentCode = '00000268';
    component.formClassName = '68B';
    selectStudentEnrollment();
    component.saveUser();
    expect(users.create).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      role: 'STUDENT', student_code: '00000268', class_name: '68B', password: undefined,
      campaign_id: 21, major_id: 31, department_id: 11
    }));
    expect(component.isModalOpen).toBeFalse();
  });

  it('keeps existing student identity, class and phone when editing the name', async () => {
    await openPage('STUDENT');
    component.openEditModal(student);
    component.formFullName = 'Tên cập nhật';
    component.saveUser();
    expect(users.update).toHaveBeenCalledOnceWith(7, jasmine.objectContaining({
      full_name: 'Tên cập nhật', role: 'STUDENT', student_code: '00000168', class_name: '68A', phone: '0900000000', password: undefined
    }));
  });

  it('keeps staff-specific requirements and sends the selected department and degree', async () => {
    await openPage('STAFF');
    component.openCreateModal();
    component.formFullName = 'Giảng viên';
    component.formEmail = 'teacher@staff.test';
    component.saveUser();
    expect(users.create).not.toHaveBeenCalled();
    component.formFacultyId = 10;
    component.formSubDepartmentId = 11;
    component.formAcademicDegree = 'TIEN_SI';
    component.saveUser();
    expect(users.create).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      role: 'GVHD', department_id: 11, academic_degree: 'TIEN_SI', password: undefined
    }));
  });

  it('blocks creating an account with a role from the other group', async () => {
    await openPage('STAFF');
    component.openCreateModal();
    component.formFullName = 'Sai nhóm'; component.formEmail = 'wrong@group.test';
    component.formPassword = 'StrongTest@2026!'; component.formRole = 'STUDENT';
    component.saveUser();
    expect(users.create).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Vui lòng chọn vai trò thuộc đúng nhóm tài khoản.');
  });

  it('only sends a password when explicitly changing it in edit mode', async () => {
    await openPage('STUDENT');
    component.openEditModal(student);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('input[type="password"]')!.getAttribute('placeholder')).toBe('Bỏ trống nếu không đổi');
    expect(component.formPassword).toBe('');
    component.formPassword = 'Changed-Password@2026!';
    component.saveUser();
    expect(users.update).toHaveBeenCalledOnceWith(student.id, jasmine.objectContaining({ password: 'Changed-Password@2026!' }));
    component.openCreateModal();
    component.formEmail = 'new@student.test'; component.formFullName = 'Sinh viên mới';
    component.formStudentCode = '00000268';
    selectStudentEnrollment();
    component.formPassword = 'Stale-Password-Ignored!';
    component.saveUser();
    expect(users.create).toHaveBeenCalledOnceWith(jasmine.objectContaining({ password: undefined }));
  });

  it('requires a valid cohort, selected campaign and major before creating a student', async () => {
    await openPage('STUDENT');
    component.openCreateModal();
    component.formEmail = 'new@student.test'; component.formFullName = 'Sinh viên mới';
    selectStudentEnrollment();
    component.formStudentCode = 'invalid'; component.saveUser();
    expect(users.create).not.toHaveBeenCalled();
    component.formStudentCode = '00000268'; component.formCampaignId = null; component.saveUser();
    expect(users.create).not.toHaveBeenCalled();
    component.formCampaignId = 21; component.formMajorId = 999; component.saveUser();
    expect(users.create).not.toHaveBeenCalled();
    component.formMajorId = 31; component.saveUser();
    expect(users.create).toHaveBeenCalledTimes(1);
  });

  it('clears the selected major and ignores stale responses after changing department', async () => {
    await openPage('STUDENT'); component.openCreateModal();
    const stale = new Subject<typeof majors>();
    api.get.and.returnValues(stale.asObservable(), of([{ id: 32, code: 'XD', name: 'Xây dựng' }]));
    component.formSubDepartmentId = 11; component.onSubDepartmentChange();
    component.formMajorId = 31;
    component.formSubDepartmentId = 12; component.onSubDepartmentChange();
    stale.next(majors);
    expect(component.formMajorId).toBeNull();
    expect(component.academicMajors.map(m => m.id)).toEqual([32]);
    expect(api.get.calls.mostRecent().args[0]).toBe('/base/academic/majors?department_id=12');
    component.formFacultyId = 20; component.onFacultyChange();
    expect(component.formSubDepartmentId).toBeNull();
    expect(component.academicMajors).toEqual([]);
  });

  it('shows campaign and major loading failures and blocks enrollment until retry succeeds', async () => {
    campaigns.getCampaignOptions.and.returnValue(throwError(() => new Error('offline')));
    await openPage('STUDENT'); component.openCreateModal();
    component.formEmail = 'new@student.test'; component.formFullName = 'Sinh viên mới';
    component.formStudentCode = '00000268'; selectStudentEnrollment();
    component.saveUser(); fixture.detectChanges();
    expect(users.create).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không thể tải đợt ĐATN');
    campaigns.getCampaignOptions.and.returnValue(of([{ id: 21, name: 'Đợt 2026' }]));
    component.loadCampaignOptions();
    api.get.and.returnValue(throwError(() => new Error('offline')));
    component.onSubDepartmentChange(); component.formMajorId = 31; component.saveUser(); fixture.detectChanges();
    expect(users.create).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không thể tải ngành');
    api.get.and.returnValue(of(majors));
    component.onSubDepartmentChange(); component.formMajorId = 31; component.saveUser();
    expect(users.create).toHaveBeenCalledTimes(1);
  });

  it('lets an existing student enroll when updating and clears enrollment for the next account', async () => {
    await openPage('STUDENT');
    component.openEditModal(student);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('select[aria-label="Đợt ĐATN"]')).not.toBeNull();
    selectStudentEnrollment();
    component.saveUser();
    expect(users.update).toHaveBeenCalledWith(7, jasmine.objectContaining({ campaign_id: 21, major_id: 31, department_id: 11 }));
    component.openEditModal(student);
    expect(component.formCampaignId).toBeNull();
    expect(component.formMajorId).toBeNull();
    component.saveUser();
    expect(users.update.calls.mostRecent().args[1].campaign_id).toBeUndefined();
  });

  it('prefills the saved campaign from assignment records and preserves it when saving account information', async () => {
    const enrollment = { student_campaign_id: 90, campaign_id: 42, campaign_name: 'Đợt từ phân công',
      campaign_status: 'INACTIVE', department_id: 11, department_name: 'Bộ môn CNTT', faculty_id: 10,
      major_id: 31, major_name: 'Công nghệ thông tin', cohort: '68' };
    users.getById.and.returnValue(of({ ...student, student_campaign: enrollment }));
    await openPage('STUDENT');
    component.openEditModal(student); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(users.getById).toHaveBeenCalledWith(7);
    expect(component.formCampaignId).toBe(42);
    expect(component.formMajorId).toBe(31);
    expect(component.formSubDepartmentId).toBe(11);
    expect(component.campaignOptions.some(c => c.id === 42)).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Đợt từ phân công');
    const select = fixture.nativeElement.querySelector('select[aria-label="Đợt ĐATN"]') as HTMLSelectElement;
    expect(select.selectedOptions[0].textContent).toContain('Đợt từ phân công');
    expect(select.disabled).toBeTrue();
    component.formFullName = 'Đổi tên'; component.saveUser();
    expect(users.update.calls.mostRecent().args[1].campaign_id).toBeUndefined();
    component.openEditModal(student);
    expect(component.formCampaignId).toBe(42);
  });

  it('flags legacy duplicate campaigns and blocks saving instead of choosing one silently', async () => {
    const base = { student_campaign_id: 90, department_id: 11, department_name: 'Bộ môn CNTT', faculty_id: 10,
      major_id: 31, major_name: 'CNTT', cohort: '68' };
    const options = new Subject<{ id: number; name: string }[]>();
    campaigns.getCampaignOptions.and.returnValue(options.asObservable());
    users.getById.and.returnValue(of({ ...student, student_campaigns: [
      { ...base, campaign_id: 42, campaign_name: 'Đợt cũ', campaign_status: 'INACTIVE' },
      { ...base, campaign_id: 43, campaign_name: 'Đợt hiện tại', campaign_status: 'ACTIVE' }
    ] }));
    await openPage('STUDENT'); component.openEditModal(student);
    expect(component.formCampaignId).toBeNull();
    expect(component.enrollmentConflict).toBeTrue();
    options.next([{ id: 21, name: 'Đợt mới' }]);
    expect(component.campaignOptions.map(c => c.id)).toEqual([21, 42, 43]);
    component.saveUser();
    expect(users.update).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Mỗi sinh viên chỉ được gán một đợt');
  });

  it('blocks saving when the saved enrollment detail fails to load and supports retry', async () => {
    users.getById.and.returnValue(throwError(() => new Error('offline')));
    await openPage('STUDENT'); component.openEditModal(student); component.saveUser(); fixture.detectChanges();
    expect(users.update).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không thể tải hồ sơ đợt ĐATN');
    users.getById.and.returnValue(of({ ...student, student_campaigns: [] }));
    component.loadStudentDetail(); component.saveUser();
    expect(users.update).toHaveBeenCalledTimes(1);
  });

  it('ignores stale detail when another account is opened', async () => {
    const stale = new Subject<UserResponse>();
    users.getById.and.returnValues(stale.asObservable(), of({ ...student, id: 8, full_name: 'Tài khoản khác', student_campaigns: [] }));
    await openPage('STUDENT'); component.openEditModal(student);
    expect(component.isLoadingDetail).toBeTrue();
    component.openEditModal({ ...student, id: 8 });
    stale.next({ ...student, full_name: 'Dữ liệu cũ' });
    expect(component.formFullName).toBe('Tài khoản khác');
    expect(component.editingId).toBe(8);
  });

  it('retains the group while filtering and paginating', async () => {
    await openPage('STAFF');
    component.currentPage = 3;
    component.searchQuery = ' Khoa '; component.selectedRole = 'LDKBM'; component.selectedFacultyId = 10;
    component.onFilterChange();
    expect(users.getUsers.calls.mostRecent().args).toEqual([
      { page: 1, limit: 10, searchText: 'Khoa' }, 'LDKBM', 10, 'STAFF'
    ]);
    component.onPageChange(2);
    expect(users.getUsers.calls.mostRecent().args[0].page).toBe(2);
    expect(users.getUsers.calls.mostRecent().args[3]).toBe('STAFF');
  });

  it('does not let a slow old search overwrite the latest results', async () => {
    await openPage('STUDENT');
    const stale = new Subject<BasePagination<UserResponse>>();
    users.getUsers.and.returnValues(stale.asObservable(), of({ ...emptyPage, data: [student], total: 1 }));
    component.searchQuery = 'old'; component.onFilterChange();
    component.searchQuery = 'new'; component.onFilterChange();
    stale.next({ ...emptyPage, data: [], total: 0 });
    expect(component.users).toEqual([student]);
    expect(component.totalItems).toBe(1);
  });

  it('refreshes the student group after locking and deleting a student', async () => {
    await openPage('STUDENT');
    component.toggleStatus(student);
    expect(users.toggleStatus).toHaveBeenCalledOnceWith(student.id);
    component.openDeleteConfirm(student); component.confirmDeleteUser();
    expect(users.delete).toHaveBeenCalledOnceWith(student.id);
    expect(users.getUsers.calls.mostRecent().args[3]).toBe('STUDENT');
  });
});
