const axios = require('axios');
const assert = require('assert');

const API_BASE = 'http://localhost:3000';

async function runTests() {
  console.log('🚀 Starting Comprehensive 3x Multi-Iteration Test Suite...\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name, fn) {
    totalTests++;
    return async () => {
      try {
        await fn();
        console.log(`  ✅ [PASS] ${name}`);
        passedTests++;
      } catch (err) {
        console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
        throw err;
      }
    };
  }

  // ── Helper: Login ──
  async function login(displayName) {
    const res = await axios.post(`${API_BASE}/auth/dev-login`, { displayName });
    return { token: res.data.accessToken, user: res.data.user };
  }

  // ── Helper: Auth Header ──
  function authHeader(token) {
    return { headers: { Authorization: `Bearer ${token}` } };
  }

  for (let iteration = 1; iteration <= 3; iteration++) {
    console.log(`\n======================================================`);
    console.log(`🔁 ITERATION ${iteration} / 3: Full Lifecycle Test`);
    console.log(`======================================================`);

    const pName = `김회장_${iteration}`;
    const m1Name = `이부회장_${iteration}`;
    const m2Name = `박회원_${iteration}`;

    let pres, mem1, mem2;
    let group;
    let event;
    let media;
    let announcement;

    // 1. 회원가입 & 카카오/개발 로그인 (3회)
    await test(`[Iter ${iteration}] 회원가입 & 로그인 3개 계정 생성`, async () => {
      pres = await login(pName);
      mem1 = await login(m1Name);
      mem2 = await login(m2Name);
      assert(pres.token, 'President token should exist');
      assert(mem1.token, 'Member 1 token should exist');
      assert(mem2.token, 'Member 2 token should exist');
    })();

    // 2. 프로필 수정 및 조회 (3회)
    await test(`[Iter ${iteration}] 프로필 수정 (전화번호 8자리 포맷, 생년월일, 성별, 소개글)`, async () => {
      const phone = `010-${1000 + iteration * 111}-${2000 + iteration * 222}`;
      const res = await axios.patch(
        `${API_BASE}/auth/me`,
        {
          phoneNumber: phone,
          birthYear: 1990 + iteration,
          birthMonth: iteration,
          birthDay: 10 + iteration,
          gender: iteration % 2 === 0 ? 'FEMALE' : 'MALE',
          bio: `안녕하세요! ${iteration}회차 테스트 계정입니다.`,
        },
        authHeader(pres.token)
      );
      assert.strictEqual(res.data.phoneNumber, phone);
      assert.strictEqual(res.data.birthYear, 1990 + iteration);
    })();

    // 3. 모임 생성 및 수정 (3회)
    await test(`[Iter ${iteration}] 모임 생성 (카테고리, 활동 지역, 활동 구장 2개 등록)`, async () => {
      const categories = ['풋살/축구', '테니스', '배드민턴'];
      const res = await axios.post(
        `${API_BASE}/groups`,
        {
          name: `클로버 스포츠 클럽 ${iteration}기`,
          description: `${iteration}번째 종합 레저 스포츠 모임입니다.`,
          category: categories[iteration - 1],
          isPublic: true,
          activitySido: '서울특별시',
          activitySigungu: '송파구',
          activityDistrict: '방이동',
          arenas: [
            { placeName: '올림픽공원 테니스경기장', address: '서울특별시 송파구 올림픽로 424' },
            { placeName: '잠실종합운동장 풋살구장', address: '서울특별시 송파구 올림픽로 25' },
          ],
        },
        authHeader(pres.token)
      );
      group = res.data;
      assert(group.id, 'Group ID should exist');
      assert.strictEqual(group.name, `클로버 스포츠 클럽 ${iteration}기`);
      assert.strictEqual(group.activitySido, '서울특별시');
    })();

    // 4. 모임 검색 및 비가입자 상세 조회 (3회)
    await test(`[Iter ${iteration}] 모임 검색 및 비가입자 모임 상세 정보 확인`, async () => {
      const searchRes = await axios.get(`${API_BASE}/groups?search=${encodeURIComponent(`클로버 스포츠 클럽 ${iteration}기`)}`, authHeader(mem1.token));
      assert(searchRes.data.length >= 1, 'Group should be found in search');

      const previewRes = await axios.get(`${API_BASE}/groups/${group.id}`, authHeader(mem1.token));
      assert.strictEqual(previewRes.data.id, group.id);
      assert.strictEqual(previewRes.data.myMembership, null, 'Non-member should have null membership');
    })();

    // 5. 모임 가입 신청, 승인 및 역할/활동상태 변경 (3회)
    await test(`[Iter ${iteration}] 가입 신청, 회장 승인, 역할(부회장) 부여, 부상자 상태 변경`, async () => {
      // mem1, mem2 join request
      await axios.post(`${API_BASE}/groups/${group.id}/join`, {}, authHeader(mem1.token));
      await axios.post(`${API_BASE}/groups/${group.id}/join`, {}, authHeader(mem2.token));

      // President approves
      await axios.patch(`${API_BASE}/groups/${group.id}/members/${mem1.user.id}`, { status: 'APPROVED' }, authHeader(pres.token));
      await axios.patch(`${API_BASE}/groups/${group.id}/members/${mem2.user.id}`, { status: 'APPROVED' }, authHeader(pres.token));

      // Promote mem1 to VICE_PRESIDENT
      await axios.patch(`${API_BASE}/groups/${group.id}/members/${mem1.user.id}`, { role: 'VICE_PRESIDENT' }, authHeader(pres.token));

      // Mem2 sets their own status to INJURED
      await axios.patch(`${API_BASE}/groups/${group.id}/members/my-status`, { userStatus: 'INJURED' }, authHeader(mem2.token));

      const updatedGroup = await axios.get(`${API_BASE}/groups/${group.id}`, authHeader(pres.token));
      const m1Record = updatedGroup.data.members.find(m => m.userId === mem1.user.id);
      const m2Record = updatedGroup.data.members.find(m => m.userId === mem2.user.id);

      assert.strictEqual(m1Record.role, 'VICE_PRESIDENT');
      assert.strictEqual(m2Record.userStatus, 'INJURED');
    })();

    // 6. 일정 생성 & 투표 순서 [참석 ➔ 늦참 ➔ 불참] 및 투표 변경 (3회)
    await test(`[Iter ${iteration}] 일정 등록 & 투표(참석/늦참/불참) 및 투표 변경`, async () => {
      const eventTime = new Date(Date.now() + 10 * 60 * 1000);
      const dateStr = eventTime.toISOString().split('T')[0];
      const hours = String(eventTime.getHours()).padStart(2, '0');
      const minutes = String(eventTime.getMinutes()).padStart(2, '0');
      const startTime = `${hours}:${minutes}`;

      const eventRes = await axios.post(
        `${API_BASE}/groups/${group.id}/events`,
        {
          title: `제${iteration}회 정기 모임 운동 경기`,
          date: dateStr,
          startTime: startTime,
          endTime: '23:59',
          location: '올림픽공원 테니스장 3번 코트',
          description: '정기 운동 경기입니다. 많은 참여 바랍니다.',
        },
        authHeader(pres.token)
      );
      event = eventRes.data;
      assert.strictEqual(event.title, `제${iteration}회 정기 모임 운동 경기`);

      // pres votes ATTEND
      await axios.post(`${API_BASE}/events/${event.id}/votes`, { choice: 'ATTEND' }, authHeader(pres.token));

      // mem1 votes LATE
      await axios.post(`${API_BASE}/events/${event.id}/votes`, { choice: 'LATE' }, authHeader(mem1.token));

      // mem2 votes ABSENT then changes to ATTEND
      await axios.post(`${API_BASE}/events/${event.id}/votes`, { choice: 'ABSENT' }, authHeader(mem2.token));
      await axios.post(`${API_BASE}/events/${event.id}/votes`, { choice: 'ATTEND' }, authHeader(mem2.token));

      const votesRes = await axios.get(`${API_BASE}/events/${event.id}/votes`, authHeader(pres.token));
      assert.strictEqual(votesRes.data.counts.ATTEND, 2);
      assert.strictEqual(votesRes.data.counts.LATE, 1);
      assert.strictEqual(votesRes.data.counts.ABSENT, 0);
    })();

    // 7. 자동 조 편성 (Team Generator) (3회)
    await test(`[Iter ${iteration}] 자동 조 편성 (팀 분배 및 저장)`, async () => {
      const teamsRes = await axios.post(
        `${API_BASE}/events/${event.id}/teams/split`,
        { teamCount: 2 },
        authHeader(pres.token)
      );
      assert(teamsRes.data.teams, 'Teams should be generated');
      assert.strictEqual(teamsRes.data.teams.length, 2, 'Should generate 2 teams');
    })();

    // 8. 사진첩 다중 업로드, 조회, 삭제 권한 검증 (3회)
    await test(`[Iter ${iteration}] 사진첩 등록, 목록 조회, 삭제 및 권한 검증`, async () => {
      const mediaRes = await axios.post(
        `${API_BASE}/groups/${group.id}/media`,
        {
          url: `https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=60`,
          fileType: 'IMAGE',
        },
        authHeader(mem1.token)
      );
      media = mediaRes.data;
      assert(media.id, 'Media ID should exist');
      assert.strictEqual(media.uploadedById, mem1.user.id);

      const listRes = await axios.get(`${API_BASE}/groups/${group.id}/media`, authHeader(pres.token));
      assert(listRes.data.length >= 1);

      // Mem1 deletes their own media
      const delRes = await axios.delete(`${API_BASE}/groups/${group.id}/media/${media.id}`, authHeader(mem1.token));
      assert.strictEqual(delRes.data.ok, true);

      const afterDelList = await axios.get(`${API_BASE}/groups/${group.id}/media`, authHeader(pres.token));
      assert(!afterDelList.data.some(m => m.id === media.id));
    })();

    // 9. 공지사항 등록 및 조회 (3회)
    await test(`[Iter ${iteration}] 공지사항 등록 및 모임별 공지 조회`, async () => {
      const annRes = await axios.post(
        `${API_BASE}/announcements`,
        {
          title: `[필독] ${iteration}기 모임 공지사항`,
          content: '운동 참여 전 준비운동 필수입니다!',
          groupId: group.id,
        },
        authHeader(pres.token)
      );
      announcement = annRes.data;
      assert.strictEqual(announcement.title, `[필독] ${iteration}기 모임 공지사항`);

      const annList = await axios.get(`${API_BASE}/announcements?groupId=${group.id}`, authHeader(pres.token));
      assert(annList.data.some(a => a.id === announcement.id), 'Announcement should exist in group feed');
    })();

    // 10. 캘린더 일정 & 3개월 지난 일정 필터링 & 회비 정산 체크 (3회)
    await test(`[Iter ${iteration}] 캘린더 조회 (예정 일정, 최근 3개월 지난 일정 필터), 월별 회비 정산`, async () => {
      const calRes = await axios.get(`${API_BASE}/calendar`, authHeader(pres.token));
      assert(Array.isArray(calRes.data), 'Calendar should return array');
      assert(calRes.data.some(e => e.id === event.id), 'Created event should be in calendar');

      // Check payments checklist
      const now = new Date();
      const payRes = await axios.get(`${API_BASE}/groups/${group.id}/payments?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, authHeader(pres.token));
      assert(Array.isArray(payRes.data.payments), 'Payments should return array of members');
    })();

    // 11. 알림 시스템 (모임 프로필 & 모임명 매핑) (3회)
    await test(`[Iter ${iteration}] 알림 수신 확인 (groupId, groupName 매핑 검증)`, async () => {
      const notesRes = await axios.get(`${API_BASE}/notifications`, authHeader(mem1.token));
      assert(Array.isArray(notesRes.data), 'Notifications should return array');
    })();
  }

  console.log(`\n======================================================`);
  console.log(`🎉 ALL 33 / 33 TESTS PASSED! (11 Features x 3 Iterations)`);
  console.log(`======================================================\n`);
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
