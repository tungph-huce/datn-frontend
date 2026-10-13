import { AcademicManagementComponent } from './pages/academic/academic-management.component';
import { CouncilScoringComponent } from './pages/academic/council-scoring.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { CampaignManagementComponent } from './pages/admin/campaign-management/campaign-management.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';
import { DepartmentManagementComponent } from './pages/admin/department-management/department-management.component';
import { UserManagementComponent } from './pages/admin/user-management/user-management.component';
import { SystemSettingsComponent } from './pages/admin/system-settings/system-settings.component';
import { NotificationManagementComponent } from './pages/admin/notification-management/notification-management.component';
import { CloRubricConfigComponent } from './pages/ldkbm/clo-rubric-config/clo-rubric-config.component';
import { StudentAssignmentComponent } from './pages/ldkbm/student-assignment/student-assignment.component';
import { DatnDeclarationComponent } from './pages/student/datn-declaration/datn-declaration.component';

import { FinalReportComponent } from './pages/student/final-report/final-report.component';
import { DatnPlanComponent } from './pages/student/datn-plan/datn-plan.component';
import { WeeklyLogComponent } from './pages/student/weekly-log/weekly-log.component';
import { StudentDashboardComponent } from './pages/student/student-dashboard/student-dashboard.component';
import { DatnReportComponent } from './pages/student/datn-report/datn-report.component';

import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { LdkbmLayoutComponent } from './layout/ldkbm-layout/ldkbm-layout.component';
import { StudentLayoutComponent } from './layout/student-layout/student-layout.component';
import { TeacherLayoutComponent } from './layout/teacher-layout/teacher-layout.component';
import { RubricEvaluationComponent } from './pages/teacher/rubric-evaluation/rubric-evaluation.component';
import { ScoreSummaryComponent } from './pages/teacher/score-summary/score-summary.component';
import { TeacherDashboardComponent } from './pages/teacher/teacher-dashboard/teacher-dashboard.component';
import { ManageStudentsComponent } from './pages/teacher/manage-students/manage-students.component';
import { SurveyStudentComponent } from './pages/student/survey-student/survey-student.component';
import { SurveyDashboardComponent } from './pages/ldkbm/survey-dashboard/survey-dashboard.component';
import { GeneralDashboardComponent } from './pages/ldkbm/general-dashboard/general-dashboard.component';
import { ApprovalRequestsComponent } from './pages/teacher/approval-requests/approval-requests.component';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { LdkbmScoreSummaryComponent } from './pages/ldkbm/score-summary/score-summary.component';
import { SetupPasswordComponent } from './pages/auth/setup-password/setup-password.component';

import { AuthGuard, LoginGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'campaigns', component: CampaignManagementComponent },
      { path: 'departments', component: DepartmentManagementComponent },
      { path: 'academic', component: AcademicManagementComponent },
      { path: 'users', component: UserManagementComponent },
      { path: 'settings', component: SystemSettingsComponent },
      { path: 'notifications', component: NotificationManagementComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'ldkbm',
    component: LdkbmLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'general-dashboard', component: GeneralDashboardComponent },
      { path: 'clo-config', component: CloRubricConfigComponent },
      { path: 'academic', component: AcademicManagementComponent },
      { path: 'student-assignment', component: StudentAssignmentComponent },
      { path: 'survey-dashboard', component: SurveyDashboardComponent },
      { path: 'score-summary', component: LdkbmScoreSummaryComponent },
      { path: '', redirectTo: 'general-dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'student',
    component: StudentLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: StudentDashboardComponent },
      { path: 'datn-declaration', component: DatnDeclarationComponent },
      { path: 'datn-report', component: DatnReportComponent },
      { path: 'survey', component: SurveyStudentComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'teacher',
    component: TeacherLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: TeacherDashboardComponent },
      { path: 'students', component: ManageStudentsComponent },
      { path: 'approval-requests', component: ApprovalRequestsComponent },
      { path: 'rubric-evaluation', component: RubricEvaluationComponent },
      { path: 'council-scoring', component: CouncilScoringComponent },
      { path: 'score-summary', component: ScoreSummaryComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [LoginGuard],
    children: [
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'setup-password', component: SetupPasswordComponent },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
