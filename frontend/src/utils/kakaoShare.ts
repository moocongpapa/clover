/**
 * 카카오톡 일정 및 투표 공유 유틸리티
 */

export const DEFAULT_KAKAO_JS_KEY = '914ce4ceb9c709b5736c0a378980bb14';

export function getKakaoJsKey(): string {
  return (
    (import.meta as any).env?.VITE_KAKAO_JAVASCRIPT_KEY || DEFAULT_KAKAO_JS_KEY
  );
}

export function initKakaoSdk(): boolean {
  if (typeof window === 'undefined') return false;
  const kakao = (window as any).Kakao;
  if (!kakao) return false;
  if (kakao.isInitialized?.()) return true;

  const jsKey = getKakaoJsKey();
  if (!jsKey) return false;

  try {
    kakao.init(jsKey);
    return kakao.isInitialized?.() ?? false;
  } catch (e) {
    console.warn('Kakao init error:', e);
    return false;
  }
}

export interface ShareEventData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  groupName?: string | null;
  groupProfileImageUrl?: string | null;
  voteCounts?: {
    ATTEND?: number;
    LATE?: number;
    ABSENT?: number;
  } | null;
}

export function formatEventScheduleText(
  date: string,
  startTime: string,
  endTime?: string | null,
) {
  try {
    const d = new Date(date);
    const weekday = d.toLocaleDateString('ko-KR', { weekday: 'short' });
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const timeRange = endTime ? `${startTime} ~ ${endTime}` : startTime;
    return `${year}-${month}-${day} (${weekday}) ${timeRange}`;
  } catch {
    return `${date} ${startTime}`;
  }
}

// 중복 터치로 인해 카톡 공유창이나 WebShare가 여러 번 뜨는 것을 방지하는 락
let isSharingActive = false;

export async function shareEventToKakao(
  event: ShareEventData,
  onToast?: (msg: string) => void,
  onError?: (err: string) => void,
): Promise<boolean> {
  if (isSharingActive) return false;
  isSharingActive = true;

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clover-gilt.vercel.app';
    const eventUrl = `${origin}/events/${event.id}`;
    const groupLabel = event.groupName ? `[${event.groupName}] ` : '';
    const shareTitle = `🍀 ${groupLabel}${event.title}`;
    const scheduleText = formatEventScheduleText(event.date, event.startTime, event.endTime);
    const locationText = event.location && event.location !== '미정' ? `\n📍 장소: ${event.location}` : '';
    const descText = event.description ? `\n💬 ${event.description}` : '';

    // 투표 현황 텍스트
    let voteText = '';
    if (event.voteCounts) {
      const attend = event.voteCounts.ATTEND ?? 0;
      const late = event.voteCounts.LATE ?? 0;
      const absent = event.voteCounts.ABSENT ?? 0;
      const total = attend + late + absent;
      if (total > 0) {
        voteText = `\n👥 투표 현황: 참석 ${attend}명 · 늦참 ${late}명 · 불참 ${absent}명`;
      }
    }

    // WebShare API용 본문 (URL을 따로 url 필드로 넘기므로 text 본문에는 URL을 중복 기재하지 않음)
    const shareBodyWithoutUrl = `📅 일시: ${scheduleText}${locationText}${voteText}${descText}`;
    const shareDescription = `${shareBodyWithoutUrl}\n\n👉 링크를 눌러 지금 바로 참석 투표에 참여해 주세요!`;
    // 클립보드 복사용 전체 텍스트
    const fullTextMessage = `${shareTitle}\n\n${shareDescription}\n\n🗳️ 참석 투표 바로가기:\n${eventUrl}`;

    // 1. Mobile devices: Prefer native Web Share API (opens KakaoTalk & native share sheet directly)
    const isMobile =
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

    if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareTitle}\n\n${shareBodyWithoutUrl}`,
          url: eventUrl,
        });
        onToast?.('카카오톡 채팅방 또는 원하는 앱으로 공유되었습니다!');
        return true;
      } catch (err: any) {
        if (err?.name === 'AbortError') return false;
        console.warn('navigator.share failed, trying fallback:', err);
      }
    }

    // 2. Kakao JavaScript SDK feed share (uses valid JS key)
    const kakao = typeof window !== 'undefined' ? (window as any).Kakao : null;
    const isSdkReady = initKakaoSdk();

    if (kakao && isSdkReady) {
      try {
        kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: shareTitle,
            description: `📅 일시: ${scheduleText}${locationText}${voteText}\n\n터치 한 번으로 참석 투표에 참여하세요!`,
            imageUrl:
              event.groupProfileImageUrl ||
              `${origin}/apple-touch-icon.png`,
            link: {
              mobileWebUrl: eventUrl,
              webUrl: eventUrl,
            },
          },
          buttons: [
            {
              title: '🗳️ 참석 투표하러 가기',
              link: {
                mobileWebUrl: eventUrl,
                webUrl: eventUrl,
              },
            },
          ],
        });
        onToast?.('카카오톡 공유창이 열렸습니다!');
        return true;
      } catch (e) {
        console.warn('Kakao.Share.sendDefault failed, falling back:', e);
      }
    }

    // 3. Desktop or non-mobile navigator.share if available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareTitle}\n\n${shareBodyWithoutUrl}`,
          url: eventUrl,
        });
        onToast?.('공유되었습니다!');
        return true;
      } catch (err: any) {
        if (err?.name === 'AbortError') return false;
        console.warn('navigator.share failed:', err);
      }
    }

    // 4. Fallback: Copy rich message with URL to clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullTextMessage);
        onToast?.('카톡 단톡방에 바로 붙여넣을 수 있도록 일정 투표 안내문이 복사되었습니다!');
        return true;
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }

    onError?.('공유 링크 복사에 실패했습니다.');
    return false;
  } finally {
    // 1초 후 중복 방지 락 해제
    setTimeout(() => {
      isSharingActive = false;
    }, 1000);
  }
}

export interface ShareAnnouncementData {
  id: string;
  title: string;
  content: string;
  isPinned?: boolean;
  authorName?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  groupProfileImageUrl?: string | null;
  createdAt?: string | Date;
}

export async function shareAnnouncementToKakao(
  announcement: ShareAnnouncementData,
  onToast?: (msg: string) => void,
  onError?: (err: string) => void,
): Promise<boolean> {
  if (isSharingActive) return false;
  isSharingActive = true;

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://clover-gilt.vercel.app';
    const targetUrl = announcement.groupId
      ? `${origin}/groups/${announcement.groupId}?tab=posts`
      : `${origin}/announcements`;

    const groupLabel = announcement.groupName ? `[${announcement.groupName}] ` : '';
    const pinPrefix = announcement.isPinned ? '📌 [필독 공지] ' : '📢 [공지] ';
    const shareTitle = `🍀 ${pinPrefix}${groupLabel}${announcement.title}`;

    const cleanContent = (announcement.content || '').trim();
    const previewContent = cleanContent.length > 120 ? `${cleanContent.slice(0, 120)}...` : cleanContent;
    const authorText = announcement.authorName ? `\n✍️ 작성자: ${announcement.authorName}` : '';
    const shareDescription = `${previewContent}${authorText}\n\n👉 링크를 눌러 전체 공지 내용을 확인하세요!`;
    const fullTextMessage = `${shareTitle}\n\n${cleanContent}${authorText}\n\n공지 바로가기:\n${targetUrl}`;

    // 1. Mobile devices: Prefer native Web Share API (opens KakaoTalk & native share sheet directly)
    const isMobile =
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

    if (isMobile && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareTitle}\n\n${cleanContent}${authorText}`,
          url: targetUrl,
        });
        onToast?.('카카오톡 채팅방 또는 원하는 앱으로 공유되었습니다!');
        return true;
      } catch (err: any) {
        if (err?.name === 'AbortError') return false;
        console.warn('navigator.share failed, trying fallback:', err);
      }
    }

    // 2. Kakao JavaScript SDK feed share (uses valid JS key)
    const kakao = typeof window !== 'undefined' ? (window as any).Kakao : null;
    const isSdkReady = initKakaoSdk();

    if (kakao && isSdkReady) {
      try {
        kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: shareTitle,
            description: shareDescription,
            imageUrl:
              announcement.groupProfileImageUrl ||
              `${origin}/apple-touch-icon.png`,
            link: {
              mobileWebUrl: targetUrl,
              webUrl: targetUrl,
            },
          },
          buttons: [
            {
              title: '📢 공지사항 보러가기',
              link: {
                mobileWebUrl: targetUrl,
                webUrl: targetUrl,
              },
            },
          ],
        });
        onToast?.('카카오톡 공유창이 열렸습니다!');
        return true;
      } catch (e) {
        console.warn('Kakao.Share.sendDefault failed, falling back:', e);
      }
    }

    // 3. Desktop or non-mobile navigator.share if available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `${shareTitle}\n\n${cleanContent}${authorText}`,
          url: targetUrl,
        });
        onToast?.('공유되었습니다!');
        return true;
      } catch (err: any) {
        if (err?.name === 'AbortError') return false;
        console.warn('navigator.share failed:', err);
      }
    }

    // 4. Fallback: Clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullTextMessage);
        onToast?.('카톡 단톡방에 바로 붙여넣을 수 있도록 공지 내용과 링크가 복사되었습니다!');
        return true;
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }

    onError?.('공지 공유 링크 복사에 실패했습니다.');
    return false;
  } finally {
    setTimeout(() => {
      isSharingActive = false;
    }, 1000);
  }
}

