# 🚀 Clover 실 배포 및 FCM 연동을 위한 TO-DO 목록

이 파일은 Clover 서비스를 실제 상용 환경에 배포하고, FCM(Firebase Cloud Messaging) 푸시 알림을 정상 작동시키기 위해 완료해야 하는 작업들을 정리한 문서입니다.

---

## 1. Firebase 콘솔 설정 및 키 발급
- [ ] **Firebase 프로젝트 생성**
  - [Firebase Console](https://console.firebase.google.com/)에 접속하여 새 프로젝트를 생성합니다.
- [ ] **웹(Web) 앱 등록**
  - 프로젝트 개요 페이지에서 `</>` (웹) 아이콘을 눌러 웹 앱을 등록합니다.
  - 제공되는 Firebase SDK 구성 객체(Configuration) 정보를 기록해 둡니다. (프론트엔드 `.env` 설정 시 필요)
    - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
- [ ] **웹 푸시 인증서 (VAPID Key) 발급**
  - Firebase 콘솔 > **프로젝트 설정** > **클라우드 메시징(Cloud Messaging)** 탭으로 이동합니다.
  - 하단의 **웹 구성 (Web configuration)** 영역에서 **웹 푸시 인증서 (Web Push certificates)**의 `Generate key pair` 버튼을 클릭합니다.
  - 생성된 공개 키(VAPID Key) 문자열을 복사해 둡니다. (프론트엔드 VAPID Key 설정 시 필요)
- [ ] **백엔드 서비스 계정 비공개 키 생성**
  - 프로젝트 설정 > **서비스 계정(Service Accounts)** 탭으로 이동합니다.
  - **새 비공개 키 생성 (Generate new private key)** 버튼을 클릭하여 JSON 파일을 다운로드합니다.

---

## 2. 백엔드 (NestJS) 설정 및 배포
- [ ] **서비스 계정 키 파일 위치**
  - 위에서 다운로드한 비공개 키 JSON 파일의 이름을 `firebase-service-account.json`으로 변경합니다.
  - 변경한 파일을 Clover 프로젝트의 `backend/` 폴더 바로 밑(root)에 위치시킵니다.
    - 파일 경로 예시: `c:\clover\backend\firebase-service-account.json`
- [ ] **데이터베이스 동기화**
  - 상용 데이터베이스 인프라에 맞춰 `backend/.env`의 `DATABASE_URL`을 설정합니다.
  - `npx prisma db push`를 실행하여 상용 데이터베이스 스키마와 동기화합니다.
- [ ] **서버 빌드 및 프로세스 가동**
  - `npm run build`를 실행하여 NestJS 프로젝트를 컴파일합니다.
  - `pm2`나 `Docker` 등을 이용하여 빌드된 NestJS 서버(`dist/src/main.js`)를 24시간 백그라운드로 구동합니다.

---

## 3. 프론트엔드 (React + Vite) 설정 및 배포
- [ ] **환경 변수 `.env` 파일 작성**
  - `frontend/` 폴더에 `.env` 파일을 생성하거나 상용 환경 변수를 세팅하여 아래 형식대로 작성합니다:
    ```env
    VITE_API_URL=https://your-api-domain.com
    VITE_FIREBASE_API_KEY=YOUR_API_KEY
    VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
    VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
    VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
    VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
    VITE_FIREBASE_APP_ID=YOUR_APP_ID
    VITE_FIREBASE_VAPID_KEY=YOUR_VAPID_KEY (위에서 발급받은 웹 푸시 인증서 공개키)
    ```
- [ ] **프로덕션 빌드 및 정적 호스팅**
  - `npm run build`를 실행하여 프론트엔드 프로젝트를 빌드합니다. (PWA 및 서비스 워커 관련 파일들이 자동 번들링됩니다)
  - 빌드 결과물인 `dist/` 폴더 내 정적 파일들을 Nginx, Vercel, Netlify, AWS S3 등 정적 호스팅 서버를 통해 배포합니다.

---

## 4. HTTPS (SSL 인증서) 보안 적용 (필수)
- [ ] **SSL 인증서 설치**
  - **매우 중요**: 웹 푸시 알림 권한 획득 및 서비스 워커(PWA) 수신 동작은 반드시 **HTTPS** 프로토콜 보안 환경 하에서만 작동합니다. (로컬호스트 개발 환경 제외)
  - 배포할 프론트엔드 및 백엔드 도메인에 Let's Encrypt 등을 적용하여 HTTPS 보안 연결을 완료해야 합니다.

---

## 5. 실 서비스 푸시 테스트 방법
- [ ] **사용자 PWA 설치 및 수신 동의**
  - HTTPS 배포가 완료된 주소로 스마트폰이나 PC에서 접속합니다.
  - 기기에 홈 화면 추가(PWA 앱 설치)를 수행합니다.
  - 로그인 완료 시 노출되는 브라우저 알림 팝업 창에서 **"허용"**을 눌러 토큰을 등록합니다.
- [ ] **수동 테스트**
  - 설정(Settings) 메뉴에 들어가서 **앱 푸시 알림 받기** 옆에 생겨난 **`[테스트 발송]`** 버튼을 클릭하여 기기에 알림이 실시간으로 도달하는지 확인합니다.
