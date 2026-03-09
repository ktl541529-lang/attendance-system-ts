import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface Holiday {
  date: string;
  name: string;
  isHoliday: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private apiUrl = 'https://calendarific.com/api/v2/holidays';
  private holidays: Set<string> = new Set();

  constructor(private http: HttpClient) {}

  // 串接政府開放資料 - 台灣國定假日
  fetchHolidays(year: number): Observable<Holiday[]> {
    const url = `https://data.ntpc.gov.tw/api/datasets/308DCD75-6119-4125-8324-09C25DCA8A7F/json?size=500`;
    return this.http.get<any[]>(url).pipe(
      map(data => {
        const holidays: Holiday[] = data
          .filter(item => item.isHoliday === '是')
          .map(item => ({
            date: item.date,
            name: item.description || '國定假日',
            isHoliday: true
          }));

        // 快取假日日期
        holidays.forEach(h => this.holidays.add(h.date));
        return holidays;
      }),
      catchError(err => {
        console.warn('假日 API 載入失敗，使用空清單', err);
        return of([]);
      })
    );
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