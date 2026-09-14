import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { WeeklyLogService } from '../../../core/services/weekly-log.service';
import { StudentCampaignService } from '../../../core/services/student-campaign.service';
import { CampaignService } from '../../../core/services/campaign.service';
import { FinalResultService, FinalResultResponse } from '../../../core/services/final-result.service';
import { DepartmentCampaignService } from '../../../core/services/department-campaign.service';
import { EvaluationService } from '../../../core/services/evaluation.service';
import { SurveyService } from '../../../core/services/survey.service';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  isLoading = true;
  hasCurrentCampaign = true;
  studentName = '';
  studentId = '';
  
  // Tab hiện tại ('roadmap' hoặc 'grades')
  activeTab: 'roadmap' | 'grades' = 'roadmap';
  
  // Thu gọn/Mở rộng Lộ trình chi tiết
  isRoadmapExpanded = false;
  
  // Trạng thái các luồng (ĐATN)
  workflowStatus = {
    datn01: { status: 'NOT_STARTED', label: 'Nhiệm vụ ĐATN', icon: 'assignment' },
    datn02: { status: 'NOT_STARTED', label: 'Kế hoạch', icon: 'edit_document' },
    datn03: { status: 'NOT_STARTED', label: 'Nhật ký', icon: 'menu_book' },
    datn08: { status: 'NOT_STARTED', label: 'Báo cáo', icon: 'description' }
  };

  // 5 mốc tiến độ thực tế (timeline động)
  milestones: any[] = [];

  // Tiến trình ĐATN (theo tuần)
  currentWeek = 1;
  totalWeeks = 10;
  progressPercent = 0;
  startDate: Date | null = null;
  endDate: Date | null = null;

  // Trạng thái khảo sát & tự đánh giá sinh viên (ĐATN-10)
  isSurveySubmitted = false;
  logs: any[] = [];

  // Lịch trình sắp tới
  upcomingTasks: any[] = [];

  // Thông tin liên hệ
  contacts = {
    teacher: { name: 'Chưa phân công', phone: '-', email: '-' },
    thesis: { name: 'Chưa khai báo', phone: '-', email: '-' }
  };

  // Điểm số học phần
  finalResult: FinalResultResponse | null = null;
  hasFinalResult = false;

  // Chi tiết điểm chuẩn đầu ra ĐATN
  cloDetails: any[] = [];
  m1Weight = 40;
  m2Weight = 60;

  constructor(
    private studentCampaignService: StudentCampaignService,
    private weeklyLogService: WeeklyLogService,
    private campaignService: CampaignService,
    private finalResultService: FinalResultService,
    private departmentCampaignService: DepartmentCampaignService,
    private evaluationService: EvaluationService,
    private surveyService: SurveyService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.studentCampaignService.getMyCampaigns().subscribe({
      next: (res) => {
        const campaigns = Array.isArray(res) ? res : (res.data || res.payload || []);
        if (campaigns.length > 0) {
          this.hasCurrentCampaign = true;
          const campaign = campaigns[0];
          this.studentName = campaign.full_name;
          this.studentId = campaign.student_code;

          this.updateWorkflowStatus(campaign.status, campaign, this.logs);

          // Fetch final result
          this.finalResultService.getMyFinalResult().subscribe({
            next: (scoreRes) => {
              if (scoreRes) {
                this.finalResult = scoreRes;
                this.hasFinalResult = true;
                this.loadDetailedScores(campaign.id, campaign.campaign_id, campaign.department_id);
              } else {
                this.hasFinalResult = false;
              }
            },
            error: () => {
              this.hasFinalResult = false;
            }
          });

          if (campaign.gvhd_name) {
            this.contacts.teacher = {
              name: campaign.gvhd_name,
              phone: '-',
              email: '-'
            };
          }

          if (campaign.datn_info) {
            this.contacts.thesis = {
              name: (campaign.datn_info.thesis_title || 'Chưa có'),
              phone: '-',
              email: '-' 
            };
          }

          // Fetch survey status first
          this.surveyService.getSurvey(campaign.id, 'STUDENT_FEEDBACK').subscribe({
            next: (surveyRes) => {
              this.isSurveySubmitted = !!surveyRes;
              this.generateUpcomingTasks(campaign, this.logs);
            },
            error: () => {
              this.isSurveySubmitted = false;
              this.generateUpcomingTasks(campaign, this.logs);
            }
          });

          // Fetch campaign details to calculate calendar-based time progress and timeline milestones
          this.campaignService.getById(campaign.campaign_id).subscribe({
            next: (camp) => {
              // Calculate custom timeline milestones
              this.calculateTimelineMilestones(camp, campaign);

              let start: Date;
              let end: Date;
              const gConfig = campaign.group_config || null;
              const activeSource = gConfig ? gConfig : camp;

              if (activeSource.start_date && activeSource.end_date) {
                const normalizedStart = activeSource.start_date.includes(' ') ? activeSource.start_date.replace(' ', 'T') : activeSource.start_date;
                const normalizedEnd = activeSource.end_date.includes(' ') ? activeSource.end_date.replace(' ', 'T') : activeSource.end_date;
                this.startDate = new Date(normalizedStart);
                this.endDate = new Date(normalizedEnd);
                start = this.startDate;
                end = this.endDate;
                this.totalWeeks = Math.max(1, Math.round((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
              } else {
                // Fallback: 8 weeks starting from campaign enrollment date (createdAt)
                const createdStr = campaign.created_at || new Date().toISOString();
                const normalizedCreated = createdStr.includes(' ') ? createdStr.replace(' ', 'T') : createdStr;
                start = new Date(normalizedCreated);
                end = new Date(start.getTime() + 8 * 7 * 24 * 60 * 60 * 1000);
                this.startDate = start;
                this.endDate = end;
              }

              const now = new Date();
              if (now < start) {
                this.progressPercent = 0;
                this.currentWeek = 1;
              } else if (now > end) {
                this.progressPercent = 100;
                this.currentWeek = this.totalWeeks;
              } else {
                const totalMs = end.getTime() - start.getTime();
                const elapsedMs = now.getTime() - start.getTime();
                this.progressPercent = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

                const msInWeek = 7 * 24 * 60 * 60 * 1000;
                this.currentWeek = Math.min(this.totalWeeks, Math.floor(elapsedMs / msInWeek) + 1);
              }
            },
            error: () => {
              // Fallback if API fails
              const createdStr = campaign.created_at || new Date().toISOString();
              const normalizedCreated = createdStr.includes(' ') ? createdStr.replace(' ', 'T') : createdStr;
              const start = new Date(normalizedCreated);
              const end = new Date(start.getTime() + 8 * 7 * 24 * 60 * 60 * 1000);
              this.startDate = start;
              this.endDate = end;
              const now = new Date();
              if (now < start) {
                this.progressPercent = 0;
                this.currentWeek = 1;
              } else if (now > end) {
                this.progressPercent = 100;
                this.currentWeek = this.totalWeeks;
              } else {
                const totalMs = end.getTime() - start.getTime();
                const elapsedMs = now.getTime() - start.getTime();
                this.progressPercent = Math.min(100, Math.round((elapsedMs / totalMs) * 100));

                const msInWeek = 7 * 24 * 60 * 60 * 1000;
                this.currentWeek = Math.min(this.totalWeeks, Math.floor(elapsedMs / msInWeek) + 1);
              }
            }
          });

          // Fetch weekly logs to calculate upcoming tasks
          this.weeklyLogService.findByStudentCampaign(campaign.id).subscribe({
            next: (logRes) => {
              this.logs = Array.isArray(logRes) ? logRes : (logRes.data || logRes.payload || []);
              this.updateWorkflowStatus(campaign.status, campaign, this.logs);
              this.generateUpcomingTasks(campaign, this.logs);
              this.isLoading = false;
            },
            error: () => {
              this.logs = [];
              this.updateWorkflowStatus(campaign.status, campaign, []);
              this.generateUpcomingTasks(campaign, []);
              this.isLoading = false;
            }
          });
        } else {
          this.hasCurrentCampaign = false;
          this.isLoading = false;
        }
      },
      error: () => {
        this.hasCurrentCampaign = false;
        this.isLoading = false;
      }
    });
  }

  updateWorkflowStatus(status: string, campaign?: any, logs: any[] = this.logs) {
    // ĐATN-01: Kê khai Nhiệm vụ ĐATN
    const datn01Approved = campaign
      ? campaign.datn_info?.datn_status === 'APPROVED'
      : ['DATN_APPROVED', 'IN_PROGRESS', 'M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(status);
    if (datn01Approved) {
      this.workflowStatus.datn01 = { status: 'APPROVED', label: 'Đã duyệt', icon: 'check_circle' };
    } else if (status === 'DATN_DECLARED') {
      this.workflowStatus.datn01 = { status: 'PENDING', label: 'Chờ duyệt', icon: 'hourglass_top' };
    } else {
      this.workflowStatus.datn01 = { status: 'NOT_STARTED', label: 'Chưa nộp', icon: 'assignment' };
    }

    // Kế hoạch thực hiện ĐATN
    const plans = campaign?.datn_plans || [];
    const hasPlan = plans.length > 0;
    const planApproved = hasPlan && plans.every((plan: any) =>
      plan.gvhd_status === 'APPROVED'
    );
    if (planApproved) {
      this.workflowStatus.datn02 = { status: 'APPROVED', label: 'Đã duyệt', icon: 'check_circle' };
    } else if (hasPlan) {
      this.workflowStatus.datn02 = { status: 'PENDING', label: 'Chờ duyệt', icon: 'hourglass_top' };
    } else if (datn01Approved) {
      this.workflowStatus.datn02 = { status: 'NOT_STARTED', label: 'Cần nộp', icon: 'edit_document' };
    } else {
      this.workflowStatus.datn02 = { status: 'LOCKED', label: 'Chưa mở', icon: 'lock' };
    }

    // ĐATN-02: Nhật ký thực hiện
    const logsApproved = logs.length >= this.totalWeeks && logs.every((log: any) => log.supervisor_status === 'APPROVED');
    if (logsApproved) {
      this.workflowStatus.datn03 = { status: 'APPROVED', label: 'Đã duyệt', icon: 'check_circle' };
    } else if (planApproved) {
      this.workflowStatus.datn03 = { status: 'PENDING', label: logs.length > 0 ? 'Chờ xác nhận' : 'Đang ghi', icon: 'menu_book' };
    } else {
      this.workflowStatus.datn03 = { status: 'LOCKED', label: 'Chưa mở', icon: 'lock' };
    }

    // Báo cáo & tổng hợp điểm
    const finalDone = ['M2_EVALUATED', 'COMPLETED'];
    if (finalDone.includes(status)) {
      this.workflowStatus.datn08 = { status: 'APPROVED', label: 'Đã nộp', icon: 'check_circle' };
    } else if (logsApproved) {
      this.workflowStatus.datn08 = { status: 'NOT_STARTED', label: 'Cần nộp', icon: 'description' };
    } else {
      this.workflowStatus.datn08 = { status: 'LOCKED', label: 'Chưa mở', icon: 'lock' };
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'NOT_STARTED': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'LOCKED': return 'bg-slate-50 text-slate-400 border-slate-200 opacity-50';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  }

  generateUpcomingTasks(campaign: any, logs: any[]) {
    this.upcomingTasks = [];
    const status = campaign.status;
    const datn01Approved = campaign.datn_info?.datn_status === 'APPROVED';
    const plans = campaign.datn_plans || [];
    const hasPlan = plans.length > 0;
    const planApproved = hasPlan && plans.every((plan: any) =>
      plan.gvhd_status === 'APPROVED'
    );
    const logsApproved = logs.length >= this.totalWeeks && logs.every((log: any) => log.supervisor_status === 'APPROVED');

    // 1. ĐATN-01: Nhiệm vụ ĐATN
    if (!datn01Approved && status !== 'DATN_DECLARED') {
      this.upcomingTasks.push({
        title: 'Kê khai Nhiệm vụ ĐATN (ĐATN-01)',
        deadline: 'Đầu kỳ',
        type: 'warning',
        route: '/student/datn-declaration'
      });
    } else if (status === 'DATN_DECLARED') {
      this.upcomingTasks.push({
        title: 'Đợi GVHD phê duyệt Nhiệm vụ ĐATN (ĐATN-01)',
        deadline: 'Chờ duyệt',
        type: 'info'
      });
    }

    // 2. Kế hoạch thực hiện ĐATN
    if (!planApproved) {
      if (datn01Approved && !hasPlan) {
        this.upcomingTasks.push({
          title: 'Nộp kế hoạch thực hiện ĐATN',
          deadline: 'Tuần 2',
          type: 'warning',
          route: '/student/datn-report'
        });
      } else if (hasPlan) {
        this.upcomingTasks.push({
          title: 'Đợi GVHD phê duyệt kế hoạch thực hiện ĐATN',
          deadline: 'Chờ duyệt',
          type: 'info'
        });
      }
    }

    // 3. ĐATN-02: Nhật ký
    if (planApproved && !logsApproved) {
      const currentWeekLog = logs.find((l: any) => (l.weekNumber ?? l.week_number) === this.currentWeek);
      const isLogDone = currentWeekLog && currentWeekLog.supervisor_status === 'APPROVED';

      if (!isLogDone && this.currentWeek <= this.totalWeeks) {
        this.upcomingTasks.push({
          title: `Nộp nhật ký thực hiện ĐATN Tuần ${this.currentWeek} (ĐATN-02)`,
          deadline: 'Cuối tuần',
          type: 'warning',
          route: '/student/datn-report'
        });
      } else {
        this.upcomingTasks.push({
          title: `Đã nộp nhật ký Tuần ${this.currentWeek}. Hãy chuẩn bị nhật ký tuần tới!`,
          deadline: 'Tuần tới',
          type: 'info'
        });
      }
    }

    // 4. Khảo sát sau học phần (ĐATN-10)
    if (!this.isSurveySubmitted) {
      this.upcomingTasks.push({
        title: 'Khảo sát sau học phần ĐATN (ĐATN-10)',
        deadline: 'Hạn cuối đợt',
        type: 'warning',
        route: '/student/survey'
      });
    } else {
      this.upcomingTasks.push({
        title: 'Đã hoàn thành Khảo sát sau học phần (ĐATN-10)',
        deadline: 'Hoàn thành',
        type: 'info'
      });
    }

    // 5. Báo cáo tổng kết
    const finalDone = ['M2_EVALUATED', 'COMPLETED'];
    if (!finalDone.includes(status)) {
      if (logsApproved) {
        this.upcomingTasks.push({
          title: 'Nộp báo cáo tổng kết ĐATN',
          deadline: 'Cuối kỳ',
          type: 'warning',
          route: '/student/datn-report'
        });
      }
    } else {
      if (status === 'M2_EVALUATED') {
        this.upcomingTasks.push({
          title: 'Đợi Khoa tổng hợp điểm & duyệt kết quả ĐATN (ĐATN-08)',
          deadline: 'Chờ duyệt',
          type: 'info'
        });
      }
    }

    if (this.upcomingTasks.length === 0) {
      this.upcomingTasks.push({
        title: 'Chúc mừng! Bạn đã hoàn thành các công việc ĐATN.',
        deadline: 'Hoàn thành',
        type: 'info'
      });
    }
  }

  calculateTimelineMilestones(camp: any, studentCampaign: any) {
    const parseDate = (dateStr?: string) => {
      if (!dateStr) return null;
      const norm = dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr;
      return new Date(norm);
    };

    const formatDateRange = (start: Date | null, end: Date | null): string => {
      if (!start || !end) return 'Chưa cấu hình';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(start.getDate())}/${pad(start.getMonth() + 1)} - ${pad(end.getDate())}/${pad(end.getMonth() + 1)}`;
    };

    const now = new Date();
    const status = studentCampaign.status;

    // Use dynamic cohort group config if available
    const gConfig = studentCampaign.group_config || null;
    const activeSource = gConfig ? gConfig : camp;

    // Định nghĩa các mốc ĐATN
    const mConfigs = [
      {
        key: 'datn01',
        title: 'Kê khai Nhiệm vụ ĐATN',
        code: 'ĐATN-01',
        description: 'Kê khai đề tài, mục tiêu, phạm vi và sản phẩm ĐATN; xin GVHD xác nhận.',
        startDate: parseDate(activeSource.m1_start_date),
        deadline: parseDate(activeSource.m1_deadline),
        isCompleted: ['DATN_APPROVED', 'IN_PROGRESS', 'M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(status),
        isPending: status === 'DATN_DECLARED',
        icon: 'assignment',
        stepCode: 'ĐATN-01'
      },
      {
        key: 'm1',
        title: 'Đánh giá mốc M1 (đầu kỳ)',
        code: 'M1',
        description: 'GVHD đánh giá tiến độ đầu kỳ theo CLO/Rubric (ĐATN-03).',
        startDate: parseDate(activeSource.m1_start_date),
        deadline: parseDate(activeSource.m1_deadline),
        isCompleted: ['M1_EVALUATED', 'M2_EVALUATED', 'COMPLETED'].includes(status),
        isPending: status === 'IN_PROGRESS' || status === 'DATN_APPROVED',
        icon: 'rate_review',
        stepCode: 'M1'
      },
      {
        key: 'm2',
        title: 'Đánh giá mốc M2 (giữa kỳ)',
        code: 'M2',
        description: 'GVHD đánh giá tiến độ giữa kỳ theo CLO/Rubric (ĐATN-04).',
        startDate: parseDate(activeSource.m2_start_date),
        deadline: parseDate(activeSource.m2_deadline),
        isCompleted: ['M2_EVALUATED', 'COMPLETED'].includes(status),
        isPending: status === 'M1_EVALUATED',
        icon: 'rate_review',
        stepCode: 'M2'
      },
      {
        key: 'final',
        title: 'Báo cáo & Tổng hợp điểm',
        code: 'ĐATN-08',
        description: 'Nộp báo cáo tổng kết; Khoa tổng hợp điểm CLO và duyệt kết quả.',
        startDate: parseDate(activeSource.m2_deadline),
        deadline: parseDate(activeSource.end_date),
        isCompleted: ['COMPLETED'].includes(status),
        isPending: status === 'M2_EVALUATED',
        icon: 'description',
        stepCode: 'BAO_CAO'
      }
    ];

    this.milestones = mConfigs.map(m => {
      let state: 'LOCKED' | 'UPCOMING' | 'IN_PROGRESS' | 'OVERDUE' | 'PENDING' | 'COMPLETED' = 'LOCKED';
      let stateLabel = 'Chưa mở';
      let warningMessage = '';

      if (m.isCompleted) {
        state = 'COMPLETED';
        stateLabel = 'Đã hoàn thành';
      } else if (m.isPending) {
        state = 'PENDING';
        stateLabel = 'Đang chờ duyệt';
      } else {
        const start = m.startDate;
        const deadline = m.deadline;

        if (start && now < start) {
          state = 'UPCOMING';
          stateLabel = 'Sắp diễn ra';
        } else if (start && deadline && now >= start && now <= deadline) {
          state = 'IN_PROGRESS';
          stateLabel = 'Đang diễn ra';
          
          const diffMs = deadline.getTime() - now.getTime();
          const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
          if (diffDays <= 3 && diffDays >= 0) {
            warningMessage = `Sắp hết hạn! Còn lại ${diffDays} ngày.`;
          }
        } else if (deadline && now > deadline) {
          state = 'OVERDUE';
          stateLabel = 'Đã quá hạn nộp';
          warningMessage = 'Đã trễ hạn nộp!';
        }
      }

      return {
        ...m,
        dateLabel: formatDateRange(m.startDate, m.deadline),
        state,
        stateLabel,
        warningMessage
      };
    });
  }

  goToMilestone(milestone: any) {
    if (milestone.state === 'LOCKED') {
      return;
    }
    this.router.navigate(['/student/datn-report'], { queryParams: { step: milestone.stepCode } });
  }

  getConvertedScore(score: any): number {
    if (score === null || score === undefined) return 0;
    const value = Number(score);
    if (Number.isNaN(value)) return 0;
    return Math.min(10, Math.max(0, value));
  }

  loadDetailedScores(studentCampaignId: number, campaignId: number, departmentId: number) {
    this.cloDetails = (this.finalResult?.clo_outcomes || []).map((o: any) => ({
      clo_code: o.code, description: o.description,
      s1_gvhd: o.m1, s1_tb: o.m1, s2_gvhd: o.m2, s2_tb: o.m2,
      clo_final: o.score, alpha_weight: o.alphaWeight,
      m1_weight: o.m1Weight, m2_weight: o.m2Weight,
      clo_converted: o.rawScore == null ? null : o.rawScore * o.alphaWeight / 100,
      achieved: o.achieved, required: o.required
    }));
  }

  getScoreComments(scoreItems: any[]): string | null {
    const comments = (scoreItems || [])
      .map((s: any) => (s.comment || s.short_comment || '').trim())
      .filter((comment: string) => comment.length > 0);
    return comments.length > 0 ? comments.join('; ') : null;
  }
}
