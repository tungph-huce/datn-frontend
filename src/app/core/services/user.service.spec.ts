import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService account filters', () => {
  let service: UserService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('sends the student group together with search and pagination', () => {
    service.getUsers({ page: 2, limit: 10, searchText: '00000168' }, 'STUDENT', undefined, 'STUDENT').subscribe();
    const request = http.expectOne(req => req.url.endsWith('/base/users'));
    expect(request.request.params.get('accountType')).toBe('STUDENT');
    expect(request.request.params.get('role')).toBe('STUDENT');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('searchText')).toBe('00000168');
    request.flush({ status: 1, payload: { data: [], total: 0 } });
  });

  it('requests all staff roles within the staff group', () => {
    service.getUsers({ page: 1, limit: 10 }, undefined, 7, 'STAFF').subscribe();
    const request = http.expectOne(req => req.url.endsWith('/base/users'));
    expect(request.request.params.get('accountType')).toBe('STAFF');
    expect(request.request.params.has('role')).toBeFalse();
    expect(request.request.params.get('departmentId')).toBe('7');
    request.flush({ status: 1, payload: { data: [], total: 0 } });
  });

  it('preserves existing teacher lookups without adding a group filter', () => {
    service.getUsers({ page: 1, limit: 1000 }, 'GVHD').subscribe();
    const request = http.expectOne(req => req.url.endsWith('/base/users'));
    expect(request.request.params.get('role')).toBe('GVHD');
    expect(request.request.params.has('accountType')).toBeFalse();
    request.flush({ status: 1, payload: { data: [], total: 0 } });
  });
});
