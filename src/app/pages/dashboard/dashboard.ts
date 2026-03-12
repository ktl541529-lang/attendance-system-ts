import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { AttendanceService } from '../../core/services/attendance';
import { User } from '../../models/user.model';
import { AttendanceRequest, AttendanceStatus } from '../../models/attendance.model';

interface AttendanceListResponse {
  success: boolean;
  data: AttendanceRequest[];
  pagination: unknown;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

interface MonthlyStats {
  month: string;
  approved: number;
  rejected: number;
  pending: number;
}

interface DonutSegment {
  dashArray: string;
  dashOffset: number;
  color: string;
  label: string;
  value: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  currentUser: User | null = null;
  isAdmin = false;
  isLoading = true;

  // ─── 個人統計 ───
  myAttendances: AttendanceRequest[] = [];
  myStatusData: ChartData[] = [];
  myTypeData: ChartData[] = [];
  myMonthlyData: MonthlyStats[] = [];
  myTotalDays = 0;
  myPendingCount = 0;
  myApprovedCount = 0;

  // ─── 管理者統計（admin only） ───
  allAttendances: AttendanceRequest[] = [];
  allStatusData: ChartData[] = [];
  allTypeData: ChartData[] = [];
  pendingReviewCount = 0;
  approvalRate = 0;
  totalEmployeeRequests = 0;

  private readonly STATUS_COLORS: Record<AttendanceStatus, string> = {
    pending:  '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
  };

  private readonly TYPE_COLORS: Record<string, string> = {
    特休:   '#6366f1',
    病假:   '#ec4899',
    事假:   '#14b8a6',
    婚假:   '#f97316',
    喪假:   '#8b5cf6',
    加班補休: '#06b6d4',
  };

  private readonly MONTH_LABELS = [
    '1月','2月','3月','4月','5月','6月',
    '7月','8月','9月','10月','11月','12月',
  ];

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.currentUser?.role === 'admin';
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToAttendance(): void {
    this.router.navigate(['/attendance']);
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  // ────────────────────────────────────────────────────────
  //  Data loading
  // ────────────────────────────────────────────────────────

  private loadData(): void {
    this.isLoading = true;

    if (this.isAdmin) {
      // Admin：同時抓「我的」與「全員」
      forkJoin({
        my:  this.attendanceService.getAttendances({ limit: 999 }),
        all: this.attendanceService.getAttendances({ limit: 999 }),
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: ({ my, all }: { my: AttendanceListResponse; all: AttendanceListResponse }) => {
            // getAttendances 回傳 { success, data, pagination }
            this.myAttendances  = my.data  ?? [];
            this.allAttendances = all.data ?? [];
            this.processMyStats();
            this.processAdminStats();
            this.isLoading = false;
          },
          error: () => (this.isLoading = false),
        });
    } else {
      this.attendanceService
        .getAttendances({ limit: 999 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: AttendanceListResponse) => {
            this.myAttendances = res.data ?? [];
            this.processMyStats();
            this.isLoading = false;
          },
          error: () => (this.isLoading = false),
        });
    }
  }

  // ────────────────────────────────────────────────────────
  //  Stats processing
  // ────────────────────────────────────────────────────────

  private processMyStats(): void {
    const data = this.myAttendances;

    const sc: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    data.forEach((a) => sc[a.status]++);

    this.myStatusData = [
      { label: '已核准', value: sc['approved'], color: this.STATUS_COLORS['approved'] },
      { label: '待審核', value: sc['pending'],  color: this.STATUS_COLORS['pending']  },
      { label: '已拒絕', value: sc['rejected'], color: this.STATUS_COLORS['rejected'] },
    ];

    const tc: Record<string, number> = {};
    data.forEach((a) => (tc[a.type] = (tc[a.type] || 0) + 1));
    this.myTypeData = Object.entries(tc).map(([type, count]) => ({
      label: type,
      value: count,
      color: this.TYPE_COLORS[type] ?? '#94a3b8',
    }));

    const now = new Date();
    this.myMonthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const items = data.filter((a) => {
        const sd = new Date(a.start_date);
        return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
      });
      return {
        month:    this.MONTH_LABELS[d.getMonth()],
        approved: items.filter((a) => a.status === 'approved').length,
        rejected: items.filter((a) => a.status === 'rejected').length,
        pending:  items.filter((a) => a.status === 'pending').length,
      };
    });

    this.myApprovedCount = sc['approved'];
    this.myPendingCount  = sc['pending'];
    this.myTotalDays = data
      .filter((a) => a.status === 'approved')
      .reduce((sum, a) => {
        const diff =
          Math.ceil(
            (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) /
              86_400_000,
          ) + 1;
        return sum + diff;
      }, 0);
  }

  private processAdminStats(): void {
    const data = this.allAttendances;

    const sc: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    data.forEach((a) => sc[a.status]++);

    this.allStatusData = [
      { label: '已核准', value: sc['approved'], color: this.STATUS_COLORS['approved'] },
      { label: '待審核', value: sc['pending'],  color: this.STATUS_COLORS['pending']  },
      { label: '已拒絕', value: sc['rejected'], color: this.STATUS_COLORS['rejected'] },
    ];

    const tc: Record<string, number> = {};
    data.forEach((a) => (tc[a.type] = (tc[a.type] || 0) + 1));
    this.allTypeData = Object.entries(tc).map(([type, count]) => ({
      label: type,
      value: count,
      color: this.TYPE_COLORS[type] ?? '#94a3b8',
    }));

    this.pendingReviewCount    = sc['pending'];
    this.totalEmployeeRequests = data.length;
    const reviewed = sc['approved'] + sc['rejected'];
    this.approvalRate = reviewed > 0 ? Math.round((sc['approved'] / reviewed) * 100) : 0;
  }

  // ────────────────────────────────────────────────────────
  //  Template helpers
  // ────────────────────────────────────────────────────────

  getDonutData(data: ChartData[]): DonutSegment[] {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) return [];
    const C = 2 * Math.PI * 35;
    let cum = 0;
    return data.map((d) => {
      const pct    = d.value / total;
      const dash   = pct * C;
      const offset = C * (1 - cum) + C * 0.25;
      cum += pct;
      return {
        dashArray:  `${dash} ${C - dash}`,
        dashOffset: offset,
        color: d.color,
        label: d.label,
        value: d.value,
      };
    });
  }

  getBarHeight(value: number, data: MonthlyStats[], field: keyof MonthlyStats): number {
    const max = Math.max(...data.map((d) => d[field] as number));
    return max === 0 ? 0 : Math.round((value / max) * 100);
  }

  getRateArc(rate: number): string {
    const C = 2 * Math.PI * 40;
    return `${(rate / 100) * C} ${C - (rate / 100) * C}`;
  }
}
