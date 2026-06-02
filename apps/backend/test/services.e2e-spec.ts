import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ServiceAssignmentStatus,
  ServiceDeliveryMethod,
  ServiceFrequency,
  ServiceTargetType,
  StaffRole,
} from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Services Module (e2e)', () => {
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

  describe('Service Catalog', () => {
    let serviceId: string;

    it('POST /services (Admin Only)', async () => {
      // Forbidden for caseworker
      await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          name: 'New Service',
          category: 'Test',
          targetType: ServiceTargetType.CHILD,
        })
        .expect(403);

      // Success for admin
      const res = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Service',
          category: 'Test',
          targetType: ServiceTargetType.CHILD,
        });

      expect(res.status).toBe(201);
      serviceId = res.body.id;
    });

    it('GET /services', async () => {
      const res = await request(app.getHttpServer())
        .get('/services')
        .query({ targetType: ServiceTargetType.CHILD });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Service Assignments', () => {
    let serviceId: string;
    let assignmentId: string;

    beforeAll(async () => {
      const service = await prisma.service.findFirst({
        where: { targetType: ServiceTargetType.CHILD },
      });
      serviceId = service!.id;
    });

    it('POST /service-assignments', async () => {
      const res = await request(app.getHttpServer())
        .post('/service-assignments')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          serviceId,
          targetType: ServiceTargetType.CHILD,
          childId,
          assignedStaffId: staffId,
          startDate: new Date().toISOString(),
          frequency: ServiceFrequency.WEEKLY,
          deliveryMethod: ServiceDeliveryMethod.ON_SITE,
        });

      expect(res.status).toBe(201);
      assignmentId = res.body.id;
    });

    it('POST /service-assignments (Validation Error)', async () => {
      // Missing childId for CHILD targetType
      await request(app.getHttpServer())
        .post('/service-assignments')
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          serviceId,
          targetType: ServiceTargetType.CHILD,
          assignedStaffId: staffId,
          startDate: new Date().toISOString(),
          frequency: ServiceFrequency.WEEKLY,
          deliveryMethod: ServiceDeliveryMethod.ON_SITE,
        })
        .expect(400);
    });

    it('PATCH /service-assignments/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/service-assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${caseworkerToken}`)
        .send({
          status: ServiceAssignmentStatus.ACTIVE,
          notes: 'Starting sessions',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(ServiceAssignmentStatus.ACTIVE);
    });
  });
});
