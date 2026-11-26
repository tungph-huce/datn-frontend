import { Component, OnInit } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'intership-frontend';

  constructor(private toastService: ToastService, public auth: AuthService) {
    window.alert = (message: string) => {
      const lower = String(message).toLowerCase();
      if (lower.includes('thành công') || lower.includes('cảm ơn') || lower.includes('ghi nhận')) {
        this.toastService.success(message);
      } else if (lower.includes('lỗi') || lower.includes('không tìm thấy') || lower.includes('thất bại')) {
        this.toastService.error(message);
      } else {
        this.toastService.warning(message);
      }
    };
  }

  ngOnInit(): void {
    this.auth.restoreSession();
  }
}
