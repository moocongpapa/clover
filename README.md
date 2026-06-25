# Clover

모임 일정은 모이고, 참석 여부는 자동으로 알려주는 웹 서비스입니다.

동호회·스터디 모임에서 이벤트를 등록하고 **참석 / 불참 / 늦참** 투표를 받을 수 있습니다. 이벤트 생성·변경·취소 알림과 **하루 전 미투표자 리마인더**를 카카오 채널로 보냅니다.

## 주요 기능

- **홈 대시보드** — 가입한 모임 일정과 투표가 필요한 이벤트를 한눈에 확인
- **모임 관리** — 생성, 검색(카테고리·이름), 초대 링크 가입, 회장 승인제, 활동 지역·모임 통장 정보
- **역할** — 회장 / 부회장 / 총무 / 운영진 / 일반 회원, 회장 양도
- **프로필** — 대표 이미지 업로드, 소개글 수정
- **이벤트** — 등록·수정·취소, 시작 전까지 투표 변경 가능, 제목 추천
- **투표** — 참석 / 불참 / 늦참, 결과·미투표자 전체 공개
- **조 편성** — 참석자를 2~4개 조로 자동 분배 (시작 30분 전부터)
- **캘린더** — 가입한 모든 모임 일정 통합 조회 (목록/달력 전환)
- **알림** — 헤더 🔔 벨에 읽지 않은 알림 수 표시, 열면 읽음 처리
  - 이벤트 생성·변경·취소, 하루 전 미투표자 리마인더 (매일 09:00)
  - 가입 요청(운영진 대상) · 가입 승인(신청자 대상) 알림

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | NestJS, Prisma |
| Database | SQLite (로컬) / PostgreSQL (프로덕션) |
| Frontend | React, Vite, TypeScript |
| Auth | 카카오 로그인 + 개발 모드 로그인 |
| 알림 | 카카오 채널 API (미설정 시 콘솔 mock) |
| E2E | Playwright |

## 빠른 시작

### 1. 백엔드

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run start:dev
```

API → http://localhost:3000

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

웹 → http://localhost:5173

### 3. 로그인

카카오 API 키가 없으면 **개발 로그인**에서 이름만 입력해 테스트할 수 있습니다.

### 4. 샘플 데이터 (선택)

```bash
cd backend
npm run db:seed
```

`김완석`으로 개발 로그인하면 다양한 모임·일정·투표 상태를 바로 확인할 수 있습니다.

### 5. 같은 네트워크의 다른 기기(모바일)에서 접속

Vite dev 서버는 `host: true`로 실행되어 LAN에 노출됩니다. 휴대폰 브라우저에서 `http://<PC의 로컬 IP>:5173`으로 접속하면 됩니다. 백엔드 CORS는 사설 IP 대역(192.168.x.x, 10.x.x.x, 172.16–31.x.x)을 허용합니다.

## 프로젝트 구조

```
clover/
├── backend/          # NestJS API
├── frontend/         # React 웹앱
├── e2e/              # Playwright E2E 테스트
├── docs/PRD.md       # 제품 요구사항
└── docker-compose.yml
```

## E2E 테스트

```bash
cd e2e
npm install
npx playwright install chromium
npm run test:headed   # Chrome 창 표시
npm test              # 헤드리스
```

## 카카오 연동

`backend/.env`에 설정합니다.

```env
KAKAO_REST_API_KEY=your_rest_api_key
KAKAO_REDIRECT_URI=http://localhost:5173/auth/callback
KAKAO_CHANNEL_ACCESS_TOKEN=your_channel_token
```

## PostgreSQL (Docker)

```bash
docker compose up -d
```

`backend/prisma/schema.prisma`의 provider를 `postgresql`로 변경하고,  
`DATABASE_URL`을 `postgresql://postgres:postgres@localhost:5432/clover`로 설정하세요.

## API 요약

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/dev-login` | 개발 로그인 |
| GET | `/auth/me` · PATCH `/auth/me` | 내 정보 조회·수정 |
| GET | `/groups` | 공개 모임 목록·검색 |
| GET | `/groups/mine` | 내 모임 |
| POST | `/groups` · PATCH `/groups/:id` | 모임 생성·수정 |
| POST | `/groups/:id/join` · `/join/cancel` · `/leave` | 가입 신청·취소·탈퇴 |
| PATCH | `/groups/:id/members/:userId` | 승인/거절/역할 변경 |
| POST | `/groups/:id/transfer-president` | 회장 양도 |
| POST | `/groups/:groupId/events` | 이벤트 생성 |
| PATCH | `/events/:id` · POST `/events/:id/cancel` | 이벤트 수정·취소 |
| GET/POST | `/events/:id/teams` · `/teams/split` | 조 편성 조회·실행 |
| POST/GET | `/events/:eventId/votes` | 투표·결과 조회 |
| GET | `/calendar` | 통합 캘린더 |
| GET | `/notifications` | 알림 목록 |
| GET | `/notifications/unread-count` | 읽지 않은 알림 수 |
| PATCH | `/notifications/read` | 알림 읽음 처리 |
| POST | `/uploads/group-image` · `/uploads/profile-image` | 이미지 업로드 |

자세한 요구사항은 [docs/PRD.md](docs/PRD.md)를 참고하세요.

## License

Private project.
