import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const seedPassword = 'password123';

function date(value: string) {
  return new Date(value);
}

async function main() {
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  console.log('Clearing existing data...');
  await prisma.dataExportLog.deleteMany();
  await prisma.savedQuery.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.progressNote.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.fundAllocation.deleteMany();
  await prisma.serviceAssignment.deleteMany();
  await prisma.childParent.deleteMany();
  await prisma.child.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.service.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordHistory.deleteMany();
  await prisma.staff.deleteMany();

  console.log('Creating fresh Super Admin accounts...');
  const [admin1, admin2, caseworker1, caseworker2] = await Promise.all([
    prisma.staff.create({
      data: {
        email: 'superadmin@fikir.org',
        fullName: 'Fikir Super Admin',
        passwordHash,
        role: 'SUPER_ADMIN',
        mustChangePassword: true,
      },
    }),
    prisma.staff.create({
      data: {
        email: 'headadmin@fikir.org',
        fullName: 'Fikir Head Administrator',
        passwordHash,
        role: 'SUPER_ADMIN',
        mustChangePassword: true,
      },
    }),
    prisma.staff.create({
      data: {
        email: 'caseworker1@fikir.org',
        fullName: 'Abebe Girma',
        passwordHash,
        role: 'CASE_WORKER',
        mustChangePassword: true,
      },
    }),
    prisma.staff.create({
      data: {
        email: 'caseworker2@fikir.org',
        fullName: 'Meron Haile',
        passwordHash,
        role: 'CASE_WORKER',
        mustChangePassword: true,
      },
    }),

  ]);

  const services = await prisma.service.createManyAndReturn({
    data: [
      {
        name: 'Financial Aid',
        description:
          'Direct support for essential household and disability-related costs.',
        category: 'Economic Support',
        targetType: 'PARENT',
      },
      {
        name: 'Awareness Workshop',
        description:
          'Group education sessions for caregivers and community members.',
        category: 'Training',
        targetType: 'PARENT',
      },
      {
        name: 'Psychosocial Counseling',
        description: 'Counseling support for parents and caregivers.',
        category: 'Mental Health',
        targetType: 'PARENT',
      },
      {
        name: 'Legal Aid',
        description: 'Support for documentation, rights, and legal referrals.',
        category: 'Protection',
        targetType: 'PARENT',
      },
      {
        name: 'Referral Support',
        description:
          'Coordination with hospitals, schools, and partner organizations.',
        category: 'Case Management',
        targetType: 'PARENT',
      },
      {
        name: 'Physiotherapy',
        description: 'Mobility, strength, and motor function therapy sessions.',
        category: 'Therapy',
        targetType: 'CHILD',
      },
      {
        name: 'Speech Therapy',
        description: 'Communication and language development sessions.',
        category: 'Therapy',
        targetType: 'CHILD',
      },
      {
        name: 'Special Education',
        description: 'Individualized learning and school-readiness support.',
        category: 'Education',
        targetType: 'CHILD',
      },
      {
        name: 'Behavioral Therapy',
        description:
          'Support for emotional regulation, routines, and social skills.',
        category: 'Therapy',
        targetType: 'CHILD',
      },
      {
        name: 'Assistive Device Provision',
        description:
          'Assessment and provision of mobility or communication devices.',
        category: 'Equipment',
        targetType: 'CHILD',
      },
      {
        name: 'Recreational Program',
        description:
          'Inclusive play, art, sport, and peer interaction sessions.',
        category: 'Social Inclusion',
        targetType: 'CHILD',
      },
    ],
  });

  const serviceByName = Object.fromEntries(
    services.map((service) => [service.name, service]),
  );

  const parents = await Promise.all([
    prisma.parent.create({
      data: {
        idTag: 'FKP-0001',
        fullName: 'Hana Alemu',
        photoUrl: null,
        dateOfBirth: date('1987-04-18'),
        gender: 'Female',
        nationalId: 'ET-AA-10024567',
        phone: '+251911234567',
        email: 'hana.alemu@example.com',
        address: 'House 214, Wollo Sefer',
        city: 'Addis Ababa',
        subcity: 'Kirkos',
        woreda: '08',
        maritalStatus: 'DIVORCED',
        employmentStatus: 'SELF_EMPLOYED',
        financialBracket: 'LOW',
        educationLevel: 'Secondary school',
        numberOfDependents: 3,
        referralSource: 'Tikur Anbessa Hospital',
        status: 'ACTIVE',
        internalNotes: 'Needs transport support for weekly therapy visits.',
        assignedStaffId: caseworker1.id,
      },
    }),
    prisma.parent.create({
      data: {
        idTag: 'FKP-0002',
        fullName: 'Mulugeta Bekele',
        photoUrl: null,
        dateOfBirth: date('1979-09-06'),
        gender: 'Male',
        nationalId: 'ET-AA-10024568',
        phone: '+251922345678',
        email: null,
        address: 'Near Ayat Square',
        city: 'Addis Ababa',
        subcity: 'Lemi Kura',
        woreda: '10',
        maritalStatus: 'MARRIED',
        employmentStatus: 'EMPLOYED',
        financialBracket: 'MEDIUM',
        educationLevel: 'Diploma',
        numberOfDependents: 4,
        referralSource: 'Inclusive Education Resource Center',
        status: 'UNDER_REVIEW',
        internalNotes: 'Family requested school placement follow-up.',
        assignedStaffId: caseworker2.id,
      },
    }),
    prisma.parent.create({
      data: {
        idTag: 'FKP-0003',
        fullName: 'Rahel Tesfaye',
        photoUrl: null,
        dateOfBirth: date('1991-12-11'),
        gender: 'Female',
        nationalId: 'ET-AA-10024569',
        phone: '+251933456789',
        email: 'rahel.tesfaye@example.com',
        address: 'Gofa Mebrathail, Block 7',
        city: 'Addis Ababa',
        subcity: 'Nifas Silk-Lafto',
        woreda: '04',
        maritalStatus: 'WIDOWED',
        employmentStatus: 'UNEMPLOYED',
        financialBracket: 'LOW',
        educationLevel: 'Primary school',
        numberOfDependents: 2,
        referralSource: 'Community health worker',
        status: 'ACTIVE',
        internalNotes: 'Priority for school fee support and counseling.',
        assignedStaffId: caseworker1.id,
      },
    }),
  ]);

  const [hana, mulugeta, rahel] = parents;

  const children = await Promise.all([
    prisma.child.create({
      data: {
        fullName: 'Dawit Kebede',
        dateOfBirth: date('2015-03-22'),
        gender: 'Male',
        disabilityType: 'PHYSICAL',
        disabilityCategory: 'mobility impairment',
        severityLevel: 'MODERATE',
        medicalHistory:
          'Congenital lower-limb weakness; regular follow-up recommended.',
        medications: null,
        schoolEnrollmentStatus: 'ENROLLED',
        communicationAbility: 'VERBAL',
        status: 'ACTIVE',
        internalNotes: 'Uses crutches and benefits from transport assistance.',
        assignedStaffId: caseworker1.id,
        parents: {
          create: [{ parentId: hana.id }],
        },
      },
    }),
    prisma.child.create({
      data: {
        fullName: 'Mimi Kebede',
        dateOfBirth: date('2018-08-09'),
        gender: 'Female',
        disabilityType: 'INTELLECTUAL',
        disabilityCategory: 'developmental delay',
        severityLevel: 'MILD',
        medicalHistory: 'Delayed speech and fine motor development.',
        medications: null,
        schoolEnrollmentStatus: 'NOT_ENROLLED',
        communicationAbility: 'ASSISTED',
        status: 'ACTIVE',
        internalNotes: 'Ready for early learning assessment.',
        assignedStaffId: caseworker1.id,
        parents: {
          create: [{ parentId: hana.id }],
        },
      },
    }),
    prisma.child.create({
      data: {
        fullName: 'Biruk Mulugeta',
        dateOfBirth: date('2013-01-14'),
        gender: 'Male',
        disabilityType: 'MULTIPLE',
        disabilityCategory: 'cerebral palsy with speech delay',
        severityLevel: 'SEVERE',
        medicalHistory:
          'History of seizures; neurology follow-up every six months.',
        medications: 'Sodium valproate as prescribed by physician.',
        schoolEnrollmentStatus: 'ENROLLED',
        communicationAbility: 'NON_VERBAL',
        status: 'ACTIVE',
        internalNotes: 'Requires caregiver assistance during sessions.',
        assignedStaffId: caseworker2.id,
        parents: {
          create: [{ parentId: mulugeta.id }],
        },
      },
    }),
    prisma.child.create({
      data: {
        fullName: 'Liya Mulugeta',
        dateOfBirth: date('2016-06-27'),
        gender: 'Female',
        disabilityType: 'INTELLECTUAL',
        disabilityCategory: 'autism',
        severityLevel: 'MODERATE',
        medicalHistory:
          'Sensory sensitivities and difficulty with transitions.',
        medications: null,
        schoolEnrollmentStatus: 'ENROLLED',
        communicationAbility: 'VERBAL',
        status: 'ACTIVE',
        internalNotes: 'Responds well to visual schedules.',
        assignedStaffId: caseworker2.id,
        parents: {
          create: [{ parentId: mulugeta.id }],
        },
      },
    }),
    prisma.child.create({
      data: {
        fullName: 'Samuel Tesfaye',
        dateOfBirth: date('2014-11-03'),
        gender: 'Male',
        disabilityType: 'PHYSICAL',
        disabilityCategory: 'hearing and mobility impairment',
        severityLevel: 'MODERATE',
        medicalHistory: 'Uses hearing aid; mild balance difficulties.',
        medications: null,
        schoolEnrollmentStatus: 'ENROLLED',
        communicationAbility: 'ASSISTED',
        status: 'ACTIVE',
        internalNotes: 'Needs assistive device maintenance.',
        assignedStaffId: caseworker1.id,
        parents: {
          create: [{ parentId: rahel.id }],
        },
      },
    }),
    prisma.child.create({
      data: {
        fullName: 'Bethel Tesfaye',
        dateOfBirth: date('2019-02-19'),
        gender: 'Female',
        disabilityType: 'INTELLECTUAL',
        disabilityCategory: 'speech delay',
        severityLevel: 'MILD',
        medicalHistory:
          'No major medical history; referred for communication support.',
        medications: null,
        schoolEnrollmentStatus: 'NOT_ENROLLED',
        communicationAbility: 'ASSISTED',
        status: 'ACTIVE',
        internalNotes: 'Parent requested home practice guidance.',
        assignedStaffId: caseworker1.id,
        parents: {
          create: [{ parentId: rahel.id }],
        },
      },
    }),
  ]);

  const milestoneStatuses = [
    'NOT_STARTED',
    'IN_PROGRESS',
    'ACHIEVED',
    'REGRESSED',
  ] as const;

  for (const [index, child] of children.entries()) {
    await prisma.progressNote.createMany({
      data: [
        {
          childId: child.id,
          staffId: child.assignedStaffId,
          note: `${child.fullName} attended intake review and baseline needs were documented with the caregiver.`,
        },
        {
          childId: child.id,
          staffId: child.assignedStaffId,
          note: `Follow-up plan created for ${child.fullName}, including caregiver coaching and service referral.`,
        },
      ],
    });

    await prisma.milestone.createMany({
      data: [
        {
          childId: child.id,
          title: 'Complete baseline assessment',
          description:
            'Initial functional and family needs assessment completed.',
          status: milestoneStatuses[(index + 2) % milestoneStatuses.length],
        },
        {
          childId: child.id,
          title: 'Attend four consecutive sessions',
          description: 'Build routine attendance and caregiver engagement.',
          status: milestoneStatuses[(index + 1) % milestoneStatuses.length],
        },
        {
          childId: child.id,
          title: 'Demonstrate home practice skill',
          description:
            'Caregiver reports consistent practice of assigned activities.',
          status: milestoneStatuses[index % milestoneStatuses.length],
        },
      ],
    });

    await prisma.goal.create({
      data: {
        childId: child.id,
        staffId: child.assignedStaffId,
        title: `Improve ${child.communicationAbility === 'VERBAL' ? 'daily independence' : 'functional communication'}`,
        description:
          'Track progress over the next care-plan cycle with family participation.',
        type: index % 2 === 0 ? 'SHORT_TERM' : 'LONG_TERM',
        achievedAt: index === 0 ? date('2026-05-20') : null,
      },
    });
  }

  await prisma.fundAllocation.createMany({
    data: [
      {
        parentId: hana.id,
        allocatedById: admin1.id,
        amount: new Prisma.Decimal('12500.00'),
        purpose: 'therapy equipment',
        allocationDate: date('2026-05-10'),
        status: 'DISBURSED',
        receiptUrl: 'https://cdn.fikir.org/receipts/fa-0001.pdf',
        parentAcknowledged: true,
        acknowledgedAt: date('2026-05-12'),
        notes:
          'Mobility support equipment purchased and confirmed by caregiver.',
      },
      {
        parentId: rahel.id,
        allocatedById: admin1.id,
        amount: new Prisma.Decimal('8500.00'),
        purpose: 'school fees',
        allocationDate: date('2026-05-18'),
        status: 'ALLOCATED',
        parentAcknowledged: false,
        notes: 'Pending disbursement appointment with finance team.',
      },
    ],
  });

  await prisma.donation.createMany({
    data: [
      {
        donorName: 'Kidus Alemayehu',
        donorContact: '+251944567890',
        donorType: 'INDIVIDUAL',
        amount: new Prisma.Decimal('25000.00'),
        donationDate: date('2026-05-01'),
        purpose: 'General child therapy support',
        isRestricted: false,
        receivedById: admin1.id,
        receiptNumber: 'DON-2026-0001',
        notes: 'Monthly individual donor contribution.',
      },
      {
        donorName: 'Addis Community Foundation',
        donorContact: 'partnerships@addiscommunity.example.org',
        donorType: 'ORGANIZATION',
        amount: new Prisma.Decimal('120000.00'),
        donationDate: date('2026-05-15'),
        purpose: 'Assistive device provision for children',
        isRestricted: true,
        restrictedToServiceId: serviceByName['Assistive Device Provision'].id,
        receivedById: admin1.id,
        receiptNumber: 'DON-2026-0002',
        notes: 'Restricted grant for mobility and communication devices.',
      },
    ],
  });

  const therapyAppointment = await prisma.appointment.create({
    data: {
      title: 'Physiotherapy follow-up for Dawit',
      staffId: caseworker1.id,
      childId: children[0].id,
      parentId: hana.id,
      scheduledAt: date('2026-06-04T09:00:00+03:00'),
      durationMinutes: 60,
      type: 'THERAPY',
      status: 'SCHEDULED',
    },
  });

  const workshopAppointment = await prisma.appointment.create({
    data: {
      title: 'Caregiver awareness workshop',
      staffId: caseworker2.id,
      parentId: mulugeta.id,
      scheduledAt: date('2026-06-06T14:00:00+03:00'),
      durationMinutes: 120,
      type: 'WORKSHOP',
      status: 'COMPLETED',
    },
  });

  const fundAppointment = await prisma.appointment.create({
    data: {
      title: 'School fee disbursement meeting',
      staffId: admin1.id,
      parentId: rahel.id,
      scheduledAt: date('2026-06-07T10:30:00+03:00'),
      durationMinutes: 45,
      type: 'FUND_DISBURSEMENT',
      status: 'SCHEDULED',
    },
  });

  await prisma.attendanceRecord.createMany({
    data: [
      {
        appointmentId: therapyAppointment.id,
        parentId: hana.id,
        childId: children[0].id,
        status: 'PRESENT',
        notes: 'Parent and child arrived on time.',
      },
      {
        appointmentId: workshopAppointment.id,
        parentId: mulugeta.id,
        status: 'PRESENT',
        notes: 'Caregiver completed workshop and received materials.',
      },
      {
        appointmentId: fundAppointment.id,
        parentId: rahel.id,
        status: 'RESCHEDULED',
        notes: 'Parent requested a later appointment due to transport issue.',
      },
    ],
  });

  await prisma.serviceAssignment.createMany({
    data: [
      {
        serviceId: serviceByName['Physiotherapy'].id,
        targetType: 'CHILD',
        childId: children[0].id,
        assignedStaffId: caseworker1.id,
        startDate: date('2026-05-20'),
        frequency: 'WEEKLY',
        deliveryMethod: 'ON_SITE',
        status: 'ACTIVE',
        notes: 'Weekly mobility support sessions.',
      },
      {
        serviceId: serviceByName['Awareness Workshop'].id,
        targetType: 'PARENT',
        parentId: mulugeta.id,
        assignedStaffId: caseworker2.id,
        startDate: date('2026-06-06'),
        endDate: date('2026-06-06'),
        frequency: 'ONE_TIME',
        deliveryMethod: 'ON_SITE',
        status: 'COMPLETED',
        notes: 'Caregiver education session completed.',
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        staffId: caseworker1.id,
        message:
          'Review pending school fee disbursement appointment for Rahel Tesfaye.',
        type: 'FUND_REMINDER',
        entityType: 'Appointment',
        entityId: fundAppointment.id,
      },
      {
        staffId: caseworker2.id,
        message: 'Follow up on Biruk Mulugeta therapy attendance plan.',
        type: 'GENERAL',
        entityType: 'Child',
        entityId: children[2].id,
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      staffId: admin1.id,
      action: 'CREATE',
      entity: 'SeedData',
      entityId: 'initial-seed',
      changes: {
        staff: 4,
        parents: parents.length,
        children: children.length,
        services: services.length,
      },
    },
  });

  const savedQueries = [
    {
      name: 'Active Children — Full Roster',
      description: 'All currently active children with key profile details',
      filters: { child: { status: ['ACTIVE'] } },
      columns: [
        'fullName',
        'age',
        'gender',
        'disabilityType',
        'severityLevel',
        'subcity',
        'assignedCaseWorker',
      ],
      dataSubject: 'CHILD',
      isOrgWide: true,
    },
    {
      name: 'Seed Funding Recipients (Disbursed & Acknowledged)',
      description: 'Parents who received and acknowledged fund disbursements',
      filters: {
        financial: {
          allocationStatus: ['DISBURSED'],
          acknowledgementStatus: 'ACKNOWLEDGED',
        },
      },
      columns: [
        'parentFullName',
        'subcity',
        'financialBracket',
        'fundAmount',
        'fundPurpose',
        'disbursedDate',
      ],
      dataSubject: 'PARENT',
      isOrgWide: true,
    },
    {
      name: 'Workshop Attendance — Current Year',
      description:
        'Parents who attended workshops or training sessions this year',
      filters: {
        training: {
          attendedAfter: '2026-01-01',
          attendanceStatus: ['PRESENT'],
        },
      },
      columns: [
        'parentFullName',
        'phone',
        'subcity',
        'workshopName',
        'attendanceDate',
      ],
      dataSubject: 'PARENT',
      isOrgWide: true,
    },
    {
      name: 'Children With No Progress Note (30 Days)',
      description:
        'Active children whose progress has not been logged in the last 30 days',
      filters: {
        progress: { noNoteInLastDays: 30 },
        child: { status: ['ACTIVE'] },
      },
      columns: [
        'fullName',
        'age',
        'disabilityType',
        'severityLevel',
        'assignedCaseWorker',
        'lastProgressNoteDate',
      ],
      dataSubject: 'CHILD',
      isOrgWide: true,
    },
    {
      name: 'Unserved Active Members',
      description:
        'Active children with no service assignment — potential gap in coverage',
      filters: {
        services: { hasNoService: true },
        child: { status: ['ACTIVE'] },
      },
      columns: [
        'fullName',
        'age',
        'disabilityType',
        'severityLevel',
        'parentName',
        'subcity',
        'registrationDate',
      ],
      dataSubject: 'CHILD',
      isOrgWide: true,
    },
    {
      name: 'Members by Sub-city — Kirkos',
      description: 'All parent-child pairs located in Kirkos sub-city',
      filters: { location: { subcities: ['Kirkos'] } },
      columns: [
        'childFullName',
        'age',
        'disabilityType',
        'parentFullName',
        'parentPhone',
        'financialBracket',
      ],
      dataSubject: 'PARENT_CHILD_PAIR',
      isOrgWide: true,
    },
    {
      name: 'Severe Disability — All Active',
      description:
        'All active children with severe disability level across all types',
      filters: {
        child: { severityLevel: ['SEVERE'], status: ['ACTIVE'] },
      },
      columns: [
        'fullName',
        'age',
        'disabilityType',
        'disabilityCategory',
        'assignedCaseWorker',
      ],
      dataSubject: 'CHILD',
      isOrgWide: true,
    },
  ];

  for (const query of savedQueries) {
    await prisma.savedQuery.create({
      data: {
        ...query,
        createdById: admin1.id,
      },
    });
  }

  console.log('Seed password:', seedPassword);
  console.log('Seed completed for Fikir system.');
  console.log(
    `Staff: ${[admin1, admin2, caseworker1, caseworker2].length}`,
  );
  console.log(`Services: ${services.length}`);
  console.log(`Parents: ${parents.length}`);
  console.log(`Children: ${children.length}`);
  console.log(`Saved queries: ${savedQueries.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
