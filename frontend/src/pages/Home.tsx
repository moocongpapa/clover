import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <p className="hero-eyebrow">동호회 · 스터디 · 소모임</p>
        <h1>
          모임 일정은 모이고,
          <br />
          <em>참석 여부는 자동으로</em> 독촉된다
        </h1>
        <p className="hero-desc">
          이벤트를 등록하면 회원 전체에 알림이 가고, 하루 전에는 아직 투표하지
          않은 사람에게만 카카오로 리마인더가 전송됩니다.
        </p>
        <div className="hero-actions">
          <Link to="/login" className="btn-primary btn-lg">
            카카오로 시작하기
          </Link>
          <Link to="/groups" className="btn-outline btn-lg">
            모임 둘러보기
          </Link>
        </div>
      </section>

      <section className="features">
        <article className="feature-card">
          <span className="feature-num">01</span>
          <h3>모임 단위 관리</h3>
          <p>동호회마다 이벤트와 회원을 분리해 관리합니다.</p>
        </article>
        <article className="feature-card">
          <span className="feature-num">02</span>
          <h3>참석 / 불참 / 늦참</h3>
          <p>세 가지 선택지로 참석 의사를 빠르게 수집합니다.</p>
        </article>
        <article className="feature-card feature-card--accent">
          <span className="feature-num">03</span>
          <h3>미투표자 자동 알림</h3>
          <p>하루 전, 아직 응답하지 않은 회원에게만 카카오 알림을 보냅니다.</p>
        </article>
      </section>
    </div>
  );
}
