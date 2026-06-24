import {
  EventStatus,
  MemberRole,
  MemberStatus,
  NotificationType,
  PrismaClient,
  VoteChoice,
} from '@prisma/client';

const prisma = new PrismaClient();

function devKakaoId(name: string) {
  return `dev-${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
}

function localDate(daysFromToday: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function pastStartTime(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - 45);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function futureStartTime(hoursAhead = 3): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursAhead);
  return `${String(d.getHours()).padStart(2, '0')}:00`;
}

async function main() {
  console.log('🌱 샘플 데이터 시드 시작…');

  await prisma.notificationLog.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.event.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all(
    [
      '김완석',
      '박민수',
      '이지은',
      '최준호',
      '정하늘',
      '강서연',
      '조현우',
      '윤채원',
    ].map((displayName) =>
      prisma.user.create({
        data: {
          kakaoId: devKakaoId(displayName),
          displayName,
        },
      }),
    ),
  );

  const [wanseok, minsu, jieun, junho, haneul, seoyeon, hyunwoo, chaewon] =
    users;

  // ── 모임 1: 김완석 회장 · 독서모임 ──
  const bookClub = await prisma.group.create({
    data: {
      name: '강남 독서모임',
      description: '매주 한 권씩 읽고 토론하는 모임이에요.',
      category: '독서',
      isPublic: true,
      inviteCode: 'book-club1',
      members: {
        create: [
          { userId: wanseok.id, role: MemberRole.PRESIDENT, status: MemberStatus.APPROVED },
          { userId: jieun.id, role: MemberRole.OFFICER, status: MemberStatus.APPROVED },
          { userId: junho.id, role: MemberRole.MEMBER, status: MemberStatus.APPROVED },
          { userId: haneul.id, role: MemberRole.MEMBER, status: MemberStatus.APPROVED },
          { userId: hyunwoo.id, role: MemberRole.MEMBER, status: MemberStatus.PENDING },
          { userId: chaewon.id, role: MemberRole.MEMBER, status: MemberStatus.PENDING },
        ],
      },
    },
  });

  // ── 모임 2: 러닝크루 (김완석 일반 회원) ──
  const runningClub = await prisma.group.create({
    data: {
      name: '주말 러닝크루',
      description: '한강 러닝 + 커피 한 잔!',
      category: '운동',
      isPublic: true,
      inviteCode: 'run-weeknd',
      members: {
        create: [
          { userId: minsu.id, role: MemberRole.PRESIDENT, status: MemberStatus.APPROVED },
          { userId: wanseok.id, role: MemberRole.MEMBER, status: MemberStatus.APPROVED },
          { userId: seoyeon.id, role: MemberRole.MEMBER, status: MemberStatus.APPROVED },
          { userId: junho.id, role: MemberRole.MEMBER, status: MemberStatus.APPROVED },
        ],
      },
    },
  });

  // ── 모임 3: React 스터디 (김완석 운영진) ──
  const reactStudy = await prisma.group.create({
    data: {
      name: 'React 스터디',
      description: '주 1회 온라인 스터디 · 사이드 프로젝트 병행',
      category: '개발',
      isPublic: true,
      inviteCode: 'react-study',
      members: {
        create: [
          { userId: jieun.id, role: MemberRole.PRESIDENT, status: MemberStatus.APPROVED },
          { userId: wanseok.id, role: MemberRole.OFFICER, status: MemberStatus.APPROVED },
          { userId: haneul.id, role: MemberRole.MEMBER, status: MemberStatus.APPROVED },
          { userId: hyunwoo.id, role: MemberRole.MEMBER, status: MemberStatus.APPROVED },
        ],
      },
    },
  });

  // ── 모임 4: 보드게임 (김완석 가입 대기) ──
  const boardGame = await prisma.group.create({
    data: {
      name: '보드게임 동호회',
      description: '매달 보드게임 번개를 열어요.',
      category: '기타',
      isPublic: true,
      inviteCode: 'board-game',
      members: {
        create: [
          { userId: minsu.id, role: MemberRole.PRESIDENT, status: MemberStatus.APPROVED },
          { userId: seoyeon.id, role: MemberRole.MEMBER, status: MemberStatus.APPROVED },
          { userId: wanseok.id, role: MemberRole.MEMBER, status: MemberStatus.PENDING },
        ],
      },
    },
  });

  // ── 모임 5·6: 모임 찾기용 (미가입 / 거절) ──
  const yogaGroup = await prisma.group.create({
    data: {
      name: '요가 & 명상',
      description: '아침 요가로 하루를 시작해요.',
      category: '운동',
      isPublic: true,
      inviteCode: 'yoga-morn',
      members: {
        create: [
          { userId: chaewon.id, role: MemberRole.PRESIDENT, status: MemberStatus.APPROVED },
        ],
      },
    },
  });

  const photoWalk = await prisma.group.create({
    data: {
      name: '사진 산책 모임',
      description: '출사 겸 산책하는 사진 애호가 모임',
      category: '여행',
      isPublic: true,
      inviteCode: 'photo-walk',
      members: {
        create: [
          { userId: junho.id, role: MemberRole.PRESIDENT, status: MemberStatus.APPROVED },
          { userId: wanseok.id, role: MemberRole.MEMBER, status: MemberStatus.REJECTED },
        ],
      },
    },
  });

  void yogaGroup;
  void photoWalk;
  void boardGame;

  type EventSeed = {
    groupId: string;
    title: string;
    daysFromToday: number;
    startTime: string;
    location: string;
    description: string;
    status?: EventStatus;
    createdById: string;
    votes?: Array<{ userId: string; choice: VoteChoice }>;
  };

  const eventSeeds: EventSeed[] = [
    // 독서모임 — 내일, 투표 필요
    {
      groupId: bookClub.id,
      title: '3월 정기 독서 토론',
      daysFromToday: 1,
      startTime: '19:30',
      location: '강남 스터디카페 3층',
      description: '「아몬드」 3~5장 토론',
      createdById: wanseok.id,
    },
    // 독서모임 — 모레, 투표 완료(참석)
    {
      groupId: bookClub.id,
      title: '작가와의 만남',
      daysFromToday: 2,
      startTime: '14:00',
      location: '교보문고 강남점',
      description: '초청 작가 북토크',
      createdById: jieun.id,
      votes: [
        { userId: wanseok.id, choice: VoteChoice.ATTEND },
        { userId: jieun.id, choice: VoteChoice.ATTEND },
        { userId: junho.id, choice: VoteChoice.LATE },
      ],
    },
    // 독서모임 — 오늘 저녁, 투표 완료(불참)
    {
      groupId: bookClub.id,
      title: '독서 일지 공유',
      daysFromToday: 0,
      startTime: futureStartTime(4),
      location: '온라인(줌)',
      description: '이번 주 읽은 책 짧게 공유',
      createdById: wanseok.id,
      votes: [
        { userId: wanseok.id, choice: VoteChoice.ABSENT },
        { userId: haneul.id, choice: VoteChoice.ATTEND },
      ],
    },
    // 독서모임 — 오늘 이미 시작, 투표 마감
    {
      groupId: bookClub.id,
      title: '점심 독서 모임',
      daysFromToday: 0,
      startTime: pastStartTime(),
      location: '강남역 인근 카페',
      description: '짧은 점심 독서 모임',
      createdById: wanseok.id,
      votes: [{ userId: junho.id, choice: VoteChoice.ATTEND }],
    },
    // 독서모임 — 지난 일정
    {
      groupId: bookClub.id,
      title: '2월 정기 모임',
      daysFromToday: -7,
      startTime: '19:00',
      location: '강남 스터디카페',
      description: '2월 독서 토론',
      createdById: wanseok.id,
      votes: [
        { userId: wanseok.id, choice: VoteChoice.ATTEND },
        { userId: jieun.id, choice: VoteChoice.ATTEND },
      ],
    },
    // 독서모임 — 취소된 일정
    {
      groupId: bookClub.id,
      title: '야외 독서 (우천 취소)',
      daysFromToday: 3,
      startTime: '10:00',
      location: '한강공원',
      description: '날씨 악화로 취소',
      status: EventStatus.CANCELLED,
      createdById: wanseok.id,
    },

    // 러닝크루 — 내일, 투표 완료
    {
      groupId: runningClub.id,
      title: '한강 5km 러닝',
      daysFromToday: 1,
      startTime: '07:00',
      location: '여의도 한강공원 5km 지점',
      description: '페이스 6분/km',
      createdById: minsu.id,
      votes: [
        { userId: wanseok.id, choice: VoteChoice.ATTEND },
        { userId: minsu.id, choice: VoteChoice.ATTEND },
        { userId: seoyeon.id, choice: VoteChoice.LATE },
      ],
    },
    // 러닝크루 — 3일 후, 투표 필요
    {
      groupId: runningClub.id,
      title: '주말 장거리 러닝',
      daysFromToday: 3,
      startTime: '08:00',
      location: '반포 한강공원',
      description: '10km 장거리',
      createdById: minsu.id,
    },

    // React 스터디 — 4일 후, 투표 필요
    {
      groupId: reactStudy.id,
      title: 'React 19 신기능 정리',
      daysFromToday: 4,
      startTime: '20:00',
      location: '디스코드',
      description: 'Server Components 심화',
      createdById: jieun.id,
    },
    // React 스터디 — 내일, 늦참 투표
    {
      groupId: reactStudy.id,
      title: '페어 프로그래밍',
      daysFromToday: 1,
      startTime: '21:00',
      location: '온라인',
      description: '과제 코드 리뷰',
      createdById: wanseok.id,
      votes: [
        { userId: wanseok.id, choice: VoteChoice.LATE },
        { userId: jieun.id, choice: VoteChoice.ATTEND },
        { userId: hyunwoo.id, choice: VoteChoice.ABSENT },
      ],
    },
    // React 스터디 — 취소
    {
      groupId: reactStudy.id,
      title: '해커톤 준비 (연기)',
      daysFromToday: 5,
      startTime: '19:00',
      location: '강남 코워킹',
      description: '일정 충돌로 취소',
      status: EventStatus.CANCELLED,
      createdById: wanseok.id,
    },
    // React 스터디 — 지난
    {
      groupId: reactStudy.id,
      title: 'Zustand vs Jotai',
      daysFromToday: -3,
      startTime: '20:00',
      location: '줌',
      description: '상태관리 라이브러리 비교',
      createdById: jieun.id,
      votes: [{ userId: wanseok.id, choice: VoteChoice.ATTEND }],
    },
  ];

  const createdEvents: Array<{ id: string; title: string }> = [];

  for (const seed of eventSeeds) {
    const event = await prisma.event.create({
      data: {
        groupId: seed.groupId,
        title: seed.title,
        date: localDate(seed.daysFromToday),
        startTime: seed.startTime,
        location: seed.location,
        description: seed.description,
        status: seed.status ?? EventStatus.ACTIVE,
        createdById: seed.createdById,
        votes: seed.votes
          ? {
              create: seed.votes.map((v) => ({
                userId: v.userId,
                choice: v.choice,
              })),
            }
          : undefined,
      },
    });
    createdEvents.push({ id: event.id, title: event.title });
  }

  // 김완석 알림 샘플
  const tomorrowEvent = createdEvents.find((e) => e.title === '3월 정기 독서 토론');
  const runningEvent = createdEvents.find((e) => e.title === '한강 5km 러닝');
  const cancelledEvent = createdEvents.find((e) => e.title === '야외 독서 (우천 취소)');

  if (tomorrowEvent) {
    await prisma.notificationLog.create({
      data: {
        userId: wanseok.id,
        eventId: tomorrowEvent.id,
        type: NotificationType.CREATED,
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.notificationLog.create({
      data: {
        userId: wanseok.id,
        eventId: tomorrowEvent.id,
        type: NotificationType.REMINDER,
        sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    });
  }

  if (runningEvent) {
    await prisma.notificationLog.create({
      data: {
        userId: wanseok.id,
        eventId: runningEvent.id,
        type: NotificationType.CREATED,
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
  }

  if (cancelledEvent) {
    await prisma.notificationLog.create({
      data: {
        userId: wanseok.id,
        eventId: cancelledEvent.id,
        type: NotificationType.CANCELLED,
        sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('✅ 샘플 데이터 시드 완료!');
  console.log('');
  console.log('로그인: 개발 로그인 → "김완석"');
  console.log('');
  console.log('김완석 계정 구성:');
  console.log('  · 회장: 강남 독서모임 (가입 신청 2건 대기)');
  console.log('  · 운영진: React 스터디');
  console.log('  · 회원: 주말 러닝크루');
  console.log('  · 가입 대기: 보드게임 동호회');
  console.log('  · 가입 거절: 사진 산책 모임');
  console.log('  · 미가입: 요가 & 명상 (모임 찾기에서 신청 가능)');
  console.log('');
  console.log('홈 화면 일정:');
  console.log('  · 투표 필요: 3월 정기 독서 토론, 주말 장거리 러닝, React 19 신기능 정리');
  console.log('  · 투표 완료: 작가와의 만남, 독서 일지 공유, 한강 5km, 페어 프로그래밍');
  console.log('  · 지난/마감: 2월 정기 모임, Zustand vs Jotai, 점심 독서 모임');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
