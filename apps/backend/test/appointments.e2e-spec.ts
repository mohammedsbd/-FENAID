import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentType, AttendanceStatus, StaffRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Appointments Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let caseworkerToken: string;
  let staffId: string;
  let parentId: string;
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
    staffId = caseworker!.id;

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
    const child = await prisma.child.findFirst();
    childId = child!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Appointments Management', () => {
    let appointmentId: string;

    it('POST /appointments', async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          title: 'Therapy Session',
          staffId,
          childId,
          parentId,
          scheduledAt: '2026-06-15T10:00:00Z',
          type: AppointmentType.THERAPY,
        });

      expect(res.status).toBe(201);
      appointmentId = res.body.id;
    });

    it('GET /appointments/calendar', async () => {
      const res = await request(app.getHttpServer())
        .get('/appointments/calendar')
        .query({ month: '2026-06' })
        .set('Authorization', `Bearer ${caseworkerToken}`);

      expect(res.status).toBe(200);
      expect(res.body['2026-06-15']).toBeDefined();
    });

    it('DELETE /appointments/:id (Admin Only)', async () => {
      // Forbidden for caseworker
      await request(app.getHttpServer())
        .delete(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .expect(403);

      // Success for admin
      await request(app.getHttpServer())
        .delete(`/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Attendance Logging', () => {
    let appointmentId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          title: 'Assessment',
          staffId,
          childId,
          parentId,
          scheduledAt: '2026-06-20T14:00:00Z',
          type: AppointmentType.ASSESSMENT,
        });
      appointmentId = res.body.id;
    });

    it('POST /appointments/:id/attendance', async () => {
      const res = await request(app.getHttpServer())
        .post(`/appointments/${appointmentId}/attendance`)
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          records: [
            {
              targetType: 'PARENT',
              targetId: parentId,
              status: AttendanceStatus.PRESENT,
              notes: 'Arrived on time',
            },
            {
              targetType: 'CHILD',
              targetId: childId,
              status: AttendanceStatus.PRESENT,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.length).toBe(2);
    });

    it('GET /appointments/:id/attendance', async () => {
      const res = await request(app.getHttpServer())
        .get(`/appointments/${appointmentId}/attendance`)
        .set('Authorization', `Bearer ${caseworkerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });
});
