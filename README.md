# 모임표 (MoimVote)

모임(동호회·스터디) 단위로 이벤트를 등록하고, **참석 / 불참 / 늦참** 투표를 받는 웹 서비스입니다.  
핵심 기능: **미투표자에게 하루 전 카카오 알림** 자동 발송.

## Tech Stack

| 영역 | 기술 |
|------|------|
| Backend | NestJS, Prisma, SQLite (로컬) / PostgreSQL (프로덕션) |
| Frontend | React, Vite, TypeScript |
| Auth | 카카오 로그인 (+ 개발 모드 로그인) |
| 알림 | 카카오 채널 API (미설정 시 콘솔 mock) |

## 빠른 시작

### 1. 백엔드

```bash
cd backend
cp .env.example .env   # 이미 .env 있으면 생략
npm install
npx prisma db push
npm run start:dev
```

API: http://localhost:3000

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

웹: http://localhost:5173

### 3. 로그인

카카오 API 키가 없으면 **개발 로그인**으로 이름만 입력해 테스트할 수 있습니다.

## PostgreSQL 사용 (Docker)

```bash
docker compose up -d
```

`backend/prisma/schema.prisma`의 provider를 `postgresql`로 변경하고  
`.env`의 `DATABASE_URL`을 `postgresql://postgres:postgres@localhost:5432/moimvote`로 설정하세요.

## 주요 기능

- 모임 생성·검색·초대 링크 가입 (승인제)
- 회장 / 운영진 역할 관리, 회장 양도
- 이벤트 등록·수정·취소
- 참석 / 불참 / 늦참 투표 (이벤트 시작 전까지 변경 가능)
- 투표 결과 전체 공개
- 통합 캘린더
- 이벤트 생성·변경·취소 시 알림
- **하루 전 미투표자 자동 리마인더** (매일 오전 9시 Cron)

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/auth/dev-login` | 개발 로그인 |
| POST | `/auth/kakao/callback` | 카카오 OAuth |
| GET | `/groups` | 공개 모임 목록 |
| GET | `/groups/mine` | 내 모임 |
| POST | `/groups` | 모임 생성 |
| POST | `/groups/:id/join` | 가입 신청 |
| GET | `/groups/:groupId/events` | 모임 이벤트 목록 |
| POST | `/groups/:groupId/events` | 이벤트 생성 |
| POST | `/events/:id/votes` | 투표 |
| GET | `/events/:id/votes` | 투표 결과 |
| GET | `/calendar` | 통합 캘린더 |

자세한 요구사항은 [docs/PRD.md](docs/PRD.md)를 참고하세요.

## 카카오 연동

`backend/.env`에 다음 값을 설정하세요.

```
KAKAO_REST_API_KEY=your_rest_api_key
KAKAO_REDIRECT_URI=http://localhost:5173/auth/callback
KAKAO_CHANNEL_ACCESS_TOKEN=your_channel_token
```

## 프로젝트 구조

```
project1/
├── backend/          # NestJS API
├── frontend/         # React 웹앱
├── docs/PRD.md       # 제품 요구사항 문서
└── docker-compose.yml
```
