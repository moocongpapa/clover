import {
  Gender,
  MemberRole,
  MemberStatus,
  PrismaClient,
} from '@prisma/client';

const prisma = new PrismaClient();

function devKakaoId(name: string) {
  return `dev-${name.trim().toLowerCase().replace(/\s+/g, '-')}`;
}

// Fisher-Yates shuffle helper
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate random number in range [min, max]
function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 새로운 스포츠 카테고리 및 풍부한 테스트용 데이터 시드 시작…');

  // Clear database tables
  await prisma.notificationLog.deleteMany();
  await prisma.eventTeamAssignment.deleteMany();
  await prisma.eventTeamSplit.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.event.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.groupMedia.deleteMany();
  await prisma.officerHistory.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // Create 55 test users
  const userNames = [
    '김완석', '박민수', '이지은', '최준호', '정하늘', '강서연', '조현우', '윤채원',
    '이민혁', '김지아', '박준영', '최민지', '정우성', '한소희', '서강준', '임윤아',
    '강하늘', '송혜교', '남주혁', '수지', '공유', '김고은', '현빈', '손예진',
    '박서준', '한효주', '이종석', '신민아', '김우빈', '아이유', '정해인', '태연',
    '지민', '정국', '뷔', 'RM', '슈가', '제이홉', '진', '카리나',
    '윈터', '장원영', '안유진', '민지', '하니', '해린', '혜인', '다니엘',
    '지효', '나연', '사나', '모모', '미나', '쯔위', '다현'
  ];

  const users = await Promise.all(
    userNames.map((name, index) =>
      prisma.user.create({
        data: {
          kakaoId: devKakaoId(name),
          displayName: name,
          gender: index % 2 === 0 ? Gender.MALE : Gender.FEMALE,
          birthYear: 1988 + (index % 12),
          birthDate: new Date(1988 + (index % 12), index % 12, (index % 28) + 1),
          phoneNumber: `0101${String(index).padStart(7, '0')}`,
        },
      }),
    ),
  );

  const wanseokUser = users.find(u => u.displayName === '김완석')!;

  // 10 sports groups configuration
  const groupConfigs = [
    { name: '서울 풋살 클럽', category: '풋살/축구', desc: '강남구 주말 야간 풋살 정기 모임입니다.', bank: '카카오뱅크', holder: '김완석', acct: '3333012345678', sido: '서울특별시', sigungu: '강남구', town: '역삼동' },
    { name: '서초 농구 동호회', category: '농구', desc: '매주 목요일 저녁 즐겁게 농구해요.', bank: '토스뱅크', holder: '박민수', acct: '100012345678', sido: '서울특별시', sigungu: '서초구', town: '서초동' },
    { name: '분당 야구 동반자', category: '야구', desc: '사회인 야구단 멤버 모집 및 정기 모임.', bank: '국민은행', holder: '최준호', acct: '444412345678', sido: '경기도', sigungu: '성남시 분당구', town: '삼평동' },
    { name: '여의도 한강 러닝 크루', category: '러닝', desc: '평일 퇴근 후 시원하게 한강 달리는 크루입니다.', bank: '신한은행', holder: '정하늘', acct: '110123456789', sido: '서울특별시', sigungu: '영등포구', town: '여의도동' },
    { name: '분당 테니스 클럽', category: '테니스', desc: '테니스 초보부터 고수까지 함께 쳐요.', bank: '하나은행', holder: '강서연', acct: '222123456789', sido: '경기도', sigungu: '성남시 분당구', town: '정자동' },
    { name: '홍대 탁구 연합', category: '탁구', desc: '비가 오나 눈이 오나 실내에서 시원하게 탁구 한 판!', bank: '우리은행', holder: '조현우', acct: '100212345678', sido: '서울특별시', sigungu: '마포구', town: '서교동' },
    { name: '마포 배드민턴 동호회', category: '배드민턴', desc: '매주 주말 오전에 배드민턴 번개 진행합니다.', bank: '농협은행', holder: '윤채원', acct: '302123456789', sido: '서울특별시', sigungu: '마포구', town: '공덕동' },
    { name: '볼링 스플릿 헌터', category: '볼링', desc: '볼링 스코어 200 돌파를 목표로 모이는 동호회.', bank: '신협', holder: '이민혁', acct: '131123456789', sido: '서울특별시', sigungu: '송파구', town: '잠실동' },
    { name: '강남 인도어 골프 프렌즈', category: '골프', desc: '스크린 골프와 정기 라운딩을 함께 가는 모임.', bank: '카카오뱅크', holder: '김완석', acct: '3333099999999', sido: '서울특별시', sigungu: '강남구', town: '도곡동' },
    { name: '기타 스포츠 체험단', category: '기타', desc: '클라이밍, 스쿼시, 양궁 등 이색 스포츠를 체험합니다.', bank: '토스뱅크', holder: '김지아', acct: '100099998888', sido: '서울특별시', sigungu: '종로구', town: '혜화동' },
  ];

  const now = new Date();
  const thisMonthYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1; // 1-indexed

  for (let i = 0; i < groupConfigs.length; i++) {
    const config = groupConfigs[i];
    const memberCount = randomRange(20, 50);

    // Shuffle users to assign members randomly
    const shuffledUsers = shuffle(users.filter(u => u.id !== wanseokUser.id));
    const selectedMembers = shuffledUsers.slice(0, memberCount - 1); 

    // Determine role for wanseok in this group
    let wanseokRole: MemberRole | null = null;
    if (config.name === '서울 풋살 클럽' || config.name === '강남 인도어 골프 프렌즈') {
      wanseokRole = MemberRole.PRESIDENT;
    } else if (config.name === '여의도 한강 러닝 크루') {
      wanseokRole = MemberRole.MEMBER;
    } else if (config.name === '분당 테니스 클럽') {
      wanseokRole = MemberRole.VICE_PRESIDENT;
    } else if (config.name === '볼링 스플릿 헌터') {
      wanseokRole = MemberRole.SECRETARY;
    } else if (config.name === '기타 스포츠 체험단') {
      wanseokRole = MemberRole.OFFICER;
    }

    const memberRelations: Array<{ userId: string; role: MemberRole; status: MemberStatus }> = [];

    // Add wanseok if he has a role in this group
    if (wanseokRole) {
      memberRelations.push({
        userId: wanseokUser.id,
        role: wanseokRole,
        status: MemberStatus.APPROVED,
      });
    }

    // Add selected random members
    selectedMembers.forEach((user, idx) => {
      let role: MemberRole = MemberRole.MEMBER;
      
      // If wanseok is not president, assign the first member as president
      if (idx === 0 && wanseokRole !== MemberRole.PRESIDENT) {
        role = MemberRole.PRESIDENT;
      } else if (idx === 1 && wanseokRole !== MemberRole.SECRETARY) {
        role = MemberRole.SECRETARY;
      } else if (idx === 2 && wanseokRole !== MemberRole.VICE_PRESIDENT) {
        role = MemberRole.VICE_PRESIDENT;
      } else if (idx === 3 && wanseokRole !== MemberRole.OFFICER) {
        role = MemberRole.OFFICER;
      }

      memberRelations.push({
        userId: user.id,
        role,
        status: MemberStatus.APPROVED,
      });
    });

    const activityRegion = `${config.sido} ${config.sigungu} ${config.town}`;

    const group = await prisma.group.create({
      data: {
        name: config.name,
        description: config.desc,
        category: config.category,
        isPublic: true,
        inviteCode: `invite-${i + 1}-${Math.random().toString(36).substring(2, 6)}`,
        bankName: config.bank,
        bankAccountNumber: config.acct,
        bankAccountHolder: config.holder,
        activitySido: config.sido,
        activitySigungu: config.sigungu,
        activityRegion,
        activityTown: config.town,
        dueDay: 15,
        officerFeeExempt: true,
        members: {
          create: memberRelations,
        },
      },
    });

    console.log(`🔹 모임 생성: [${group.category}] ${group.name} - 멤버 ${memberRelations.length}명`);

    // Fetch the president of this group to set as author
    const groupMembersWithDetails = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: { user: true },
    });
    const presidentMember = groupMembersWithDetails.find(m => m.role === MemberRole.PRESIDENT) || groupMembersWithDetails[0];
    const presidentUser = presidentMember.user;

    // Seeding events and announcements for Wanseok's active groups
    if (wanseokRole) {
      // 1. Create a mock important announcement
      await prisma.announcement.create({
        data: {
          groupId: group.id,
          title: `📢 [공지] ${group.name} 정기 회비 납부 및 회칙 준수 안내`,
          content: `회원 여러분 안녕하세요! 모임의 원활한 운영을 위해 매달 15일까지 모임 통장(${group.bankAccountNumber})으로 정기 회비를 납부해 주시기 바랍니다. 미투표자 알람이 매일 지정시간에 가니 투표 참여도 잊지 마세요!`,
          authorId: presidentUser.id,
        },
      });

      // 2. Create 4 events: 2 upcoming, 2 past
      const eventConfigs = [
        {
          title: `🔥 ${group.name} 이번주 정기전 및 번개`,
          offsetDays: 2,
          desc: '이번주 정기전 진행합니다! 운동 후 간단한 뒤풀이가 있을 예정이오니 투표 부탁드립니다.',
          location: `${config.town} 실내 체육관`,
        },
        {
          title: `📅 ${group.name} 다음주 특별 교류전`,
          offsetDays: 9,
          desc: '타 모임과의 친선 교류전이 예정되어 있습니다. 많은 참여 부탁드려요!',
          location: `서초 종합 체육관`,
        },
        {
          title: `지난주 정기 정산 모임`,
          offsetDays: -5,
          desc: '지난주 평일 정기 번개입니다. 참석해주신 분들 모두 감사드립니다.',
          location: `${config.town} 인근 시설`,
        },
        {
          title: `지난달 대항전 및 총회`,
          offsetDays: -12,
          desc: '친선 경기 전반기 총 결산 대항전입니다.',
          location: `잠실 체육관`,
        },
      ];

      for (const evConfig of eventConfigs) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + evConfig.offsetDays);
        
        const event = await prisma.event.create({
          data: {
            groupId: group.id,
            title: evConfig.title,
            date: targetDate,
            startTime: '19:00',
            endTime: '21:00',
            location: evConfig.location,
            description: evConfig.desc,
            status: 'ACTIVE',
            createdById: presidentUser.id,
          },
        });

        // 3. Seed votes for other members (15-30 random members)
        const voterPool = shuffle(groupMembersWithDetails.filter(m => m.userId !== wanseokUser.id));
        const numVoters = randomRange(12, Math.min(voterPool.length, 30));
        
        // Ensure wanseok votes
        await prisma.vote.create({
          data: {
            eventId: event.id,
            userId: wanseokUser.id,
            choice: evConfig.offsetDays > 0 && evConfig.offsetDays < 5 ? 'ATTEND' : 'ABSENT',
          },
        });

        for (let j = 0; j < numVoters; j++) {
          const voter = voterPool[j];
          const choices = ['ATTEND', 'ABSENT', 'LATE'];
          // 65% ATTEND, 20% ABSENT, 15% LATE
          const rand = Math.random();
          const choice = rand < 0.65 ? 'ATTEND' : rand < 0.85 ? 'ABSENT' : 'LATE';

          await prisma.vote.create({
            data: {
              eventId: event.id,
              userId: voter.userId,
              choice,
            },
          });
        }

        // 4. Seed comments for events (1-3 comments by members)
        const commentPool = [
          '다들 이번 정기전도 다치지 말고 재밌게 운동해요! 화이팅!',
          '저 참석합니다! 이번에도 재밌게 쳐요!',
          '저는 일이 있어서 이번에는 조금 늦을 것 같습니다 😭',
          '개인 사정으로 이번주는 참석이 어렵네요 ㅠㅠ 다음번에 꼭 가겠습니다.',
          '날씨도 좋은데 땀 흘리고 시원하게 치맥 한잔 하시죠!'
        ];
        const numComments = randomRange(1, 3);
        const commenters = shuffle(groupMembersWithDetails.filter(m => m.userId !== wanseokUser.id));
        
        for (let k = 0; k < Math.min(numComments, commenters.length); k++) {
          const commenter = commenters[k];
          await prisma.comment.create({
            data: {
              eventId: event.id,
              userId: commenter.userId,
              content: commentPool[k % commentPool.length],
            },
          });
        }
      }

      // 5. Seed historical payment logs for members
      for (const m of groupMembersWithDetails) {
        // Exempt check (if officer fee exempt is enabled and they are officer/president)
        const isExempt = group.officerFeeExempt && m.role !== MemberRole.MEMBER;
        if (isExempt) continue; // Exempt members don't pay (so no FeePayment entry)

        // Seed current month payment status (75% chance paid)
        if (Math.random() < 0.75) {
          await prisma.feePayment.create({
            data: {
              groupId: group.id,
              userId: m.userId,
              year: thisMonthYear,
              month: thisMonth,
              paidById: presidentUser.id,
            },
          });
        }

        // Seed previous month payment status (92% chance paid)
        if (Math.random() < 0.92) {
          const prevMonthVal = thisMonth === 1 ? 12 : thisMonth - 1;
          const prevYearVal = thisMonth === 1 ? thisMonthYear - 1 : thisMonthYear;
          await prisma.feePayment.create({
            data: {
              groupId: group.id,
              userId: m.userId,
              year: prevYearVal,
              month: prevMonthVal,
              paidById: presidentUser.id,
            },
          });
        }
      }

      // 6. Seed officer history logs
      await prisma.officerHistory.create({
        data: {
          groupId: group.id,
          userId: presidentUser.id,
          role: MemberRole.PRESIDENT,
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        },
      });

      const secretaryMember = groupMembersWithDetails.find(m => m.role === MemberRole.SECRETARY);
      if (secretaryMember) {
        await prisma.officerHistory.create({
          data: {
            groupId: group.id,
            userId: secretaryMember.userId,
            role: MemberRole.SECRETARY,
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  console.log('✅ 데이터베이스 시드 및 10개 모임 재생성 완료!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
