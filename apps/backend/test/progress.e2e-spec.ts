import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GoalType, MilestoneStatus, StaffRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Progress Tracking Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let caseworkerToken: string;
  let childId: string;

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

    const child = await prisma.child.findFirst();
    childId = child!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Progress Notes', () => {
    it('POST /progress/notes', async () => {
      const res = await request(app.getHttpServer())
        .post('/progress/notes')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          childId,
          note: 'Observation: Child is responding well to behavioral therapy.',
        });

      expect(res.status).toBe(201);
      expect(res.body.note).toContain('Observation');
    });

    it('GET /progress/notes/child/:childId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/progress/notes/child/${childId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Milestones', () => {
    let milestoneId: string;

    it('POST /progress/milestones', async () => {
      const res = await request(app.getHttpServer())
        .post('/progress/milestones')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          childId,
          title: 'Walk independently',
          description: 'Able to walk 10 meters without assistance.',
        });

      expect(res.status).toBe(201);
      milestoneId = res.body.id;
    });

    it('GET /progress/milestones/child/:childId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/progress/milestones/child/${childId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.NOT_STARTED).toBeDefined();
    });

    it('PATCH /progress/milestones/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/progress/milestones/${milestoneId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          status: MilestoneStatus.ACHIEVED,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(MilestoneStatus.ACHIEVED);

      const audit = await prisma.auditLog.findFirst({
        where: { entityId: milestoneId, action: 'UPDATE' },
        orderBy: { createdAt: 'desc' }
      });
      expect(audit).toBeDefined();
    });
  });

  describe('Goals', () => {
    let goalId: string;

    it('POST /progress/goals', async () => {
      const res = await request(app.getHttpServer())
        .post('/progress/goals')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          childId,
          title: 'Master sign language basics',
          type: GoalType.LONG_TERM,
        });

      expect(res.status).toBe(201);
      goalId = res.body.id;
    });

    it('PATCH /progress/goals/:id (Mark Achieved)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/progress/goals/${goalId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          isAchieved: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.achievedAt).not.toBeNull();
    });

    it('DELETE /progress/goals/:id (Admin Only)', async () => {
      // Caseworker fails
      await request(app.getHttpServer())
        .delete(`/progress/goals/${goalId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .expect(403);

      // Admin succeeds
      await request(app.getHttpServer())
        .delete(`/progress/goals/${goalId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});
