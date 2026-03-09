export type AttendanceStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceType = '特休' | '病假' | '事假' | '婚假' | '喪假';

export interface AttendanceRequest {
  id: number;
  userId: number;
  userName?: string;
  type: AttendanceType;
  status: AttendanceStatus;
  startDate: string;
  endDate: string;
  reason: string;
  rejectReason?: string;
  createdAt: string;
}

export interface AttendanceQueryParams {
  status?: AttendanceStatus | '';
  type?: AttendanceType | '';
  keyword?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}