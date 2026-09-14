import { Component, OnInit } from '@angular/core';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { DepartmentCampaignService } from '../../../core/services/department-campaign.service';
import { EvaluationService, EvaluationRequest } from '../../../core/services/evaluation.service';
import { AuthService } from '../../../core/services/auth.service';
import { CampaignResponse, StudentCampaignResponse } from '../../../core/models/base.model';
import { ToastService } from '../../../core/services/toast.service';
import { CampaignService } from '../../../core/services/campaign.service';
import { ActivatedRoute } from '@angular/router';

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  alphaWeight: number;
  m1Weight: number;
  m2Weight: number;
  selectedScore?: number | null;
  comment?: string;
  levels: { level: number; label: string; range: string; description: string }[];
}

type Stage = 'M1' | 'M2';
type Tab = 'M1' | 'M2' | 'SUMMARY';

@Component({
  selector: 'app-rubric-evaluation',
  templateUrl: './rubric-evaluation.component.html',
  styleUrls: ['./rubric-evaluation.component.scss']
})
export class RubricEvaluationComponent implements OnInit {
  isLoading = true;
  isSaving = false;
  isLocking = false;
  isExportingM1 = false;
  isExportingM2 = false;

  allStudents: StudentCampaignResponse[] = [];
  students: StudentCampaignResponse[] = [];
  campaigns: CampaignResponse[] = [];
  availableCampaigns: CampaignResponse[] = [];
  searchTerm = '';
  selectedGradingStatus = '';
  selectedCampaignId: number | null = null;
  selectedStudent: StudentCampaignResponse | null = null;

  criteria: RubricCriterion[] = [];
  existingEvaluation: any = null;
  generalComment = '';
  conclusion: 'PASSED' | 'REVISION_REQUIRED' | 'FAILED' = 'PASSED';
  revisionResolved = false;
  isReassessment = false;

  selectedStage: Stage = 'M1';
  activeTab: Tab = 'M1';
  finalResult: any = null;
  summaryEvaluations: any[] = [];
  isSummaryLoading = false;
  campaign: any = null;
  isCampaignActive = true;
  isM1Open = false;
  isM2Open = false;
  m1StartDateStr = '';
  m2StartDateStr = '';
  departmentM1Weight = 40;
  departmentM2Weight = 60;

  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  paginatedStudents: StudentCampaignResponse[] = [];

  private pendingStudentCampaignId: number | null = null;
  private pendingStage: Stage | null = null;
  private pendingTab: Tab | null = null;

  columns = [
    { key: 'STT', label: 'STT', width: '60px', align: 'center' },
    { key: 'student_code', label: 'Mã SV', width: '120px' },
    { key: 'full_name', label: 'Họ và tên' },
    { key: 'first_name', label: 'Tên', width: '110px' },
    { key: 'thesis', label: 'Đề tài ĐATN' },
    { key: 'gradingStatus', label: 'Trạng thái', width: '150px', align: 'center' },
    { key: 'actions', label: 'Thao tác', align: 'center', width: '150px' }
  ];

  readonly scoreBands = [
    { level: 0, label: 'Mức 0', range: '0 - dưới 4.0' },
    { level: 1, label: 'Mức 1', range: '4.0 - dưới 5.5' },
    { level: 2, label: 'Mức 2', range: '5.5 - dưới 7.0' },
    { level: 3, label: 'Mức 3', range: '7.0 - dưới 8.5' },
    { level: 4, label: 'Mức 4', range: '8.5 - 10.0' }
  ];

  constructor(
    private studentCampaignService: StudentCampaignService,
    private departmentCampaignService: DepartmentCampaignService,
    private evaluationService: EvaluationService,
    private authService: AuthService,
    private toastService: ToastService,
    private campaignService: CampaignService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.readNavigationContext();
    this.loadCampaigns();
    this.loadEligibleStudents();
  }

  loadCampaigns(): void {
    this.campaignService.getCampaignOptions('ACTIVE').subscribe({
      next: (res) => {
        this.campaigns = res || [];
        this.refreshAvailableCampaigns();
        this.filterStudents();
      },
      error: () => {
        this.campaigns = [];
        this.refreshAvailableCampaigns();
        this.filterStudents();
      }
    });
  }

  loadEligibleStudents(): void {
    this.isLoading = true;
    this.studentCampaignService.getMyGuidedStudents().subscribe({
      next: (res) => {
        const all = Array.isArray(res) ? res : (res.data || res.payload || []);
        this.allStudents = all
          .filter((s: any) => s.status !== 'SUSPENDED')
          .map((s: any) => ({ ...s, gradingStatus: 'Đang tải...' }))
          .sort((a: any, b: any) => this.compareStudentsByName(a, b));
        this.refreshAvailableCampaigns();
        this.filterStudents();
        this.isLoading = false;
        this.openPendingGuidedStudentIfNeeded();
        this.checkAllEvaluationsStatus();
      },
      error: () => {
        this.isLoading = false;
        this.toastService.error('Lỗi tải danh sách sinh viên.');
      }
    });
  }

  checkAllEvaluationsStatus(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || this.allStudents.length === 0) return;

    const studentIds = this.allStudents.map(student => Number(student.id)).filter(id => Number.isFinite(id));

    this.evaluationService.findEvaluationsByStudents(studentIds).subscribe({
      next: (res) => {
        const evaluations = Array.isArray(res) ? res : (res.data || res.payload || []);
        const byStudent = this.groupEvaluationsByStudent(evaluations);
        this.allStudents.forEach(student => {
          const evals = byStudent.get(Number(student.id)) || [];
          (student as any).gradingStatus = this.resolveGradingStatus(evals);
        });
        this.filterStudents();
      },
      error: () => {
        this.allStudents.forEach(student => (student as any).gradingStatus = 'Lỗi trạng thái');
        this.filterStudents();
      }
    });
  }

  private groupEvaluationsByStudent(evaluations: any[]): Map<number, any[]> {
    const grouped = new Map<number, any[]>();
    evaluations.forEach((evaluation: any) => {
      const id = Number(evaluation.student_campaign_id);
      if (!Number.isFinite(id)) return;
      const list = grouped.get(id) || [];
      list.push(evaluation);
      grouped.set(id, list);
    });
    return grouped;
  }

  private resolveGradingStatus(evaluations: any[]): string {
    const currentUser = this.authService.getCurrentUser();
    const myEvals = evaluations.filter((e: any) =>
      e.evaluator_type === 'GVHD' && Number(e.evaluator_id) === Number(currentUser?.userId));
    const hasM1 = myEvals.some((e: any) => e.stage === 'M1');
    const hasM2 = myEvals.some((e: any) => e.stage === 'M2');
    if (hasM1 && hasM2) return 'Hoàn tất chấm điểm';
    if (hasM1) return 'Đã chấm M1';
    if (hasM2) return 'Đã chấm M2';
    return 'Chưa chấm';
  }

  filterStudents(): void {
    let result = [...this.allStudents];

    if (this.selectedCampaignId !== null) {
      const campaignId = Number(this.selectedCampaignId);
      result = result.filter(s => Number(s.campaign_id) === campaignId);
    } else if (this.campaigns.length > 0) {
      const activeIds = new Set(this.campaigns.map(c => Number(c.id)));
      result = result.filter(s => activeIds.has(Number(s.campaign_id)));
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(s =>
        (s.full_name && s.full_name.toLowerCase().includes(term)) ||
        (s.student_code && s.student_code.toLowerCase().includes(term)) ||
        (s.datn_info?.thesis_title && s.datn_info.thesis_title.toLowerCase().includes(term))
      );
    }

    if (this.selectedGradingStatus) {
      result = result.filter(s => (s as any).gradingStatus === this.selectedGradingStatus);
    }

    this.students = result;
    this.totalItems = result.length;

    const totalPages = Math.ceil(this.totalItems / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    this.paginate();
  }

  paginate(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedStudents = this.students.slice(startIndex, startIndex + this.pageSize);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.filterStudents();
  }

  private refreshAvailableCampaigns(): void {
    const assignedIds = new Set(this.allStudents.map(s => Number(s.campaign_id)).filter(id => Number.isFinite(id)));
    this.availableCampaigns = this.campaigns.filter(c => assignedIds.has(Number(c.id)));
    if (this.selectedCampaignId !== null && !assignedIds.has(Number(this.selectedCampaignId))) {
      this.selectedCampaignId = null;
      this.onFilterChange();
    }
  }

  private compareStudentsByName(a: StudentCampaignResponse, b: StudentCampaignResponse): number {
    const fa = this.getStudentFirstName(a).localeCompare(this.getStudentFirstName(b), 'vi', { sensitivity: 'base' });
    if (fa !== 0) return fa;
    return (a.student_code || '').localeCompare(b.student_code || '', 'vi', { numeric: true });
  }

  getStudentFirstName(student: StudentCampaignResponse): string {
    if (student.first_name) return student.first_name;
    const parts = (student.full_name || '').trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts[parts.length - 1] : (student.full_name || '');
  }

  getStudentLastName(student: StudentCampaignResponse): string {
    if (student.last_name) return student.last_name;
    const parts = (student.full_name || '').trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? parts.slice(0, -1).join(' ') : '';
  }

  selectStudent(s: StudentCampaignResponse): void {
    this.selectedStudent = s;
    this.criteria = [];
    this.existingEvaluation = null;
    this.generalComment = '';
    this.isReassessment = false;
    this.conclusion = 'PASSED';
    this.revisionResolved = false;
    this.finalResult = null;
    this.summaryEvaluations = [];
    this.activeTab = this.pendingStage || 'M1';
    this.selectedStage = this.pendingStage || 'M1';
    this.loadStudentDetail();
  }

  closeStudent(): void {
    this.selectedStudent = null;
    this.pendingStudentCampaignId = null;
    this.pendingStage = null;
    this.pendingTab = null;
  }

  onStageChange(stage: Stage): void {
    this.selectedStage = stage;
    this.isReassessment = false;
    this.conclusion = 'PASSED';
    this.revisionResolved = false;
    this.criteria = [];
    this.generalComment = '';
    this.activeTab = stage;
    this.loadStudentDetail();
  }

  onSummaryTab(): void {
    this.activeTab = 'SUMMARY';
    this.loadSummaryData();
  }

  private loadStudentDetail(): void {
    if (!this.selectedStudent) return;
    this.isLoading = true;
    const id = this.selectedStudent.id;

    this.campaignService.getById(this.selectedStudent.campaign_id).subscribe({
      next: (camp) => {
        this.campaign = camp;
        this.isCampaignActive = camp.status === 'ACTIVE';
        const parseDate = (str?: string) => str ? new Date(str.includes(' ') ? str.replace(' ', 'T') : str) : null;
        const m1Start = parseDate(camp.m1_start_date);
        const m2Start = parseDate(camp.m2_start_date) || (camp.end_date ? new Date(new Date(camp.end_date).getTime() - 7 * 24 * 3600 * 1000) : null);
        const now = new Date();
        this.isM1Open = !!m1Start && now >= m1Start && !!camp.m1_deadline && now <= new Date(camp.m1_deadline.replace(' ', 'T'));
        this.isM2Open = !!m2Start && now >= m2Start && !!camp.m2_deadline && now <= new Date(camp.m2_deadline.replace(' ', 'T'));
        this.m1StartDateStr = m1Start ? m1Start.toISOString().slice(0, 16).replace('T', ' ') : '';
        this.m2StartDateStr = m2Start ? m2Start.toISOString().slice(0, 16).replace('T', ' ') : '';
      },
      error: () => {
        this.isCampaignActive = false;
      }
    });

    // Load CLO config
    this.departmentCampaignService.findOrCreate(this.selectedStudent.campaign_id, this.selectedStudent.department_id).subscribe({
      next: (dc) => {
        if (dc) {
          this.departmentM1Weight = this.toNumber(dc.m1_weight, 40);
          this.departmentM2Weight = this.toNumber(dc.m2_weight, 60);
          if (dc.clo_configs && dc.clo_configs.length) {
            this.criteria = dc.clo_configs.map((clo: any, idx: number) => this.buildCriterion(clo, idx));
            this.applySavedScores();
          }
        }
      }
    });

    // Load existing evaluations
    this.evaluationService.findEvaluations(id).subscribe({
      next: (evals) => {
        this.summaryEvaluations = Array.isArray(evals) ? evals : (evals.data || evals.payload || []);
        const currentUser = this.authService.getCurrentUser();
        const myEval = this.summaryEvaluations.find((e: any) =>
          e.evaluator_type === 'GVHD' && Number(e.evaluator_id) === Number(currentUser?.userId) && e.stage === this.selectedStage);
        this.existingEvaluation = myEval || null;
        this.conclusion = myEval?.conclusion || 'PASSED';
        this.revisionResolved = myEval?.revision_resolved === true;
        this.applySavedScores();
        if (myEval) {
          const scoreByClo = new Map<string, any>();
          (myEval.scores || []).forEach((s: any) => scoreByClo.set(String(s.clo_code).toUpperCase(), s));
          this.criteria.forEach(c => {
            const score = scoreByClo.get(c.id.toUpperCase());
            if (score) {
              c.selectedScore = score.score_level;
              c.comment = score.comment || '';
            }
          });
          this.generalComment = myEval.general_comment || '';
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    this.evaluationService.getFinalResult(id).subscribe({
      next: (fr) => {
        this.finalResult = fr || null;
      }
    });
  }

  private applySavedScores(): void {
    const scores = this.existingEvaluation?.scores || [];
    for (const c of this.criteria) {
      const s = scores.find((item: any) => item.clo_code === c.id);
      if (s) { c.selectedScore = s.score_level; c.comment = s.comment || ''; }
    }
  }

  canReassess(): boolean {
    const e = this.existingEvaluation;
    if (!e || e.conclusion !== 'FAILED' || (e.reassessment_count || 0) >= 1 || !e.first_failed_at) return false;
    return Date.now() <= new Date(e.first_failed_at.replace(' ', 'T')).getTime() + 7 * 86400000;
  }

  private buildCriterion(clo: any, index: number): RubricCriterion {
    const levels = (clo.rubrics || []).map((r: any) => ({
      level: r.score_level,
      label: `Mức ${r.score_level}`,
      range: this.getLevelRange(r.score_level),
      description: r.description || ''
    }));
    return {
      id: clo.clo_code,
      name: `CLO: ${clo.clo_code}`,
      description: clo.description || '',
      alphaWeight: this.toNumber(clo.alpha_weight, 0),
      m1Weight: this.toNumber(clo.m1_weight, this.departmentM1Weight),
      m2Weight: this.toNumber(clo.m2_weight, this.departmentM2Weight),
      levels,
      selectedScore: null,
      comment: ''
    };
  }

  getLevelRange(level: number): string {
    const band = this.scoreBands.find(b => b.level === level);
    return band ? band.range : '';
  }

  getActiveTabTitle(): string {
    if (this.activeTab === 'SUMMARY') return 'Tổng hợp điểm CLO';
    return this.activeTab === 'M1' ? 'Đánh giá mốc M1 (đầu kỳ)' : 'Đánh giá mốc M2 (giữa kỳ)';
  }

  getActiveTabSubtitle(): string {
    if (this.activeTab === 'SUMMARY') return 'Điểm học phần ĐATN = Tổng (CLOi × αi)';
    const w = this.activeTab === 'M1' ? this.departmentM1Weight : this.departmentM2Weight;
    return `GVHD chấm theo CLO/Rubric. Trọng số mốc: ${w}% tổng điểm học phần.`;
  }

  getStageLabel(): string {
    return this.selectedStage === 'M1' ? 'Mốc M1 (đầu kỳ)' : 'Mốc M2 (giữa kỳ)';
  }

  getStageWeight(criterion: RubricCriterion): number {
    return this.selectedStage === 'M1' ? criterion.m1Weight : criterion.m2Weight;
  }

  getStageAverageScore(criterion: RubricCriterion): number | null {
    return criterion.selectedScore ?? null;
  }

  getStageAverageScoreText(criterion: RubricCriterion): string {
    const v = this.getStageAverageScore(criterion);
    return v === null || v === undefined ? '—' : this.formatScore(v);
  }

  getStageResultBadgeClass(criterion: RubricCriterion): string {
    const v = this.getStageAverageScore(criterion);
    const level = this.getScoreLevel(v);
    if (level <= 0) return 'bg-red-100 text-red-700';
    if (level <= 1) return 'bg-orange-100 text-orange-700';
    if (level <= 2) return 'bg-amber-100 text-amber-700';
    if (level <= 3) return 'bg-green-100 text-green-700';
    return 'bg-emerald-100 text-emerald-700';
  }

  getScoreLevelName(score: number | null | undefined): string {
    if (score === null || score === undefined) return '—';
    return `Mức ${this.getScoreLevel(score)}`;
  }

  getScoreLevelRange(score: number | null | undefined): string {
    if (score === null || score === undefined) return '';
    const band = this.scoreBands.find(b => b.level === this.getScoreLevel(score));
    return band ? band.range : '';
  }

  getScoreLevel(score: number | null | undefined): number {
    if (score === null || score === undefined || score < 4) return 0;
    if (score < 5.5) return 1;
    if (score < 7) return 2;
    if (score < 8.5) return 3;
    return 4;
  }

  getAverageScoreText(): string {
    const vals = this.criteria.map(c => c.selectedScore).filter((v): v is number => v !== null && v !== undefined);
    if (vals.length === 0) return '—';
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return this.formatScore(avg);
  }

  getProgressText(): string {
    const graded = this.criteria.filter(c => this.getStageWeight(c) > 0 && c.selectedScore !== null && c.selectedScore !== undefined).length;
    return `${graded}/${this.criteria.length} CLO đã chấm`;
  }

  normalizeScore(criterion: RubricCriterion): void {
    if (criterion.selectedScore === null || criterion.selectedScore === undefined) return;
    const v = Math.min(10, Math.max(0, Number(criterion.selectedScore)));
    criterion.selectedScore = Math.round(v * 10) / 10;
  }

  getScoreInputClass(criterion: RubricCriterion): string {
    const v = criterion.selectedScore;
    if (v === null || v === undefined) return 'border-slate-300';
    const level = this.getScoreLevel(v);
    if (level <= 1) return 'border-red-300 bg-red-50';
    if (level <= 2) return 'border-amber-300 bg-amber-50';
    return 'border-emerald-300 bg-emerald-50';
  }

  isScoringLocked(): boolean {
    if (this.isReassessment && this.canReassess()) return false;
    if (!this.finalResult) return false;
    if (this.selectedStage === 'M1') return this.finalResult.m1_locked === true || this.finalResult.m1_gvhd_locked === true;
    return this.finalResult.m2_locked === true || this.finalResult.m2_gvhd_locked === true;
  }

  isStage1FullyLocked(): boolean {
    return this.finalResult?.m1_locked === true;
  }

  isStageManuallyLocked(): boolean {
    if (!this.finalResult) return false;
    if (this.selectedStage === 'M1') return this.finalResult.m1_gvhd_locked === true;
    return this.finalResult.m2_gvhd_locked === true;
  }

  canSubmit(): boolean {
    if (!this.isCampaignActive) return false;
    if (this.selectedStudent?.datn_info?.datn_status !== 'APPROVED') return false;
    if (this.isReassessment) return this.canReassess();
    if (this.isScoringLocked()) return false;
    if (this.selectedStage === 'M1') return this.isM1Open;
    if (this.selectedStage === 'M2') return this.isM2Open && this.isStage1FullyLocked();
    return false;
  }

  getCommentPlaceholder(): string {
    return this.selectedStage === 'M1'
      ? 'Nhận xét chung của GVHD cho mốc M1 (đầu kỳ)...'
      : 'Nhận xét chung của GVHD cho mốc M2 (giữa kỳ)...';
  }

  submitEvaluation(): void {
    if (!this.selectedStudent) return;
    if (!this.canSubmit()) {
      this.toastService.error('Chưa đủ điều kiện nộp phiếu đánh giá cho mốc này.');
      return;
    }

    const scores = this.criteria
      .filter(c => this.getStageWeight(c) > 0 && c.selectedScore !== null && c.selectedScore !== undefined)
      .map(c => ({ clo_code: c.id, score_level: Number(c.selectedScore), comment: c.comment || '' }));

    if (scores.length !== this.criteria.filter(c => this.getStageWeight(c) > 0).length || scores.length === 0) {
      this.toastService.error('Vui lòng nhập điểm đầy đủ các CLO của mốc.');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const request: EvaluationRequest = {
      student_campaign_id: this.selectedStudent.id,
      evaluator_type: 'GVHD',
      evaluator_id: Number(currentUser?.userId),
      stage: this.selectedStage,
      general_comment: this.generalComment,
      conclusion: this.conclusion,
      revision_resolved: this.revisionResolved,
      reassessment: this.isReassessment,
      scores
    };

    this.isSaving = true;
    this.evaluationService.submitEvaluation(request).subscribe({
      next: () => {
        this.toastService.success(`Đã nộp phiếu đánh giá mốc ${this.selectedStage} thành công!`);
        this.isSaving = false;
        this.loadStudentDetail();
        this.checkAllEvaluationsStatus();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Có lỗi khi nộp phiếu đánh giá.');
        this.isSaving = false;
      }
    });
  }

  lockCurrentStage(): void {
    if (!this.selectedStudent) return;
    this.isLocking = true;
    this.evaluationService.lockFinalResultStage(this.selectedStudent.id, this.selectedStage, 'GVHD').subscribe({
      next: () => {
        this.toastService.success(`Đã khóa điểm mốc ${this.selectedStage}.`);
        this.isLocking = false;
        this.loadStudentDetail();
        this.checkAllEvaluationsStatus();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || 'Có lỗi khi khóa điểm.');
        this.isLocking = false;
      }
    });
  }

  exportM1(): void {
    if (!this.selectedStudent) return;
    this.isExportingM1 = true;
    this.evaluationService.exportM1Datn03(this.selectedStudent.id).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `DATN-03-${this.selectedStudent!.student_code}.docx`);
        this.isExportingM1 = false;
      },
      error: () => {
        this.toastService.error('Không thể xuất phiếu ĐATN-03.');
        this.isExportingM1 = false;
      }
    });
  }

  exportStageSummary(): void {
    if (!this.selectedStudent) return;
    this.evaluationService.exportStageDatn07(this.selectedStudent.id, this.selectedStage).subscribe({
      next: blob => this.downloadBlob(blob, `DATN-07-${this.selectedStage}.docx`),
      error: () => this.toastService.error('Chưa thể xuất tổng hợp CLO của mốc này.')
    });
  }

  exportM2(): void {
    if (!this.selectedStudent) return;
    this.isExportingM2 = true;
    this.evaluationService.exportM2Datn04(this.selectedStudent.id).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `DATN-04-${this.selectedStudent!.student_code}.docx`);
        this.isExportingM2 = false;
      },
      error: () => {
        this.toastService.error('Không thể xuất phiếu ĐATN-04.');
        this.isExportingM2 = false;
      }
    });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ---- Summary ----
  loadSummaryData(): void {
    if (!this.selectedStudent) return;
    this.isSummaryLoading = true;
    this.evaluationService.getFinalResult(this.selectedStudent.id).subscribe({
      next: (fr) => {
        this.finalResult = fr || null;
        this.isSummaryLoading = false;
      },
      error: () => {
        this.isSummaryLoading = false;
      }
    });
  }

  getSummaryRows(): any[] {
    return this.criteria.map(c => ({
      criterion: c,
      cloScore: c.selectedScore ?? null,
      contribution: c.selectedScore !== null && c.selectedScore !== undefined
        ? this.round2(c.selectedScore * c.alphaWeight / 100)
        : null
    }));
  }

  getSummaryHpScore(): number | null {
    let total = 0;
    let hasAny = false;
    this.criteria.forEach(c => {
      if (c.selectedScore !== null && c.selectedScore !== undefined) {
        total += c.selectedScore * c.alphaWeight / 100;
        hasAny = true;
      }
    });
    return hasAny ? this.round2(total) : null;
  }

  formatSummaryScore(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return this.formatScore(this.round2(v));
  }

  formatSummaryContribution(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return this.formatScore(this.round2(v));
  }

  getNoVisibleCriteriaMessage(): string {
    return 'Chưa có cấu hình CLO/Rubric cho Bộ môn này trong đợt. Vui lòng liên hệ Khoa/Bộ môn.';
  }

  // ---- Helpers ----
  private round2(v: number): number {
    return Math.round(v * 100) / 100;
  }

  private formatScore(v: number): string {
    return v % 1 === 0 ? String(v) : String(Math.round(v * 10) / 10);
  }

  private toNumber(v: any, fallback: number): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private readNavigationContext(): void {
    this.route.queryParams.subscribe(params => {
      if (params['student']) this.pendingStudentCampaignId = Number(params['student']);
      if (params['stage']) this.pendingStage = params['stage'] === 'M2' ? 'M2' : 'M1';
      if (params['tab'] === 'SUMMARY') this.pendingTab = 'SUMMARY';
    });
  }

  private openPendingGuidedStudentIfNeeded(): void {
    if (!this.pendingStudentCampaignId) return;
    const found = this.allStudents.find(s => Number(s.id) === this.pendingStudentCampaignId);
    if (found) {
      this.selectStudent(found);
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.paginate();
  }
}
