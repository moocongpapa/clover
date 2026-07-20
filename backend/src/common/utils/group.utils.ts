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

export const OFFICER_SUB_ROLES: MemberRole[] = [
  MemberRole.VICE_PRESIDENT,
  MemberRole.SECRETARY,
  MemberRole.OFFICER,
];

export function isOfficerSubRole(role: MemberRole) {
  return OFFICER_SUB_ROLES.includes(role);
}

export function isOfficer(role: MemberRole) {
  return role === MemberRole.PRESIDENT || isOfficerSubRole(role);
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

export function eventEndAt(
  date: Date,
  startTime: string,
  endTime?: string | null,
): Date {
  const time = endTime ?? startTime;
  const [hours, minutes] = time.split(':').map(Number);
  const end = new Date(date);
  end.setHours(hours, minutes, 0, 0);
  return end;
}

export function teamSplitAvailableAt(date: Date, startTime: string): Date {
  const start = eventStartAt(date, startTime);
  return new Date(start.getTime() - 60 * 60 * 1000);
}

export function canSplitTeams(date: Date, startTime: string): boolean {
  return new Date() >= teamSplitAvailableAt(date, startTime);
}

export function isEventVoteLocked(
  event: { date: Date; startTime: string; status: string },
  hasTeamSplit: boolean,
): boolean {
  if (event.status === 'CANCELLED') return true;
  if (hasTeamSplit) return true;
  return eventStartAt(event.date, event.startTime) <= new Date();
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

export function buildActivityRegion(parts: {
  activitySido: string;
  activitySigungu?: string | null;
  activityDistrict?: string | null;
  activityTown?: string | null;
}) {
  return [
    parts.activitySido,
    parts.activitySigungu,
    parts.activityDistrict,
    parts.activityTown,
  ]
    .filter((v) => v && v.trim())
    .join(' ');
}

export function parseKoreanAddress(address: string) {
  const tokens = address.trim().split(/\s+/);
  if (tokens.length === 0) return null;

  const activitySido = tokens[0];
  let activitySigungu = '';
  let activityDistrict = '';
  let activityTown = '';

  if (tokens.length > 1) {
    const second = tokens[1];
    if (tokens.length > 2 && second.endsWith('시') && (tokens[2].endsWith('구') || tokens[2].endsWith('군'))) {
      activitySigungu = `${second} ${tokens[2]}`;
      if (tokens.length > 3) activityDistrict = tokens[3];
      if (tokens.length > 4) activityTown = tokens[4];
    } else {
      activitySigungu = second;
      if (tokens.length > 2) activityDistrict = tokens[2];
      if (tokens.length > 3) activityTown = tokens[3];
    }
  }

  return {
    activitySido,
    activitySigungu: activitySigungu || null,
    activityDistrict: activityDistrict || null,
    activityTown: activityTown || null,
  };
}

export function normalizeOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export const USER_MEMBER_SELECT = {
  id: true,
  displayName: true,
  profileImageUrl: true,
  gender: true,
  birthYear: true,
  isEarlyYear: true,
  phoneNumber: true,
} as const;
