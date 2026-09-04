# Clover 서비스 기술 스펙 및 아키텍처 명세서 (TECH_SPEC.md)

이 문서는 **Clover(클로버)** 모임 관리 플랫폼의 전체 기술 스택, 시스템 아키텍처, 모바일 푸시 알림 메커니즘 및 주요 도메인 기능의 구현 상세를 총망라한 기술 명세서입니다.

---

## 📌 목차
1. [핵심 질문 답변: 모바일 푸시 알림의 정체](#1-핵심-질문-답변-모바일-푸시-알림의-정체)
2. [푸시 알림 파이프라인 아키텍처 (Push Pipeline)](#2-푸시-알림-파이프라인-아키텍처-push-pipeline)
3. [전체 기술 스택 요약 (Tech Stack Matrix)](#3-전체-기술-스택-요약-tech-stack-matrix)
4. [시스템 구조 및 클라우드 인프라 (System Architecture)](#4-시스템-구조-및-클라우드-인프라-system-architecture)
5. [프론트엔드 기술 상세 (Frontend Engineering)](#5-프론트엔드-기술-상세-frontend-engineering)
6. [백엔드 기술 상세 (Backend Engineering)](#6-백엔드-기술-상세-backend-engineering)
7. [데이터베이스 및 스키마 설계 (Database & Prisma ORM)](#7-데이터베이스-및-스키마-설계-database--prisma-orm)
8. [핵심 비즈니스 기능 상세 (Core Features)](#8-핵심-비즈니스-기능-상세-core-features)
9. [보안 및 성능 최적화 (Security & Performance)](#9-보안-및-성능-최적화-security--performance)

---

## 1. 핵심 질문 답변: 모바일 푸시 알림의 정체

> **Q. 모바일에 이벤트 발생 시 날아가는 푸시 알림이 구글 FCM인가요, 아니면 웹 자체 기능인가요?**

**A. 정답은 「구글 FCM (Firebase Cloud Messaging) 기반의 Web Push」 + 「카카오톡 알림」의 하이브리드(Hybrid) 파이프라인입니다.**

- 단순 브라우저 탭이 열려있을 때만 작동하는 인앱 자바스크립트 팝업(Toast)이 **아닙니다.**
- 사용자가 브라우저를 닫았거나 백그라운드에 있을 때도, 스마트폰 상단 알림 센터에 진동과 함께 뜨는 **W3C 표준 Web Push + Google FCM + 모바일 OS 네이티브 푸시 알림** 기술입니다.
- 추가로, FCM 수신에 실패하거나 미동의한 사용자를 위해 **카카오톡 비즈니스 알림톡(메시지 API)**으로 자동 우회 전송되는 **3단계 폴백(Fallback) 안전장치**가 구축되어 있습니다.

```
[이벤트 발생: 일정 등록 / 리마인더 / 회비]
                  │
                  ▼
         [NestJS 백엔드 서버]
                  │
         ┌────────┴────────┐
         │ (1차 시도)      │ (2차 자동 폴백)
         ▼                 ▼
   [Google FCM API]   [Kakao 알림 API]
   (Firebase Admin)   (카카오톡 메시지)
         │                 │
         ├─────────────────┤
         ▼                 ▼
   [iOS APNs / Android OS 알림센터]
   (스마트폰 홈 화면 네이티브 배너)
```

---

## 2. 푸시 알림 파이프라인 아키텍처 (Push Pipeline)

### 2.1. 디바이스 토큰 발급 및 구독 (Subscription Flow)
1. **권한 요청**: 사용자가 모바일 PWA 또는 웹 브라우저에서 알림을 허용(`Notification.requestPermission()`)합니다.
2. **FCM 디바이스 토큰 발급**: 프론트엔드의 `firebase/messaging` SDK가 Google FCM 서버와 통신하여 해당 기기 전용 VAPID 인증 토큰을 발급받습니다.
3. **토큰 동기화**: 발급된 토큰을 백엔드 API(`PATCH /users/me/fcm-token`)로 전달하여 데이터베이스의 `User.fcmToken` 필드에 영구 저장합니다.
4. **서비스 워커 등록**: 백그라운드 알림 수신을 전담하는 `public/firebase-messaging-sw.js` 서비스 워커가 백그라운드 스레드에 상주합니다.

### 2.2. 알림 발송 메커니즘 (Dispatch Mechanism)
1. **이벤트 트리거**:
   - 운영진이 새 일정을 등록(`CREATED`), 변경(`CHANGED`), 취소(`CANCELLED`)했을 때
   - 마감 24시간 전 / 1시간 전 미투표자를 추출하는 크론(`@Cron`) 리마인더가 동작할 때
   - 매월 회비 납부일 1일 전 자동 알림이 동작할 때
2. **1차 발송 - Google FCM Web Push**:
   - NestJS 백엔드가 `firebase-admin` SDK의 `getMessaging().send()`를 호출합니다.
   - 구글 FCM 서버가 iOS 기기에는 **Apple APNs(Apple Push Notification service)**를 거쳐 전달하고, 안드로이드 기기에는 **Google Play Services**를 거쳐 OS 잠금화면 및 상단 바에 네이티브 푸시를 띄웁니다.
3. **2차 발송 - 카카오톡 알림톡 자동 폴백 (Kakao Fallback)**:
   - FCM 토큰이 만료되었거나, 알림 수신 거부 상태이거나, 발송 실패 시 즉시 카카오톡 REST API(`kapi.kakao.com`)를 호출하여 사용자의 카카오톡 채팅방으로 알림을 전송합니다.
4. **3차 저장 - 인앱 알림함 (In-App Notification)**:
   - 모든 알림은 데이터베이스의 `NotificationLog` 테이블에 기록되어 앱 내 우측 상단 종 모양 아이콘(`NotificationBell`)과 소식 탭(`Notifications.tsx`)에 영구 보관됩니다.

---

## 3. 전체 기술 스택 요약 (Tech Stack Matrix)

| 구분 | 도입 기술 / 라이브러리 | 상세 역할 및 용도 |
| :--- | :--- | :--- |
| **프론트엔드** | **React 18** + **TypeScript** | 반응형 모바일 웹 SPA 컴포넌트 개발 |
| **빌드 도구** | **Vite 6** | 초고속 HMR 및 최적화 번들러 |
| **PWA** | **Vite Plugin PWA** + **Workbox** | 오프라인 캐싱, 서비스 워커, iOS/안드로이드 홈 화면 설치 |
| **스타일링** | **Vanilla CSS3** (Custom Tokens) | 순수 CSS 디자인 토큰 체계, 고성능 모바일 반응형 UI |
| **백엔드 프레임워크** | **NestJS (Node.js)** | 엔터프라이즈 모듈러 아키텍처 및 RESTful API 서버 |
| **ORM** | **Prisma ORM (v6)** | 타입 안전(Type-safe) 데이터베이스 쿼리 및 마이그레이션 |
| **데이터베이스** | **PostgreSQL** (상용: Supabase) / **SQLite** (로컬/테스트) | 모임, 일정, 투표, 회원, 결제, 설정 데이터 관리 |
| **푸시 알림 (Push)** | **Firebase Cloud Messaging (FCM)** + **Kakao API** | 백그라운드 모바일 OS 네이티브 푸시 및 카톡 리마인더 |
| **미디어 스토리지** | **Firebase Cloud Storage (Google Cloud CDN)** | 모임 대표 사진, 프로필, 갤러리 이미지 영구 CDN 보존 |
| **인증 (Auth)** | **Kakao OAuth 2.0** + **JWT (JSON Web Token)** | 카카오 1초 간편 로그인 및 Stateless Bearer 인증 |
| **스케줄러** | **@nestjs/schedule (Cron)** | 24시간/1시간 전 투표 리마인더, 일일 정기 회비 알림 |
| **지도 및 위치** | **Kakao Maps SDK** + Haversine Formula | 모임 장소 지도 핀포인트 표시 및 내 위치 기반 거리 계산 |
| **클라우드 배포** | **Vercel** (FE) + **Render** (BE) + **Supabase** (DB) | 고가용성 글로벌 분산 서버리스 및 매니지드 호스팅 |
| **테스트** | **Playwright** | E2E(End-to-End) 포트 격리 자동화 테스트 |

---

## 4. 시스템 구조 및 클라우드 인프라 (System Architecture)

- **Frontend (Vercel)**:
  - 글로벌 엣지 CDN을 통해 전 세계 어디서든 초고속 TTFB로 서빙.
  - PWA 매니페스트 및 서비스 워커를 통한 오프라인 캐싱 지원.
- **Backend (Render)**:
  - Node.js 기반 NestJS API 서버 가동.
  - JWT 토큰 기반의 무상태(Stateless) API로 유연한 스케일아웃 지원.
- **Database (Supabase PostgreSQL)**:
  - 안정적인 매니지드 클라우드 RDBMS 사용.
  - Prisma Client를 통한 안전한 연결 풀(Connection Pool) 관리.
- **Push & CDN (Google Cloud Platform / Firebase)**:
  - `clover-e3338` 프로젝트의 FCM 및 Cloud Storage를 활용해 무제한 미디어 호스팅과 안정적 푸시 발송 달성.

---

## 5. 프론트엔드 기술 상세 (Frontend Engineering)

### 5.1. PWA (Progressive Web Application) 모바일 앱 경험
- **`manifest.webmanifest`**: `display: standalone` 모드로 실행되어 Safari/Chrome 주소창 없이 네이티브 앱처럼 동작.
- **맞춤형 설치 가이드**:
  - **iOS (아이폰)**: 하단 사파리 공유 아이콘 ➔ `[홈 화면에 추가]` 팝업 안내 (`PwaInstallModal.tsx`).
  - **Android (갤럭시)**: 브라우저 기본 설치 이벤트(`beforeinstallprompt`)를 캡처하여 원클릭 설치 배너 제공.
- **앱 검색 최적화**: 한글 `클로버` 및 영문 `Clover` 모두 스토어/검색기에서 필터링될 수 있도록 메타데이터 이중 태깅.

### 5.2. 고성능 Vanilla CSS 디자인 시스템
- 무거운 외부 UI 라이브러리(Tailwind, MUI 등) 의존 없이 **100% 순수 CSS 커스텀 디자인 토큰**을 구축하여 로딩 속도 극대화.
- 주요 토큰:
  - 브랜드 컬러: `--brand-primary: #10b981`, `--brand-primary-hover: #059669`
  - 서피스 & 보더: `--surface: #ffffff`, `--border-soft: #f1f5f9`, `--border: #e2e8f0`
  - 텍스트 잉크: `--ink-dark: #0f172a`, `--ink-muted: #475569`, `--ink-subtle: #94a3b8`
- **Toss / Apple 스타일 마이크로 인터랙션**: 부드러운 아코디언 확장, 햅틱 느낌의 버튼 액티브 효과(`transform: scale(0.98)`).

### 5.3. 모바일 입력 UX 최적화
- **전화번호 8자리 스마트 바인딩**: `type="tel"` 및 `inputMode="numeric"`으로 숫자 키패드를 강제하며, 앞자리 `010-`을 고정하고 숫자 입력에 따라 실시간 하이픈 마스킹.
- **인라인 아코디언 수정 패턴**: 무거운 전체화면 모달 대신 상세 설정 리스트 클릭 시 아래쪽으로 부드럽게 열리는 편집 인터페이스 적용.

---

## 6. 백엔드 기술 상세 (Backend Engineering)

### 6.1. NestJS 엔터프라이즈 모듈 구조
- **`AuthModule`**: 카카오 OAuth2 콜백 검증, 개발자 토큰 발급, JWT 가드(`JwtAuthGuard`, `OptionalJwtAuthGuard`).
- **`GroupsModule`**: 모임 생성, 공개 모임 검색, 회원 승인/거절, 직책 관리, 활동 상태 관리.
- **`EventsModule`**: 일정 CRUD, 다중 날짜 투표, 반복 일정(매주/격주 2~8회 자동 생성).
- **`VotesModule`**: 참석 / 늦참 / 불참 원자적 트랜잭션 투표 처리 및 중복 방지.
- **`SettlementsModule`**: 월별 회비 납부 현황 추적, 완납/미납 토글, 면제 처리.
- **`NotificationsModule`**: Google FCM 발송, 카카오톡 알림톡 전송, 크론 리마인더 스케줄링.
- **`AdminModule`**: 시스템 대시보드 통계, 카테고리/직책 관리, 푸시 전체 브로드캐스트.

### 6.2. 무중단 동적 설정 엔진 (Zero Schema Migration)
- 모임 카테고리(축구, 러닝, 배드민턴 등) 및 직책(회장, 부회장, 총무, 스태프 등)을 데이터베이스 스키마 수정(Migration) 없이 실시간으로 추가/수정/삭제할 수 있도록 **`AppSetting` JSON 동적 설정 엔진** 설계.
- 운영 중 서비스 중단이나 DB 락(Lock) 없이 관리자 콘솔에서 즉각적인 변경 사항 반영 가능.

---

## 7. 데이터베이스 및 스키마 설계 (Database & Prisma ORM)

### 주요 핵심 엔티티 구조
1. **User (사용자)**
   - `id`, `kakaoId`, `displayName`, `profileImageUrl`, `gender`, `birthYear`, `phoneNumber`, `role` (USER / ADMIN)
   - `fcmToken`: Google FCM Web Push 전송용 디바이스 토큰
   - `kakaoChannelUserKey`: 카카오톡 1:1 메시지 전송용 식별자
   - `pushNotifyEnabled`, `kakaoNotifyEnabled`: 알림 채널별 온/오프 설정
2. **Group (모임)**
   - `id`, `name`, `description`, `category`, `profileImageUrl`, `inviteCode`, `isPublic`
   - `activityRegion`, `activitySido`, `activitySigungu`: 활동 지역 정보
   - `bankName`, `bankAccountNumber`, `bankAccountHolder`, `monthlyFee`, `dueDay`: 회비 및 계좌 정보
3. **GroupMember (모임 멤버십)**
   - `groupId`, `userId`, `role` (PRESIDENT, VICE_PRESIDENT, SECRETARY, OFFICER, MEMBER), `status` (PENDING, APPROVED, REJECTED)
   - `userStatus`: 활동 상태 (ACTIVE, RESTING, INJURED, MILITARY 등)
4. **Event (일정)**
   - `groupId`, `title`, `date`, `startTime`, `endTime`, `location`, `status` (ACTIVE, CANCELLED)
   - `reminderOffsets`: 자동 알림 발송 시점 (예: `'24,1'` ➔ 24시간 전, 1시간 전)
5. **Vote (투표)**
   - `eventId`, `userId`, `choice` (ATTEND, LATE, ABSENT), `updatedAt`
6. **FeePayment (회비 납부 내역)**
   - `groupId`, `userId`, `year`, `month`, `isPaid`, `paidAt`, `notes`
7. **NotificationLog (알림 기록)**
   - `userId`, `type` (CREATED, CHANGED, CANCELLED, REMINDER, NOTICE), `message`, `isRead`

---

## 8. 핵심 비즈니스 기능 상세 (Core Features)

### 8.1. 실시간 스마트 참석 투표 & 리마인더
- 참석 / 늦참 / 불참 3-Way 실시간 투표.
- 투표 마감 전까지 투표하지 않은 회원만 백엔드 크론이 자동으로 감지하여 **카톡 핀포인트 리마인더** 발송.

### 8.2. 스마트 조 편성 (자동 팀 밸런싱)
- 일정에 '참석'으로 투표한 인원만을 자동으로 필터링.
- 실력 등급과 성별 비율을 고르게 분배하여 2개 팀(A/B) 또는 다수 팀으로 원클릭 균등 배분.

### 8.3. 투명한 회비 정산 & 금융 딥링크
- 월별 회비 납부율 시각화 프로그레스 바 제공.
- 미납 회원이 본인 상태 확인 시 **토스(`supertoss://`)** 및 **카카오페이(`kakaotalk://pay`)** 간편 송금 딥링크로 계좌번호 복사 없이 1초 송금 지원.

### 8.4. 영구 미디어 보존 (Firebase Storage)
- 모임 사진 및 프로필 이미지를 서버 로컬 디스크가 아닌 **Google Firebase Cloud Storage 영구 CDN 버킷**에 업로드.
- 클라이언트 단에서 600px 리사이즈 및 품질 82% 압축 후 전송하여 대역폭 절약 및 고속 로딩 보장.

---

## 9. 보안 및 성능 최적화 (Security & Performance)

1. **무상태(Stateless) JWT 보안 인증**:
   - 비밀번호를 별도로 수집·저장하지 않고 카카오 공식 OAuth 2.0으로 신원을 검증하여 개인정보 유출 위험을 원천 차단.
2. **Web Push 중복 방지 태그(Tagging & Renotify Lock)**:
   - 푸시 알림 페이로드에 고유 식별 태그(`tag: clover-group-event`)를 할당하여 동일한 알림이 중복 울리는 현상 방지.
3. **안전한 포트 격리 E2E 테스트 환경**:
   - 로컬 개발 서버(`Port 3000 / 5174`)와 Playwright E2E 테스트 서버(`Port 3001 / 5175`, `e2e.db`)를 완전히 분리하여 파일 락(`EPERM`) 및 데이터 오염 방지.
4. **경량 번들링 & PWA 캐시 전략**:
   - 정적 리소스(JS, CSS, 폰트, 아이콘)는 Workbox를 통해 Service Worker Cache에 안전하게 캐싱되어 오프라인 및 불안정한 네트워크에서도 즉각적인 앱 실행 보장.

---

*문서 생성일: 2026년 9월 4일*  
*작성자: Antigravity AI Pair Programmer & Clover Core Dev Team*
