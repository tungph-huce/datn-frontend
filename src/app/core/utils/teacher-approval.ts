import { StudentCampaignResponse } from '../models/base.model';

export function hasPendingDatnInfo(student: StudentCampaignResponse): boolean {
  return student.datn_info?.datn_status === 'PENDING'
    || (!student.datn_info?.datn_status && student.status === 'DATN_DECLARED');
}

export function hasPendingDatnPlan(student: StudentCampaignResponse): boolean {
  return (student.datn_plans || []).some(plan => plan.gvhd_status === 'PENDING');
}
