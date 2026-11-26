import { of } from 'rxjs';
import { ApiService } from './api.service';
import { WeeklyLogService } from './weekly-log.service';

describe('WeeklyLogService confirmation', () => {
  it('loads the teacher queue and sends Vietnamese comments in a JSON body', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get', 'patch']);
    api.get.and.returnValue(of([])); api.patch.and.returnValue(of({}));
    const service = new WeeklyLogService(api);
    service.getPending().subscribe(); service.approveWeeklyLog(81, 'Hoàn thành tốt').subscribe();
    expect(api.get).toHaveBeenCalledOnceWith('/base/weekly-logs/pending');
    expect(api.patch).toHaveBeenCalledOnceWith('/base/weekly-logs/81/approve', { comment: 'Hoàn thành tốt' });
  });
});
