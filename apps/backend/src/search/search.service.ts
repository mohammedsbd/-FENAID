import { Injectable } from '@nestjs/common';
import { Prisma, StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { GlobalSearchDto } from './dto/global-search.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async global(user: JwtPayload, query: GlobalSearchDto) {
    const search = query.q.trim();
    const limit = Math.min(query.limit ?? 8, 20);

    if (search.length < 2) {
      return {
        query: search,
        parents: [],
        children: [],
        total: 0,
      };
    }

    const staffFilter = user.role !== StaffRole.SUPER_ADMIN
      ? { assignedStaffId: user.staffId }
      : {};

    const parentWhere: Prisma.ParentWhereInput = {
      ...staffFilter,
      OR: [
        { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { idTag: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    };

    const childWhere: Prisma.ChildWhereInput = {
      ...staffFilter,
      OR: [
        { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { idTag: { contains: search, mode: Prisma.QueryMode.insensitive } },
        {
          disabilityCategory: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          parent: {
            fullName: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
      ],
    };

    const [parents, children] = await this.prisma.$transaction([
      this.prisma.parent.findMany({
        where: parentWhere,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          idTag: true,
          fullName: true,
          phone: true,
          status: true,
          assignedStaff: {
            select: { fullName: true },
          },
          _count: {
            select: { children: true },
          },
        },
      }),
      this.prisma.child.findMany({
        where: childWhere,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          idTag: true,
          fullName: true,
          disabilityType: true,
          severityLevel: true,
          status: true,
          parent: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          assignedStaff: {
            select: { fullName: true },
          },
        },
      }),
    ]);

    return {
      query: search,
      parents: parents.map((parent) => ({
        type: 'PARENT' as const,
        id: parent.id,
        idTag: parent.idTag,
        title: parent.fullName,
        subtitle: `${parent.phone} · ${parent._count.children} child${parent._count.children === 1 ? '' : 'ren'}`,
        status: parent.status,
        meta: parent.idTag || '',
        assignedStaffName: parent.assignedStaff.fullName,
        href: `/dashboard/parents/${parent.id}`,
      })),
      children: children.map((child) => ({
        type: 'CHILD' as const,
        id: child.id,
        idTag: child.idTag,
        title: child.fullName,
        subtitle: `${child.parent?.fullName || 'Unknown'} · ${child.disabilityType}`,
        status: child.status,
        meta: child.severityLevel,
        assignedStaffName: child.assignedStaff.fullName,
        href: `/dashboard/children/${child.id}`,
        parent: child.parent ? {
          id: child.parent.id,
          fullName: child.parent.fullName,
          phone: child.parent.phone,
        } : null,
      })),
      total: parents.length + children.length,
    };
  }
}
