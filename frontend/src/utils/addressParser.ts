export function normalizeSido(sido: string): string {
  if (!sido) return '';
  if (sido.startsWith('서울')) return '서울특별시';
  if (sido.startsWith('부산')) return '부산광역시';
  if (sido.startsWith('대구')) return '대구광역시';
  if (sido.startsWith('인천')) return '인천광역시';
  if (sido.startsWith('광주')) return '광주광역시';
  if (sido.startsWith('대전')) return '대전광역시';
  if (sido.startsWith('울산')) return '울산광역시';
  if (sido.startsWith('세종')) return '세종특별자치시';
  if (sido.startsWith('경기')) return '경기도';
  if (sido.startsWith('강원')) return '강원특별자치도';
  if (sido.startsWith('충북') || sido.startsWith('충청북')) return '충청북도';
  if (sido.startsWith('충남') || sido.startsWith('충청남')) return '충청남도';
  if (sido.startsWith('전북') || sido.startsWith('전북특별자치')) return '전북특별자치도';
  if (sido.startsWith('전남') || sido.startsWith('전라남')) return '전라남도';
  if (sido.startsWith('경북') || sido.startsWith('경상북')) return '경상북도';
  if (sido.startsWith('경남') || sido.startsWith('경상남')) return '경상남도';
  if (sido.startsWith('제주')) return '제주특별자치도';
  return sido;
}

export interface ParsedKoreanAddress {
  activitySido: string;
  activitySigungu: string;
  activityDistrict?: string;
  activityTown?: string;
}

export function parseKoreanAddress(address: string): ParsedKoreanAddress | null {
  if (!address) return null;
  let clean = address.trim();

  // Reverse comma-separated address (e.g. from OpenStreetMap/geocoder: "융합기술로116번길, 흥해읍, 북구, 포항시, 경상북도, 37554, 대한민국")
  if (clean.includes(',')) {
    const rawParts = clean.split(',').map((p) => p.trim()).filter(Boolean);
    const filteredParts = rawParts.filter(
      (p) => !/^\d{5}$/.test(p) && p !== '대한민국' && p !== 'South Korea' && p !== 'ROK'
    );
    const lastPart = filteredParts[filteredParts.length - 1];
    if (
      lastPart &&
      (lastPart.endsWith('도') ||
        lastPart.endsWith('시') ||
        lastPart.includes('경상') ||
        lastPart.includes('전라') ||
        lastPart.includes('충청') ||
        lastPart.includes('경기') ||
        lastPart.includes('서울') ||
        lastPart.includes('부산') ||
        lastPart.includes('대구') ||
        lastPart.includes('인천') ||
        lastPart.includes('광주') ||
        lastPart.includes('대전') ||
        lastPart.includes('울산') ||
        lastPart.includes('세종') ||
        lastPart.includes('제주') ||
        lastPart.includes('강원'))
    ) {
      filteredParts.reverse();
    }
    clean = filteredParts.join(' ');
  } else {
    if (clean.startsWith('대한민국')) {
      clean = clean.substring(4).trim();
    }
  }

  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  const activitySido = normalizeSido(tokens[0]);
  let activitySigungu = '';
  let activityDistrict = '';
  let activityTown = '';

  if (tokens.length > 1) {
    const second = tokens[1];
    if (tokens.length > 2 && second.endsWith('시') && (tokens[2].endsWith('구') || tokens[2].endsWith('군'))) {
      activitySigungu = `${second} ${tokens[2]}`;
      if (tokens.length > 3) {
        if (tokens[3].endsWith('읍') || tokens[3].endsWith('면') || tokens[3].endsWith('동') || tokens[3].endsWith('리')) {
          activityTown = tokens[3];
          activityDistrict = tokens[3];
        } else {
          activityDistrict = tokens[3];
        }
      }
      if (tokens.length > 4 && (tokens[4].endsWith('읍') || tokens[4].endsWith('면') || tokens[4].endsWith('동') || tokens[4].endsWith('리'))) {
        activityTown = tokens[4];
      }
    } else {
      activitySigungu = second;
      if (tokens.length > 2) {
        if (tokens[2].endsWith('읍') || tokens[2].endsWith('면') || tokens[2].endsWith('동') || tokens[2].endsWith('리')) {
          activityTown = tokens[2];
          activityDistrict = tokens[2];
        } else {
          activityDistrict = tokens[2];
        }
      }
      if (tokens.length > 3 && (tokens[3].endsWith('읍') || tokens[3].endsWith('면') || tokens[3].endsWith('동') || tokens[3].endsWith('리'))) {
        activityTown = tokens[3];
      }
    }
  }

  return {
    activitySido,
    activitySigungu,
    activityDistrict: activityDistrict || undefined,
    activityTown: activityTown || undefined,
  };
}
