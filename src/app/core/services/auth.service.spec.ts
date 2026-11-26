import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, SessionState } from './auth.service';
import { LoginResponse } from '../models/base.model';

describe('AuthService first-login gate', () => {
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  const required: LoginResponse = {
    token: 'limited-token', user_id: 1, email: 'first@test.invalid', full_name: 'Người dùng mới',
    role: 'STUDENT', department_id: null, password_change_required: true
  };
  beforeEach(() => {
    localStorage.removeItem('token'); localStorage.removeItem('user_info');
    router = jasmine.createSpyObj('Router', ['navigate']); router.navigate.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: Router, useValue: router }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify(); localStorage.removeItem('token'); localStorage.removeItem('user_info');
  });
  function login(auth: AuthService): void {
    auth.login({ email: required.email, password: 'Abc@1234' }).subscribe();
    http.expectOne(req => req.url.endsWith('/base/auth/login')).flush({ status: 1, payload: required });
  }

  it('opens the password gate immediately after login and stores the required state', () => {
    const auth = TestBed.inject(AuthService);
    let state: SessionState | undefined; auth.sessionState$.subscribe(value => state = value);
    login(auth);
    expect(state).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(auth.getCurrentUser()?.passwordChangeRequired).toBeTrue();
  });

  it('verifies persisted sessions with the server even if the cached flag was modified', () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('user_info', JSON.stringify({ passwordChangeRequired: false }));
    const auth = TestBed.inject(AuthService);
    let state: SessionState | undefined; auth.sessionState$.subscribe(value => state = value);
    auth.restoreSession();
    expect(state).toBe('CHECKING');
    http.expectOne(req => req.url.endsWith('/base/auth/session')).flush({ status: 1, payload: required });
    expect(state).toBe('PASSWORD_CHANGE_REQUIRED');
    expect(auth.getCurrentUser()?.passwordChangeRequired).toBeTrue();
  });

  it('only unlocks pages after receiving the fresh unrestricted session', () => {
    const auth = TestBed.inject(AuthService); login(auth);
    let state: SessionState | undefined; auth.sessionState$.subscribe(value => state = value);
    auth.changeFirstLoginPassword('Own-Password@2026!', 'Own-Password@2026!').subscribe();
    const request = http.expectOne(req => req.url.endsWith('/base/auth/change-password'));
    expect(request.request.body).toEqual({ newPassword: 'Own-Password@2026!', confirmPassword: 'Own-Password@2026!' });
    expect(state).toBe('PASSWORD_CHANGE_REQUIRED');
    request.flush({ status: 1, payload: { ...required, token: 'full-token', password_change_required: false } });
    expect(state).toBe('READY');
    expect(auth.getToken()).toBe('full-token');
    expect(auth.getCurrentUser()?.passwordChangeRequired).toBeFalse();
    expect(localStorage.getItem('user_info')).not.toContain('Own-Password@2026!');
  });

  it('keeps the gate closed after an invalid password and after session network failure', () => {
    const auth = TestBed.inject(AuthService); login(auth);
    let state: SessionState | undefined; auth.sessionState$.subscribe(value => state = value);
    auth.changeFirstLoginPassword('Abc@1234', 'Abc@1234').subscribe({ error: () => {} });
    http.expectOne(req => req.url.endsWith('/base/auth/change-password')).flush({ message: 'Không được dùng mật khẩu mặc định' }, { status: 400, statusText: 'Bad Request' });
    expect(state).toBe('PASSWORD_CHANGE_REQUIRED');
    auth.restoreSession();
    http.expectOne(req => req.url.endsWith('/base/auth/session')).error(new ProgressEvent('error'));
    expect(state).toBe('ERROR');
  });

  it('logs out without clearing the server-side requirement', () => {
    const auth = TestBed.inject(AuthService); login(auth);
    let state: SessionState | undefined; auth.sessionState$.subscribe(value => state = value);
    auth.logout();
    expect(state).toBe('SIGNED_OUT');
    expect(auth.getToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
