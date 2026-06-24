# Clover

모임 일정은 모이고, 참석 여부는 자동으로 알려주는 웹 서비스입니다.

동호회·스터디 모임에서 이벤트를 등록하고 **참석 / 불참 / 늦참** 투표를 받을 수 있습니다. 이벤트 생성·변경·취소 알림과 **하루 전 미투표자 리마인더**를 카카오 채널로 보냅니다.

## 주요 기능

- **홈 대시보드** — 가입한 모임 일정과 투표가 필요한 이벤트를 한눈에 확인
- **모임 관리** — 생성, 검색, 초대 링크 가입, 회장 승인제
- **프로필** — 대표 이미지 업로드 및 모임 정보 수정
- **이벤트** — 등록·수정·취소, 시작 전까지 투표 변경 가능
- **투표** — 참석 / 불참 / 늦참, 결과 전체 공개
- **캘린더** — 가입한 모든 모임 일정 통합 조회
- **알림** — 생성·변경·취소 즉시 알림 + 하루 전 미투표자 자동 리마인더 (매일 09:00)

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
| GET | `/groups` | 공개 모임 목록 |
| GET | `/groups/mine` | 내 모임 |
| POST | `/groups` | 모임 생성 |
| PATCH | `/groups/:id` | 모임 프로필 수정 |
| POST | `/groups/:id/join` | 가입 신청 |
| POST | `/uploads/group-image` | 대표 이미지 업로드 |
| POST | `/groups/:groupId/events` | 이벤트 생성 |
| POST | `/events/:id/votes` | 투표 |
| GET | `/calendar` | 통합 캘린더 |

자세한 요구사항은 [docs/PRD.md](docs/PRD.md)를 참고하세요.

## License

Private project.
