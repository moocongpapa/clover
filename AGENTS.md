# Clover 개발 가이드 (AGENTS.md)

이 문서는 Clover 프로젝트의 로컬 빌드, 실행, 테스트 및 주요 설계 규칙을 정리한 개발자 가이드라인입니다.

---

## 1. 프로젝트 실행 및 개발 명령어 (Commands)

### 백엔드 (NestJS)
- **개발 서버 실행**: `npm run start:dev` (기본 포트: `3000`)
- **데이터베이스 동기화 (Prisma Push)**: `npx prisma db push --skip-generate`
- **Prisma Client 코드 생성**: `npx prisma generate`
- **E2E 백엔드용 데이터베이스 리셋**: `node scripts/e2e-reset.js`

### 프론트엔드 (React + Vite)
- **개발 서버 실행**: `npm run dev` (기본 포트: `5174`)
- **프로덕션 빌드**: `npm run build`

### E2E 테스트 (Playwright)
- **테스트 실행**: `npm test` (또는 `npx playwright test` 실행, `e2e` 폴더 내부)

---

## 2. 포트 및 실행 환경 격리 (Port Isolation)

로컬 개발 중 E2E 테스트를 동시에 원활히 실행하고 포트 충돌로 인한 서버 종료를 방지하기 위해 포트를 이중으로 격리해 사용합니다.

| 서비스 | 로컬 개발 환경 (Dev) | 로컬 E2E 테스트 환경 (E2E) |
| :--- | :--- | :--- |
| **백엔드 (API)** | `3000` 포트 | `3001` 포트 |
| **프론트엔드 (Vite)** | `5174` 포트 | `5175` 포트 |

### 중요 개발 규칙
- **E2E 테스트 실행 설정**: Playwright 테스트 구동 시, 백그라운드 서버 구동용 `playwright.config.ts` 파일의 `VITE_API_URL`은 `http://localhost:3001`로, 프론트엔드 포트는 `5175`로 할당되어 있습니다.
- **Prisma Generate 에러 방지**: 개발 서버와 E2E 테스트가 동시에 동일한 `node_modules/.prisma` 라이브러리 파일을 잠금(Lock)하여 `EPERM` 에러가 발생하는 것을 방지하기 위해, E2E 백엔드 시작 명령어에서는 `prisma generate`를 무시하고 `prisma db push --skip-generate && nest start`로 기동합니다.

---

## 3. 코드 스타일 및 아키텍처 규칙 (Code Style & Guideline)

### 프론트엔드 (React UI)
- **모바일 웹 뷰 포커싱**: 모바일 환경에 적합한 반응형 UI 및 모바일 단말기 자판 호환성을 최우선으로 고려합니다.
- **인라인 아코디언 편집 패턴**: 생년월일, 성별, 전화번호 등 상세 정보 수정 시 무거운 바텀 시트나 모달 오버레이 대신 리스트 항목을 클릭했을 때 그 자리에서 펼쳐지는 **인라인 아코디언 방식**을 채택합니다.
- **전화번호 8자리 입력 포맷**: 휴대폰 번호 수정 폼의 경우 `inputMode="numeric"` 및 `type="tel"`을 할당하여 모바일 기기에서 숫자 패드가 뜨도록 보장하고, 사용자가 hyphens(-)나 앞자리 국번(010) 없이 숫자 8자리만 입력하도록 제한하되, 입력창 내에는 실시간으로 `010-####-####` 구조의 실시간 양방향 바인딩 마스킹 텍스를 렌더링합니다.
- **CSS 스타일링**: 컴포넌트마다 전용 CSS 파일을 사용하며 CSS 변수(`var(--surface)`, `var(--border-soft)`, `var(--ink-dark)` 등)를 준수합니다.

### 백엔드 (NestJS)
- **Prisma ORM**: 데이터베이스 변경 시 `prisma/schema.prisma`를 수정하고 `prisma db push`를 실행하여 스키마를 동기화합니다.
- **SQLite 사용**: 개발 및 테스트 전체에서 가볍고 호환성이 높은 SQLite 데이터베이스(기본 `dev.db`, E2E용 `e2e.db`)를 내장하여 사용합니다.
