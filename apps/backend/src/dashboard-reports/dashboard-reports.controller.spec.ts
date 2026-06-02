import { Test, TestingModule } from '@nestjs/testing';
import { DashboardReportsController } from './dashboard-reports.controller';

describe('DashboardReportsController', () => {
  let controller: DashboardReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardReportsController],
    }).compile();

    controller = module.get<DashboardReportsController>(DashboardReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
