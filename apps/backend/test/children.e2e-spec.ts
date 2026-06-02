import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ChildStatus, DisabilityType, SeverityLevel, StaffRole } from '@prisma/client';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Children (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let adminToken: string;
  let parentId: string;
  let staffId: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Get a caseworker for login
    const staff = await prisma.staff.findFirst({ where: { role: StaffRole.CASE_WORKER } });
    staffId = staff!.id;

    // Get an admin for login
    const admin = await prisma.staff.findFirst({ where: { role: StaffRole.SUPER_ADMIN } });
    adminId = admin!.id;

    // We assume the seed has run and passwords are 'Fikir@2024'
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: staff!.email, password: 'Fikir@2024' });
    accessToken = loginRes.body.accessToken;

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: admin!.email, password: 'Fikir@2024' });
    adminToken = adminLoginRes.body.accessToken;

    const parent = await prisma.parent.findFirst();
    parentId = parent!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /children (Success)', async () => {
    const res = await request(app.getHttpServer())
      .post('/children')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Test Child',
        dateOfBirth: '2020-01-01',
        gender: 'Male',
        disabilityType: DisabilityType.PHYSICAL,
        disabilityCategory: 'test category',
        severityLevel: SeverityLevel.MODERATE,
        schoolEnrollmentStatus: 'NOT_ENROLLED',
        communicationAbility: 'VERBAL',
        parentId,
        assignedStaffId: staffId,
      });

    expect(res.status).toBe(201);
    expect(res.body.child.fullName).toBe('Test Child');
    expect(res.body.suggestedServices).toBeDefined();
    expect(res.body.suggestedServices.some((s: any) => s.name === 'Physiotherapy')).toBe(true);
  });

  it('POST /children (Suggest Intensive Therapy for SEVERE)', async () => {
    const res = await request(app.getHttpServer())
      .post('/children')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        fullName: 'Severe Child',
        dateOfBirth: '2020-01-01',
        gender: 'Female',
        disabilityType: DisabilityType.INTELLECTUAL,
        disabilityCategory: 'test category',
        severityLevel: SeverityLevel.SEVERE,
        schoolEnrollmentStatus: 'NOT_ENROLLED',
        communicationAbility: 'NON_VERBAL',
        parentId,
        assignedStaffId: staffId,
      });

    expect(res.status).toBe(201);
    expect(res.body.eligibilityNotes).toContain('Intensive Therapy recommended due to severe support needs.');
  });

  it('GET /children (List with filters)', async () => {
    const res = await request(app.getHttpServer())
      .get('/children')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ search: 'Dawit', disabilityType: DisabilityType.PHYSICAL });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].fullName).toContain('Dawit');
  });

  it('GET /children/:id (Detail Profile)', async () => {
    const child = await prisma.child.findFirst();
    const res = await request(app.getHttpServer())
      .get(`/children/${child!.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(child!.id);
    expect(res.body.parent).toBeDefined();
    expect(res.body.serviceAssignments).toBeDefined();
    expect(res.body.progressNotes).toBeDefined();
  });

  it('PATCH /children/:id (Update)', async () => {
    const child = await prisma.child.findFirst({ where: { fullName: 'Test Child' } });
    const res = await request(app.getHttpServer())
      .patch(`/children/${child!.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ fullName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe('Updated Name');

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: child!.id, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' }
    });
    expect(audit).toBeDefined();
  });

  it('DELETE /children/:id (Soft Delete - Admin Only)', async () => {
    const child = await prisma.child.findFirst({ where: { fullName: 'Updated Name' } });
    
    // Test Caseworker forbidden
    const forbiddenRes = await request(app.getHttpServer())
      .delete(`/children/${child!.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(forbiddenRes.status).toBe(403);

    // Test Admin success
    const res = await request(app.getHttpServer())
      .delete(`/children/${child!.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe(ChildStatus.INACTIVE);
  });
});
