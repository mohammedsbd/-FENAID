import { Test, TestingModule } from '@nestjs/testing';
import { ProgressTrackingController } from './progress-tracking.controller';

describe('ProgressTrackingController', () => {
  let controller: ProgressTrackingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressTrackingController],
    }).compile();

    controller = module.get<ProgressTrackingController>(ProgressTrackingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
