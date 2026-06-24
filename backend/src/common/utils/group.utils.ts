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
