import { MemberRole, MemberStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export async function getApprovedMembership(
  prisma: PrismaService,
  groupId: string,
  userId: string,
) {
  return prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
}

export function isOfficer(role: MemberRole) {
  return role === MemberRole.PRESIDENT || role === MemberRole.OFFICER;
}

export function isApproved(status: MemberStatus) {
  return status === MemberStatus.APPROVED;
}

export function eventStartAt(date: Date, startTime: string): Date {
  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date(date);
  start.setHours(hours, minutes, 0, 0);
  return start;
}

/** YYYY-MM-DD → 로컬 자정 (타임존 불일치 방지) */
export function parseEventDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function localDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
