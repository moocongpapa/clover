import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import './TermsAndPrivacy.css';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="legal-doc-page">
      <div className="legal-doc-header">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="legal-doc-title">개인정보 처리방침</h1>
      </div>

      <div className="legal-doc-container">
        <span className="legal-doc-updated">시행일자: 2026년 9월 1일</span>

        <p className="legal-section__content">
          클로버(이하 "서비스")는 『개인정보 보호법』 등 관련 법령을 준수하며, 이용자의 소중한 개인정보를 안전하게 보호하고 이와 관련된 고충을 신속하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
        </p>

        <section className="legal-section">
          <h2 className="legal-section__title">1. 수집하는 개인정보의 항목 및 수집 방법</h2>
          <p className="legal-section__content">
            서비스는 회원가입 및 원활한 모임 관리를 위해 다음의 개인정보를 수집합니다:
          </p>
          <ul className="legal-list">
            <li><strong>카카오 간편 로그인 시 (필수):</strong> 고유 식별자(ID), 닉네임, 프로필 사진 URL</li>
            <li><strong>모임 프로필 입력 시 (선택/필수):</strong> 실명(표시 이름), 성별, 생년월일(빠른 생일 여부 포함), 휴대폰 번호</li>
            <li><strong>모임 운영진 설정 시 (선택):</strong> 모임 회비 수납용 계좌번호 및 은행명</li>
            <li><strong>서비스 이용 과정에서 자동 생성되는 정보:</strong> 접속 로그, 기기 정보, 푸시 토큰(FCM Token)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="legal-list">
            <li><strong>회원 관리:</strong> 회원제 서비스 이용에 따른 본인 식별, 중복 가입 방지, 회원 탈퇴 의사 확인</li>
            <li><strong>모임 서비스 제공:</strong> 모임 가입 승인 및 명부 관리, 일정 생성 및 참석 투표 현황 집계, 팀 편성</li>
            <li><strong>알림 발송:</strong> 신규 일정 등록, 일정 변경, 투표 마감 독려, 모임 가입 신청 및 승인 결과, 웹 푸시 및 알림톡 전송</li>
            <li><strong>고객 지원 및 부정 이용 방지:</strong> 서비스 개선 피드백 처리, 불법/유해 게시물 신고 접수 및 조치</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">3. 개인정보의 보유 및 이용 기간</h2>
          <p className="legal-section__content">
            서비스는 원칙적으로 <strong>회원 탈퇴 시 이용자의 개인정보를 지체 없이 영구 파기</strong>합니다.<br />
            단, 관련 법령의 규정에 의하여 보존할 필요가 있는 경우 다음과 같이 법정 기간 동안 안전하게 분리 보관합니다:
          </p>
          <ul className="legal-list">
            <li>서비스 방문 및 접속 기록: 3개월 (통신비밀보호법)</li>
            <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">4. 개인정보의 파기 절차 및 방법</h2>
          <p className="legal-section__content">
            1. <strong>파기 절차:</strong> 이용자가 회원 탈퇴를 요청하거나 개인정보 수집 목적이 달성된 경우, 해당 정보를 지체 없이 데이터베이스에서 즉시 삭제합니다.<br />
            2. <strong>파기 방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 영구 삭제합니다.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">5. 개인정보의 제3자 제공 및 위탁</h2>
          <p className="legal-section__content">
            서비스는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 단, 원활한 서비스 인프라 제공을 위해 다음과 같이 전문 클라우드 인프라에 처리를 위탁하고 있습니다:
          </p>
          <ul className="legal-list">
            <li><strong>카카오 (Kakao Corp.):</strong> 카카오 OAuth 로그인 인증 및 알림톡 연동</li>
            <li><strong>구글 (Google Firebase):</strong> 웹 푸시 알림 전송 (FCM) 및 클라우드 이미지 스토리지</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">6. 이용자의 권리와 행사 방법</h2>
          <p className="legal-section__content">
            이용자는 언제든지 서비스 내 [마이페이지] &gt; [프로필 수정] 또는 [설정] 메뉴를 통해 본인의 개인정보를 조회, 수정하거나 [회원 탈퇴]를 통해 개인정보 파기를 요청할 수 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">7. 개인정보의 안전성 확보 조치</h2>
          <p className="legal-section__content">
            서비스는 개인정보의 도난, 유출, 변조를 방지하기 위해 다음과 같은 조치를 취하고 있습니다:
          </p>
          <ul className="legal-list">
            <li>모든 통신 구간에 HTTPS(TLS) 보안 암호화 프로토콜 적용</li>
            <li>JWT 기반의 안전한 사용자 인증 토큰 관리</li>
            <li>비인가자의 접근을 차단하기 위한 엄격한 데이터베이스 접근 제어</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">8. 개인정보 보호책임자 및 문의</h2>
          <p className="legal-section__content">
            서비스 이용 중 발생하는 모든 개인정보보호 관련 민원이나 문의사항은 아래의 개인정보 보호책임자에게 문의하실 수 있습니다:
          </p>
          <div className="legal-footer-info" style={{ marginTop: '12px' }}>
            <p><strong>개인정보 보호책임자:</strong> 클로버 개발팀</p>
            <p><strong>이메일:</strong> official.clover.team@gmail.com</p>
            <p><strong>운영시간:</strong> 평일 10:00 ~ 18:00</p>
          </div>
        </section>
      </div>
    </div>
  );
}
