import { TestBed } from '@angular/core/testing';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { BehaviorSubject } from 'rxjs';
import { AuthService, SessionState } from './core/services/auth.service';

let dashboardCreations = 0;
@Component({ template: '<p>Đăng nhập kiểm thử</p>' })
class TestLoginPage {}
@Component({ template: '<p id="ready-dashboard">Dashboard đã mở</p>' })
class TestDashboardPage {
  constructor() { dashboardCreations++; }
}

describe('AppComponent', () => {
  let state: BehaviorSubject<SessionState>;
  let auth: { sessionState$: any; restoreSession: jasmine.Spy; logout: jasmine.Spy };
  beforeEach(async () => {
    state = new BehaviorSubject<SessionState>('SIGNED_OUT');
    auth = { sessionState$: state.asObservable(), restoreSession: jasmine.createSpy('restoreSession'), logout: jasmine.createSpy('logout') };
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent, TestLoginPage, TestDashboardPage
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'intership-frontend'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('intership-frontend');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('does not create business pages while checking the session or requiring a password change', () => {
    state.next('CHECKING');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(auth.restoreSession).toHaveBeenCalledOnceWith();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    state.next('PASSWORD_CHANGE_REQUIRED'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-first-login-password')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    state.next('READY'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-first-login-password')).toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('keeps business pages blocked if session verification fails and offers retry', () => {
    state.next('ERROR');
    const fixture = TestBed.createComponent(AppComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    fixture.nativeElement.querySelector('button').click();
    expect(auth.restoreSession).toHaveBeenCalledTimes(2);
  });

  it('holds dashboard navigation until the password change finishes, then opens the dashboard', async () => {
    dashboardCreations = 0;
    const router = TestBed.inject(Router);
    router.resetConfig([
      { path: 'auth/login', component: TestLoginPage },
      { path: 'student/dashboard', component: TestDashboardPage }
    ]);
    const fixture = TestBed.createComponent(AppComponent); fixture.detectChanges();
    await fixture.ngZone!.run(() => router.navigateByUrl('/auth/login')); fixture.detectChanges();
    state.next('PASSWORD_CHANGE_REQUIRED'); fixture.detectChanges();
    await fixture.ngZone!.run(() => router.navigateByUrl('/student/dashboard')); fixture.detectChanges();
    expect(dashboardCreations).toBe(0);
    expect(fixture.nativeElement.querySelector('#ready-dashboard')).toBeNull();
    state.next('READY'); fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(dashboardCreations).toBe(1);
    expect(fixture.nativeElement.querySelector('#ready-dashboard')).toBeTruthy();
  });
});
