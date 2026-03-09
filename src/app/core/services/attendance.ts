import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AttendanceRequest,
  AttendanceQueryParams
} from '../../models/attendance.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAttendances(query: AttendanceQueryParams = {}): Observable<any> {
    let params = new HttpParams();
    if (query.status) params = params.set('status', query.status);
    if (query.type) params = params.set('type', query.type);
    if (query.keyword) params = params.set('keyword', query.keyword);
    if (query.date_from) params = params.set('date_from', query.date_from);
    if (query.date_to) params = params.set('date_to', query.date_to);
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    return this.http.get<{ success: boolean; data: AttendanceRequest[]; pagination: any }>(
      `${this.apiUrl}/attendance`, { params }
    );
  }

  getAttendance(id: number): Observable<AttendanceRequest> {
    return this.http.get<AttendanceRequest>(`${this.apiUrl}/attendance/${id}`);
  }

  createAttendance(data: Partial<AttendanceRequest>): Observable<any> {
    return this.http.post(`${this.apiUrl}/attendance`, data);
  }

  updateAttendance(id: number, data: Partial<AttendanceRequest>): Observable<any> {
    return this.http.put(`${this.apiUrl}/attendance/${id}`, data);
  }

  deleteAttendance(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/attendance/${id}`);
  }

  approveAttendance(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/attendance/${id}/approve`, {});
  }

  rejectAttendance(id: number, rejectReason: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/attendance/${id}/reject`, { rejectReason });
  }
}