import type { DataQueryFilters } from '@fikir/types';
import { Prisma } from '@prisma/client';

function subYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() - years);
  return result;
}

function buildChildDemographics(
  child?: DataQueryFilters['child'],
): Prisma.ChildWhereInput | undefined {
  if (!child) return undefined;

  const conditions: Prisma.ChildWhereInput[] = [];
  const now = new Date();

  if (child.ageMin != null) {
    conditions.push({ dateOfBirth: { lte: subYears(now, child.ageMin) } });
  }
  if (child.ageMax != null) {
    conditions.push({ dateOfBirth: { gt: subYears(now, child.ageMax + 1) } });
  }
  if (child.gender) {
    conditions.push({ gender: child.gender });
  }
  if (child.disabilityType?.length) {
    conditions.push({ disabilityType: { in: child.disabilityType as never[] } });
  }
  if (child.disabilityCategory?.length) {
    conditions.push({
      disabilityCategory: { in: child.disabilityCategory, mode: 'insensitive' },
    });
  }
  if (child.severityLevel?.length) {
    conditions.push({ severityLevel: { in: child.severityLevel as never[] } });
  }
  if (child.communicationAbility?.length) {
    conditions.push({
      communicationAbility: { in: child.communicationAbility as never[] },
    });
  }
  if (child.schoolEnrollmentStatus?.length) {
    conditions.push({
      schoolEnrollmentStatus: { in: child.schoolEnrollmentStatus as never[] },
    });
  }
  if (child.status?.length) {
    conditions.push({ status: { in: child.status as never[] } });
  }
  if (child.registeredAfter) {
    conditions.push({ createdAt: { gte: new Date(child.registeredAfter) } });
  }
  if (child.registeredBefore) {
    conditions.push({ createdAt: { lte: new Date(child.registeredBefore) } });
  }

  return conditions.length ? { AND: conditions } : undefined;
}

function buildParentDemographics(
  parent?: DataQueryFilters['parent'],
): Prisma.ParentWhereInput | undefined {
  if (!parent) return undefined;

  const conditions: Prisma.ParentWhereInput[] = [];

  if (parent.gender) {
    conditions.push({ gender: parent.gender });
  }
  if (parent.financialBracket?.length) {
    conditions.push({
      financialBracket: { in: parent.financialBracket as never[] },
    });
  }
  if (parent.maritalStatus?.length) {
    conditions.push({ maritalStatus: { in: parent.maritalStatus as never[] } });
  }
  if (parent.employmentStatus?.length) {
    conditions.push({
      employmentStatus: { in: parent.employmentStatus as never[] },
    });
  }
  if (parent.referralSource?.length) {
    conditions.push({ referralSource: { in: parent.referralSource } });
  }
  if (parent.status?.length) {
    conditions.push({ status: { in: parent.status as never[] } });
  }
  if (parent.numberOfDependentsMin != null) {
    conditions.push({
      numberOfDependents: { gte: parent.numberOfDependentsMin },
    });
  }
  if (parent.numberOfDependentsMax != null) {
    conditions.push({
      numberOfDependents: { lte: parent.numberOfDependentsMax },
    });
  }

  return conditions.length ? { AND: conditions } : undefined;
}

function buildLocation(
  location?: DataQueryFilters['location'],
): Prisma.ParentWhereInput | undefined {
  if (!location) return undefined;

  const conditions: Prisma.ParentWhereInput[] = [];

  if (location.city) {
    conditions.push({ city: { contains: location.city, mode: 'insensitive' } });
  }
  if (location.subcities?.length) {
    conditions.push({ subcity: { in: location.subcities } });
  }
  if (location.woreda) {
    conditions.push({
      woreda: { contains: location.woreda, mode: 'insensitive' },
    });
  }

  return conditions.length ? { AND: conditions } : undefined;
}

function buildServiceAssignmentFilter(
  services?: DataQueryFilters['services'],
  target: 'child' | 'parent' = 'child',
): Prisma.ServiceAssignmentWhereInput | undefined {
  if (!services) return undefined;

  if (services.hasNoService) {
    return undefined;
  }

  const conditions: Prisma.ServiceAssignmentWhereInput[] = [];

  if (services.serviceIds?.length) {
    conditions.push({ serviceId: { in: services.serviceIds } });
  }
  if (services.serviceStatus?.length) {
    conditions.push({ status: { in: services.serviceStatus as never[] } });
  }
  if (services.deliveryMethod?.length) {
    conditions.push({
      deliveryMethod: { in: services.deliveryMethod as never[] },
    });
  }
  if (services.startedAfter) {
    conditions.push({ startDate: { gte: new Date(services.startedAfter) } });
  }
  if (services.startedBefore) {
    conditions.push({ startDate: { lte: new Date(services.startedBefore) } });
  }

  if (!conditions.length) return undefined;

  if (target === 'child') {
    return { AND: conditions };
  }

  return { AND: conditions, parentId: { not: null } };
}

function buildTrainingFilter(
  training?: DataQueryFilters['training'],
): Prisma.AttendanceRecordWhereInput | undefined {
  if (!training || training.hasNeverAttended) return undefined;

  const conditions: Prisma.AttendanceRecordWhereInput[] = [];

  if (training.appointmentIds?.length) {
    conditions.push({ appointmentId: { in: training.appointmentIds } });
  }
  if (training.attendanceStatus?.length) {
    conditions.push({ status: { in: training.attendanceStatus as never[] } });
  }
  if (training.attendedAfter) {
    conditions.push({ createdAt: { gte: new Date(training.attendedAfter) } });
  }
  if (training.attendedBefore) {
    conditions.push({ createdAt: { lte: new Date(training.attendedBefore) } });
  }

  return conditions.length ? { AND: conditions } : undefined;
}

function buildFinancialFilter(
  financial?: DataQueryFilters['financial'],
): Prisma.FundAllocationWhereInput | undefined {
  if (!financial) return undefined;

  const conditions: Prisma.FundAllocationWhereInput[] = [];

  if (financial.hasAllocation === true) {
    conditions.push({});
  } else if (financial.hasAllocation === false) {
    return { id: '__none__' };
  }

  if (financial.allocationStatus?.length) {
    conditions.push({ status: { in: financial.allocationStatus as never[] } });
  }
  if (financial.purposeKeyword) {
    conditions.push({
      purpose: { contains: financial.purposeKeyword, mode: 'insensitive' },
    });
  }
  if (financial.minAmount != null) {
    conditions.push({ amount: { gte: financial.minAmount } });
  }
  if (financial.maxAmount != null) {
    conditions.push({ amount: { lte: financial.maxAmount } });
  }
  if (financial.disbursedAfter) {
    conditions.push({
      allocationDate: { gte: new Date(financial.disbursedAfter) },
    });
  }
  if (financial.disbursedBefore) {
    conditions.push({
      allocationDate: { lte: new Date(financial.disbursedBefore) },
    });
  }
  if (financial.acknowledgementStatus === 'ACKNOWLEDGED') {
    conditions.push({ parentAcknowledged: true });
  } else if (financial.acknowledgementStatus === 'PENDING') {
    conditions.push({ parentAcknowledged: false });
  }

  if (!conditions.length && financial.hasAllocation !== true) {
    return undefined;
  }

  return conditions.length ? { AND: conditions } : {};
}

function buildProgressFilter(
  progress?: DataQueryFilters['progress'],
): Prisma.ChildWhereInput | undefined {
  if (!progress) return undefined;

  const conditions: Prisma.ChildWhereInput[] = [];

  if (progress.specificMilestoneTitle) {
    conditions.push({
      milestones: {
        some: {
          title: {
            contains: progress.specificMilestoneTitle,
            mode: 'insensitive',
          },
        },
      },
    });
  }

  if (progress.goalType?.length) {
    conditions.push({
      goals: { some: { type: { in: progress.goalType as never[] } } },
    });
  }

  if (progress.goalAchieved === true) {
    conditions.push({ goals: { some: { achievedAt: { not: null } } } });
  } else if (progress.goalAchieved === false) {
    conditions.push({ goals: { some: { achievedAt: null } } });
  }

  if (progress.lastNoteAfter) {
    conditions.push({
      progressNotes: {
        some: { createdAt: { gte: new Date(progress.lastNoteAfter) } },
      },
    });
  }
  if (progress.lastNoteBefore) {
    conditions.push({
      progressNotes: {
        some: { createdAt: { lte: new Date(progress.lastNoteBefore) } },
      },
    });
  }

  if (progress.noNoteInLastDays != null) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - progress.noNoteInLastDays);
    conditions.push({
      progressNotes: { none: { createdAt: { gte: cutoff } } },
    });
  }

  if (progress.minMilestonesAchieved != null) {
    conditions.push({
      milestones: {
        some: { status: 'ACHIEVED' },
      },
    });
  }

  return conditions.length ? { AND: conditions } : undefined;
}

function buildCaseWorkerChild(
  caseWorker?: DataQueryFilters['caseWorker'],
): Prisma.ChildWhereInput | undefined {
  if (!caseWorker) return undefined;

  if (caseWorker.unassigned) {
    return { assignedStaff: { isActive: false } };
  }
  if (caseWorker.staffId) {
    return { assignedStaffId: caseWorker.staffId };
  }

  return undefined;
}

function buildCaseWorkerParent(
  caseWorker?: DataQueryFilters['caseWorker'],
): Prisma.ParentWhereInput | undefined {
  if (!caseWorker) return undefined;

  if (caseWorker.unassigned) {
    return { assignedStaff: { isActive: false } };
  }
  if (caseWorker.staffId) {
    return { assignedStaffId: caseWorker.staffId };
  }

  return undefined;
}

export function buildPrismaWhereClause(
  filters: DataQueryFilters,
  dataSubject: string,
): Prisma.ChildWhereInput | Prisma.ParentWhereInput {
  const and: Array<Prisma.ChildWhereInput | Prisma.ParentWhereInput> = [];

  const childDemo = buildChildDemographics(filters.child);
  const parentDemo = buildParentDemographics(filters.parent);
  const location = buildLocation(filters.location);
  const progress = buildProgressFilter(filters.progress);

  if (dataSubject === 'CHILD' || dataSubject === 'PARENT_CHILD_PAIR') {
    const childWhere = and as Prisma.ChildWhereInput[];

    if (childDemo) childWhere.push(childDemo);
    if (progress) childWhere.push(progress);

    if (parentDemo || location) {
      const parentConditions: Prisma.ParentWhereInput[] = [];
      if (parentDemo) parentConditions.push(parentDemo);
      if (location) parentConditions.push(location);
      childWhere.push({ parents: { some: { parent: { AND: parentConditions } } } });
    }

    if (filters.services?.hasNoService) {
      childWhere.push({ serviceAssignments: { none: {} } });
    } else {
      const serviceFilter = buildServiceAssignmentFilter(filters.services, 'child');
      if (serviceFilter) {
        childWhere.push({ serviceAssignments: { some: serviceFilter } });
      }
    }

    if (filters.training?.hasNeverAttended) {
      childWhere.push({ attendanceRecords: { none: {} } });
    } else {
      const trainingFilter = buildTrainingFilter(filters.training);
      if (trainingFilter) {
        childWhere.push({ attendanceRecords: { some: trainingFilter } });
      }
    }

    if (filters.financial) {
      const financialFilter = buildFinancialFilter(filters.financial);
      if (financialFilter) {
        if ('id' in financialFilter && financialFilter.id === '__none__') {
          childWhere.push({ parents: { none: { parent: { fundAllocations: { some: {} } } } } });
        } else {
          childWhere.push({
            parents: { some: { parent: { fundAllocations: { some: financialFilter } } } },
          });
        }
      }
    }

    const caseWorker = buildCaseWorkerChild(filters.caseWorker);
    if (caseWorker) childWhere.push(caseWorker);

    return childWhere.length ? { AND: childWhere } : {};
  }

  const parentWhere = and as Prisma.ParentWhereInput[];

  if (parentDemo) parentWhere.push(parentDemo);
  if (location) parentWhere.push(location);

  if (childDemo || progress) {
    const childConditions: Prisma.ChildWhereInput[] = [];
    if (childDemo) childConditions.push(childDemo);
    if (progress) childConditions.push(progress);
    parentWhere.push({ children: { some: { child: { AND: childConditions } } } });
  } else if (filters.child) {
    const childOnly = buildChildDemographics(filters.child);
    if (childOnly) {
      parentWhere.push({ children: { some: { child: childOnly } } });
    }
  }

  if (filters.services?.hasNoService) {
    parentWhere.push({ serviceAssignments: { none: {} } });
  } else {
    const serviceFilter = buildServiceAssignmentFilter(filters.services, 'parent');
    if (serviceFilter) {
      parentWhere.push({ serviceAssignments: { some: serviceFilter } });
    }
  }

  if (filters.training?.hasNeverAttended) {
    parentWhere.push({ attendanceRecords: { none: {} } });
  } else {
    const trainingFilter = buildTrainingFilter(filters.training);
    if (trainingFilter) {
      parentWhere.push({ attendanceRecords: { some: trainingFilter } });
    }
  }

  if (filters.financial) {
    const financialFilter = buildFinancialFilter(filters.financial);
    if (financialFilter) {
      if ('id' in financialFilter && financialFilter.id === '__none__') {
        parentWhere.push({ fundAllocations: { none: {} } });
      } else {
        parentWhere.push({ fundAllocations: { some: financialFilter } });
      }
    }
  }

  const caseWorker = buildCaseWorkerParent(filters.caseWorker);
  if (caseWorker) parentWhere.push(caseWorker);

  return parentWhere.length ? { AND: parentWhere } : {};
}

export function countActiveFilters(filters: DataQueryFilters): number {
  let count = 0;

  const countSection = (section: Record<string, unknown> | undefined) => {
    if (!section) return;
    for (const value of Object.values(section)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (typeof value === 'boolean' && value === false) continue;
      count += 1;
    }
  };

  countSection(filters.child as Record<string, unknown> | undefined);
  countSection(filters.parent as Record<string, unknown> | undefined);
  countSection(filters.location as Record<string, unknown> | undefined);
  countSection(filters.services as Record<string, unknown> | undefined);
  countSection(filters.training as Record<string, unknown> | undefined);
  countSection(filters.financial as Record<string, unknown> | undefined);
  countSection(filters.progress as Record<string, unknown> | undefined);
  countSection(filters.caseWorker as Record<string, unknown> | undefined);

  return count;
}
