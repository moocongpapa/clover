import { useEffect, useState, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  api,
  startKakaoLogin,
  formatEventTimeRange,
  isProfileComplete,
  isStaffRole,
  VOTE_CHOICES,
  VOTE_LABELS,
  type CalendarEvent,
  type VoteChoice,
  type Group,
} from '../api';
import { useAuth } from '../context/AuthContext';
import HomeEventCard, { HomeVoteProgressBar } from '../components/EventCard';
import GroupAvatar from '../components/GroupAvatar';
import LoadingIndicator from '../components/LoadingIndicator';
import GroupPreviewModal from '../components/GroupPreviewModal';
import EventShareModal from '../components/EventShareModal';
import './Home.css';

function formatEventDate(
  date: string,
  startTime: string,
  endTime?: string | null,
) {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDay = new Date(d);
  eventDay.setHours(0, 0, 0, 0);

  let label = d.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
  if (eventDay.getTime() === today.getTime()) label = '오늘';
  else if (eventDay.getTime() === tomorrow.getTime()) label = '내일';

  return `${label} ${formatEventTimeRange(startTime, endTime)}`;
}

function isUpcoming(ev: CalendarEvent) {
  return !ev.isPast;
}



const FAQS = [
  {
    q: 'Clover는 정말 무료인가요?',
    a: '네! 모임 개설, 일정 등록, 참석 투표, 카카오톡 알림톡, 조 편성, 회비 장부 등 모든 핵심 기능이 평생 100% 무료로 제공됩니다. 추가 결제나 유료 플랜 없이 자유롭게 이용하세요.',
  },
  {
    q: '모임원들도 앱을 설치하거나 가입해야 하나요?',
    a: '전혀 필요 없습니다! 별도의 앱 설치나 복잡한 가입 절차 없이, 카카오 계정으로 1초 만에 로그인하여 바로 참여할 수 있습니다. 모바일 웹 브라우저와 카카오톡 인앱 브라우저에서 모두 즉시 작동합니다.',
  },
  {
    q: '기존 카카오톡 단톡방과 어떻게 함께 쓰나요?',
    a: '일정을 등록한 뒤 [카톡 공유] 버튼만 누르면 단톡방으로 예쁜 일정 카드와 바로가기 링크가 전송됩니다. 회원들은 링크를 누르고 터치 한 번으로 참석 여부를 투표할 수 있습니다.',
  },
  {
    q: '정기 모임이나 반복 일정도 지원하나요?',
    a: '네! 매주 또는 격주로 진행되는 정기 모임 일정을 한 번에 최대 8회까지 자동 생성할 수 있어 모임장과 총무님의 반복 등록 수고를 덜어드립니다.',
  },
];

function GuestLanding() {
  // Demo 3-in-1 Playground Tab
  const [demoTab, setDemoTab] = useState<'vote' | 'teams' | 'dues'>('vote');

  // Tab 1: Vote State
  const [demoVote, setDemoVote] = useState<'ATTEND' | 'LATE' | 'ABSENT' | null>('ATTEND');
  const attendCount = 14 + (demoVote === 'ATTEND' ? 1 : 0);
  const lateCount = 2 + (demoVote === 'LATE' ? 1 : 0);
  const absentCount = 1 + (demoVote === 'ABSENT' ? 1 : 0);
  const totalVoted = attendCount + lateCount + absentCount;
  const totalMembers = 18;
  const attendPct = Math.round((attendCount / totalMembers) * 100);

  // Tab 2: Teams State
  const [teamsShuffleKey, setTeamsShuffleKey] = useState(0);
  const [teamA, setTeamA] = useState([
    { name: '김민수', pos: 'FW' },
    { name: '이지호', pos: 'MF' },
    { name: '박서준', pos: 'DF' },
    { name: '정하은', pos: 'MF' },
    { name: '윤도윤', pos: 'GK' },
    { name: '한수아', pos: 'DF' },
  ]);
  const [teamB, setTeamB] = useState([
    { name: '최예준', pos: 'FW' },
    { name: '강시우', pos: 'MF' },
    { name: '임서아', pos: 'DF' },
    { name: '백유진', pos: 'MF' },
    { name: '조진우', pos: 'DF' },
    { name: '송채원', pos: 'GK' },
  ]);

  const handleShuffleTeams = () => {
    const all = [...teamA, ...teamB];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    setTeamA(all.slice(0, 6));
    setTeamB(all.slice(6, 12));
    setTeamsShuffleKey((k) => k + 1);
  };

  // Tab 3: Dues State
  const [paidList, setPaidList] = useState<Record<string, boolean>>({
    '김민수': true,
    '이지호': true,
    '정하은': true,
    '한수아': true,
    '최예준': true,
    '강시우': true,
    '박서준': false,
    '윤도윤': false,
  });

  const duesPaidCount = Object.values(paidList).filter(Boolean).length;
  const duesTotalCount = Object.keys(paidList).length;
  const duesPct = Math.round((duesPaidCount / duesTotalCount) * 100);

  const toggleMemberPaid = (name: string) => {
    setPaidList((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Public Recommended Groups
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [previewGroup, setPreviewGroup] = useState<Group | null>(null);

  useEffect(() => {
    api.listGroups()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setPublicGroups(res.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="home-guest">
      {/* Background ambient gradient glow */}
      <div className="landing-ambient-glow" />

      {/* ── 1. Hero Section ── */}
      <section className="landing-hero">
        <div className="landing-badge-pill">
          <span className="landing-badge-icon">🍀</span>
          <span>모임 일정 · 실시간 투표 · 팀 편성 · 회비 정산</span>
        </div>

        <h1 className="landing-hero-title">
          모임 일정은 <span className="landing-title-accent">한눈에,</span><br />
          참석 투표와 정산은 <span className="landing-title-highlight">자동으로</span>
        </h1>

        <p className="landing-hero-subtitle">
          번거로운 단톡방 투표와 참석 확인, 계좌 복붙은 이제 그만.<br className="mobile-break" />
          일정 등록부터 카톡 자동 리마인더, 조 편성, 회비 정산까지 한번에 해결하세요.
        </p>

        <div className="landing-hero-actions">
          <button type="button" onClick={startKakaoLogin} className="landing-btn-kakao">
            <svg className="kakao-svg" width="18" height="18" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.477 3 2 6.477 2 10.772c0 2.766 1.848 5.19 4.646 6.57-.205.77-.754 2.802-.865 3.235-.138.544.198.536.417.391.172-.114 2.748-1.874 3.864-2.637.625.092 1.272.141 1.938.141 5.523 0 10-3.477 10-7.7c0-4.295-4.477-7.772-10-7.772z"/>
            </svg>
            <span>카카오로 1초 만에 시작하기</span>
          </button>
          <Link to="/groups" className="landing-btn-explore">
            <span>모임 둘러보기</span>
            <span className="landing-arrow">→</span>
          </Link>
        </div>

        <div className="landing-trust-bar">
          <div className="trust-item">
            <span className="trust-check">✓</span>
            <span>비밀번호 없이 1초 가입</span>
          </div>
          <span className="trust-dot">·</span>
          <div className="trust-item">
            <span className="trust-check">✓</span>
            <span>평생 100% 무료</span>
          </div>
          <span className="trust-dot">·</span>
          <div className="trust-item">
            <span className="trust-check">✓</span>
            <span>카톡 단톡방 100% 호환</span>
          </div>
        </div>
      </section>

      {/* ── 2. Interactive 3-in-1 Simulator (Signature Element) ── */}
      <section className="landing-demo-section">
        <div className="landing-demo-header">
          <div className="demo-live-badge">
            <span className="demo-live-dot" />
            <span>실제 Clover 기능 체험 (직접 눌러보세요!)</span>
          </div>

          {/* Segmented Control */}
          <div className="demo-tabs-bar" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={demoTab === 'vote'}
              className={`demo-tab-btn ${demoTab === 'vote' ? 'is-active' : ''}`}
              onClick={() => setDemoTab('vote')}
            >
              <span>🗳️</span>
              <span>참석 투표</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={demoTab === 'teams'}
              className={`demo-tab-btn ${demoTab === 'teams' ? 'is-active' : ''}`}
              onClick={() => setDemoTab('teams')}
            >
              <span>⚖️</span>
              <span>스마트 조 편성</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={demoTab === 'dues'}
              className={`demo-tab-btn ${demoTab === 'dues' ? 'is-active' : ''}`}
              onClick={() => setDemoTab('dues')}
            >
              <span>💰</span>
              <span>회비 정산</span>
            </button>
          </div>
        </div>

        <div className="landing-demo-card">
          {/* TAB 1: 실시간 투표 */}
          {demoTab === 'vote' && (
            <div className="demo-tab-content">
              <div className="demo-card-top">
                <div className="demo-group-info">
                  <div className="demo-avatar">⚽</div>
                  <div>
                    <div className="demo-group-name">FC 클로버 (풋살/축구 정기모임)</div>
                    <div className="demo-event-title">이번 주 정기 매치 & 뒤풀이</div>
                  </div>
                </div>
                <span className="demo-status-badge">D-2 투표 진행 중</span>
              </div>

              <div className="demo-event-details">
                <div className="demo-detail-item">
                  <span className="demo-icon">📅</span>
                  <span>이번 주 토요일 오후 4:00 ~ 6:00</span>
                </div>
                <div className="demo-detail-item">
                  <span className="demo-icon">📍</span>
                  <span>펜타시티 풋살파크 A구장</span>
                </div>
              </div>

              {/* Progress Summary Bar */}
              <div className="demo-progress-wrap">
                <div className="demo-progress-label-row">
                  <span className="demo-progress-title">참석 현황</span>
                  <span className="demo-progress-stat">
                    총 {totalMembers}명 중 <strong>{totalVoted}명</strong> 투표 ({attendPct}%)
                  </span>
                </div>
                <div className="demo-progress-bar-track">
                  <div
                    className="demo-progress-bar-fill demo-progress-bar-fill--attend"
                    style={{ width: `${(attendCount / totalMembers) * 100}%` }}
                    title={`참석: ${attendCount}명`}
                  />
                  <div
                    className="demo-progress-bar-fill demo-progress-bar-fill--late"
                    style={{ width: `${(lateCount / totalMembers) * 100}%` }}
                    title={`늦참: ${lateCount}명`}
                  />
                  <div
                    className="demo-progress-bar-fill demo-progress-bar-fill--absent"
                    style={{ width: `${(absentCount / totalMembers) * 100}%` }}
                    title={`불참: ${absentCount}명`}
                  />
                </div>
              </div>

              {/* Interactive Vote Row */}
              <div className="demo-vote-row">
                <button
                  type="button"
                  className={`demo-vote-btn demo-vote-btn--attend ${demoVote === 'ATTEND' ? 'is-active' : ''}`}
                  onClick={() => setDemoVote(demoVote === 'ATTEND' ? null : 'ATTEND')}
                >
                  <span className="demo-vote-label">⚽ 참석</span>
                  <span className="demo-vote-count">{attendCount}명</span>
                </button>
                <button
                  type="button"
                  className={`demo-vote-btn demo-vote-btn--late ${demoVote === 'LATE' ? 'is-active' : ''}`}
                  onClick={() => setDemoVote(demoVote === 'LATE' ? null : 'LATE')}
                >
                  <span className="demo-vote-label">⏰ 늦참</span>
                  <span className="demo-vote-count">{lateCount}명</span>
                </button>
                <button
                  type="button"
                  className={`demo-vote-btn demo-vote-btn--absent ${demoVote === 'ABSENT' ? 'is-active' : ''}`}
                  onClick={() => setDemoVote(demoVote === 'ABSENT' ? null : 'ABSENT')}
                >
                  <span className="demo-vote-label">🚫 불참</span>
                  <span className="demo-vote-count">{absentCount}명</span>
                </button>
              </div>

              {/* Kakao Reminder Live Toast Simulation */}
              <div className="demo-kakao-alert">
                <div className="demo-kakao-icon">💬</div>
                <div className="demo-kakao-text">
                  <strong>카카오톡 자동 알림:</strong> 투표 마감 24시간 전 미투표 회원 3명에게 개인톡 리마인더가 발송되었습니다.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 스마트 조 편성 */}
          {demoTab === 'teams' && (
            <div className="demo-tab-content">
              <div className="demo-teams-header">
                <div>
                  <div className="demo-group-name">⚽ 참석자 12명 확정</div>
                  <div className="demo-event-title">실력 & 성별 균등 자동 조 편성</div>
                </div>
                <button
                  type="button"
                  className="demo-shuffle-btn"
                  onClick={handleShuffleTeams}
                >
                  <span>🎲 팀 다시 섞기</span>
                </button>
              </div>

              <div className="demo-teams-grid" key={teamsShuffleKey}>
                <div className="demo-team-box demo-team-box--a">
                  <div className="demo-team-title">
                    <span className="team-badge team-badge--a">A팀 (레드 조끼)</span>
                    <span className="team-count">6명</span>
                  </div>
                  <div className="demo-team-members">
                    {teamA.map((m, idx) => (
                      <div key={idx} className="demo-member-pill">
                        <span className="demo-member-name">{m.name}</span>
                        <span className="demo-member-pos">{m.pos}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="demo-team-box demo-team-box--b">
                  <div className="demo-team-title">
                    <span className="team-badge team-badge--b">B팀 (블루 조끼)</span>
                    <span className="team-count">6명</span>
                  </div>
                  <div className="demo-team-members">
                    {teamB.map((m, idx) => (
                      <div key={idx} className="demo-member-pill">
                        <span className="demo-member-name">{m.name}</span>
                        <span className="demo-member-pos">{m.pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="demo-teams-footer-note">
                <span>✨ 밸런스 지수 99% 달성! 공정한 팀 매칭으로 게임의 재미가 배가됩니다.</span>
              </div>
            </div>
          )}

          {/* TAB 3: 회비 정산 */}
          {demoTab === 'dues' && (
            <div className="demo-tab-content">
              <div className="demo-dues-header">
                <div>
                  <div className="demo-group-name">💰 5월 정기 모임 정산</div>
                  <div className="demo-event-title">1인 15,000원 (구장 대관료 & 음료)</div>
                </div>
                <div className="demo-dues-status-pill">
                  {duesPaidCount === duesTotalCount ? '🎉 전원 완납 완료' : `${duesTotalCount}명 중 ${duesPaidCount}명 완납`}
                </div>
              </div>

              {/* Dues Progress */}
              <div className="demo-dues-progress-wrap">
                <div className="demo-dues-progress-bar">
                  <div
                    className="demo-dues-progress-fill"
                    style={{ width: `${duesPct}%` }}
                  />
                </div>
                <div className="demo-dues-progress-text">
                  <span>납부율 {duesPct}%</span>
                  <span>총 {(duesPaidCount * 15000).toLocaleString()}원 / {(duesTotalCount * 15000).toLocaleString()}원</span>
                </div>
              </div>

              {/* Quick Pay Buttons */}
              <div className="demo-dues-pay-buttons">
                <button type="button" className="demo-pay-btn demo-pay-btn--toss" onClick={() => alert('토스 송금 화면으로 연결되는 딥링크입니다.')}>
                  <span>🚀 토스로 1초 송금</span>
                </button>
                <button type="button" className="demo-pay-btn demo-pay-btn--kakao" onClick={() => alert('카카오페이 송금 화면으로 연결되는 딥링크입니다.')}>
                  <span>💛 카카오페이 송금</span>
                </button>
              </div>

              {/* Member payment checklist (clickable!) */}
              <div className="demo-dues-checklist">
                <div className="demo-checklist-heading">회원 납부 현황 (이름을 눌러보세요)</div>
                <div className="demo-checklist-grid">
                  {Object.entries(paidList).map(([name, isPaid]) => (
                    <button
                      key={name}
                      type="button"
                      className={`demo-check-item ${isPaid ? 'is-paid' : 'is-unpaid'}`}
                      onClick={() => toggleMemberPaid(name)}
                    >
                      <span className="check-mark">{isPaid ? '✅' : '⏳'}</span>
                      <span className="check-name">{name}</span>
                      <span className="check-status">{isPaid ? '완납' : '미납'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 3. Before vs After Comparison ── */}
      <section className="landing-compare-section">
        <div className="landing-section-header">
          <span className="landing-section-pill">WHY CLOVER?</span>
          <h2 className="landing-section-title">기존 단톡방 vs 클로버</h2>
          <p className="landing-section-subtitle">
            단톡방에서 지친 모임장과 총무님, 이제 클로버로 10배 편해지세요.
          </p>
        </div>

        <div className="landing-compare-grid">
          {/* Traditional Chatroom */}
          <div className="landing-compare-card landing-compare-card--old">
            <div className="compare-card-badge compare-card-badge--old">
              <span>❌ 기존 단톡방 투표</span>
            </div>
            <ul className="compare-list">
              <li>
                <span className="compare-icon">😣</span>
                <div>
                  <strong>수동 투표 독려 스트레스</strong>
                  <p>마감 지나도 투표 안 한 회원 찾아 일일이 갠톡 독려</p>
                </div>
              </li>
              <li>
                <span className="compare-icon">📝</span>
                <div>
                  <strong>참석자 수작업 정리</strong>
                  <p>투표 결과 보며 메모장에 참석/불참 명단 옮겨 적기</p>
                </div>
              </li>
              <li>
                <span className="compare-icon">🤯</span>
                <div>
                  <strong>머리 싸매는 조 편성</strong>
                  <p>실력과 성별 맞추느라 종이에 썼다 지웠다 반복</p>
                </div>
              </li>
              <li>
                <span className="compare-icon">💸</span>
                <div>
                  <strong>계좌 복붙 & 입금 확인 피로</strong>
                  <p>단톡방에 계좌 올리고 통장 내역과 1:1 대조 확인</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Clover Solution */}
          <div className="landing-compare-card landing-compare-card--new">
            <div className="compare-card-badge compare-card-badge--new">
              <span>🍀 스마트 모임 클로버</span>
            </div>
            <ul className="compare-list">
              <li>
                <span className="compare-icon">🤖</span>
                <div>
                  <strong>미투표자 카톡 자동 알림</strong>
                  <p>마감 전 미투표 회원에게만 카톡으로 친절하게 리마인더</p>
                </div>
              </li>
              <li>
                <span className="compare-icon">⚡</span>
                <div>
                  <strong>3초 참석 투표 & 실시간 집계</strong>
                  <p>참석·늦참·불참 인원과 명단이 실시간으로 자동 정리</p>
                </div>
              </li>
              <li>
                <span className="compare-icon">⚖️</span>
                <div>
                  <strong>원클릭 밸런스 스마트 조 편성</strong>
                  <p>참석자만 쏙 골라 성별·실력 균등한 팀 자동 매칭</p>
                </div>
              </li>
              <li>
                <span className="compare-icon">💳</span>
                <div>
                  <strong>투명한 회비 & 토스/카카오페이 송금</strong>
                  <p>완납 현황 실시간 확인 및 1초 원터치 간편 송금</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 4. 4 Core Superpowers Grid ── */}
      <section className="landing-superpowers-section">
        <div className="landing-section-header">
          <span className="landing-section-pill">CORE FEATURES</span>
          <h2 className="landing-section-title">모임 운영에 꼭 필요한 4가지</h2>
          <p className="landing-section-subtitle">불필요한 군더더기는 빼고, 모임 관리에 진짜 필요한 기능만 담았습니다.</p>
        </div>

        <div className="landing-superpowers-grid">
          <div className="superpower-card">
            <div className="superpower-icon superpower-icon--green">⚡</div>
            <h3>3초 참석 투표 & 알림톡</h3>
            <p>단톡방 투표 도배 없이, 마감 전 미투표 회원에게만 카카오톡 핀포인트 리마인더를 발송합니다.</p>
          </div>
          <div className="superpower-card">
            <div className="superpower-icon superpower-icon--blue">⚖️</div>
            <h3>스마트 조 편성 (팀 나누기)</h3>
            <p>참석 인원만 기반으로 실력과 성별이 고르게 분배된 공정한 팀을 원클릭으로 자동 생성합니다.</p>
          </div>
          <div className="superpower-card">
            <div className="superpower-icon superpower-icon--amber">💰</div>
            <h3>투명한 회비 & 간편 송금</h3>
            <p>월별 회비 납부율을 한눈에 확인하고, 토스/카카오페이 딥링크로 1초 만에 송금할 수 있습니다.</p>
          </div>
          <div className="superpower-card">
            <div className="superpower-icon superpower-icon--purple">📸</div>
            <h3>고화질 갤러리 & 공지 핀고정</h3>
            <p>단톡방에서 만료되어 사라지는 모임 추억 사진과 주요 공지를 영구적으로 깔끔하게 보관하세요.</p>
          </div>
        </div>
      </section>

      {/* ── 5. Recommended Public Groups ── */}
      {publicGroups.length > 0 && (
        <section className="landing-groups-section" id="explore-groups">
          <div className="landing-section-header">
            <span className="landing-section-pill">COMMUNITY</span>
            <h2 className="landing-section-title">지금 활발히 활동 중인 모임들</h2>
            <p className="landing-section-subtitle">클로버와 함께 더 스마트하게 운영되고 있는 모임을 둘러보세요.</p>
          </div>

          <div className="landing-groups-grid">
            {publicGroups.map((g) => {
              const locationStr = g.activityRegion || [g.activitySido, g.activitySigungu].filter(Boolean).join(' ') || '전국';
              return (
                <div
                  key={g.id}
                  className="landing-group-card"
                  onClick={() => setPreviewGroup(g)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="landing-group-card__top">
                    <GroupAvatar src={g.profileImageUrl} name={g.name} size={48} radius={14} />
                    <div className="landing-group-card__meta">
                      <span className="landing-group-card__cat">
                        {g.category || '기타'}
                      </span>
                      <h4 className="landing-group-card__name">{g.name}</h4>
                    </div>
                  </div>
                  {g.description && (
                    <p className="landing-group-card__desc">{g.description}</p>
                  )}
                  <div className="landing-group-card__bottom">
                    <span className="landing-group-tag">👥 {g._count?.members || g.members?.length || 1}명</span>
                    <span className="landing-group-tag">📍 {locationStr}</span>
                    <span className="landing-group-view-btn">자세히 보기 ›</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="landing-groups-more-wrap">
            <Link to="/groups" className="landing-groups-more-btn">
              <span>모든 모임 둘러보기</span>
              <span>→</span>
            </Link>
          </div>
        </section>
      )}

      {/* ── 6. FAQ Accordion ── */}
      <section className="landing-faq-section">
        <div className="landing-section-header">
          <span className="landing-section-pill">FAQ</span>
          <h2 className="landing-section-title">자주 묻는 질문</h2>
          <p className="landing-section-subtitle">궁금하신 점들을 모아 명쾌하게 정리해 드립니다.</p>
        </div>

        <div className="landing-faq-list">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={`landing-faq-item ${isOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span className="landing-faq-toggle-icon">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="landing-faq-answer">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 7. Bottom CTA Banner ── */}
      <section className="landing-bottom-cta">
        <div className="bottom-cta-badge">🍀 Clover와 함께 스마트하게</div>
        <h2>지금 바로 우리 모임의 일정을 시작해보세요</h2>
        <p>복잡한 가입 절차 없이 카카오 계정으로 1초 만에 시작할 수 있습니다.</p>
        <button type="button" onClick={startKakaoLogin} className="landing-btn-kakao landing-btn-kakao--large">
          <svg className="kakao-svg" width="20" height="20" viewBox="0 0 24 24" fill="#191919">
            <path d="M12 3C6.477 3 2 6.477 2 10.772c0 2.766 1.848 5.19 4.646 6.57-.205.77-.754 2.802-.865 3.235-.138.544.198.536.417.391.172-.114 2.748-1.874 3.864-2.637.625.092 1.272.141 1.938.141 5.523 0 10-3.477 10-7.7c0-4.295-4.477-7.772-10-7.772z"/>
          </svg>
          <span>카카오로 1초 만에 무료 시작하기</span>
        </button>
        <div className="bottom-cta-subtext">가입비 없음 · 평생 무료 지원 · 광고 없음</div>
      </section>

      {/* ── 8. Footer ── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">🍀</span>
            <span className="footer-brand-text">Clover</span>
          </div>
          <div className="footer-links">
            <Link to="/terms">이용약관</Link>
            <span className="footer-dot">·</span>
            <Link to="/privacy">개인정보처리방침</Link>
            <span className="footer-dot">·</span>
            <Link to="/groups">모임 찾기</Link>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} Clover. All rights reserved.</p>
        </div>
      </footer>

      {/* Group Preview Modal */}
      {previewGroup && (
        <GroupPreviewModal
          group={previewGroup}
          isOpen={Boolean(previewGroup)}
          onClose={() => setPreviewGroup(null)}
          onUpdated={() => {}}
        />
      )}
    </div>
  );
}

function HomeDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [duesSummary, setDuesSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [showGroupSelectModal, setShowGroupSelectModal] = useState(false);

  const officerGroups = groups.filter((g) => g.myRole && isStaffRole(g.myRole));
  const isOfficerInAnyGroup = officerGroups.length > 0;

  const handleCreateEventClick = () => {
    setIsFabOpen(false);
    if (officerGroups.length >= 1) {
      setShowGroupSelectModal(true);
    } else {
      navigate('/groups/new');
    }
  };

  const handleCreateGroupClick = () => {
    setIsFabOpen(false);
    navigate('/groups/new');
  };

  const load = () => {
    setLoading(true);
    setNetworkError(false);
    Promise.all([
      api.getCalendar(),
      api.myGroups(),
      api.getMyDuesSummary ? api.getMyDuesSummary() : Promise.resolve([]),
    ])
      .then(([calendarEvents, myGroups, myDues]) => {
        setEvents(calendarEvents);
        setGroups(myGroups);
        if (myDues) setDuesSummary(myDues);
      })
      .catch(() => setNetworkError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const upcoming = events.filter(isUpcoming);
  const [heroVoting, setHeroVoting] = useState(false);
  const [showHeroShare, setShowHeroShare] = useState(false);

  const handleHeroVote = async (eventId: string, choice: VoteChoice, currentVote?: VoteChoice | null) => {
    setHeroVoting(true);
    try {
      if (currentVote === choice) {
        await api.cancelVote(eventId);
      } else {
        await api.castVote(eventId, choice);
      }
      await load();
    } catch (err) {
      console.error('Hero vote failed:', err);
    } finally {
      setHeroVoting(false);
    }
  };

  // Next upcoming urgent event for the hero D-Day card (sorted by earliest date/time)
  const nextUrgentEvent = upcoming.length > 0 ? upcoming[0] : null;

  // Remaining upcoming events (excluding nextUrgentEvent which is in the Hero card)
  const remainingUpcoming = useMemo(() => {
    if (!nextUrgentEvent) return upcoming;
    return upcoming.filter((e) => e.id !== nextUrgentEvent.id);
  }, [upcoming, nextUrgentEvent]);

  const getDDayInfo = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cleanDateStr = (dateStr || '').split('T')[0];
    const parts = cleanDateStr.split('-');
    if (parts.length < 3) return { label: 'D-Day', isUrgent: false };
    const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: '🔥 오늘 D-Day', isUrgent: true };
    if (diffDays === 1) return { label: '⚡ 내일 D-1', isUrgent: true };
    if (diffDays === 2) return { label: '📅 D-2', isUrgent: false };
    if (diffDays > 2) return { label: `📅 D-${diffDays}`, isUrgent: false };
    return { label: '진행 중', isUrgent: true };
  };

  const unpaidDuesCount = useMemo(() => {
    return duesSummary.filter(d => !d.isPaid && !d.isExempt).length;
  }, [duesSummary]);

  const unvotedEvents = useMemo(() => {
    return upcoming.filter(e => !e.myVote);
  }, [upcoming]);

  const actionItems = useMemo(() => {
    const items = [];
    if (unvotedEvents.length > 0 && !nextUrgentEvent?.myVote) {
      items.push({
        title: '참석 투표 필요',
        desc: `${unvotedEvents.length}개의 다가오는 일정 투표가 아직 진행되지 않았어요.`,
        iconClass: 'home-action-card__icon--vote',
        emoji: '🗳️',
        link: `/events/${unvotedEvents[0].id}`,
      });
    }
    if (unpaidDuesCount > 0) {
      items.push({
        title: '이번 달 회비 미납',
        desc: `${unpaidDuesCount}개의 모임 회비가 아직 납부되지 않았어요.`,
        iconClass: 'home-action-card__icon--dues',
        emoji: '💰',
        link: '/my',
      });
    }
    return items;
  }, [unpaidDuesCount, unvotedEvents, nextUrgentEvent]);
  return (
    <div className="home-dashboard">
      {networkError && (
        <div style={{
          margin: '0 0 12px',
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
            ⚠️ 네트워크 연결에 문제가 발생했습니다
          </span>
          <button
            onClick={() => { setNetworkError(false); load(); }}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            다시 시도
          </button>
        </div>
      )}
      {/* 🌟 Next Upcoming Event D-Day Highlight Widget with Integrated Direct Voting */}
      {nextUrgentEvent && (
        <div
          className="home-dday-hero"
          style={{
            margin: '0 0 20px 0',
            padding: '18px',
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
            borderRadius: '20px',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(6, 78, 59, 0.22)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle background glow */}
          <div style={{
            position: 'absolute',
            right: '-20px',
            bottom: '-20px',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, rgba(52, 211, 153, 0) 70%)',
            pointerEvents: 'none'
          }} />

          {/* Top Row: D-Day, Vote Badge, Group Name */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 10px',
                background: getDDayInfo(nextUrgentEvent.date).isUrgent ? '#ef4444' : 'rgba(255, 255, 255, 0.2)',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '-0.2px'
              }}>
                {getDDayInfo(nextUrgentEvent.date).label}
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 8px',
                background: nextUrgentEvent.myVote ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                color: nextUrgentEvent.myVote ? '#6ee7b7' : '#fde047',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                border: `1px solid ${nextUrgentEvent.myVote ? 'rgba(110, 231, 183, 0.4)' : 'rgba(253, 224, 71, 0.4)'}`
              }}>
                {nextUrgentEvent.myVote ? `${VOTE_LABELS[nextUrgentEvent.myVote]} 완료` : '투표 필요'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to={`/groups/${nextUrgentEvent.group.id}`}
                style={{ fontSize: '13px', fontWeight: 700, color: '#a7f3d0', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                {nextUrgentEvent.group.name || '모임'} 〉
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHeroShare(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: '#fee500',
                  border: '1px solid #e6cf00',
                  color: '#191919',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px',
                }}
                title="일정 및 투표 공유"
                aria-label="공유"
              >
                💬
              </button>
            </div>
          </div>

          {/* Event Title */}
          <h3 style={{
            fontSize: '18px',
            fontWeight: 800,
            margin: '0 0 8px 0',
            letterSpacing: '-0.3px',
            lineHeight: 1.3
          }}>
            <Link
              to={`/events/${nextUrgentEvent.id}`}
              style={{ color: '#ffffff', textDecoration: 'none' }}
            >
              {nextUrgentEvent.title}
            </Link>
          </h3>

          {/* Date & Location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', color: '#d1fae5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📅</span>
              <span>{formatEventDate(nextUrgentEvent.date, nextUrgentEvent.startTime, nextUrgentEvent.endTime)}</span>
            </div>
            {nextUrgentEvent.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📍</span>
                <span>{nextUrgentEvent.location}</span>
              </div>
            )}
          </div>

          {/* Direct 1-Tap Voting Card (세번째 카드처럼 바로 투표 가능하게 통합) */}
          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px' }}>🗳️</span>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--ink-dark)' }}>
                  {nextUrgentEvent.myVote ? (
                    <span style={{ color: '#059669' }}>
                      내 투표: <strong>{VOTE_LABELS[nextUrgentEvent.myVote]}</strong> ✅
                    </span>
                  ) : (
                    <span style={{ color: '#d97706' }}>
                      참석 여부를 바로 선택해 주세요!
                    </span>
                  )}
                </span>
              </div>
              <Link
                to={`/events/${nextUrgentEvent.id}`}
                style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--ink-muted)', textDecoration: 'none' }}
              >
                상세보기 ›
              </Link>
            </div>

            {/* Live Vote Progress Bar */}
            <HomeVoteProgressBar event={nextUrgentEvent} />

            {/* Direct Voting Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
              {VOTE_CHOICES.map((c) => {
                const isSelected = nextUrgentEvent.myVote === c;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={heroVoting}
                    onClick={() => handleHeroVote(nextUrgentEvent.id, c, nextUrgentEvent.myVote)}
                    className={`home-vote-btn home-vote-btn--${c.toLowerCase()}${isSelected ? ' is-selected' : ''}`}
                    style={{
                      height: '42px',
                      fontSize: '13.5px',
                      fontWeight: '800',
                      borderRadius: '12px',
                    }}
                  >
                    <span className="home-vote-btn__label">{VOTE_LABELS[c]}</span>
                    <span className="home-vote-btn__count">({nextUrgentEvent.voteCounts[c]})</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 지금 필요한 것 Action Cards (미납 회비 등 꼭 필요한 경우만 노출) */}
      {actionItems.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h2 className="home-section__title" style={{ marginBottom: '12px', fontSize: '15px', color: 'var(--ink-dark)' }}>지금 필요한 것</h2>
          <div className="home-action-cards">
            {actionItems.map((item, i) => (
              <Link key={i} to={item.link} className="home-action-card">
                <div className={`home-action-card__icon ${item.iconClass}`}>
                  {item.emoji}
                </div>
                <div className="home-action-card__body">
                  <p className="home-action-card__title">{item.title}</p>
                  <p className="home-action-card__desc">{item.desc}</p>
                </div>
                <span className="home-action-card__arrow">›</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Loading Indicator */}
      {loading && (
        <LoadingIndicator message="모임 일정을 불러오는 중입니다…" onRetry={load} />
      )}

      {/* 진행 중인 일정이 아예 없을 때의 빈 상태 */}
      {!loading && upcoming.length === 0 && (
        <div className="home-empty" style={{ padding: '36px 16px', background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center', marginTop: '16px' }}>
          <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--ink-dark)' }}>
            현재 진행 중인 일정이 없어요 🌱
          </p>
          <p style={{ margin: '8px 0 16px', fontSize: '13px', color: 'var(--ink-muted)' }}>
            새로운 모임에 참여하거나 일정을 만들어 보세요.
          </p>
          <Link to="/groups" className="link-text" style={{ fontWeight: 700 }}>
            모임 찾아보기 →
          </Link>
        </div>
      )}

      {/* 다음 진행 예정 일정 카드 목록 (Hero 카드 외에 추가 일정이 있는 경우) */}
      {!loading && remainingUpcoming.length > 0 && (
        <section className="home-section" style={{ marginTop: '20px' }}>
          <h2 className="home-section__title" style={{ fontSize: '15px', color: 'var(--ink-dark)', marginBottom: '12px' }}>
            다음 진행 일정
            <span className="home-section__count" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', marginLeft: '6px' }}>
              {remainingUpcoming.length}
            </span>
          </h2>
          <div className="home-event-list">
            {remainingUpcoming.map((ev) => (
              <HomeEventCard key={ev.id} event={ev} votable onVoted={load} />
            ))}
          </div>
        </section>
      )}

      {/* Officer Floating Action Button (FAB) & Speed Dial */}
      {isOfficerInAnyGroup && (
        <div className="home-fab-container app-fab-fixed-container">
          {isFabOpen && (
            <div className="home-fab-backdrop" onClick={() => setIsFabOpen(false)} />
          )}

          <div className={`home-fab-speed-dial${isFabOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="home-fab-action-item"
              onClick={handleCreateEventClick}
            >
              <span className="fab-item-icon">⚽</span>
              <span>새 일정 만들기</span>
            </button>
            <button
              type="button"
              className="home-fab-action-item"
              onClick={handleCreateGroupClick}
            >
              <span className="fab-item-icon">🌱</span>
              <span>새 모임 만들기</span>
            </button>
          </div>

          <button
            type="button"
            className={`home-fab-main-btn${isFabOpen ? ' is-open' : ''}`}
            onClick={() => setIsFabOpen((prev) => !prev)}
            aria-label="생성 메뉴 열기"
            title="새 일정 또는 모임 생성"
          >
            +
          </button>
        </div>
      )}

      {/* Group Selector Modal for Event Creation */}
      {showGroupSelectModal && (
        <div className="group-select-modal-overlay" onClick={() => setShowGroupSelectModal(false)}>
          <div className="group-select-modal" onClick={(e) => e.stopPropagation()}>
            <div className="group-select-modal__header">
              <h3>어느 모임의 일정을 만드시겠어요?</h3>
              <button
                type="button"
                className="group-select-modal__close-btn"
                onClick={() => setShowGroupSelectModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="group-select-modal__body">
              <div className="group-select-modal__list">
                {officerGroups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="group-select-modal__item"
                    onClick={() => {
                      setShowGroupSelectModal(false);
                      navigate(`/groups/${g.id}/events/new`);
                    }}
                  >
                    <GroupAvatar src={g.profileImageUrl} name={g.name} size={40} radius={12} />
                    <div className="group-select-modal__item-info">
                      <span className="group-select-modal__item-name">{g.name}</span>
                      <span className="group-select-modal__item-role">운영진</span>
                    </div>
                    <span className="group-select-modal__arrow">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Event Share Modal */}
      {nextUrgentEvent && (
        <EventShareModal
          isOpen={showHeroShare}
          onClose={() => setShowHeroShare(false)}
          event={{
            id: nextUrgentEvent.id,
            title: nextUrgentEvent.title,
            date: nextUrgentEvent.date,
            startTime: nextUrgentEvent.startTime,
            endTime: nextUrgentEvent.endTime,
            location: nextUrgentEvent.location,
            groupName: nextUrgentEvent.group.name,
            groupProfileImageUrl: nextUrgentEvent.group.profileImageUrl,
          }}
        />
      )}
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingIndicator message="사용자 정보를 확인하고 있습니다…" />;
  if (!user) return <GuestLanding />;
  if (!isProfileComplete(user)) {
    return <Navigate to="/profile/edit?required=true" replace />;
  }
  return <HomeDashboard />;
}
