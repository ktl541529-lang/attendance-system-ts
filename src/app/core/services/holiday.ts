import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Holiday {
  date: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private holidays: Set<string> = new Set();

  constructor(private http: HttpClient) { }

  fetchHolidays(year: number): Observable<Holiday[]> {
    const base = environment.production ? '/attendance-system-ts' : '';
    return this.http.get<any[]>(`${base}/holidays.json`).pipe(
      map(data => {
        const holidays: Holiday[] = data
          .filter(item => item['Subject'] && item['Start Date']) // 過濾空白列
          .map(item => ({
            date: this.formatDate(item['Start Date']),
            name: item['Subject']
          }));

        holidays.forEach(h => this.holidays.add(h.date));
        return holidays;
      }),
      catchError(err => {
        console.warn('假日資料載入失敗，使用空清單', err);
        return of([]);
      })
    );
  }

  // 把 "2026\/1\/1" 轉成 "2026-01-01"
  private formatDate(raw: string): string {
    const cleaned = raw.replace(/\\/g, '');
    const [y, m, d] = cleaned.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  isHoliday(date: string): boolean {
    return this.holidays.has(date);
  }

  isWeekend(date: string): boolean {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
  }

  isRestDay(date: string): boolean {
    return this.isHoliday(date) || this.isWeekend(date);
  }
}