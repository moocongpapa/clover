# PRD: 모임 이벤트 등록 & 참석 투표 시스템

**Status:** ready-for-agent  
**Stack:** Node.js (NestJS) + PostgreSQL + React (웹)  
**Version:** MVP 1.0

---

## Problem Statement

소규모 동호회·스터디 모임은 회의·세미나·정기 모임 일정을 잡을 때 카카오톡 투표, 구글 폼, 밴드 등 여러 도구를 섞어 씁니다. 그 결과 일정과 참석 여부가 여러 곳에 흩어지고, **아직 투표하지 않은 회원을 일일이 독촉**해야 하는 부담이 큽니다. 모임별로 일정·투표·알림이 한곳에서 관리되지 않아 운영진의 수고가 크고, 참석 현황 파악도 어렵습니다.

## Solution

**모임(그룹) 단위**로 이벤트를 등록하고, 회원이 **참석 / 불참 / 늦참**으로 투표할 수 있는 웹 서비스를 제공합니다. 카카오 로그인으로 간편히 가입하고, **이벤트 생성 시 전체 알림**과 **하루 전 미투표자 대상 자동 알림**을 카카오 채널로 보냅니다. 가입한 모든 모임 일정은 통합 캘린더에서 한눈에 볼 수 있습니다.

핵심 가치: **미투표자에게 자동으로 알림이 가는 것** — 기존 수동 독촉을 대체합니다.

---

## User Stories

### 인증 & 계정

1. As a visitor, I want to sign in with Kakao only, so that I can join the service without creating a separate email account.
2. As a signed-in user, I want my profile to show my Kakao display name and profile image, so that other members can identify me in vote results.
3. As a signed-in user, I want to sign out, so that I can protect my account on shared devices.
4. As a returning user, I want my session to persist across browser visits, so that I do not have to log in every time.

### 모임 생성 & 관리

5. As a signed-in user, I want to create a new 모임 (group), so that I can start organizing events for my club or study group.
6. As a 모임 creator, I want to automatically become the 회장 (president) of the group I created, so that I have initial management authority.
7. As a 회장, I want to set the 모임 name, description, profile image, category, and public visibility, so that the group is properly represented.
8. As a 회장, I want to designate members as 운영진 (officers), so that they can help manage the group and register events.
9. As a 회장, I want to remove members from the 운영진 role, so that I can adjust the management team over time.
10. As a 회장, I want to transfer the 회장 role to another member, so that leadership can change without dissolving the group.
11. As a 회장 or 운영진, I want to approve or reject membership requests, so that I control who joins the group.
12. As a 회장 or 운영진, I want to see a list of pending membership requests, so that I can process them efficiently.
13. As a 회장 or 운영진, I want to remove a member from the group, so that I can manage inactive or problematic members.
14. As a member, I want to leave a 모임 voluntarily, so that I am no longer associated with a group I no longer participate in.

### 모임 탐색 & 가입

15. As a signed-in user, I want to browse a list of publicly visible 모임, so that I can discover clubs I might want to join.
16. As a signed-in user, I want to search 모임 by name or category, so that I can find groups relevant to my interests.
17. As a signed-in user, I want to view a 모임's public profile (name, description, category, member count) before joining, so that I can decide whether to apply.
18. As a signed-in user, I want to request to join a 모임, so that I can become a member after approval.
19. As a signed-in user, I want to join a 모임 via an invite link without searching, so that I can quickly join when a friend shares a link.
20. As a user with a pending request, I want to see my application status, so that I know I am waiting for approval.
21. As a user, I want to belong to multiple 모임 simultaneously, so that I can participate in several clubs at once.
22. As a signed-in user, I want to see a list of all 모임 I belong to, so that I can navigate to each group easily.

### 이벤트 등록 & 관리

23. As an 운영진 member, I want to register an event with title, date, time, location, and description, so that members know the meeting details.
24. As an 운영진 member, I want events to be visible only to approved 모임 members, so that private group activities stay within the group.
25. As an 운영진 member, I want to edit event details before the event starts, so that I can correct mistakes or update information.
26. As an 운영진 member, I want existing votes to be preserved when I change the event schedule, so that members do not have to vote again unnecessarily.
27. As an 운영진 member, I want all members to receive a notification when the event schedule changes, so that everyone is aware of the update.
28. As an 운영진 member, I want to cancel an event, so that members know the meeting will not happen.
29. As an 운영진 member, I want all members to receive a notification when an event is cancelled, so that no one shows up to a cancelled meeting.
30. As a member, I want to see cancelled events marked clearly as "취소됨", so that I do not confuse them with active events.
31. As a non-운영진 member, I want to be prevented from creating events, so that only authorized people manage the schedule.

### 투표

32. As an approved 모임 member, I want to vote 참석, 불참, or 늦참 on an event, so that I can communicate my attendance intention.
33. As a voter, I want to change my vote until the event start time, so that I can update my plans if they change.
34. As a voter, I want to be prevented from changing my vote after the event has started, so that attendance records are finalized.
35. As a member, I want to see who voted 참석, 불참, or 늦참 with their names, so that I know who is coming.
36. As a member, I want to see vote counts (e.g., 참석 12, 불참 3, 늦참 2), so that I can gauge overall attendance at a glance.
37. As a member who has not voted, I want to clearly see that I have not yet responded, so that I am reminded to vote.
38. As a non-member, I want to be prevented from viewing or voting on a 모임's events, so that group privacy is maintained.

### 알림 (카카오 채널)

39. As a 모임 member, I want to receive a Kakao channel notification when a new event is created, so that I know about upcoming meetings immediately.
40. As a member who has not voted, I want to receive a Kakao channel reminder one day before the event, so that I do not forget to respond.
41. As a member who has already voted, I want to NOT receive the one-day-before reminder, so that I am not spammed with unnecessary notifications.
42. As a member, I want to receive a Kakao notification when an event schedule changes, so that I am aware of updates.
43. As a member, I want to receive a Kakao notification when an event is cancelled, so that I do not make plans around a dead event.
44. As a user, I want to link my Kakao account for channel notifications during or after login, so that the system can reach me on Kakao.

### 화면 & 탐색 (웹)

45. As a member, I want to see a list of upcoming and past events within each 모임, so that I can review that group's schedule.
46. As a member of multiple 모임, I want to see a unified calendar of all events across my groups, so that I can manage my personal schedule.
47. As a member, I want to click an event to see its full details and current vote results, so that I have all information in one place.
48. As a member, I want the web app to work on both desktop and mobile browsers, so that I can vote from any device.
49. As a visitor, I want to see a landing page explaining the service, so that I understand what the platform does before signing in.

### 운영진 역할 관리

50. As a 회장, I want to see who is currently in the 운영진, so that I know who can register events.
51. As a member, I want to see who the 회장 and 운영진 are, so that I know who to contact for group matters.
52. As a former 회장 after transferring the role, I want to remain in the group (as 운영진 or regular member based on configuration), so that I can still participate without managing leadership duties.

---

## Implementation Decisions

### Tech Stack

- **Runtime:** Node.js (LTS)
- **Backend framework:** NestJS — 모듈 단위로 Auth, Groups, Events, Votes, Notifications 도메인을 분리하기에 적합
- **Frontend:** React + Vite (SPA) — 웹 MVP, 모바일 브라우저 대응
- **Database:** PostgreSQL — 관계형 데이터(모임-회원-이벤트-투표)에 적합
- **ORM:** Prisma — 스키마 관리 및 타입 안전성
- **Auth:** Kakao OAuth 2.0 (카카오 로그인) — JWT 세션 토큰 발급
- **Notifications:** Kakao Channel Message API (알림톡/친구톡) — 비즈니스 채널 연동 필요
- **Scheduler:** `@nestjs/schedule` 또는 BullMQ — 하루 전 미투표자 알림 배치 작업

### Domain Model (Core Entities)

```
User
  - kakaoId (unique)
  - displayName
  - profileImageUrl
  - kakaoChannelUserKey (nullable, for notifications)

Group (모임)
  - name, description, profileImageUrl, category
  - isPublic (검색·목록 노출 여부)
  - inviteCode (초대 링크용, unique)

GroupMember
  - userId, groupId
  - role: MEMBER | OFFICER | PRESIDENT
  - status: PENDING | APPROVED | REJECTED

Event
  - groupId
  - title, date, startTime, location, description
  - status: ACTIVE | CANCELLED
  - createdBy (userId)

Vote
  - eventId, userId (unique per event)
  - choice: ATTEND | ABSENT | LATE
  - votedAt, updatedAt

NotificationLog
  - userId, eventId, type (CREATED | REMINDER | CHANGED | CANCELLED)
  - sentAt
```

### Role & Permission Rules

- **PRESIDENT (회장):** 운영진 지정/해제, 회장 양도, 가입 승인/거절, 회원 제거, 이벤트 등록·수정·취소
- **OFFICER (운영진):** 가입 승인/거절, 이벤트 등록·수정·취소
- **MEMBER:** 이벤트 열람, 투표, 모임 탈퇴
- 회장 양도 시: 기존 회장은 OFFICER로 강등 (또는 MEMBER — MVP에서는 OFFICER로 유지)
- 이벤트 등록·수정·취소는 PRESIDENT 또는 OFFICER만 가능

### API Modules (NestJS)

| Module | Responsibility |
|--------|---------------|
| `AuthModule` | Kakao OAuth callback, JWT 발급·검증 |
| `GroupsModule` | 모임 CRUD, 가입 신청·승인, 초대 링크, 운영진·회장 관리 |
| `EventsModule` | 이벤트 CRUD, 일정 변경·취소, 모임별·통합 목록 |
| `VotesModule` | 투표 생성·수정, 결과 조회 |
| `NotificationsModule` | 카카오 채널 메시지 발송, 스케줄러 연동 |
| `CalendarModule` | 가입 모임 전체 이벤트 통합 조회 (EventsModule 위 레이어) |

### Key API Contracts (REST)

```
POST   /auth/kakao/callback        → JWT 발급
GET    /groups                     → 공개 모임 목록·검색
POST   /groups                     → 모임 생성
GET    /groups/:id                 → 모임 상세
POST   /groups/:id/join            → 가입 신청
POST   /groups/join/:inviteCode    → 초대 링크 가입 신청
PATCH  /groups/:id/members/:userId → 승인/거절/역할 변경/제거
POST   /groups/:id/transfer-president → 회장 양도

GET    /groups/:id/events          → 모임별 이벤트 목록
POST   /groups/:id/events          → 이벤트 생성 (운영진)
PATCH  /events/:id                 → 이벤트 수정 (운영진)
POST   /events/:id/cancel          → 이벤트 취소 (운영진)

POST   /events/:id/votes           → 투표 (참석/불참/늦참)
PATCH  /events/:id/votes           → 투표 변경 (시작 전까지만)
GET    /events/:id/votes           → 투표 결과 (이름 포함, 전체 공개)

GET    /calendar                   → 내 가입 모임 통합 이벤트 목록
```

### Notification Flow

1. **이벤트 생성:** `EventsModule` → `NotificationsModule.sendToGroupMembers(groupId, CREATED)`
2. **일정 변경:** `EventsModule` → `NotificationsModule.sendToGroupMembers(groupId, CHANGED)` — 투표 유지
3. **이벤트 취소:** `EventsModule` → `NotificationsModule.sendToGroupMembers(groupId, CANCELLED)`
4. **하루 전 미투표자:** Cron (매일 특정 시각) → 대상 이벤트 조회 (내일 시작) → 미투표 APPROVED 멤버만 `REMINDER` 발송

### Vote State Machine

```
[no vote] ──vote──→ ATTEND | ABSENT | LATE
ATTEND | ABSENT | LATE ──change (before start)──→ ATTEND | ABSENT | LATE
any state ──event started──→ locked (no further changes)
```

### Frontend Pages

- `/` — 랜딩
- `/login` — 카카오 로그인
- `/groups` — 모임 목록·검색
- `/groups/:id` — 모임 상세, 회원·운영진, 이벤트 목록
- `/groups/:id/events/new` — 이벤트 등록 (운영진)
- `/events/:id` — 이벤트 상세 + 투표 UI + 결과
- `/calendar` — 통합 캘린더
- `/my-groups` — 내 모임 목록

---

## Testing Decisions

### 원칙

- **외부 행동만 테스트** — HTTP 요청·응답, DB 상태, 알림 발송 여부 등 관찰 가능한 결과를 검증
- 구현 세부(내부 private 메서드, Prisma 쿼리 형태)는 테스트하지 않음
- **단일 최고 seam:** NestJS HTTP API 통합 테스트 (`supertest` + 테스트 DB)

### 테스트 대상 모듈

| 우선순위 | 시나리오 | 검증 내용 |
|---------|---------|----------|
| P0 | 카카오 로그인 → JWT 발급 | 인증 토큰 반환 |
| P0 | 모임 생성 → 회장 자동 지정 | GroupMember.role = PRESIDENT |
| P0 | 가입 신청 → 승인 → 이벤트 열람 | 비회원 접근 거부, 회원 접근 허용 |
| P0 | 운영진 이벤트 생성 → 회원 투표 → 결과 조회 | 참석/불참/늦참 반영, 이름 공개 |
| P0 | 투표 변경 (시작 전) / 거부 (시작 후) | 시간 기반 잠금 |
| P0 | 일정 변경 시 투표 유지 | Vote 레코드 unchanged |
| P0 | 하루 전 미투표자 알림 | 투표한 사람 제외, 미투표자만 NotificationLog |
| P1 | 회장 양도 | 역할 교체 정확성 |
| P1 | 운영진만 이벤트 등록 | 권한 거부 |
| P1 | 이벤트 취소 → 상태 CANCELLED | status 변경 + 알림 트리거 |

### Prior Art

- Greenfield 프로젝트 — 기존 테스트 패턴 없음
- NestJS 공식 패턴: `e2e/` 디렉터리에 `app.e2e-spec.ts`, 테스트용 PostgreSQL (Docker) 사용

### 제안 Testing Seam

```
[HTTP Client] → [NestJS App (full)] → [Test PostgreSQL]
                      ↓
              [NotificationsModule mock]
```

카카오 API·채널 메시지는 테스트 환경에서 **mock adapter**로 대체하고, `NotificationLog` 기록 및 대상 userId 목록만 검증합니다. 이 seam 하나로 Auth → Groups → Events → Votes → Notifications 전체 흐름을 커버합니다.

---

## Out of Scope (MVP)

- 모바일 네이티브 앱 (iOS/Android)
- 이메일·비밀번호 로그인
- 반복 일정 (매주/매월 정기 생성)
- 정원 제한 및 대기자 명단
- 이벤트 댓글·채팅
- 파일 첨부 (회의 자료 등)
- 플랫폼 전체 관리자 (슈퍼 어드민) 콘솔
- SMS·이메일·슬랙 등 카카오 외 알림 채널
- 다국어 지원
- 오프라인/실시간 동기화 (PWA)

---

## Further Notes

### 카카오 연동 사전 준비

- [Kakao Developers](https://developers.kakao.com) 앱 등록 (로그인 + 메시지 API)
- 카카오 비즈니스 채널 개설 및 메시지 API 권한 신청
- OAuth Redirect URI, 채널 연동 키 환경 변수 관리 (`.env` — 커밋 금지)

### 용어 정리 (Domain Glossary)

| 용어 | 영문 (코드) | 설명 |
|------|------------|------|
| 모임 | Group | 동호회·스터디 단위 |
| 회장 | President | 모임 최고 관리자, 운영진 지정·회장 양도 가능 |
| 운영진 | Officer | 이벤트 등록·가입 승인 권한 보유 |
| 이벤트 | Event | 회의·세미나 등 일정 단위 |
| 참석/불참/늦참 | ATTEND/ABSENT/LATE | 투표 선택지 |

### Issue Tracker

현재 프로젝트에 Git 저장소 및 이슈 트래커가 설정되어 있지 않습니다. GitHub 저장소 생성 후 이 PRD를 이슈로 등록하고 `ready-for-agent` 라벨을 적용하세요. (`/setup-matt-pocock-skills` 실행 권장)

### 구현 순서 제안

1. NestJS 프로젝트 셋업 + Prisma 스키마 + PostgreSQL
2. Kakao OAuth + JWT 인증
3. Groups 모듈 (생성, 가입, 역할)
4. Events 모듈 (CRUD, 취소)
5. Votes 모듈
6. React 웹 UI (모임·이벤트·투표)
7. Notifications 모듈 + 스케줄러
8. 통합 캘린더 UI
