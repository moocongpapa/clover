import { expect, test } from '@playwright/test';
import {
  approveMember,
  cancelEvent,
  castVote,
  createEvent,
  createGroup,
  devLogin,
  futureStartTime,
  getNotifications,
  getVotes,
  joinGroup,
  pastStartTime,
  today,
  tomorrow,
  triggerReminders,
  updateEvent,
} from '../helpers/api';
import { loginViaUI, loginWithToken } from '../helpers/auth';

const MEMBERS = [
  '김회장',
  '이부회장',
  '박회원1',
  '최회원2',
  '정회원3',
  '강회원4',
  '조회원5',
];

test.describe('Clover 전체 기능 E2E', () => {
  test('모임·회원·일정·투표·마감·알림 전체 플로우', async ({ page, browser }) => {
  // ── 1. 회장 로그인 & 모임 2개 생성 ──
  const president = await devLogin('김회장');
  await loginWithToken(page, president.accessToken, president.user);

  await page.getByRole('link', { name: '내 모임' }).click();
  await page.getByRole('link', { name: '모임 만들기' }).click();
  await page.getByLabel('모임 이름 *').fill('E2E 독서모임');
  await page.getByLabel('소개 *').fill('Playwright 테스트용 독서모임');
  await page.getByLabel('카테고리 *').selectOption('독서');
  await page.getByRole('button', { name: '모임 만들기' }).click();
  await expect(page.getByRole('heading', { name: 'E2E 독서모임' })).toBeVisible();

  const bookClubUrl = page.url();
  const bookClubId = bookClubUrl.split('/groups/')[1];

  const devGroup = await createGroup(president.accessToken, {
    name: 'E2E 개발스터디',
    description: 'API로 만든 두 번째 모임',
    category: '개발',
    isPublic: true,
  });

  // ── 2. 여러 회원 가입 & 승인 ──
  const sessions = await Promise.all(
    MEMBERS.slice(1).map((name) => devLogin(name)),
  );

  for (const session of sessions) {
    await joinGroup(session.accessToken, bookClubId);
    await joinGroup(session.accessToken, devGroup.id);
    await approveMember(president.accessToken, bookClubId, session.user.id);
    await approveMember(president.accessToken, devGroup.id, session.user.id);
  }

  // ── 3. 이벤트 등록 (UI) ──
  await page.getByRole('link', { name: '이벤트 등록' }).click();
  await page.getByLabel('제목 *').fill('이번 주 독서 토론');
  await page.getByLabel('날짜 *').fill(tomorrow());
  await page.getByLabel('시간 *').fill('19:00');
  await page.getByLabel('장소 *').fill('강남 스터디카페');
  await page.getByLabel('설명 *').fill('7시 토론 시작');
  await page.getByRole('button', { name: '이벤트 등록' }).click();
  await expect(page.getByRole('heading', { name: '이번 주 독서 토론' })).toBeVisible();

  const eventUrl = page.url();
  const eventId = eventUrl.split('/events/')[1];

  // ── 4. CREATED 알림 확인 ──
  for (const session of sessions) {
    const notes = await getNotifications(session.accessToken);
    expect(notes.some((n) => n.type === 'CREATED' && n.event.title.includes('독서 토론'))).toBeTruthy();
  }

  // ── 5. 홈에서 투표 필요 표시 & 빠른 투표 ──
  const member1Ctx = await browser.newContext();
  const member1Page = await member1Ctx.newPage();
  await loginWithToken(member1Page, sessions[0].accessToken, sessions[0].user);

  await member1Page.goto('/');
  await expect(member1Page.getByText('투표가 필요해요')).toBeVisible();
  await expect(member1Page.getByText('이번 주 독서 토론')).toBeVisible();

  const voteCard = member1Page.locator('.home-event-card--action').first();
  await voteCard.getByRole('button', { name: '참석' }).click();
  await expect(voteCard.getByRole('button', { name: '참석' })).toHaveClass(/is-selected/);

  // ── 6. 투표 변경 (참석 → 불참) ──
  await member1Page.goto(eventUrl);
  await member1Page.getByRole('button', { name: '불참' }).click();
  const votesAfterChange = await getVotes(sessions[0].accessToken, eventId);
  expect(votesAfterChange.myVote?.choice).toBe('ABSENT');
  expect(votesAfterChange.counts.ABSENT).toBeGreaterThanOrEqual(1);

  // ── 7. 여러 회원 투표 ──
  await castVote(sessions[1].accessToken, eventId, 'ATTEND');
  await castVote(sessions[2].accessToken, eventId, 'LATE');
  await castVote(sessions[3].accessToken, eventId, 'ATTEND');
  // sessions[4], sessions[5] 미투표 → 리마인더 대상

  // ── 8. CHANGED 알림 (API로 일정 변경) ──
  await updateEvent(president.accessToken, eventId, {
    title: '이번 주 독서 토론 (시간 변경)',
    date: tomorrow(),
    startTime: '20:00',
    location: '강남 스터디카페 2층',
    description: '8시로 변경',
  });

  const changedNotes = await getNotifications(sessions[4].accessToken);
  expect(
    changedNotes.some(
      (n) => n.type === 'CHANGED' && n.event.title.includes('시간 변경'),
    ),
  ).toBeTruthy();

  await member1Page.goto(eventUrl);
  await expect(
    member1Page.getByRole('heading', { name: '이번 주 독서 토론 (시간 변경)' }),
  ).toBeVisible();

  // ── 9. 리마인더 알림 (미투표자) ──
  await triggerReminders();

  const reminderForNonVoter = await getNotifications(sessions[4].accessToken);
  expect(
    reminderForNonVoter.some((n) => n.type === 'REMINDER'),
  ).toBeTruthy();

  const reminderForVoter = await getNotifications(sessions[0].accessToken);
  expect(reminderForVoter.some((n) => n.type === 'REMINDER')).toBeFalsy();

  // ── 10. 시작된 이벤트 투표 마감 ──
  const pastEvent = await createEvent(president.accessToken, bookClubId, {
    title: '이미 시작된 모임',
    date: today(),
    startTime: pastStartTime(),
    location: '온라인',
    description: '마감 테스트',
  });

  const lockedPage = await browser.newContext().then((ctx) => ctx.newPage());
  await loginWithToken(lockedPage, sessions[5].accessToken, sessions[5].user);
  await lockedPage.goto(`/events/${pastEvent.id}`);

  await expect(lockedPage.getByText('투표가 마감되었습니다.')).toBeVisible();
  await expect(lockedPage.getByRole('button', { name: '참석' })).toHaveCount(0);

  let voteBlocked = false;
  try {
    await castVote(sessions[5].accessToken, pastEvent.id, 'ATTEND');
  } catch {
    voteBlocked = true;
  }
  expect(voteBlocked).toBeTruthy();

  const pastVotes = await getVotes(sessions[5].accessToken, pastEvent.id);
  expect(pastVotes.event.voteLocked).toBeTruthy();

  // ── 11. 이벤트 취소 & CANCELLED 알림 ──
  const cancelTarget = await createEvent(president.accessToken, devGroup.id, {
    title: '취소될 스터디',
    date: tomorrow(),
    startTime: futureStartTime(),
    location: '줌',
    description: '취소 테스트',
  });

  await page.goto(`/events/${cancelTarget.id}`);
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '이벤트 취소' }).click();
  await expect(page.getByText('취소됨')).toBeVisible();

  const cancelNotes = await getNotifications(sessions[1].accessToken);
  expect(
    cancelNotes.some(
      (n) => n.type === 'CANCELLED' && n.event.title.includes('취소될 스터디'),
    ),
  ).toBeTruthy();

  let cancelVoteBlocked = false;
  try {
    await castVote(sessions[1].accessToken, cancelTarget.id, 'ATTEND');
  } catch {
    cancelVoteBlocked = true;
  }
  expect(cancelVoteBlocked).toBeTruthy();

  // ── 12. 모임 찾기 & 캘린더 ──
  await page.goto('/groups');
  await expect(page.getByText('E2E 독서모임')).toBeVisible();
  await expect(page.getByText('E2E 개발스터디')).toBeVisible();

  await page.getByRole('link', { name: '캘린더' }).click();
  await expect(page.getByText('이번 주 독서 토론 (시간 변경)')).toBeVisible();

  // ── 13. 내 모임 목록 ──
  await page.getByRole('link', { name: '내 모임' }).click();
  await expect(page.getByText('E2E 독서모임')).toBeVisible();
  await expect(page.getByText('E2E 개발스터디')).toBeVisible();

  await member1Ctx.close();
  await lockedPage.context().close();
  });

  test('비로그인 랜딩 & 로그인 플로우', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main').getByRole('link', { name: '시작하기' })).toBeVisible();

    await loginViaUI(page, '게스트테스터');
    await expect(page.getByRole('heading', { name: '홈' })).toBeVisible();
  });
});
