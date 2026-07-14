import { useState } from 'react';
import './Settings.css';

const FONTS = [
  {
    name: '기본 글꼴 (Pretendard)',
    value: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  },
  {
    name: 'Inter (영문 특화 고딕)',
    value: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    name: 'Standard Sans (표준 한글 고딕)',
    value: "'Noto Sans KR', sans-serif",
  },
  {
    name: 'D2Coding (코딩/고정폭 글꼴)',
    value: "'D2Coding', 'Courier New', monospace",
  },
];

export default function Settings() {
  const [notifications, setNotifications] = useState(
    localStorage.getItem('clover_notifications_enabled') !== 'false'
  );
  const [selectedFont, setSelectedFont] = useState(
    localStorage.getItem('clover_font_family') || FONTS[0].value
  );
  const [selectedSize, setSelectedSize] = useState(
    localStorage.getItem('clover_font_size') || '14px'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleNotificationToggle = () => {
    const nextVal = !notifications;
    setNotifications(nextVal);
    localStorage.setItem('clover_notifications_enabled', String(nextVal));
    triggerSaveSuccess();
  };

  const handleFontChange = (fontValue: string) => {
    setSelectedFont(fontValue);
    localStorage.setItem('clover_font_family', fontValue);
    document.documentElement.style.setProperty('--font-body', fontValue);
    triggerSaveSuccess();
  };

  const handleSizeChange = (size: number) => {
    const sizeValue = `${size}px`;
    setSelectedSize(sizeValue);
    localStorage.setItem('clover_font_size', sizeValue);
    document.documentElement.style.setProperty('--app-font-size', sizeValue);
    
    const zoomVal = (size / 14).toFixed(3);
    document.documentElement.style.setProperty('--app-zoom', zoomVal);
    triggerSaveSuccess();
  };

  const triggerSaveSuccess = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 1500);
  };

  return (
    <div className="settings-page">
      <h1 className="page-title">⚙️ 설정</h1>

      <div className="settings-container form-card">
        <section className="settings-section">
          <h2 className="settings-section__title">알림 설정</h2>
          <div className="settings-row">
            <div className="settings-row__info">
              <span className="settings-row__label">푸시 알림 켜기</span>
              <p className="settings-row__desc">모임 가입 승인 및 이벤트 리마인더 푸시 알림을 수신합니다.</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notifications}
                onChange={handleNotificationToggle}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </section>

        <div className="settings-divider" />

        <section className="settings-section">
          <h2 className="settings-section__title">화면 설정</h2>
          
          <div className="settings-control-group">
            <span className="settings-row__label">글꼴 선택</span>
            <div className="font-selection-list">
              {FONTS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={`font-selection-btn ${selectedFont === f.value ? 'is-active' : ''}`}
                  onClick={() => handleFontChange(f.value)}
                  style={{ fontFamily: f.value }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-control-group">
            <div className="size-slider-header">
              <span className="settings-row__label">글자 크기 조절</span>
              <span className="size-preview-badge">{selectedSize}</span>
            </div>
            <div className="size-slider-wrapper">
              <span className="slider-label slider-label--small">A</span>
              <input
                type="range"
                min="12"
                max="20"
                step="1"
                value={parseInt(selectedSize, 10) || 14}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                className="size-range-slider"
              />
              <span className="slider-label slider-label--large">A</span>
            </div>
            <div className="size-description-bar">
              <span>작게 (12px)</span>
              <span>기본 (14px)</span>
              <span>크게 (16px)</span>
              <span>아주 크게 (20px)</span>
            </div>
          </div>
        </section>
      </div>

      {saveSuccess && (
        <div className="settings-toast-popup">
          설정이 적용되었습니다.
        </div>
      )}
    </div>
  );
}
