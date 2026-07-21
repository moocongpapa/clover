# Clover

모임 일정은 모이고, 참석 여부는 자동으로 알려주는 웹 서비스입니다.

동호회·스터디 모임에서 이벤트를 등록하고 **참석 / 불참 / 늦참** 투표를 받을 수 있습니다. 이벤트 생성·변경·취소 알림과 **하루 전 미투표자 리마인더**를 카카오 채널로 보냅니다.

---

## 주요 기능

- **홈 대시보드** — 가입한 모임 일정과 투표가 필요한 이벤트를 한눈에 확인.
- **모임 관리** — 생성, 검색(카테고리·이름), 초대 링크 가입, 회장 승인제, 활동 지역·모임 통장 정보 관리.
- **역할 및 권한** — 회장 / 부회장 / 총무 / 운영진 / 일반 회원 역할 관리 및 회장 권한 양도 기능.
- **프로필 설정 (인라인 아코디언)** — 닉네임 표기 제거 및 이름 수정 불가 고정. 생년월일, 성별, 휴대폰 번호 편집 시 하단 바텀 시트나 오버레이 없이 리스트 행에서 바로 전개되어 변경되는 **인라인 아코디언 UI**.
- **전화번호 8자리 자동 마스킹** — 국번(010)과 하이픈 입력 없이 숫자 8자리만 터치 키보드로 바로 타이핑하면 실시간으로 `010-####-####` 형식으로 자동 바인딩 및 마스킹.
- **이벤트** — 등록·수정·취소, 시작 전까지 자유로운 투표 변경, AI 제목 추천.
- **투표** — 참석 / 불참 / 늦참, 결과 및 미투표자 리스트 실시간 공개.
- **회비 관리 및 상태별 필터** — 모임 내 회비 납부 이력 관리 및 월별 선택 기능. 하단 서브 탭을 통해 **전체 / 납부 / 미납** 회원 리스트를 조건별로 필터링하여 모아보기 지원.
- **조 편성 (팀 나누기)** — 참석자를 2~4개 조로 자동 분배 (시작 30분 전부터 늦참 투표자까지 균등하게 분배 지원).
- **캘린더** — 가입한 모든 모임 일정 통합 조회 (목록 뷰 / 달력 뷰 전환).
- **알림** — 헤더 🔔 벨에 읽지 않은 실시간 알림 수(SSE) 표시 및 일괄 읽음 처리 지원.
  - 이벤트 생성·변경·취소, 하루 전 미투표자 리마인더 (매일 09:00).
  - 가입 요청(운영진 대상) 및 가입 승인(신청자 대상) 알림.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Backend** | NestJS, Prisma ORM |
| **Database** | SQLite (로컬 개발/E2E 테스트) / PostgreSQL (프로덕션) |
| **Frontend** | React, Vite, TypeScript, Vanilla CSS (테마 변수 활용) |
| **Auth** | 카카오 로그인 (OAuth2) + 개발 테스트 모드 로그인 |
| **알림** | 카카오 채널 API (로컬 미설정 시 콘솔 모킹 발송) |
| **E2E Test** | Playwright |

---

## 빠른 시작

### 1. 백엔드 (NestJS)
```bash
cd backend
cp .env.example .env
npm install
npx prisma db push --skip-generate
npm run start:dev
```
- API 접속 주소: `http://localhost:3000`

### 2. 프론트엔드 (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- 웹 애플리케이션 접속 주소: `http://localhost:5174`

### 3. 로그인
카카오 API 키가 설정되지 않은 로컬 개발 환경에서는 **개발 로그인** 탭을 선택하고 이름만 입력하여 바로 편리하게 테스트할 수 있습니다.

### 4. 샘플 데이터 시딩 (선택)
```bash
cd backend
npm run db:seed
```
`김완석` 이름으로 개발 로그인하면 사전에 준비된 가상의 모임·일정·투표 및 정산 상태 데이터를 바로 확인할 수 있습니다.

### 5. 모바일 기기 실기기 테스트
Vite 개발 서버는 `host: true`로 실행되어 동일 LAN 환경의 기기에 노출됩니다. 모바일 브라우저에서 `http://<PC의 로컬 IP>:5174`로 접속하면 완벽하게 반응형으로 동작하는 모바일 모드 최적화 UI를 테스트할 수 있습니다.

---

## 프로젝트 구조

```text
clover/
├── backend/          # NestJS API 서버 및 데이터베이스(Prisma)
├── frontend/         # React 웹 애플리케이션 (포트: 5174)
├── e2e/              # Playwright E2E 통합 테스트 시나리오 (포트: 5175 / 3001)
├── docs/PRD.md       # 제품 요구사항 정의서 (PRD)
├── AGENTS.md         # AI 에이전트 및 로컬 개발용 가이드라인
└── docker-compose.yml
```

---

## E2E 통합 테스트

로컬 개발 서버(`3000`, `5174` 포트)가 기동 중인 상태에서도 아무런 리소스/포트 충돌 없이 안정적으로 E2E 테스트를 수행하도록 **독립된 포트 구성 및 SQLite DB 환경 격리**를 적용했습니다.

- **E2E 백엔드 API 포트**: `3001` (데이터베이스: `backend/e2e.db`)
- **E2E 프론트엔드 포트**: `5175`

```bash
cd e2e
npm install
npx playwright install chromium
npm test              # 헤드리스 모드로 7개 통합 시나리오 자동 테스트 실행
npm run test:headed   # 크롬 브라우저 창을 띄워 시각적으로 테스트 수행
```

---

## API 엔드포인트 요약

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/dev-login` | 개발자용 테스트 로그인 |
| GET | `/auth/me` · PATCH `/auth/me` | 사용자 프로필 정보 조회 및 수정 |
| GET | `/groups` | 공개 모임 목록 조회 및 검색 |
| GET | `/groups/mine` | 내가 가입한 모임 목록 |
| POST | `/groups` · PATCH `/groups/:id` | 모임 생성 및 수정 |
| POST | `/groups/:id/join` · `/join/cancel` · `/leave` | 모임 가입 신청, 가입 취소, 모임 탈퇴 |
| PATCH | `/groups/:id/members/:userId` | 가입 승인/거절 및 회원 권한 변경 |
| POST | `/groups/:id/transfer-president` | 회장 직책 양도 |
| POST | `/groups/:groupId/events` | 새 일정 생성 |
| PATCH | `/events/:id` · POST `/events/:id/cancel` | 일정 수정 및 일정 취소 |
| GET/POST | `/events/:id/teams` · `/teams/split` | 조 편성 조회 및 조 분배 자동 실행 |
| POST/GET | `/events/:eventId/votes` | 일정 투표 제출 및 투표 결과 조회 |
| GET | `/calendar` | 통합 캘린더 일정 목록 |
| GET | `/notifications` | 실시간 SSE 알림 목록 조회 |
| GET | `/notifications/unread-count` | 읽지 않은 알림 개수 조회 |
| PATCH | `/notifications/read` | 알림 개별/일괄 읽음 처리 |
| POST | `/uploads/group-image` · `/uploads/profile-image` | 이미지 파일 업로드 |
