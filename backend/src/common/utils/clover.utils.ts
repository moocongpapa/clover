import { PrismaService } from '../../prisma/prisma.service';

/**
 * Calculates a user's Clover score (0.0 ~ 4.0) based on:
 * 1. Voting engagement & promptness (up to 2.0 pts)
 * 2. Attendance rate in active events (up to 1.0 pt)
 * 3. Regular fee payment diligence (up to 1.0 pt)
 *
 * Minimum: 0.0 (새싹/씨앗)
 * Maximum: 4.0 (네잎클로버)
 */
export async function calculateUserCloverScore(
  prisma: PrismaService,
  userId: string,
): Promise<number> {
  try {
    // 1. Check user memberships
    const memberships = await prisma.groupMember.findMany({
      where: { userId, status: 'APPROVED' },
      select: { groupId: true },
    });

    if (memberships.length === 0) {
      return 0.0;
    }

    const groupIds = memberships.map((m) => m.groupId);

    // 2. Voting engagement & speed (past 15 events across user's groups)
    const recentEvents = await prisma.event.findMany({
      where: {
        groupId: { in: groupIds },
        status: 'ACTIVE',
      },
      orderBy: { date: 'desc' },
      take: 15,
      include: {
        votes: {
          where: { userId },
        },
      },
    });

    let voteScore = 0.0;
    if (recentEvents.length > 0) {
      let votedCount = 0;
      let quickVoteBonusCount = 0;

      for (const ev of recentEvents) {
        const userVote = ev.votes[0];
        if (userVote) {
          votedCount++;
          // Quick vote check: voted within 6 hours of event creation
          const diffHours = (userVote.votedAt.getTime() - ev.createdAt.getTime()) / (1000 * 60 * 60);
          if (diffHours >= 0 && diffHours <= 6) {
            quickVoteBonusCount++;
          }
        }
      }

      // Participation rate (up to 1.2)
      const voteRate = votedCount / recentEvents.length;
      const participationPart = voteRate * 1.2;

      // Speed bonus (up to 0.8)
      const speedRate = votedCount > 0 ? quickVoteBonusCount / votedCount : 0;
      const speedPart = speedRate * 0.8;

      voteScore = participationPart + speedPart;
    }

    // 3. Attendance rate on completed events (up to 1.0)
    const pastEvents = recentEvents.filter((ev) => ev.date < new Date());
    let attendanceScore = 0.0;
    if (pastEvents.length > 0) {
      let attendedCount = 0;
      for (const ev of pastEvents) {
        const userVote = ev.votes[0];
        if (userVote && (userVote.choice === 'ATTEND' || userVote.choice === 'LATE')) {
          attendedCount++;
        }
      }
      attendanceScore = (attendedCount / pastEvents.length) * 1.0;
    }

    // 4. Dues Payment Diligence (up to 1.0)
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Check last 3 months dues payments across user's groups
    const recentPayments = await prisma.feePayment.findMany({
      where: {
        userId,
        groupId: { in: groupIds },
        year: { in: [currentYear, currentYear - 1] },
      },
    });

    // Groups that actually have monthlyFee set
    const feeGroups = await prisma.group.findMany({
      where: {
        id: { in: groupIds },
        monthlyFee: { gt: 0 },
      },
      select: { id: true },
    });

    let duesScore = 0.5; // Default neutral if no fees configured in groups
    if (feeGroups.length > 0) {
      // Check last month payment
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const paidLastMonthCount = recentPayments.filter(
        (p) => p.year === lastMonthYear && p.month === lastMonth,
      ).length;

      const paidRatio = paidLastMonthCount / feeGroups.length;
      duesScore = paidRatio * 1.0;
    }

    const totalRaw = voteScore + attendanceScore + duesScore;
    // Round to 1 decimal place, clamp between 0.0 and 4.0
    const finalScore = Math.min(4.0, Math.max(0.0, Math.round(totalRaw * 10) / 10));

    return finalScore;
  } catch (err) {
    console.error('Error calculating clover score for user:', userId, err);
    return 0.0;
  }
}
