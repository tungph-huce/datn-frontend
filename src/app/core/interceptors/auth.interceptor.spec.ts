import { HttpErrorResponse, HttpHandler, HttpRequest } from '@angular/common/http';
import { throwError } from 'rxjs';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

describe('AuthInterceptor password requirement', () => {
  it('reopens the mandatory password gate when the server rejects a business request', () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['getToken', 'requirePasswordChange', 'logout']);
    auth.getToken.and.returnValue('limited-token');
    const handler = { handle: () => throwError(() => new HttpErrorResponse({ status: 403, error: { code: 'PASSWORD_CHANGE_REQUIRED' } })) } as HttpHandler;
    const interceptor = new AuthInterceptor(auth, {} as Router);
    interceptor.intercept(new HttpRequest('GET', '/base/campaigns/options'), handler).subscribe({ error: () => {} });
    expect(auth.requirePasswordChange).toHaveBeenCalledOnceWith();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
