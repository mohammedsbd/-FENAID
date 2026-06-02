import { Test, TestingModule } from '@nestjs/testing';
import { DashboardReportsService } from './dashboard-reports.service';

describe('DashboardReportsService', () => {
  let service: DashboardReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardReportsService],
    }).compile();

    service = module.get<DashboardReportsService>(DashboardReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
