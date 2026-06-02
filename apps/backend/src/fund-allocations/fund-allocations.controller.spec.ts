import { Test, TestingModule } from '@nestjs/testing';
import { FundAllocationsController } from './fund-allocations.controller';

describe('FundAllocationsController', () => {
  let controller: FundAllocationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundAllocationsController],
    }).compile();

    controller = module.get<FundAllocationsController>(FundAllocationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
