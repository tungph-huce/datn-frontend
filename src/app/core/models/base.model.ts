export interface BaseResponse<T = any> {
  status: number;
  message: string;
  payload: T;
}

/**
 * Khớp với backend BasePagination.java
 * Backend trả: { current_page, last_page, total, data }
 */
export interface BasePagination<T> {
  current_page: number;
  last_page: number;
  total: number;
  data: T[];
}

/**
 * Khớp với backend PaginationRequest.java
 * Backend nhận query params: page, limit, searchText, orderBy
 */
export interface PaginationRequest {
  page: number;
  limit: number;
  searchText?: string;
  orderBy?: string; // format: "field:ASC" hoặc "field:DESC"
}

/**
 * Khớp với backend LoginResponse.java
 */
export interface LoginResponse {
  password_change_required?: boolean;
  token: string;
  user_id: number;
  email: string;
  full_name: string;
  role: string;
  department_id: number | null;
}

/**
 * Thông tin user đang đăng nhập (lưu trong localStorage)
 */
export interface UserInfo {
  passwordChangeRequired?: boolean;
  userId: number;
  email: string;
  fullName: string;
  role: string;
  departmentId: number | null;
}

/**
 * Khớp với backend CampaignResponse.java
 */
export interface CampaignResponse {
  m3_start_date?: string; m3_deadline?: string;
  week_count?: number;
  id: number;
  code: string;
  name: string;
  academic_year: string;
  semester: number | null;
  description: string | null;
  start_date: string;   // "yyyy-MM-dd HH:mm:ss"
  end_date: string;
  m1_start_date?: string;
  m1_deadline?: string;
  m2_start_date?: string;
  m2_deadline?: string;
  status: string;        // "ACTIVE" | "INACTIVE"
  student_count: number;
  created_at: string;
}

/**
 * Khớp với backend DepartmentResponse.java
 * parentId = null → Khoa (top-level)
 * parentId != null → Bộ môn (sub-department)
 */
export interface DepartmentResponse {
  id: number;
  parent_id: number | null;
  parent_name: string | null;
  code: string;
  name: string;
  status: string; // "ACTIVE" | "INACTIVE"
  children_count: number;
  children?: DepartmentResponse[];
  created_at: string;
}

/**
 * Khớp với backend UserResponse.java
 */
export interface UserResponse {
  student_campaign?: StudentEnrollment | null;
  enrollment_conflict?: boolean;
  student_campaigns?: StudentEnrollment[];
  student_code?: string | null;
  class_name?: string | null;
  id: number;
  email: string;
  full_name: string;
  role: string;
  department_id: number | null;
  department_name: string | null;
  status: string; // "ACTIVE" | "INACTIVE"
  phone?: string;
  academic_degree?: string | null;
  external_supervisor?: boolean;
  created_at: string;
}

export interface StudentEnrollment {
  student_campaign_id: number;
  campaign_id: number;
  campaign_name: string;
  campaign_status: string | null;
  department_id: number;
  department_name: string | null;
  faculty_id: number | null;
  major_id: number | null;
  major_name: string | null;
  cohort: string | null;
}

/**
 * Khớp với backend SystemSettingResponse.java
 */
export interface SystemSettingResponse {
  settingKey: string;
  settingValue: string;
  description: string;
  createdAt: string;
}

export interface DatnInfoResponse {
  thesis_title: string;
  objectives?: string;
  scope?: string;
  deliverables?: string;
  inputs?: string;
  expected_results?: string;
  datn_status?: string;
}

export interface DatnPlanResponse {
  id: number;
  week: number;
  task: string;
  expected_result: string;
  evidence_form: string;
  clo_mapped: string;
  gvhd_status: string;
}

export interface WeeklyLogResponse {
  id: number;
  student_campaign_id: number;
  week_number: number;
  content: string;
  results: string;
  completion_percentage: number;
  supervisor_status: string;
  supervisor_comment?: string | null;
  submitted_at?: string | null;
}

export interface WeeklyLogApprovalResponse {
  student_campaign_id: number;
  student_code: string;
  full_name: string;
  class_name: string;
  campaign_id: number;
  department_id: number;
  thesis_title?: string | null;
  weekly_log: WeeklyLogResponse;
}

export interface StudentCampaignResponse {
  major_id?: number; major_name?: string; cohort?: string; clo_set_id?: number;
  id: number;
  student_code: string;
  full_name: string;
  last_name?: string;
  first_name?: string;
  class_name: string;
  status: string;
  campaign_id: number;
  department_id: number;
  gvhd_ids?: number[];
  gvhd_name?: string;
  committee_id?: number;
  datn_info?: DatnInfoResponse;
  datn_plans?: DatnPlanResponse[];
  campaign_group_config_id?: number;
  group_config?: any;
  created_at?: string;
}

export interface FinalReportResponse {
  id: number;
  student_campaign_id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface CampaignOptionResponse {
  id: number;
  name: string;
}

