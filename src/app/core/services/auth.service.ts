import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { LoginRequest, RegisterRequest } from '../models/request.model';
import { LoginResponse, UserInfo } from '../models/base.model';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

const STORAGE_KEY_TOKEN = 'token';
const STORAGE_KEY_USER = 'user_info';

export type SessionState = 'CHECKING' | 'PASSWORD_CHANGE_REQUIRED' | 'READY' | 'SIGNED_OUT' | 'ERROR';

/**
 * Mapping role backend → route dashboard frontend
 */
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  'ADMIN': '/admin/dashboard',
  'LDKBM': '/ldkbm/general-dashboard',
  'GVHD': '/teacher/dashboard',
  'STUDENT': '/student/dashboard',
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly sessionState = new BehaviorSubject<SessionState>(localStorage.getItem(STORAGE_KEY_TOKEN) ? 'CHECKING' : 'SIGNED_OUT');
  readonly sessionState$ = this.sessionState.asObservable();
  constructor(private apiService: ApiService, private router: Router) {}

  /**
   * Gọi API login thật → lưu token + user info vào localStorage
   */
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('/base/auth/login', request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  /**
   * Xóa token + user info, redirect về login
   */
  logout(): void {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    this.sessionState.next('SIGNED_OUT');
    this.router.navigate(['/auth/login']);
  }

  /**
   * Kiểm tra đã đăng nhập chưa
   */
  isLoggedIn(): boolean {
    return !!localStorage.getItem(STORAGE_KEY_TOKEN);
  }

  /**
   * Lấy JWT token
   */
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  }

  /**
   * Lấy thông tin user đang đăng nhập
   */
  getCurrentUser(): UserInfo | null {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserInfo;
    } catch {
      return null;
    }
  }

  /**
   * Lấy role hiện tại
   */
  getRole(): string {
    return this.getCurrentUser()?.role || '';
  }

  /**
   * Trả về route dashboard tương ứng với role hiện tại
   */
  getRoleDashboardRoute(): string {
    const role = this.getRole();
    return ROLE_DASHBOARD_MAP[role] || '/auth/login';
  }

  /**
   * Gọi API đăng ký → tự động lưu token + user info (đăng nhập luôn sau đăng ký)
   */
  register(request: RegisterRequest): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('/base/auth/register', request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  /**
   * Gọi API thiết lập mật khẩu
   */
  setupPassword(request: any): Observable<any> {
    return this.apiService.post<any>('/base/auth/setup-password', request);
  }

  restoreSession(): void {
    if (!this.getToken()) {
      this.sessionState.next('SIGNED_OUT');
      return;
    }
    this.sessionState.next('CHECKING');
    this.apiService.get<LoginResponse>('/base/auth/session').subscribe({
      next: response => this.saveSession(response),
      error: error => {
        if (error.status === 401 || error.status === 403) this.logout();
        else this.sessionState.next('ERROR');
      }
    });
  }

  requirePasswordChange(): void {
    const user = this.getCurrentUser();
    if (user) localStorage.setItem(STORAGE_KEY_USER, JSON.stringify({ ...user, passwordChangeRequired: true }));
    this.sessionState.next('PASSWORD_CHANGE_REQUIRED');
  }

  changeFirstLoginPassword(newPassword: string, confirmPassword: string): Observable<LoginResponse> {
    return this.apiService.post<LoginResponse>('/base/auth/change-password', { newPassword, confirmPassword }).pipe(
      tap(response => this.saveSession(response))
    );
  }

  private saveSession(response: LoginResponse): void {
    if (!response?.token) return;
    localStorage.setItem(STORAGE_KEY_TOKEN, response.token);
    const userInfo: UserInfo = {
      userId: response.user_id, email: response.email, fullName: response.full_name,
      role: response.role, departmentId: response.department_id,
      passwordChangeRequired: !!response.password_change_required
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userInfo));
    this.sessionState.next(userInfo.passwordChangeRequired ? 'PASSWORD_CHANGE_REQUIRED' : 'READY');
  }
}
