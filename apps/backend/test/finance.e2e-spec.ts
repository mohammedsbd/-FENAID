import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DonorType, FundAllocationStatus, StaffRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Finance Modules (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let parentId: string;
  let staffId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const staff = await prisma.staff.findFirst({
      where: { role: StaffRole.SUPER_ADMIN },
    });
    staffId = staff!.id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: staff!.email, password: 'Fikir@2024' });
    accessToken = loginRes.body.accessToken;

    const parent = await prisma.parent.findFirst();
    parentId = parent!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('FundAllocation', () => {
    let allocationId: string;

    it('POST /fund-allocations', async () => {
      const res = await request(app.getHttpServer())
        .post('/fund-allocations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          parentId,
          amount: '5000.00',
          purpose: 'School Fees',
          allocationDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.amount).toBe('5000');
      allocationId = res.body.id;
    });

    it('PATCH /fund-allocations/:id (Locking Rule)', async () => {
      // 1. Mark as DISBURSED and Acknowledged
      await request(app.getHttpServer())
        .patch(`/fund-allocations/${allocationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          status: FundAllocationStatus.DISBURSED,
          parentAcknowledged: true,
          receiptUrl: 'http://receipt.com/1',
        });

      // 2. Try to update again - should be Forbidden
      const res = await request(app.getHttpServer())
        .patch(`/fund-allocations/${allocationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notes: 'Sneaky update' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('finalized');
    });
  });

  describe('Donations', () => {
    it('POST /donations', async () => {
      const res = await request(app.getHttpServer())
        .post('/donations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          donorName: 'Generous Donor',
          donorType: DonorType.INDIVIDUAL,
          amount: '10000.00',
          donationDate: new Date().toISOString(),
          isRestricted: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.receiptNumber).toMatch(/^DON-\d{4}-\d{4}$/);
    });

    it('GET /donations/summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/donations/summary')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalThisMonth).toBeDefined();
    });
  });
});
