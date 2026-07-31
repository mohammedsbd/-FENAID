import type { DataQueryFilters, DataQueryResponse, QuerySummary } from '@fikir/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttendanceStatus,
  ChildStatus,
  FundAllocationStatus,
  MilestoneStatus,
  ParentStatus,
  Prisma,
  StaffRole,
} from '@prisma/client';
import { I18nService } from '../i18n/i18n.service';
import { PrismaService } from '../prisma/prisma.service';
import { RunQueryDto } from './dto/run-query.dto';
import { SaveQueryDto, UpdateSavedQueryDto } from './dto/save-query.dto';
import { buildPrismaWhereClause } from './helpers/query-builder.helper';

const MAX_EXPORT = 5000;

const childInclude = {
  parents: {
    include: {
      parent: {
        include: {
          fundAllocations: { orderBy: { allocationDate: 'desc' as const } },
        },
      },
    },
  },
  assignedStaff: { select: { id: true, fullName: true } },
  serviceAssignments: {
    include: { service: true },
    orderBy: { startDate: 'desc' as const },
  },
  milestones: true,
  progressNotes: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  attendanceRecords: {
    include: { appointment: true },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.ChildInclude;

const parentInclude = {
  assignedStaff: { select: { id: true, fullName: true } },
  children: {
    include: {
      child: {
        include: { milestones: true },
      },
    },
  },
  serviceAssignments: {
    include: { service: true },
    orderBy: { startDate: 'desc' as const },
  },
  fundAllocations: { orderBy: { allocationDate: 'desc' as const } },
  attendanceRecords: {
    include: { appointment: true },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.ParentInclude;

type ChildRow = Prisma.ChildGetPayload<{ include: typeof childInclude }>;
type ParentRow = Prisma.ParentGetPayload<{ include: typeof parentInclude }>;
type QueryRow = ChildRow | ParentRow;

@Injectable()
export class DataQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async runQuery(
    staffId: string,
    dto: RunQueryDto,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<DataQueryResponse> {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 25, 200);
    const { rows, total } = await this.fetchRows(dto, page, pageSize);

    let filteredRows: QueryRow[] = rows;
    if (dto.filters.services?.minSessionsCompleted != null) {
      filteredRows = this.filterByMinSessions(
        filteredRows,
        dto.filters.services.minSessionsCompleted,
      );
    }
    if (dto.filters.training?.minWorkshopsAttended != null) {
      filteredRows = this.filterByMinWorkshops(
        filteredRows,
        dto.filters.training.minWorkshopsAttended,
      );
    }
    if (dto.filters.progress?.minMilestonesAchieved != null) {
      filteredRows = this.filterByMinMilestones(
        filteredRows,
        dto.dataSubject,
        dto.filters.progress.minMilestonesAchieved,
      );
    }

    const results = this.buildResults(
      filteredRows,
      dto.columns,
      dto.dataSubject,
      dto.anonymize ?? false,
    );
    const summary = this.buildSummary(filteredRows, dto.dataSubject);

    await this.prisma.auditLog.create({
      data: {
        staffId,
        action: 'DATA_QUERY_RUN',
        entity: 'DataQuery',
        entityId: 'run',
        changes: {
          dataSubject: dto.dataSubject,
          filterCount: Object.keys(dto.filters ?? {}).length,
          resultCount: total,
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return {
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize) || 1,
      summary,
      results,
    };
  }

  async exportQuery(
    staffId: string,
    role: StaffRole,
    dto: RunQueryDto,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { canExportIdentified: true, fullName: true },
    });

    const anonymize =
      dto.anonymize === true ||
      dto.format?.startsWith('anonymized_') === true;

    let columns = [...dto.columns];

    const { rows, total } = await this.fetchRows(
      { ...dto, page: 1, pageSize: MAX_EXPORT + 1 },
      1,
      MAX_EXPORT + 1,
      false,
    );

    if (total > MAX_EXPORT) {
      throw new BadRequestException(
        this.i18n.t('error.dataQuery.exportLimit', { limit: MAX_EXPORT }),
      );
    }

    let filteredRows: QueryRow[] = rows;
    if (dto.filters.services?.minSessionsCompleted != null) {
      filteredRows = this.filterByMinSessions(
        filteredRows,
        dto.filters.services.minSessionsCompleted,
      );
    }
    if (dto.filters.training?.minWorkshopsAttended != null) {
      filteredRows = this.filterByMinWorkshops(
        filteredRows,
        dto.filters.training.minWorkshopsAttended,
      );
    }
    if (dto.filters.progress?.minMilestonesAchieved != null) {
      filteredRows = this.filterByMinMilestones(
        filteredRows,
        dto.dataSubject,
        dto.filters.progress.minMilestonesAchieved,
      );
    }

    const results = this.buildResults(
      filteredRows,
      columns,
      dto.dataSubject,
      anonymize,
    );
    const summary = this.buildSummary(filteredRows, dto.dataSubject);
    const exportFormat = dto.format ?? (anonymize ? 'anonymized_excel' : 'excel');

    await this.prisma.dataExportLog.create({
      data: {
        staffId,
        queryFilters: dto.filters as Prisma.InputJsonValue,
        queryColumns: columns,
        dataSubject: dto.dataSubject,
        recordCount: results.length,
        exportFormat,
        anonymized: anonymize,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        staffId,
        action: 'DATA_EXPORT',
        entity: 'DataQuery',
        entityId: 'export',
        changes: {
          dataSubject: dto.dataSubject,
          recordCount: results.length,
          format: exportFormat,
          anonymized: anonymize,
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return {
      results,
      summary,
      total: results.length,
      dataSubject: dto.dataSubject,
      filters: dto.filters,
      columns,
      anonymized: anonymize,
      generatedBy: staff?.fullName ?? 'Unknown',
      generatedAt: new Date().toISOString(),
    };
  }

  async getStatistics() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear(), 0, 1);

    const [
      childrenByDisabilityType,
      childrenBySeverity,
      activeChildren,
      activeParents,
      allChildren,
      allParents,
      servicesThisYear,
      servicesLastYear,
      fundsDisbursedThisYear,
      milestoneStats,
      attendanceStats,
      childrenBySubcity,
      registrationsRaw,
    ] = await Promise.all([
      this.prisma.child.groupBy({
        by: ['disabilityType'],
        where: { status: ChildStatus.ACTIVE },
        _count: true,
      }),
      this.prisma.child.groupBy({
        by: ['severityLevel'],
        where: { status: ChildStatus.ACTIVE },
        _count: true,
      }),
      this.prisma.child.count({ where: { status: ChildStatus.ACTIVE } }),
      this.prisma.parent.count({ where: { status: ParentStatus.ACTIVE } }),
      this.prisma.child.findMany({
        where: { status: ChildStatus.ACTIVE },
        select: { dateOfBirth: true, gender: true },
      }),
      this.prisma.parent.findMany({
        where: { status: ParentStatus.ACTIVE },
        select: { gender: true },
      }),
      this.prisma.serviceAssignment.count({
        where: { startDate: { gte: yearStart } },
      }),
      this.prisma.serviceAssignment.count({
        where: {
          startDate: { gte: lastYearStart, lt: lastYearEnd },
        },
      }),
      this.prisma.fundAllocation.aggregate({
        where: {
          status: FundAllocationStatus.DISBURSED,
          allocationDate: { gte: yearStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.milestone.groupBy({
        by: ['status'],
        where: { child: { status: ChildStatus.ACTIVE } },
        _count: true,
      }),
      this.prisma.attendanceRecord.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.parent.groupBy({
        by: ['subcity'],
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<Array<{ month: string; children: bigint; parents: bigint }>>`
        SELECT month, COALESCE(SUM(children), 0)::bigint AS children, COALESCE(SUM(parents), 0)::bigint AS parents
        FROM (
          SELECT TO_CHAR("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS children, 0::bigint AS parents
          FROM "Child"
          WHERE "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY 1
          UNION ALL
          SELECT TO_CHAR("createdAt", 'YYYY-MM') AS month, 0::bigint AS children, COUNT(*)::bigint AS parents
          FROM "Parent"
          WHERE "createdAt" >= NOW() - INTERVAL '12 months'
          GROUP BY 1
        ) combined
        GROUP BY month
        ORDER BY month ASC
      `,
    ]);

    const ageGroups = this.groupByAge(allChildren);
    const genderChildren = this.countGender(allChildren.map((c) => c.gender));
    const genderParents = this.countGender(allParents.map((p) => p.gender));

    const presentCount =
      attendanceStats.find((a) => a.status === AttendanceStatus.PRESENT)?._count ?? 0;
    const totalAttendance = attendanceStats.reduce((sum, a) => sum + a._count, 0);
    const workshopAttendanceRate =
      totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    const achieved =
      milestoneStats.find((m) => m.status === MilestoneStatus.ACHIEVED)?._count ?? 0;
    const totalMilestones = milestoneStats.reduce((sum, m) => sum + m._count, 0);
    const milestoneAchievementRate =
      totalMilestones > 0 ? Math.round((achieved / totalMilestones) * 100) : 0;

    const childParentRels = await this.prisma.childParent.findMany({
      select: { childId: true, parentId: true },
    });
    const childFirstParent = new Map<string, string>();
    for (const cp of childParentRels) {
      if (!childFirstParent.has(cp.childId)) {
        childFirstParent.set(cp.childId, cp.parentId);
      }
    }
    const parentCounts = new Map<string, number>();
    for (const parentId of childFirstParent.values()) {
      parentCounts.set(parentId, (parentCounts.get(parentId) ?? 0) + 1);
    }
    const parentSubcities = await this.prisma.parent.findMany({
      select: { id: true, subcity: true },
    });
    const parentSubcityMap = new Map<string, string | null>(
      parentSubcities.map((p) => [p.id, p.subcity]),
    );
    const childCountBySubcity = new Map<string, number>();
    for (const [parentId, count] of parentCounts) {
      const subcity = parentSubcityMap.get(parentId) ?? 'Unknown';
      childCountBySubcity.set(
        subcity,
        (childCountBySubcity.get(subcity) ?? 0) + count,
      );
    }

    const membersBySubcity = childrenBySubcity.map((s) => ({
      subcity: s.subcity,
      parentCount: s._count._all,
      childCount: childCountBySubcity.get(s.subcity) ?? 0,
    }));

    return {
      totalActiveChildren: activeChildren,
      totalActiveParents: activeParents,
      childrenByDisabilityType: childrenByDisabilityType.map((r) => ({
        type: r.disabilityType,
        count: r._count,
      })),
      childrenBySeverity: childrenBySeverity.map((r) => ({
        level: r.severityLevel,
        count: r._count,
      })),
      childrenByAgeGroup: ageGroups,
      membersBySubcity,
      servicesDeliveredThisYear: servicesThisYear,
      servicesDeliveredLastYear: servicesLastYear,
      fundsDisbursedThisYear: fundsDisbursedThisYear._sum.amount ?? 0,
      workshopAttendanceRate,
      milestoneAchievementRate,
      genderBreakdownChildren: genderChildren,
      genderBreakdownParents: genderParents,
      newRegistrationsPerMonth: registrationsRaw.map((r) => ({
        month: r.month,
        children: Number(r.children),
        parents: Number(r.parents),
      })),
    };
  }

  async exportStatistics(
    staffId: string,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const statistics = await this.getStatistics();

    await this.prisma.dataExportLog.create({
      data: {
        staffId,
        queryFilters: {},
        queryColumns: [],
        dataSubject: 'STATISTICS',
        recordCount: 0,
        exportFormat: 'statistics_pdf',
        anonymized: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        staffId,
        action: 'DATA_EXPORT',
        entity: 'DataQuery',
        entityId: 'statistics',
        changes: { format: 'statistics_pdf' },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return statistics;
  }

  async getExportPermissions(staffId: string, role: StaffRole) {
    if (role === StaffRole.SUPER_ADMIN) {
      return { role, canExportIdentified: true };
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { canExportIdentified: true },
    });

    return {
      role,
      canExportIdentified: staff?.canExportIdentified ?? false,
    };
  }

  async listStaff() {
    return this.prisma.staff.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async listEducationLevels() {
    const groups = await this.prisma.parent.groupBy({
      by: ['educationLevel'],
      where: { deletedAt: null },
      _count: { educationLevel: true },
      orderBy: { educationLevel: 'asc' },
    });

    return groups.map((group) => ({
      value: group.educationLevel,
      count: group._count.educationLevel,
    }));
  }

  async saveQuery(staffId: string, dto: SaveQueryDto) {
    return this.prisma.savedQuery.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdById: staffId,
        filters: dto.filters as Prisma.InputJsonValue,
        columns: dto.columns,
        dataSubject: dto.dataSubject,
        sortBy: dto.sortBy,
        sortDir: dto.sortDir,
        isOrgWide: dto.isOrgWide ?? false,
      },
    });
  }

  async listSavedQueries(staffId: string) {
    const [mine, orgWide] = await Promise.all([
      this.prisma.savedQuery.findMany({
        where: { createdById: staffId, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.savedQuery.findMany({
        where: { isOrgWide: true, deletedAt: null },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { mine, orgWide };
  }

  async getSavedQuery(id: string) {
    const query = await this.prisma.savedQuery.findFirst({ where: { id, deletedAt: null } });
    if (!query) {
      throw new NotFoundException('error.dataQuery.savedQueryNotFound');
    }
    return query;
  }

  async updateSavedQuery(
    staffId: string,
    role: StaffRole,
    id: string,
    dto: UpdateSavedQueryDto,
  ) {
    const existing = await this.getSavedQuery(id);
    if (existing.createdById !== staffId && role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('error.dataQuery.onlyCreatorCanUpdate');
    }

    return this.prisma.savedQuery.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.filters !== undefined
          ? { filters: dto.filters as Prisma.InputJsonValue }
          : {}),
        ...(dto.columns !== undefined ? { columns: dto.columns } : {}),
        ...(dto.dataSubject !== undefined ? { dataSubject: dto.dataSubject } : {}),
        ...(dto.sortBy !== undefined ? { sortBy: dto.sortBy } : {}),
        ...(dto.sortDir !== undefined ? { sortDir: dto.sortDir } : {}),
        ...(dto.isOrgWide !== undefined ? { isOrgWide: dto.isOrgWide } : {}),
      },
    });
  }

  async deleteSavedQuery(staffId: string, role: StaffRole, id: string) {
    const existing = await this.getSavedQuery(id);
    if (existing.createdById !== staffId && role !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('error.dataQuery.onlyCreatorCanDelete');
    }

    await this.prisma.savedQuery.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async runSavedQuery(
    staffId: string,
    id: string,
    pagination?: { page?: number; pageSize?: number },
    meta: { ipAddress?: string; userAgent?: string } = {},
  ) {
    const saved = await this.getSavedQuery(id);

    const dto: RunQueryDto = {
      dataSubject: saved.dataSubject as RunQueryDto['dataSubject'],
      filters: saved.filters as DataQueryFilters,
      columns: saved.columns as string[],
      sortBy: saved.sortBy ?? undefined,
      sortDir: (saved.sortDir as 'asc' | 'desc') ?? undefined,
      page: pagination?.page,
      pageSize: pagination?.pageSize,
    };

    const result = await this.runQuery(staffId, dto, meta);

    await this.prisma.savedQuery.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        lastRunCount: result.total,
      },
    });

    return result;
  }

  private async fetchRows(
    dto: RunQueryDto,
    page: number,
    pageSize: number,
    paginate = true,
  ): Promise<{ rows: QueryRow[]; total: number }> {
    const where = buildPrismaWhereClause(dto.filters ?? {}, dto.dataSubject);
    const orderBy = this.buildOrderBy(dto.sortBy, dto.sortDir, dto.dataSubject);

    if (dto.dataSubject === 'PARENT') {
      const total = await this.prisma.parent.count({ where: where as Prisma.ParentWhereInput });
      const rows = await this.prisma.parent.findMany({
        where: where as Prisma.ParentWhereInput,
        include: parentInclude,
        orderBy,
        ...(paginate ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
      });
      return { rows, total };
    }

    const total = await this.prisma.child.count({ where: where as Prisma.ChildWhereInput });
    const rows = await this.prisma.child.findMany({
      where: where as Prisma.ChildWhereInput,
      include: childInclude,
      orderBy,
      ...(paginate ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    });
    return { rows, total };
  }

  private buildOrderBy(
    sortBy?: string,
    sortDir?: 'asc' | 'desc',
    dataSubject?: string,
  ): Prisma.ChildOrderByWithRelationInput | Prisma.ParentOrderByWithRelationInput {
    const direction = sortDir ?? 'asc';
    const fieldMap: Record<string, string> = {
      fullName: 'fullName',
      registrationDate: 'createdAt',
      status: 'status',
      gender: 'gender',
      severityLevel: 'severityLevel',
      disabilityType: 'disabilityType',
    };

    const field = sortBy ? fieldMap[sortBy] ?? 'fullName' : 'fullName';

    if (dataSubject === 'PARENT') {
      return { [field]: direction };
    }

    return { [field]: direction };
  }

  private calcAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
    ) {
      age -= 1;
    }
    return age;
  }

  buildResults(
    rows: QueryRow[],
    columns: string[],
    dataSubject: string,
    anonymize: boolean,
  ): Record<string, unknown>[] {
    let childCounter = 0;
    let parentCounter = 0;

    return rows.map((row) => {
      const result: Record<string, unknown> = {};
      const isChildRow = 'disabilityType' in row;
      const child = isChildRow ? (row as ChildRow) : null;
      const parent = isChildRow
        ? (row as ChildRow).parents[0]?.parent ?? null
        : (row as ParentRow);

      for (const col of columns) {
        switch (col) {
          case 'fullName':
          case 'childFullName':
            if (child) {
              result[col] = anonymize
                ? `Child #${String(++childCounter).padStart(4, '0')}`
                : child.fullName;
            }
            break;
          case 'parentFullName':
          case 'parentName':
            result[col] = anonymize
              ? `Parent #${String(++parentCounter).padStart(4, '0')}`
              : parent?.fullName;
            break;
          case 'age':
            if (child) result[col] = this.calcAge(child.dateOfBirth);
            else if ((row as ParentRow).children?.[0]?.child) {
              result[col] = this.calcAge((row as ParentRow).children[0].child.dateOfBirth);
            }
            break;
          case 'gender':
            result[col] = child?.gender ?? parent?.gender;
            break;
          case 'disabilityType':
            result[col] = child?.disabilityType;
            break;
          case 'disabilityCategory':
            result[col] = child?.disabilityCategory;
            break;
          case 'severityLevel':
          case 'severity':
            result[col] = child?.severityLevel;
            break;
          case 'communicationAbility':
            result[col] = child?.communicationAbility;
            break;
          case 'schoolEnrollmentStatus':
          case 'schoolStatus':
            result[col] = child?.schoolEnrollmentStatus;
            break;
          case 'status':
            result[col] = child?.status ?? parent?.status;
            break;
          case 'registrationDate':
            result[col] = (child?.createdAt ?? parent?.createdAt)?.toISOString();
            break;
          case 'assignedCaseWorker':
            result[col] =
              child?.assignedStaff?.fullName ??
              (row as ParentRow).assignedStaff?.fullName;
            break;
          case 'phone':
          case 'parentPhone':
            if (!anonymize) result[col] = parent?.phone;
            break;
          case 'subcity':
            result[col] = parent?.subcity;
            break;
          case 'woreda':
            result[col] = parent?.woreda;
            break;
          case 'financialBracket':
            result[col] = parent?.financialBracket;
            break;
          case 'educationLevel':
            result[col] = parent?.educationLevel;
            break;
          case 'employmentStatus':
            result[col] = parent?.employmentStatus;
            break;
          case 'maritalStatus':
            result[col] = parent?.maritalStatus;
            break;
          case 'referralSource':
            result[col] = parent?.referralSource;
            break;
          case 'serviceName':
            result[col] =
              child?.serviceAssignments[0]?.service.name ??
              (row as ParentRow).serviceAssignments[0]?.service.name;
            break;
          case 'serviceStatus':
            result[col] =
              child?.serviceAssignments[0]?.status ??
              (row as ParentRow).serviceAssignments[0]?.status;
            break;
          case 'startDate':
            result[col] =
              child?.serviceAssignments[0]?.startDate?.toISOString() ??
              (row as ParentRow).serviceAssignments[0]?.startDate?.toISOString();
            break;
          case 'endDate':
            result[col] =
              child?.serviceAssignments[0]?.endDate?.toISOString() ??
              (row as ParentRow).serviceAssignments[0]?.endDate?.toISOString();
            break;
          case 'totalAllocated':
          case 'fundAmount': {
            const allocations = parent?.fundAllocations ?? [];
            const total = allocations.reduce(
              (sum, a) => sum + Number(a.amount),
              0,
            );
            result[col] = total;
            break;
          }
          case 'totalDisbursed': {
            const disbursed = (parent?.fundAllocations ?? [])
              .filter((a) => a.status === FundAllocationStatus.DISBURSED)
              .reduce((sum, a) => sum + Number(a.amount), 0);
            result[col] = disbursed;
            break;
          }
          case 'fundPurpose':
            result[col] = parent?.fundAllocations[0]?.purpose;
            break;
          case 'disbursedDate':
            result[col] =
              parent?.fundAllocations[0]?.allocationDate?.toISOString();
            break;
          case 'milestonesAchievedCount':
          case 'milestonesAchieved': {
            const count =
              child?.milestones.filter((m) => m.status === MilestoneStatus.ACHIEVED)
                .length ?? 0;
            result[col] = count;
            break;
          }
          case 'lastProgressNoteDate':
          case 'lastNoteDate':
            result[col] = child?.progressNotes[0]?.createdAt?.toISOString();
            break;
          case 'workshopName':
            result[col] =
              child?.attendanceRecords[0]?.appointment?.title ??
              (row as ParentRow).attendanceRecords[0]?.appointment?.title;
            break;
          case 'attendanceDate':
            result[col] =
              child?.attendanceRecords[0]?.createdAt?.toISOString() ??
              (row as ParentRow).attendanceRecords[0]?.createdAt?.toISOString();
            break;
          case 'activeServices': {
            const active = (child?.serviceAssignments ?? []).filter(
              (s) => s.status === 'ACTIVE',
            );
            result[col] = active.map((s) => s.service.name).join(', ');
            break;
          }
          case 'internalNotes':
            if (!anonymize) {
              result[col] = child?.internalNotes ?? parent?.internalNotes;
            }
            break;
          case 'id':
            result[col] = child?.id ?? parent?.id;
            break;
          case 'entityType':
            result[col] = dataSubject === 'PARENT' ? 'parent' : 'child';
            break;
          case 'photoUrl':
            result[col] = child?.photoUrl ?? parent?.photoUrl;
            break;
          default:
            result[col] = null;
        }
      }

      if (!anonymize) {
        result._childId = child?.id;
        result._parentId = parent?.id;
      }

      return result;
    });
  }

  buildSummary(
    rows: QueryRow[],
    dataSubject: string,
  ): QuerySummary {
    const summary: QuerySummary = { total: rows.length };

    const genders = { male: 0, female: 0 };
    const disabilityMap = new Map<string, number>();
    const subcityMap = new Map<string, number>();
    const severityMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    const bracketMap = new Map<string, number>();

    for (const row of rows) {
      const isChild = 'disabilityType' in row;
      const child = isChild ? (row as ChildRow) : null;
      const parent = isChild ? (row as ChildRow).parents[0]?.parent ?? null : (row as ParentRow);

      const gender = (child?.gender ?? parent?.gender ?? '').toLowerCase();
      if (gender === 'male') genders.male += 1;
      else if (gender === 'female') genders.female += 1;

      if (child?.disabilityType) {
        disabilityMap.set(
          child.disabilityType,
          (disabilityMap.get(child.disabilityType) ?? 0) + 1,
        );
      }
      if (child?.severityLevel) {
        severityMap.set(
          child.severityLevel,
          (severityMap.get(child.severityLevel) ?? 0) + 1,
        );
      }

      const status = child?.status ?? parent?.status;
      if (status) {
        statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
      }

      if (parent?.subcity) {
        subcityMap.set(
          parent.subcity,
          (subcityMap.get(parent.subcity) ?? 0) + 1,
        );
      }

      if (parent?.financialBracket) {
        bracketMap.set(
          parent.financialBracket,
          (bracketMap.get(parent.financialBracket) ?? 0) + 1,
        );
      }
    }

    summary.byGender = genders;

    if (dataSubject !== 'PARENT') {
      summary.byDisabilityType = [...disabilityMap.entries()].map(
        ([type, count]) => ({ type, count }),
      );
      summary.bySeverity = [...severityMap.entries()].map(([level, count]) => ({
        level,
        count,
      }));
    }

    summary.bySubcity = [...subcityMap.entries()].map(([subcity, count]) => ({
      subcity,
      count,
    }));
    summary.byStatus = [...statusMap.entries()].map(([status, count]) => ({
      status,
      count,
    }));

    if (dataSubject !== 'CHILD') {
      summary.byFinancialBracket = [...bracketMap.entries()].map(
        ([bracket, count]) => ({ bracket, count }),
      );
    }

    return summary;
  }

  private groupByAge(
    children: Array<{ dateOfBirth: Date }>,
  ): Array<{ group: string; count: number }> {
    const groups = [
      { group: '0-5', min: 0, max: 5 },
      { group: '6-10', min: 6, max: 10 },
      { group: '11-15', min: 11, max: 15 },
      { group: '16-18', min: 16, max: 18 },
      { group: '18+', min: 19, max: 200 },
    ];

    const counts = new Map(groups.map((g) => [g.group, 0]));

    for (const child of children) {
      const age = this.calcAge(child.dateOfBirth);
      const bucket = groups.find((g) => age >= g.min && age <= g.max);
      if (bucket) {
        counts.set(bucket.group, (counts.get(bucket.group) ?? 0) + 1);
      }
    }

    return groups.map((g) => ({ group: g.group, count: counts.get(g.group) ?? 0 }));
  }

  private countGender(genders: string[]) {
    return genders.reduce(
      (acc, g) => {
        const key = g.toLowerCase();
        if (key === 'male') acc.male += 1;
        else if (key === 'female') acc.female += 1;
        return acc;
      },
      { male: 0, female: 0 },
    );
  }

  private filterByMinSessions(rows: QueryRow[], min: number) {
    return rows.filter((row) => {
      const records =
        'disabilityType' in row
          ? (row as ChildRow).attendanceRecords
          : (row as ParentRow).attendanceRecords;
      const present = records.filter((r) => r.status === AttendanceStatus.PRESENT)
        .length;
      return present >= min;
    });
  }

  private filterByMinWorkshops(rows: QueryRow[], min: number) {
    return rows.filter((row) => {
      const records =
        'disabilityType' in row
          ? (row as ChildRow).attendanceRecords
          : (row as ParentRow).attendanceRecords;
      const workshops = records.filter(
        (r) =>
          r.status === AttendanceStatus.PRESENT &&
          r.appointment?.type === 'WORKSHOP',
      ).length;
      return workshops >= min;
    });
  }

  private filterByMinMilestones(
    rows: QueryRow[],
    dataSubject: string,
    min: number,
  ) {
    if (dataSubject === 'PARENT') {
      return rows.filter((row) => {
        const children = (row as ParentRow).children?.map((cp) => cp.child) ?? [];
        return children.some((child) => {
          const achieved =
            child.milestones?.filter((m) => m.status === MilestoneStatus.ACHIEVED)
              .length ?? 0;
          return achieved >= min;
        });
      });
    }

    return rows.filter((row) => {
      const milestones = (row as ChildRow).milestones.filter(
        (m) => m.status === MilestoneStatus.ACHIEVED,
      );
      return milestones.length >= min;
    });
  }
}
