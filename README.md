# 🍀 Clover (클로버)

> **모임 일정은 한눈에, 참석 투표는 자동으로.**  
> 번거로운 단톡방 투표와 참석 확인을 끝내고, 일정 생성부터 카카오톡 리마인더, 조 편성, 회비 정산까지 한번에 해결하는 모바일 최적화 모임 관리 웹 서비스입니다.

---

## 🌐 라이브 서비스 배포 주소

| 서비스 | 플랫폼 | 역할 및 엔드포인트 |
| :--- | :--- | :--- |
| **Frontend (웹앱 & PWA)** | **Vercel** | [https://clover-gilt.vercel.app](https://clover-gilt.vercel.app) (Edge Global CDN) |
| **Backend (REST API & SSE)** | **Render** | [https://clover-backend-vm9k.onrender.com](https://clover-backend-vm9k.onrender.com) (24/7 Always-On Starter Server) |
| **Database (PostgreSQL)** | **Supabase** | `aws-0-ap-southeast-1.pooler.supabase.com` (영구 클라우드 DB) |
| **Cloud Storage** | **Firebase** | `clover-e3338.firebasestorage.app` (모임/프로필 사진 영구 CDN 스토리지) |
| **Push Notification** | **Firebase & Kakao** | `clover-e3338` (FCM Web Push) + **KakaoTalk** 알림톡 리마인더 |

---

## 🏗️ 4대 멀티 클라우드 시스템 아키텍처

```mermaid
flowchart TD
    User([사용자 모바일 & PC 브라우저])
    
    subgraph Frontend ["1. Frontend (Vercel)"]
        VercelApp["https://clover-gilt.vercel.app"]
        PWA["PWA Service Worker (오프라인/앱 설치)"]
        FCMClient["Firebase FCM Client SDK"]
        FBStorageClient["Firebase Cloud Storage SDK"]
    end
    
    subgraph Backend ["2. Backend (Render)"]
        RenderAPI["https://clover-backend-vm9k.onrender.com"]
        CORS["CORS: Vercel & HTTPS 화이트리스트"]
        AuthService["카카오 OAuth2 & JWT 인증"]
        NotifyService["FCM Admin & 카카오톡 알림톡"]
    end
    
    subgraph Database ["3. Database (Supabase)"]
        Postgres["PostgreSQL 영구 클라우드 데이터베이스"]
        PrismaPooler["Prisma Transaction & Connection Pooling"]
    end
    
    subgraph CloudStorage ["4. 영구 미디어 스토리지 (Firebase Storage)"]
        StorageBucket["Firebase Storage (clover-e3338)"]
    end

    subgraph PushService ["5. 알림 파이프라인 (Firebase & Kakao)"]
        FirebaseFCM["Firebase Cloud Messaging (FCM)"]
        KakaoAPI["Kakao Developers API (메시지/알림톡)"]
    end

    User <-->|HTTPS / PWA| VercelApp
    VercelApp <-->|REST API / Bearer Token| RenderAPI
    VercelApp -->|영구 사진 업로드| StorageBucket
    RenderAPI <-->|Prisma ORM / SSL| Postgres
    RenderAPI -->|1차 Web Push| FirebaseFCM
    RenderAPI -->|2차 리마인더 / 알림톡| KakaoAPI
```

---

## ✨ 핵심 기능 및 차별화된 UX

### 1. 🎯 인터랙티브 첫 화면 (Live Demo Card)
- 방문자가 회원가입 전에도 **실제 모임 카드에서 `[참석]` / `[늦참]` / `[불참]` 버튼을 직접 눌러 실시간 집계를 체험**할 수 있는 시그니처 데모 UI 제공.
- 카카오 계정으로 1초 만에 시작하는 간편 온보딩 지원.

### 2. ⚡ 원터치 스마트 프로필 입력 (Toss/Karrot Style)
- **성별**: 휠 스크롤 제거 ➔ `[ 🙋‍♂️ 남성 ] [ 🙋‍♀️ 여성 ]` 2분할 원터치 세그먼트 버튼 (0.1초 선택 & 즉시 자동 저장).
- **생년월일**: 스마트 8자리 직접 입력(`1995.01.01`) + 우측 원클릭 달력(📅) 피커 + `[ ⚡ 빠른 년생 ]` 미니 토글.
- **휴대폰 번호**: `010` 고정 및 8자리 숫자 입력 즉시 `010-####-####` 실시간 양방향 마스킹.
- **실시간 자동 저장(Auto-Save)**: 입력과 동시에 백엔드로 자동 동기화되어 별도의 저장 버튼 불필요.

### 3. ⏰ 30분 단위 일정 생성 & 템플릿 불러오기
- **30분 단위 전용 드롭다운**: 브라우저의 1분 단위 휠 팝업을 제거하고 30분 단위 시간 선택 제공.
- **`[ 저녁 7:30 ~ 10:00 (추천) ]` 단일 퀵 프리셋**: 저녁 운동/모임 시간을 원터치로 자동 세팅.
- **💡 이전 일정 1초 불러오기**: 매주 반복되는 일정의 제목, 장소, 시간, 리마인더를 탭 한 번에 자동 입력.
- **시작/종료 시간 완전 독립 분리**: 시작 시간을 변경해도 설정해둔 종료 시간이 임의로 바뀌지 않음.

### 4. 📢 스마트 새소식 알림 (유형별 뱃지 & 2단 분리 레이아웃)
- **명확한 카테고리 뱃지**: `[ 📅 새 일정 ]`, `[ ✏️ 일정 변경 ]`, `[ ⏰ 투표 리마인더 ]`, `[ 🚫 일정 취소 ]`, `[ 👋 가입 신청 ]`, `[ 🎉 가입 승인 ]`으로 알림 성격 즉시 파악.
- **2단 헤드라인 & 세부 내용 분리**: 알림 핵심 메시지 아래에 일정명/내용을 한 줄 띄워 `📌 이번 주 정기 풋살 매치` 형태의 깔끔한 강조 박스로 렌더링하여 가독성 극대화.
- **상대 시간 표기**: `방금 전`, `10분 전`, `2시간 전`, `어제` 등으로 직관적 표기.

### 5. 📸 Firebase Cloud Storage 영구 미디어 보존
- 모임 대표 사진 및 프로필 사진을 **Google Firebase Cloud Storage 영구 CDN 버킷**에 직접 저장하여, 서버 재시작이나 슬립 모드에 영향받지 않고 100% 안전하게 영구 유지.

### 6. 💬 카카오톡 & FCM 핀포인트 알림
- **미투표자 자동 리마인더**: 단톡방 도배 없이, 마감 전 미투표한 회원에게만 카카오톡으로 친절하게 리마인더 발송.
- **안전한 배포 링크 바인딩**: 알림톡의 [자세히 보기] 클릭 시 배포 도메인(`https://clover-gilt.vercel.app`)으로 바로 연결.

### 7. 👥 자동 조 편성 & 투명한 회비 정산
- **공정한 팀 밸런스 매칭**: 참석 확정 인원을 2~4개 팀으로 자동 분배.
- **회비 관리**: 월별 회비 납부 내역 및 전체/납부/미납 필터링 조회.

---

## 🛠️ 기술 스택

| 영역 | 기술 스택 |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Vanilla CSS (Design Tokens), Workbox (PWA) |
| **Backend** | NestJS, Prisma ORM, RxJS, Server-Sent Events (SSE) |
| **Database** | PostgreSQL (Supabase Cloud) / SQLite (로컬 개발 & E2E) |
| **스토리지** | Firebase Cloud Storage (Google Cloud CDN) |
| **인증 (Auth)** | Kakao OAuth2 + JWT (Access Token) + Dev Login Mode |
| **푸시 알림** | Firebase Cloud Messaging (FCM Web Push) + Kakao Messaging API |
| **호스팅** | Vercel (Frontend) + Render (Backend) + Supabase (Database) + Firebase |
| **테스트** | Playwright (E2E 격리 테스트) |

---

## ⚙️ 환경 변수 설정 가이드

### 1. 프론트엔드 환경 변수 (Vercel)

| Key | 설명 | 예시 값 |
| :--- | :--- | :--- |
| `VITE_API_URL` | 백엔드 API 주소 | `https://clover-backend-vm9k.onrender.com` |
| `VITE_GOOGLE_MAPS_API_KEY` | 구글 맵 API 키 | `AIzaSy...` |
| `VITE_FIREBASE_API_KEY` | Firebase API 키 | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase 인증 도메인 | `clover-e3338.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | `clover-e3338` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase 스토리지 버킷 | `clover-e3338.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Firebase 발송자 ID | `1085828612485` |
| `VITE_FIREBASE_APP_ID` | Firebase 앱 ID | `1:1085828612485:web:d28568bed15717d44084ec` |
| `VITE_FIREBASE_VAPID_KEY` | Firebase Web Push VAPID 키 | `BGB4iYanv8gfi03w1owjcQfVLIyMBTuxm1m_6OPjSBz9r_CHP1oUB1Oi2TM3a2KgPUda2ymdlZgidRfM5l40CRg` |

### 2. 백엔드 환경 변수 (Render)

| Key | 설명 | 예시 값 |
| :--- | :--- | :--- |
| `DATABASE_URL` | Supabase PostgreSQL 연결 주소 | `postgresql://postgres.xxx:비밀번호@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | JWT 서명 비밀키 | `your-secure-jwt-secret` |
| `FRONTEND_URL` | 허용 프론트엔드 도메인 | `https://clover-gilt.vercel.app` |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 | `48b4025d5f4f...` |
| `KAKAO_REDIRECT_URI` | 카카오 로그인 콜백 URI | `https://clover-gilt.vercel.app/login` |
| `KAKAO_CHANNEL_ACCESS_TOKEN` | 카카오 알림톡/메시지 발송 토큰 | `RPCSQsfGGN...` |

---

## 💻 로컬 개발 환경 실행 방법

### 1. 백엔드 실행 (포트 3000)
```bash
cd backend
cp .env.example .env
npm install
npx prisma db push --skip-generate
npm run start:dev
```

### 2. 프론트엔드 실행 (포트 5174)
```bash
cd frontend
npm install
npm run dev
```

### 3. E2E 통합 테스트 (포트 격리: 5175 / 3001)
```bash
cd e2e
npm install
npx playwright install chromium
npm test
```

---

## 📄 라이선스 및 저작권
Copyright © 2026 Clover Team. All rights reserved.
