import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-first-login-password',
  templateUrl: './first-login-password.component.html'
})
export class FirstLoginPasswordComponent implements AfterViewInit {
  @ViewChild('dialog') dialog!: ElementRef<HTMLElement>;
  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  isSaving = false;
  errorMessage = '';

  constructor(public auth: AuthService, private toast: ToastService) {}

  ngAfterViewInit(): void {
    this.passwordInput.nativeElement.focus();
  }

  @HostListener('keydown', ['$event'])
  keepFocus(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); }
    if (event.key !== 'Tab') return;
    const controls = Array.from(this.dialog.nativeElement.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)'));
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  submit(): void {
    if (this.isSaving) return;
    this.errorMessage = '';
    if (!this.newPassword.trim() || this.newPassword.length < 8 || new TextEncoder().encode(this.newPassword).length > 72) {
      this.errorMessage = 'Mật khẩu mới phải từ 8 ký tự và tối đa 72 byte.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Xác nhận mật khẩu mới không khớp.';
      return;
    }
    this.isSaving = true;
    this.auth.changeFirstLoginPassword(this.newPassword, this.confirmPassword).subscribe({
      next: () => {
        this.newPassword = ''; this.confirmPassword = '';
        this.isSaving = false;
        this.toast.success('Đổi mật khẩu thành công. Bạn có thể sử dụng hệ thống.');
      },
      error: error => {
        this.isSaving = false;
        this.errorMessage = error.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.';
      }
    });
  }
}
