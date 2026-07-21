import { expect, test } from '@playwright/test';
import {
  approveMember,
  castVote,
  createEvent,
  createGroup,
  devLogin,
  joinGroup,
  tomorrow,
  today,
  pastStartTime,
  futureStartTime,
} from '../helpers/api';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

async function apiRequest(path: string, method: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const options: RequestInit = {
    method,
    headers,
  };
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(`${API_URL}${path}`, options);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

test.describe('Clover 비즈니스 로직 Edge Case 테스트', () => {
  let presidentToken: string;
  let memberToken: string;
  let presidentUserId: string;
  let memberUserId: string;
  let groupId: string;

  test.beforeAll(async () => {
    // 1. 회장 & 일반 회원 로그인 세션 획득
    const president = await devLogin('테스트회장');
    const member = await devLogin('테스트회원');
    
    presidentToken = president.accessToken;
    memberToken = member.accessToken;
    presidentUserId = president.user.id;
    memberUserId = member.user.id;

    // 2. 모임 생성 및 회원 가입/승인
    const group = await createGroup(presidentToken, {
      name: 'Edge Case 테스트 모임',
      description: 'Edge Case 테스트용 모임 설명',
      category: 'IT/개발',
      isPublic: true,
    });
    groupId = group.id;

    await joinGroup(memberToken, groupId);
    await approveMember(presidentToken, groupId, memberUserId);
  });

  test('이벤트 시작/종료 시간 정합성 검증 (종료 시간 <= 시작 시간 에러)', async () => {
    // 종료 시간이 시작 시간보다 앞서는 경우 400 에러 반환
    const res1 = await apiRequest(`/groups/${groupId}/events`, 'POST', {
      title: '시간 역전 이벤트',
      date: tomorrow(),
      startTime: '19:00',
      endTime: '18:00',
      location: '온라인',
      description: '종료 시간이 더 빠른 일정',
    }, presidentToken);

    expect(res1.status).toBe(400);
    expect(res1.body.message).toContain('종료 시간은 시작 시간보다 뒤여야 합니다.');

    // 종료 시간이 시작 시간과 동일한 경우 400 에러 반환
    const res2 = await apiRequest(`/groups/${groupId}/events`, 'POST', {
      title: '동일 시간 이벤트',
      date: tomorrow(),
      startTime: '19:00',
      endTime: '19:00',
      location: '온라인',
      description: '시작과 종료가 같은 일정',
    }, presidentToken);

    expect(res2.status).toBe(400);
    expect(res2.body.message).toContain('종료 시간은 시작 시간보다 뒤여야 합니다.');
  });

  test('이벤트 상태별 투표 차단 검증', async () => {
    // 1. 지난 모임(시작 시간이 과거인 모임) 투표 차단 검증
    const pastEvent = await createEvent(presidentToken, groupId, {
      title: '시작 시간이 지난 모임',
      date: today(),
      startTime: pastStartTime(),
      location: '온라인',
      description: '과거 시간 일정',
    });

    const resPastVote = await apiRequest(`/events/${pastEvent.id}/votes`, 'POST', {
      choice: 'ATTEND',
    }, memberToken);

    expect(resPastVote.status).toBe(403);
    expect(resPastVote.body.message).toContain('모임 시작 후에는 투표를 변경할 수 없습니다.');

    // 2. 취소된 모임 투표 차단 검증
    const cancelTarget = await createEvent(presidentToken, groupId, {
      title: '취소될 모임',
      date: tomorrow(),
      startTime: futureStartTime(),
      location: '온라인',
      description: '취소 예정 일정',
    });

    // 이벤트 취소
    const resCancel = await apiRequest(`/events/${cancelTarget.id}/cancel`, 'POST', {}, presidentToken);
    expect(resCancel.status).toBe(201); // Created (NestJS POST default)

    // 취소된 일정에 투표 시도
    const resCancelVote = await apiRequest(`/events/${cancelTarget.id}/votes`, 'POST', {
      choice: 'ATTEND',
    }, memberToken);

    expect(resCancelVote.status).toBe(400);
    expect(resCancelVote.body.message).toContain('취소된 이벤트에는 투표할 수 없습니다.');

    // 3. 조 편성 완료된 모임 투표 차단 검증
    // E2E 상에서 조 편성 가능한 이벤트를 생성하기 위해, 시작 시간을 현재시간 + 10분으로 동적 설정 (30분 이내이므로 즉시 조편성 가능)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    const splitEventStartTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const splitEvent = await createEvent(presidentToken, groupId, {
      title: '조 편성 테스트 모임',
      date: today(),
      startTime: splitEventStartTime,
      location: '온라인',
      description: '조 편성이 일어날 일정',
    });

    // 회장과 일반 회원이 참석 투표를 함
    await castVote(presidentToken, splitEvent.id, 'ATTEND');
    await castVote(memberToken, splitEvent.id, 'ATTEND');

    // 회장이 조 편성을 진행
    const resSplit = await apiRequest(`/events/${splitEvent.id}/teams/split`, 'POST', {
      teamCount: 2,
    }, presidentToken);
    expect(resSplit.status).toBe(201);

    // 조 편성 완료 후, 투표 변경을 시도하면 차단되어야 함
    const resSplitVote = await apiRequest(`/events/${splitEvent.id}/votes`, 'POST', {
      choice: 'ABSENT',
    }, memberToken);

    expect(resSplitVote.status).toBe(403);
    expect(resSplitVote.body.message).toContain('그룹 나누기 후에는 투표를 변경할 수 없습니다.');
  });

  test('조 편성(팀 나누기) 제약 조건 검증', async () => {
    // 1. 참석자가 아무도 없는 상태에서 조 편성 시도
    // 시간 제약 검증을 우회하기 위해, 현재 시간 기준으로 10분 후로 재생성
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    const nearStartTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const nearEvent = await createEvent(presidentToken, groupId, {
      title: '참석자 없는 동적 모임',
      date: today(),
      startTime: nearStartTime,
      location: '온라인',
      description: '조편성 시각 내 모임',
    });

    // 참석자가 한 명도 없는 상태에서 조 편성 시도
    const resSplitEmpty = await apiRequest(`/events/${nearEvent.id}/teams/split`, 'POST', {
      teamCount: 2,
    }, presidentToken);

    expect(resSplitEmpty.status).toBe(400);
    expect(resSplitEmpty.body.message).toContain('참석 또는 늦참으로 투표한 회원이 없습니다.');

    // 2. 참석 인원보다 많은 그룹 수로 분할하려 할 때 백엔드 에러 검증
    // 1명(회장)만 참석 투표
    await castVote(presidentToken, nearEvent.id, 'ATTEND');

    const resSplitOverCount = await apiRequest(`/events/${nearEvent.id}/teams/split`, 'POST', {
      teamCount: 2, // 참석자 1명인데 2개 조로 나눌 수 없음
    }, presidentToken);

    expect(resSplitOverCount.status).toBe(400);
    expect(resSplitOverCount.body.message).toContain('참석 인원보다 많은 그룹 수는 선택할 수 없습니다.');

    // 3. 모임 시작 30분 전 시간 제약 조건 검증
    // 미래(2시간 후) 모임 생성
    const farEvent = await createEvent(presidentToken, groupId, {
      title: '2시간 뒤 미래 모임',
      date: today(),
      startTime: futureStartTime(),
      location: '온라인',
      description: '조편성 시각 외 모임',
    });

    // 두 명 다 참석 투표
    await castVote(presidentToken, farEvent.id, 'ATTEND');
    await castVote(memberToken, farEvent.id, 'ATTEND');

    // 조 편성 시도
    const resSplitEarly = await apiRequest(`/events/${farEvent.id}/teams/split`, 'POST', {
      teamCount: 2,
    }, presidentToken);

    expect(resSplitEarly.status).toBe(400);
    expect(resSplitEarly.body.message).toContain('모임 시작 1시간 전부터만 사용할 수 있습니다.');
  });

  test('회장 권한 양도 시 직책 강등 및 권한 박탈 여부 검증', async () => {
    // 1. 일반 회원이 회장 양도 API를 호출하면 403 에러 발생 확인
    const resUnauthTransfer = await apiRequest(`/groups/${groupId}/transfer-president`, 'POST', {
      newPresidentUserId: presidentUserId,
    }, memberToken);

    expect(resUnauthTransfer.status).toBe(403);
    expect(resUnauthTransfer.body.message).toContain('회장만 이 작업을 수행할 수 있습니다.');

    // 2. 회장이 일반 회원에게 회장 직책 양도 성공 확인
    const resTransfer = await apiRequest(`/groups/${groupId}/transfer-president`, 'POST', {
      newPresidentUserId: memberUserId,
    }, presidentToken);

    expect(resTransfer.status).toBe(201);
    expect(resTransfer.body.success).toBe(true);

    // 3. 양도 후 이전 회장(김회장)의 역할이 일반 회원(MEMBER)으로 변경되었는지 확인
    // 양도된 회장의 토큰으로 모임 정보를 조회
    const groupRes = await apiRequest(`/groups/${groupId}`, 'GET', {}, presidentToken);
    expect(groupRes.body.myMembership.role).toBe('MEMBER');

    // 4. 양도 후 이전 회장(김회장)이 이벤트 등록(운영진 전용)을 시도하면 403 Forbidden으로 거부되는지 확인
    const resForbiddenEvent = await apiRequest(`/groups/${groupId}/events`, 'POST', {
      title: '양도된 회장의 일정 추가 시도',
      date: tomorrow(),
      startTime: '19:00',
      location: '온라인',
      description: '권한 없음 테스트',
    }, presidentToken); // 이전 회장의 토큰 사용

    expect(resForbiddenEvent.status).toBe(403);
    expect(resForbiddenEvent.body.message).toContain('운영진만 이벤트를 등록할 수 있습니다.');
  });

  test('그룹 나누기 시 늦참 투표자 분배 로직 검증 (참석자 우선 분할 후 늦참자 균등 분배)', async () => {
    // 1. 추가 회원 2명 확보
    const m2 = await devLogin('테스트회원2');
    const m3 = await devLogin('테스트회원3');

    // 2. 이 테스트 케이스 전용의 새로운 모임 생성 (이전 테스트에서 회장 권한이 양도되었으므로 독립성 확보)
    const newGroup = await createGroup(presidentToken, {
      name: '늦참 분할 전용 모임',
      description: '늦참 분할 테스트용 모임',
      category: 'IT/개발',
      isPublic: true,
    });
    const localGroupId = newGroup.id;
    
    // 3. 모임 가입 및 승인
    await joinGroup(memberToken, localGroupId);
    await approveMember(presidentToken, localGroupId, memberUserId);
    await joinGroup(m2.accessToken, localGroupId);
    await approveMember(presidentToken, localGroupId, m2.user.id);
    await joinGroup(m3.accessToken, localGroupId);
    await approveMember(presidentToken, localGroupId, m3.user.id);

    // 4. 10분 뒤 시작하는 동적 모임 생성 (조 편성 가능)
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    const startStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const event = await createEvent(presidentToken, localGroupId, {
      title: '늦참자 분배 테스트 모임',
      date: today(),
      startTime: startStr,
      location: '온라인',
      description: '늦참 분배 검증',
    });

    // 5. 투표 진행
    await castVote(presidentToken, event.id, 'ATTEND');
    await castVote(memberToken, event.id, 'ATTEND');
    await castVote(m2.accessToken, event.id, 'LATE');
    await castVote(m3.accessToken, event.id, 'LATE');

    // 5. 회장이 조 편성 진행 (2개 조)
    const resSplit = await apiRequest(`/events/${event.id}/teams/split`, 'POST', {
      teamCount: 2,
    }, presidentToken);

    expect(resSplit.status).toBe(201);
    
    // 6. 조 편성 결과 분석
    const teams = resSplit.body.teams;
    expect(teams.length).toBe(2);

    const teamA = teams[0].members;
    const teamB = teams[1].members;

    // 전체 조 인원은 각각 2명이어야 함 (총 4명)
    expect(teamA.length).toBe(2);
    expect(teamB.length).toBe(2);

    // 각 조에는 참석자 1명, 늦참자 1명씩 균등하게 배치되어야 함
    const attendeeIds = [presidentUserId, memberUserId];
    const lateIds = [m2.user.id, m3.user.id];

    const teamA_attendeeCount = teamA.filter(m => attendeeIds.includes(m.id)).length;
    const teamA_lateCount = teamA.filter(m => lateIds.includes(m.id)).length;

    const teamB_attendeeCount = teamB.filter(m => attendeeIds.includes(m.id)).length;
    const teamB_lateCount = teamB.filter(m => lateIds.includes(m.id)).length;

    expect(teamA_attendeeCount).toBe(1);
    expect(teamA_lateCount).toBe(1);
    expect(teamB_attendeeCount).toBe(1);
    expect(teamB_lateCount).toBe(1);
  });
});
