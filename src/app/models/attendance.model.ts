export type AttendanceStatus = 'pending' | 'approved' | 'rejected';
export type AttendanceType = '特休' | '病假' | '事假' | '婚假' | '喪假' | '加班補休';

export interface AttendanceRequest {
  id: number;
  user_id: number;
  user_name?: string;
  dept?: string;
  type: AttendanceType;
  status: AttendanceStatus;
  start_date: string;
  end_date: string;
  reason: string;
  reject_reason?: string;
  created_at: string;
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