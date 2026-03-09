export interface AuditLog {
  id: number;
  userId: number;
  userName?: string;
  action: string;
  targetId?: number;
  detail?: string;
  createdAt: string;
}