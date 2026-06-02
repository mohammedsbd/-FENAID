import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StaffRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Documents and Notifications Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let caseworkerToken: string;
  let parentId: string;

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

    const parent = await prisma.parent.findFirst();
    parentId = parent!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Documents', () => {
    let documentId: string;

    it('POST /documents', async () => {
      const res = await request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          name: 'Medical Report',
          category: 'Medical',
          fileUrl: 'https://storage.fikir.org/docs/med-001.pdf',
          parentId,
        });

      expect(res.status).toBe(201);
      documentId = res.body.id;
    });

    it('GET /documents/parent/:parentId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/documents/parent/${parentId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('DELETE /documents/:id (Admin Only)', async () => {
      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Notifications', () => {
    let notificationId: string;

    beforeAll(async () => {
      // Manually create a notification for testing
      const admin = await prisma.staff.findFirst({ where: { role: StaffRole.SUPER_ADMIN } });
      const notif = await prisma.notification.create({
        data: {
          staffId: admin!.id,
          message: 'Test Notification',
          type: 'GENERAL',
        },
      });
      notificationId = notif.id;
    });

    it('GET /notifications/mine', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications/mine')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.some((n: any) => n.id === notificationId)).toBe(true);
    });

    it('PATCH /notifications/:id/read', async () => {
      await request(app.getHttpServer())
        .patch(`/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/notifications/mine')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.some((n: any) => n.id === notificationId)).toBe(false);
    });
  });
});
