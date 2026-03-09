import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, combineLatest } from 'rxjs';
import { startWith, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { AttendanceService } from '../../core/services/attendance';
import { HolidayService } from '../../core/services/holiday';
import { User } from '../../models/user.model';
import { AttendanceRequest, AttendanceStatus, AttendanceType } from '../../models/attendance.model';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './attendance.html',
  styleUrl: './attendance.scss'
})
export class AttendanceComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  attendances: AttendanceRequest[] = [];
  isLoading = false;
  isAdmin = false;
  showForm = false;
  submitError = '';
  submitSuccess = '';

  // 假日相關
  startDateWarning = '';
  endDateWarning = '';

  // RxJS 篩選條件
  statusControl = new FormControl<AttendanceStatus | ''>('');
  typeControl = new FormControl<AttendanceType | ''>('');
  keywordControl = new FormControl('');

  // 新增申請表單
  applyForm = new FormGroup({
    type: new FormControl<AttendanceType | ''>('', Validators.required),
    startDate: new FormControl('', Validators.required),
    endDate: new FormControl('', Validators.required),
    reason: new FormControl('', Validators.required)
  });

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private holidayService: HolidayService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.isAdmin = this.authService.isAdmin();
    this.initFilter();
    this.loadHolidays();
    this.watchDateChanges();
  }

  loadHolidays() {
    const year = new Date().getFullYear();
    this.holidayService.fetchHolidays(year).subscribe();
  }

  watchDateChanges() {
    this.applyForm.get('startDate')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(date => {
        if (date && this.holidayService.isRestDay(date)) {
          this.startDateWarning = '⚠️ 此日期為假日或週末';
        } else {
          this.startDateWarning = '';
        }
      });

    this.applyForm.get('endDate')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(date => {
        if (date && this.holidayService.isRestDay(date)) {
          this.endDateWarning = '⚠️ 此日期為假日或週末';
        } else {
          this.endDateWarning = '';
        }
      });
  }

  initFilter() {
    this.isLoading = true;
    combineLatest([
      this.statusControl.valueChanges.pipe(startWith('')),
      this.typeControl.valueChanges.pipe(startWith('')),
      this.keywordControl.valueChanges.pipe(startWith(''), debounceTime(300)),
    ]).pipe(
      switchMap(([status, type, keyword]) =>
        this.attendanceService.getAttendances({
          status: status as AttendanceStatus | '',
          type: type as AttendanceType | '',
          keyword: keyword ?? ''
        })
      ),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.attendances = data.data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onSubmitApply() {
    if (this.applyForm.invalid) return;
    const val = this.applyForm.value;
    this.attendanceService.createAttendance({
      type: val.type as AttendanceType,
      startDate: val.startDate!,
      endDate: val.endDate!,
      reason: val.reason!
    }).subscribe({
      next: () => {
        this.submitSuccess = '申請成功！';
        this.submitError = '';
        this.showForm = false;
        this.applyForm.reset();
        this.statusControl.setValue('');
      },
      error: () => {
        this.submitError = '申請失敗，請稍後再試';
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  onLogout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  getStatusLabel(status: AttendanceStatus): string {
    const map = { pending: '待審核', approved: '已核准', rejected: '已退回' };
    return map[status] || status;
  }

  getStatusClass(status: AttendanceStatus): string {
    const map = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' };
    return map[status] || '';
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}