import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StaffRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Dashboard and Reports Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let caseworkerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    const admin = await prisma.staff.findFirst({
      where: { role: StaffRole.SUPER_ADMIN },
    });
    const caseworker = await prisma.staff.findFirst({
      where: { role: StaffRole.CASE_WORKER },
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin!.email, password: 'Fikir@2024' });
    adminToken = adminLogin.body.accessToken;

    const caseworkerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: caseworker!.email, password: 'Fikir@2024' });
    caseworkerToken = caseworkerLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Dashboards', () => {
    it('GET /dashboard/admin (Admin Only)', async () => {
      // Forbidden for caseworker
      await request(app.getHttpServer())
        .get('/dashboard/admin')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .expect(403);

      // Success for admin
      const res = await request(app.getHttpServer())
        .get('/dashboard/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.donationSummary).toBeDefined();
    });

    it('GET /dashboard/staff', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/staff')
        .set('Authorization', `Bearer ${caseworkerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.myParents).toBeDefined();
    });
  });

  describe('Reports', () => {
    it('GET /reports/member-directory', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/member-directory')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.parents).toBeDefined();
    });

    it('GET /reports/donation-log', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/donation-log')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ startDate: '2020-01-01' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
