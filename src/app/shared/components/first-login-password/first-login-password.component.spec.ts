import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { FirstLoginPasswordComponent } from './first-login-password.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoginResponse } from '../../../core/models/base.model';

describe('FirstLoginPasswordComponent', () => {
  let fixture: ComponentFixture<FirstLoginPasswordComponent>;
  let component: FirstLoginPasswordComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let toast: jasmine.SpyObj<ToastService>;
  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'changeFirstLoginPassword', 'logout']);
    auth.getCurrentUser.and.returnValue(null);
    toast = jasmine.createSpyObj('ToastService', ['success']);
    await TestBed.configureTestingModule({
      imports: [FormsModule], declarations: [FirstLoginPasswordComponent],
      providers: [{ provide: AuthService, useValue: auth }, { provide: ToastService, useValue: toast }]
    }).compileComponents();
    fixture = TestBed.createComponent(FirstLoginPasswordComponent); component = fixture.componentInstance;
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  });

  it('cannot be dismissed by clicking the backdrop or pressing Escape', () => {
    const html = fixture.nativeElement as HTMLElement;
    html.querySelector('div')!.click();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    html.querySelector('[role="dialog"]')!.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBeTrue();
    expect(html.querySelector('[role="dialog"]')).toBeTruthy();
    expect(html.textContent).not.toContain('Hủy bỏ');
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('rejects short or mismatched passwords without sending a request', () => {
    component.newPassword = 'short'; component.confirmPassword = 'short'; component.submit();
    expect(component.errorMessage).toContain('8 ký tự');
    component.newPassword = 'Own-Password@2026!'; component.confirmPassword = 'Other-Password@2026!'; component.submit();
    expect(component.errorMessage).toContain('không khớp');
    expect(auth.changeFirstLoginPassword).not.toHaveBeenCalled();
  });

  it('keeps the popup active on server errors and prevents duplicate submits', () => {
    const result = new Subject<LoginResponse>(); auth.changeFirstLoginPassword.and.returnValue(result);
    component.newPassword = 'Own-Password@2026!'; component.confirmPassword = component.newPassword;
    component.submit(); component.submit();
    expect(auth.changeFirstLoginPassword).toHaveBeenCalledOnceWith(component.newPassword, component.confirmPassword);
    expect(component.isSaving).toBeTrue();
    result.error({ message: 'Mật khẩu mới phải khác mật khẩu hiện tại.' }); fixture.detectChanges();
    expect(component.isSaving).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('khác mật khẩu hiện tại');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('clears password fields after successful completion', () => {
    auth.changeFirstLoginPassword.and.returnValue(of({} as LoginResponse));
    component.newPassword = 'Own-Password@2026!'; component.confirmPassword = component.newPassword; component.submit();
    expect(component.newPassword).toBe(''); expect(component.confirmPassword).toBe('');
    expect(toast.success).toHaveBeenCalled();
  });

  it('keeps keyboard focus inside the dialog', () => {
    const html = fixture.nativeElement as HTMLElement;
    const first = html.querySelector<HTMLInputElement>('input')!;
    const buttons = html.querySelectorAll<HTMLButtonElement>('button');
    const last = buttons[buttons.length - 1];
    first.focus(); first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(first);
  });
});
