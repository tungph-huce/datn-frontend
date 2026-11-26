import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { StudentCampaignResponse } from '../../core/models/base.model';
import { StudentCampaignService } from '../../core/services/student-campaign.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CampaignService } from '../../core/services/campaign.service';
import { WeeklyLogService } from '../../core/services/weekly-log.service';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { ApprovalRequestsComponent } from './approval-requests/approval-requests.component';
import { DatnPlanComponent } from '../student/datn-plan/datn-plan.component';
import { WeeklyLogComponent } from '../student/weekly-log/weekly-log.component';

describe('Teacher plan submission and approval flow', () => {
  let service: jasmine.SpyObj<StudentCampaignService>;
  let toast: jasmine.SpyObj<ToastService>;
  let campaigns: jasmine.SpyObj<CampaignService>;
  let weekly: jasmine.SpyObj<WeeklyLogService>;
  const student = (id: number, state: 'PENDING' | 'APPROVED' | 'NONE'): StudentCampaignResponse => ({
    id, student_code: String(id), full_name: 'Sinh viên ' + id, class_name: '68A', campaign_id: 1, department_id: 1,
    status: state === 'APPROVED' ? 'IN_PROGRESS' : 'DATN_APPROVED',
    datn_info: { thesis_title: 'Đề tài', datn_status: 'APPROVED' },
    datn_plans: state === 'NONE' ? [] : Array.from({ length: 8 }, (_, i) => ({
      id: i + 1, week: i + 1, task: 'Công việc tuần ' + (i + 1), expected_result: 'Sản phẩm',
      evidence_form: 'Báo cáo', clo_mapped: 'CLO1', gvhd_status: state
    }))
  });
  const pending = student(1, 'PENDING');
  const declaration: StudentCampaignResponse = { ...student(5, 'NONE'), status: 'DATN_DECLARED', datn_info: { thesis_title: 'Đề tài mới', datn_status: 'PENDING' } };

  beforeEach(async () => {
    service = jasmine.createSpyObj('StudentCampaignService', ['getMyAssignedStudents', 'approveDatnInfo', 'approveDatnPlan', 'getMyCampaigns', 'submitDatnPlan']);
    toast = jasmine.createSpyObj('ToastService', ['success', 'error', 'warning']);
    campaigns = jasmine.createSpyObj('CampaignService', ['getCampaignOptions']);
    weekly = jasmine.createSpyObj('WeeklyLogService', ['getPending', 'approveWeeklyLog', 'findByStudentCampaign', 'createOrUpdate']);
    weekly.findByStudentCampaign.and.returnValue(of([])); weekly.createOrUpdate.and.returnValue(of({}));
    weekly.getPending.and.returnValue(of([])); weekly.approveWeeklyLog.and.returnValue(of({}));
    campaigns.getCampaignOptions.and.returnValue(of([{ id: 1, name: 'ĐATN' }]));
    service.getMyAssignedStudents.and.returnValue(of([pending, student(2, 'PENDING'), student(3, 'NONE'), student(4, 'APPROVED'), declaration]));
    service.getMyCampaigns.and.returnValue(of([]));
    service.approveDatnInfo.and.returnValue(of({})); service.approveDatnPlan.and.returnValue(of({}));
    service.submitDatnPlan.and.returnValue(of(pending.datn_plans));
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterTestingModule],
      declarations: [TeacherDashboardComponent, ApprovalRequestsComponent, DatnPlanComponent, WeeklyLogComponent],
      providers: [{ provide: StudentCampaignService, useValue: service }, { provide: ToastService, useValue: toast },
        { provide: CampaignService, useValue: campaigns }, { provide: WeeklyLogService, useValue: weekly },
        { provide: AuthService, useValue: { getCurrentUser: () => ({ fullName: 'GVHD' }) } }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  it('counts two submitted plans, not eight weeks per student or students with no plan', () => {
    const fixture = TestBed.createComponent(TeacherDashboardComponent); fixture.detectChanges();
    expect(fixture.componentInstance.pendingRequests).toEqual({ datn01: 1, datnPlan: 2, weeklyLogs: 0 });
    const alerts = fixture.componentInstance.studentAlerts;
    expect(alerts.find(a => a.mssv === '1').issue).toContain('chờ GVHD phê duyệt');
    expect(alerts.find(a => a.mssv === '2').issue).not.toContain('Chưa nộp');
    expect(alerts.find(a => a.mssv === '3').issue).toBe('Chưa nộp kế hoạch thực hiện ĐATN');
  });

  it('lists submitted plans alongside declarations and renders all eight weeks', () => {
    const fixture = TestBed.createComponent(ApprovalRequestsComponent); fixture.detectChanges();
    expect(fixture.componentInstance.requests.map(s => s.id)).toEqual([1, 2, 5]);
    fixture.componentInstance.openRequest(pending); fixture.detectChanges();
    expect(fixture.componentInstance.requestType).toBe('PLAN');
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Chi tiết Kế hoạch thực hiện ĐATN');
    expect(html.textContent).toContain('Công việc tuần 8');
    expect(html.querySelectorAll('section').length).toBe(8);
    fixture.componentInstance.selectedCampaignId = 99; fixture.componentInstance.applyFilters();
    expect(fixture.componentInstance.filteredRequests.length).toBe(0);
  });

  it('approves a plan through the plan endpoint and removes it from the pending list', () => {
    const fixture = TestBed.createComponent(ApprovalRequestsComponent); fixture.detectChanges();
    fixture.componentInstance.openRequest(pending); fixture.componentInstance.approve();
    expect(service.approveDatnPlan).toHaveBeenCalledOnceWith(1);
    expect(service.approveDatnInfo).not.toHaveBeenCalled();
    expect(fixture.componentInstance.requests.map(s => s.id)).toEqual([2, 5]);
    expect(fixture.componentInstance.showModal).toBeFalse();
  });

  it('keeps declaration approval on its own endpoint', () => {
    const fixture = TestBed.createComponent(ApprovalRequestsComponent); fixture.detectChanges();
    fixture.componentInstance.openRequest(declaration); fixture.componentInstance.approve();
    expect(service.approveDatnInfo).toHaveBeenCalledOnceWith(5);
    expect(service.approveDatnPlan).not.toHaveBeenCalled();
  });

  it('prevents duplicate clicks and retains the request when approval fails', () => {
    const response = new Subject<any>(); service.approveDatnPlan.and.returnValue(response);
    const fixture = TestBed.createComponent(ApprovalRequestsComponent); fixture.detectChanges();
    const component = fixture.componentInstance; component.openRequest(pending); component.approve(); component.approve();
    expect(service.approveDatnPlan).toHaveBeenCalledTimes(1);
    component.closeModal(); expect(component.showModal).toBeTrue();
    response.error({ error: { message: 'Lỗi phê duyệt' } });
    expect(component.requests.some(s => s.id === 1)).toBeTrue();
    expect(component.isProcessing).toBeFalse(); expect(toast.error).toHaveBeenCalledWith('Lỗi phê duyệt');
  });

  it('does not allow approval when the active campaign list is empty', () => {
    campaigns.getCampaignOptions.and.returnValue(of([]));
    const fixture = TestBed.createComponent(ApprovalRequestsComponent); fixture.detectChanges();
    fixture.componentInstance.openRequest(pending); fixture.componentInstance.approve();
    expect(service.approveDatnPlan).not.toHaveBeenCalled();
  });

  it('updates student submission state immediately from the saved plan response', () => {
    const fixture = TestBed.createComponent(DatnPlanComponent); fixture.detectChanges();
    const component = fixture.componentInstance; component.campaign = student(1, 'NONE'); component.updateStatus();
    component.weeks.forEach(w => w.tasks = 'Công việc'); component.onSubmit();
    expect(component.campaign.datn_plans?.length).toBe(8);
    expect(component.status.label).toBe('Chờ duyệt'); expect(component.isLocked).toBeTrue();
  });

  const logEntry = (id: number, week: number) => ({
    student_campaign_id: 4, student_code: '4', full_name: 'Sinh viên 4', class_name: '68A', campaign_id: 1, department_id: 1,
    thesis_title: 'Đề tài nhật ký', weekly_log: { id, student_campaign_id: 4, week_number: week,
      content: 'Nội dung tuần ' + week, results: 'Kết quả tuần ' + week, completion_percentage: 100,
      supervisor_status: 'PENDING', submitted_at: '2026-11-26 10:00:00' }
  });

  it('counts weekly log requests on the dashboard and links to the weekly log filter', () => {
    weekly.getPending.and.returnValue(of([logEntry(81, 1), logEntry(82, 2)]));
    const fixture = TestBed.createComponent(TeacherDashboardComponent); fixture.detectChanges();
    expect(fixture.componentInstance.pendingRequests.weeklyLogs).toBe(2);
    expect(fixture.componentInstance.studentAlerts.find(a => a.mssv === '4').issue).toContain('tuần 1, 2');
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('type=WEEKLY_LOG');
  });

  it('shows weekly details, saves the comment, and removes only the confirmed week', () => {
    weekly.getPending.and.returnValue(of([logEntry(81, 1), logEntry(82, 2)]));
    const fixture = TestBed.createComponent(ApprovalRequestsComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.filterType = 'WEEKLY_LOG'; component.applyFilters();
    expect(component.filteredRequests.length).toBe(2);
    const request = component.filteredRequests[0]; component.openRequest(request); fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Nội dung tuần 1'); expect(html.textContent).toContain('Kết quả tuần 1');
    expect(html.textContent).toContain('100%');
    expect(html.querySelector('textarea[aria-label="Nhận xét xác nhận nhật ký"]')).not.toBeNull();
    component.supervisorComment = '  Hoàn thành tốt  '; component.approve();
    expect(weekly.approveWeeklyLog).toHaveBeenCalledOnceWith(81, 'Hoàn thành tốt');
    expect(service.approveDatnPlan).not.toHaveBeenCalled(); expect(service.approveDatnInfo).not.toHaveBeenCalled();
    expect(component.filteredRequests.length).toBe(1);
    expect(component.filteredRequests[0].weekly_log?.id).toBe(82);
    expect(component.requests.length).toBe(4);
    expect(component.showModal).toBeFalse();
  });

  it('retains a weekly request and comment when confirmation fails and prevents duplicate clicks', () => {
    weekly.getPending.and.returnValue(of([logEntry(81, 1)]));
    const response = new Subject<any>(); weekly.approveWeeklyLog.and.returnValue(response);
    const fixture = TestBed.createComponent(ApprovalRequestsComponent); fixture.detectChanges();
    const component = fixture.componentInstance; component.openRequest(component.requests.find(r => !!r.weekly_log)!);
    component.supervisorComment = 'Cần ghi nhận'; component.approve(); component.approve();
    expect(weekly.approveWeeklyLog).toHaveBeenCalledTimes(1);
    response.error({ message: 'Lỗi xác nhận' });
    expect(component.requests.some(r => r.weekly_log?.id === 81)).toBeTrue();
    expect(component.supervisorComment).toBe('Cần ghi nhận'); expect(component.showModal).toBeTrue();
  });

  it('shows a load error instead of an empty queue when weekly requests fail to load', () => {
    weekly.getPending.and.returnValue(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(ApprovalRequestsComponent); fixture.detectChanges();
    expect(fixture.componentInstance.loadError).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Không thể tải yêu cầu');
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Không có yêu cầu nào');
    weekly.getPending.and.returnValue(of([logEntry(81, 1)]));
    fixture.componentInstance.loadRequests(); expect(fixture.componentInstance.loadError).toBeFalse();
    expect(fixture.componentInstance.requests.length).toBe(4);
  });

  it('saves drafts separately from sending a weekly log for teacher confirmation', () => {
    const fixture = TestBed.createComponent(WeeklyLogComponent); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.campaign = student(4, 'APPROVED'); component.activeWeekNumber = 1;
    component.activeLogTasks = 'Công việc tuần 1'; component.submitLog(false);
    expect(weekly.createOrUpdate.calls.mostRecent().args[0].submit_for_confirmation).toBeFalse();
    component.activeLogTasks = 'Công việc tuần 1'; component.submitLog();
    expect(weekly.createOrUpdate.calls.mostRecent().args[0].submit_for_confirmation).toBeTrue();
  });
});
