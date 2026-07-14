// Geolocation utility coordinates for Clover groups
// Maps region keywords (towns, sigungus) to latitude/longitude

export const REGION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '역삼동': { lat: 37.49808, lng: 127.02797 }, // 강남
  '여의도동': { lat: 37.52156, lng: 126.92425 }, // 여의도
  '흥해읍': { lat: 36.11059, lng: 129.34707 }, // 포항
  '우동': { lat: 35.15934, lng: 129.13600 }, // 부산 해운대
  '정자동': { lat: 37.36154, lng: 127.11148 }, // 성남 분당
  '송도동': { lat: 37.38202, lng: 126.65607 }, // 인천 송도

  // Fallbacks
  '강남구': { lat: 37.49808, lng: 127.02797 },
  '영등포구': { lat: 37.52156, lng: 126.92425 },
  '포항시': { lat: 36.0190, lng: 129.3434 },
  '해운대구': { lat: 35.15934, lng: 129.13600 },
  '성남시': { lat: 37.4200, lng: 127.1265 },
  '연수구': { lat: 37.4100, lng: 126.6784 },
  '서울특별시': { lat: 37.5665, lng: 126.9780 },
  '부산광역시': { lat: 35.1796, lng: 129.0756 },
  '경기도': { lat: 37.2752, lng: 127.0095 },
  '인천광역시': { lat: 37.4563, lng: 126.7052 },
  '경상북도': { lat: 36.5760, lng: 128.5056 },
};

export interface GroupLocationInput {
  activitySido?: string | null;
  activitySigungu?: string | null;
  activityDistrict?: string | null;
  activityTown?: string | null;
}

export function getGroupCoordinates(group: GroupLocationInput): { lat: number; lng: number } {
  // 1. Try Town match
  if (group.activityTown && REGION_COORDINATES[group.activityTown]) {
    return REGION_COORDINATES[group.activityTown];
  }
  // 2. Try District match
  if (group.activityDistrict && REGION_COORDINATES[group.activityDistrict]) {
    return REGION_COORDINATES[group.activityDistrict];
  }
  // 3. Try Sigungu match
  if (group.activitySigungu && REGION_COORDINATES[group.activitySigungu]) {
    return REGION_COORDINATES[group.activitySigungu];
  }
  // 4. Try Sido match
  if (group.activitySido && REGION_COORDINATES[group.activitySido]) {
    return REGION_COORDINATES[group.activitySido];
  }

  // Fallback hash-based coordinates for arbitrary address string
  const text = `${group.activitySido ?? ''} ${group.activitySigungu ?? ''} ${group.activityDistrict ?? ''} ${group.activityTown ?? ''}`.trim();
  if (!text) {
    return { lat: 37.5665, lng: 126.9780 }; // Default to Seoul City Hall
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const latOffset = ((hash % 100) / 1000); // max +/- 0.1 degree
  const lngOffset = (((hash >> 8) % 100) / 1000);
  
  return {
    lat: 37.5665 + latOffset,
    lng: 126.9780 + lngOffset,
  };
}

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
