export interface MenuItem {
  title: string;
  icon: string;
  route: string;
  exact?: boolean;
}

export const adminMenu: MenuItem[] = [
  { title: 'Ngành & Hội đồng', icon: 'school', route: '/admin/academic' },
  { title: 'Bảng điều khiển', icon: 'dashboard', route: '/admin/dashboard', exact: true },
  { title: 'Quản lý đợt ĐATN', icon: 'assignment_ind', route: '/admin/campaigns' },
  { title: 'Quản lý Khoa/Bộ môn', icon: 'apartment', route: '/admin/departments' },
  { title: 'Tài khoản Nhân sự', icon: 'group_add', route: '/admin/users' },
  { title: 'Cấu hình thông báo', icon: 'notifications_active', route: '/admin/notifications' },
];

export const ldkbmMenu: MenuItem[] = [
  { title: 'Ngành, CLO SV & Hội đồng', icon: 'school', route: '/ldkbm/academic' },
  { title: 'Bảng điều khiển', icon: 'dashboard', route: '/ldkbm/general-dashboard', exact: true },
  { title: 'Cấu hình CLO & Rubric', icon: 'fact_check', route: '/ldkbm/clo-config' },
  { title: 'Phân công GVHD ĐATN', icon: 'group_add', route: '/ldkbm/student-assignment' },
  { title: 'Bảng tổng hợp điểm', icon: 'table_view', route: '/ldkbm/score-summary' },
  { title: 'Tổng hợp Khảo sát', icon: 'insights', route: '/ldkbm/survey-dashboard' },
];

export const studentMenu: MenuItem[] = [
  { title: 'Bảng điều khiển', icon: 'dashboard', route: '/student/dashboard', exact: true },
  { title: 'Hồ sơ ĐATN', icon: 'assignment', route: '/student/datn-report' },
  { title: 'Khảo sát ĐATN', icon: 'rate_review', route: '/student/survey' },
];

export const teacherMenu: MenuItem[] = [
  { title: 'Hội đồng — Chấm M3', icon: 'groups', route: '/teacher/council-scoring' },
  { title: 'Bảng điều khiển', icon: 'dashboard', route: '/teacher/dashboard', exact: true },
  { title: 'Sinh viên hướng dẫn', icon: 'groups', route: '/teacher/students' },
  { title: 'Yêu cầu Phê duyệt', icon: 'fact_check', route: '/teacher/approval-requests' },
  { title: 'Chấm điểm M1/M2', icon: 'assignment_turned_in', route: '/teacher/rubric-evaluation' },
  { title: 'Bảng tổng hợp điểm', icon: 'table_view', route: '/teacher/score-summary' },
];
