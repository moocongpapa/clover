import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import './TermsAndPrivacy.css';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="legal-doc-page">
      <div className="legal-doc-header">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="legal-doc-title">서비스 이용약관</h1>
      </div>

      <div className="legal-doc-container">
        <span className="legal-doc-updated">시행일자: 2026년 9월 1일</span>

        <section className="legal-section">
          <h2 className="legal-section__title">제1조 (목적)</h2>
          <p className="legal-section__content">
            본 약관은 클로버(이하 "서비스")가 제공하는 모임 관리, 일정 투표, 회원 간 소통 및 회비 정산 보조 기능 등 제반 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">제2조 (용어의 정의)</h2>
          <ul className="legal-list">
            <li><strong>"이용자"</strong>란 본 약관에 동의하고 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li><strong>"회원"</strong>이란 카카오 계정 등을 통해 서비스에 가입하여 고유 계정을 부여받은 자를 말합니다.</li>
            <li><strong>"모임"</strong>이란 회원이 공통의 관심사나 활동을 위해 서비스 내에서 개설하거나 가입한 그룹을 말합니다.</li>
            <li><strong>"모임장(회장) 및 운영진"</strong>이란 모임을 개설하거나 관리 권한을 부여받아 일정 등록, 회원 승인 등을 수행하는 자를 말합니다.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">제3조 (약관의 효력 및 변경)</h2>
          <p className="legal-section__content">
            1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.<br />
            2. 서비스는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정 사유를 명시하여 최소 7일 전(중요 변경의 경우 30일 전)에 공지합니다.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">제4조 (회원가입 및 계정 관리)</h2>
          <p className="legal-section__content">
            1. 이용자는 카카오 OAuth 등을 통해 본인 인증 후 회원가입을 신청합니다.<br />
            2. 회원은 본인의 계정 정보를 성실히 관리할 책임이 있으며, 타인에게 양도하거나 대여할 수 없습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">제5조 (서비스의 제공 및 제한)</h2>
          <p className="legal-section__content">
            서비스는 모임 개설, 회원 가입 승인, 일정 등록 및 실시간 참석 투표, 사진 갤러리 공유, 웹 푸시 알림 등의 편의 기능을 제공합니다. 천재지변, 시스템 점검, 보안상 위험 등의 사유가 있을 경우 서비스의 전부 또는 일부가 일시 중단될 수 있습니다.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">제6조 (회비 정산 및 금융 거래 관련 면책 - 중요)</h2>
          <div className="legal-highlight-box">
            <strong>⚠️ 전자금융거래 및 대금 결제 대행 면책 고지:</strong><br />
            1. 클로버는 모임원 간의 회비 정산 및 편의를 돕기 위해 계좌번호 표시 및 금융 앱(토스, 카카오페이 등) 송금 딥링크 연동만을 제공합니다.<br />
            2. <strong>클로버는 회비를 직접 수납·예치·보관·중개하거나 결제 대행(PG) 업무를 일체 수행하지 않습니다.</strong><br />
            3. 모임장 및 총무의 계좌로 직접 입금되는 회비의 관리 책임과 납부 내역의 진위 여부는 해당 모임 구성원 간의 상호 자율적 책임 하에 있으며, 클로버는 모임 내 금전 거래 및 사적 분쟁에 대해 법적 책임을 지지 않습니다.
          </div>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">제7조 (이용자의 의무 및 금지행위)</h2>
          <p className="legal-section__content">
            이용자는 다음 각 호의 행위를 하여서는 안 되며, 적발 시 계정 영구 정지 및 법적 조치가 취해질 수 있습니다:
          </p>
          <ul className="legal-list">
            <li>타인의 명의나 연락처, 계정을 도용하는 행위</li>
            <li>음란물, 불법 도박, 청소년 유해 매체물, 사기성 금전 요구 게시물을 등록하는 행위</li>
            <li>타인을 비방하거나 모욕, 협박, 혐오 발언을 유포하는 행위</li>
            <li>자동화 스크립트(봇, 매크로)를 이용해 시스템에 부하를 주거나 데이터를 무단 수집하는 행위</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">제8조 (회원 탈퇴 및 이용 제한)</h2>
          <p className="legal-section__content">
            1. 회원은 서비스 내 '마이페이지' 또는 '설정' 화면에서 언제든지 회원 탈퇴를 요청할 수 있으며, 서비스는 관련 법령에 따라 즉시 계정 정보 및 개인정보를 영구 파기합니다.<br />
            2. 회장이 다른 회원이 존재하는 모임을 운영 중인 경우, 모임 관리의 연속성을 위해 다른 운영진에게 권한을 양도하거나 모임을 해산한 후 탈퇴를 진행해야 합니다.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="legal-section__title">제9조 (분쟁의 해결 및 관할법원)</h2>
          <p className="legal-section__content">
            본 약관과 관련하여 발생한 분쟁에 대해서는 대한민국 법률을 준거법으로 하며, 서비스 제공자의 주소지를 관할하는 법원을 전속 관할법원으로 합니다.
          </p>
        </section>

        <div className="legal-footer-info">
          <p><strong>서비스명:</strong> 클로버 (Clover)</p>
          <p><strong>운영자 및 문의:</strong> official.clover.team@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
