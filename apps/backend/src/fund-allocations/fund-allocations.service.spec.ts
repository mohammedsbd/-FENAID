import { Test, TestingModule } from '@nestjs/testing';
import { FundAllocationsService } from './fund-allocations.service';

describe('FundAllocationsService', () => {
  let service: FundAllocationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FundAllocationsService],
    }).compile();

    service = module.get<FundAllocationsService>(FundAllocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
