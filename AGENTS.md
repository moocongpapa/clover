# Clover 개발 가이드 (AGENTS.md)

이 문서는 Clover 프로젝트의 시스템 구조, 주요 디렉토리 역할, 실행/테스트 방법, 포트 격리 정책 및 프론트엔드/백엔드 개발 규칙을 정리한 개발자 가이드라인입니다.

---

## 목차
1. [시스템 개요 (System Overview)](#1-시스템-개요-system-overview)
2. [주요 디렉토리 구조 및 역할 (Project Architecture)](#2-주요-디렉토리-구조-및-역할-project-architecture)
3. [프로젝트 실행 및 개발 명령어 (Commands)](#3-프로젝트-실행-및-개발-명령어-commands)
4. [포트 및 실행 환경 격리 규칙 (Port & Environment Isolation)](#4-포트-및-실행-환경-격리-규칙-port--environment-isolation)
5. [인증 및 E2E 테스트 로그인 메커니즘 (Auth & Testing Hooks)](#5-인증-및-e2e-테스트-로그인-메커니즘-auth--testing-hooks)
6. [코드 스타일 및 주요 설계 규칙 (Code Style & Design Conventions)](#6-코드-스타일-및-주요-설계-규칙-code-style--design-conventions)

---

## 1. 시스템 개요 (System Overview)

Clover는 모임, 회원 정보, 일정 및 투표, 정산 이력을 관리하는 반응형 모바일 최적화 웹 애플리케이션입니다.

- **프론트엔드**: React (TypeScript) + Vite, CSS3 (Vanilla CSS 테마 변수 활용)
- **백엔드**: NestJS (TypeScript), Prisma ORM
- **데이터베이스**: PostgreSQL (개발/운영과 E2E 전용 데이터베이스를 분리)
- **테스트 프레임워크**: Playwright (E2E 테스트)

---

## 2. 주요 디렉토리 구조 및 역할 (Project Architecture)

### 📂 `frontend/` (프론트엔드)
- **`src/pages/`**: 각 탭 및 세부 화면 컴포넌트 (예: `GroupDetail.tsx`, `EditProfile.tsx` 등)
- **`src/components/`**: 공통 재사용 컴포넌트 (예: `Layout.tsx`, `NotificationBell.tsx` 등)
- **`src/context/`**: 전역 상태 관리 (예: 사용자 인증을 관리하는 `AuthContext.tsx`)
- **`src/api.ts`**: API 요청 클라이언트 및 백엔드 URL 동적 해소 로직 (`resolveApiBase`)
- **`src/index.css`**: 글로벌 스타일시트 및 CSS 디자인 토큰 정의

### 📂 `backend/` (백엔드)
- **`src/auth/`**: 카카오 OAuth2 연동 및 개발자 로그인 토큰 발급 로직
- **`src/groups/` / `src/events/` / `src/votes/`**: 모임, 일정, 투표 도메인 모듈 및 비즈니스 로직
- **`src/notifications/`**: SSE(Server-Sent Events) 기반 실시간 알림 전송 로직
- **`prisma/schema.prisma`**: 데이터베이스 스키마 정의 및 모델 구조
- **`scripts/e2e-reset.js`**: E2E 테스트 시작 전 데이터베이스를 완전히 초기화하는 스크립트

### 📂 `e2e/` (E2E 테스트)
- **`tests/clover.spec.ts`**: 전체 모임 생성, 투표, 알림 시나리오 통합 E2E 테스트
- **`tests/edge-cases.spec.ts`**: 예외 비즈니스 로직(시간 제한, 조 편성 제약 등) 검증 테스트
- **`playwright.config.ts`**: E2E 격리 서버 실행 명령어 및 포트 바인딩 설정

---

## 3. 프로젝트 실행 및 개발 명령어 (Commands)

### 백엔드 (NestJS)
- **개발 서버 실행**: `npm run start:dev` (포트: `3000`)
- **데이터베이스 동기화**: `npx prisma db push --skip-generate` (개발 스키마 변경 반영 시 실행)
- **Prisma Client 코드 생성**: `npx prisma generate`

### 프론트엔드 (React + Vite)
- **개발 서버 실행**: `npm run dev` (포트: `5174`)
- **프로덕션 빌드**: `npm run build`

### E2E 테스트 (Playwright)
- **테스트 실행**: `npm test` (또는 `e2e` 폴더 진입 후 `npx playwright test` 실행)

---

## 4. 포트 및 실행 환경 격리 규칙 (Port & Environment Isolation)

로컬에서 개발 서버를 활성화해 둔 채로 E2E 테스트를 안정적으로 돌리기 위해 포트와 리소스를 완전히 격리합니다.

| 서비스 | 로컬 개발 환경 (Dev) | 로컬 E2E 테스트 환경 (E2E) |
| :--- | :--- | :--- |
| **백엔드 (API)** | `3000` 포트 | `3001` 포트 |
| **프론트엔드 (Vite)** | `5174` 포트 | `5175` 포트 |
| **데이터베이스** | 개발용 PostgreSQL | 이름에 `e2e` 또는 `test`가 포함된 별도 PostgreSQL |

### 주의사항 및 문제 예방 (EPERM 방지)
- **테스트 데이터 보호**: E2E는 `E2E_DATABASE_URL`을 필수로 요구하고, 이름에 `e2e` 또는 `test`가 포함된 DB만 초기화합니다. 개발·운영 `DATABASE_URL`은 E2E에 전달하지 않습니다.
- **환경 변수 전달**: E2E 구동 시 Vite 서버에는 `VITE_API_URL=http://localhost:3001`을, NestJS 서버에는 `PORT=3001`, `NODE_ENV=test`, `DATABASE_URL=$E2E_DATABASE_URL`을 할당합니다.

---

## 5. 인증 및 E2E 테스트 로그인 메커니즘 (Auth & Testing Hooks)

- 일반 사용자 로그인은 **카카오 OAuth2**를 경유하여 토큰을 발급받습니다.
- **E2E 테스트 환경**에서는 복잡한 카카오 UI 인증을 생략할 수 있도록 `DEV_LOGIN_ENABLED=true` 옵션을 백엔드에 제공합니다.
- 테스트 스크립트(`e2e/tests/clover.spec.ts` 등)는 테스트용 유저 토큰 발급 API를 통해 빠르게 토큰을 주입받아 로그인을 성공시킵니다.

---

## 6. 코드 스타일 및 주요 설계 규칙 (Code Style & Design Conventions)

### 프론트엔드 (React UI)
- **모바일 웹 포커싱**: 모든 레이아웃은 모바일 세로 뷰(360px ~ 480px) 환경에서 어색함이 없고 짤리지 않도록 반응형(Flexbox, Grid)으로 구성합니다.
- **인라인 아코디언 편집 패턴**: 생년월일, 성별, 전화번호 등 상세 정보 수정 시 무거운 바텀 시트나 전체화면 모달을 여는 대신, 리스트 항목 클릭 시 아래쪽으로 부드럽게 상세 폼 영역이 열리는 **인라인 아코디언 수정 방식**을 사용합니다.
- **전화번호 8자리 입력 포맷**:
  - 휴대폰 번호 입력창은 `inputMode="numeric"` 및 `type="tel"`을 할당해 모바일 숫자 패드를 강제합니다.
  - 사용자가 앞자리 '010' 및 하이픈 없이 숫자 8자리만 입력하도록 제한하되, 입력값이 채워짐에 따라 실시간으로 `010-####-####` 구조의 실시간 양방향 마스킹 텍스트가 바인딩되도록 설계합니다.
- **CSS 스타일링**: 컴포넌트별 개별 CSS 파일을 생성해 사용하며, `--surface`, `--border-soft`, `--ink-dark`, `--ink-muted` 등 글로벌 CSS 디자인 토큰(index.css 선언)을 반드시 준수하여 조화로운 테마를 유지합니다.
