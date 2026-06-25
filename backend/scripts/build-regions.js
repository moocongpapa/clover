/**
 * 행정구역 4depth 원본(JSON)을 앱용 계층 데이터로 변환합니다.
 * 원본: Juhye-Kim/korea-map-data (전국행정동리스트 기반)
 * 갱신: npm run regions:update
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RAW_FILE = path.join(DATA_DIR, 'regions-4depth.json');
const OUT_FILE = path.join(DATA_DIR, 'regions.json');
const SOURCE_URL =
  'https://raw.githubusercontent.com/Juhye-Kim/korea-map-data/master/4depth.json';

function isTownLevel(name) {
  return /(읍|면|동)$/.test(name);
}

function uniqueTowns(list) {
  return [...new Set(list)].filter(isTownLevel).sort((a, b) =>
    a.localeCompare(b, 'ko'),
  );
}

function transform(raw) {
  const result = [];

  for (const [sido, sigunguMap] of Object.entries(raw)) {
    const sidoNode = { name: sido, sigungu: [] };

    for (const [sigungu, districtMap] of Object.entries(sigunguMap)) {
      if (sigungu === '') {
        for (const [gu, towns] of Object.entries(districtMap)) {
          sidoNode.sigungu.push({
            name: gu,
            districts: [],
            towns: uniqueTowns(towns),
          });
        }
        continue;
      }

      const node = { name: sigungu, districts: [], towns: [] };

      for (const [district, towns] of Object.entries(districtMap)) {
        if (district === '') {
          node.towns = uniqueTowns(towns);
        } else {
          node.districts.push({
            name: district,
            towns: uniqueTowns(towns),
          });
        }
      }

      node.districts.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      sidoNode.sigungu.push(node);
    }

    sidoNode.sigungu.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    result.push(sidoNode);
  }

  result.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return result;
}

async function downloadRaw() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`다운로드 실패: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  fs.writeFileSync(RAW_FILE, text, 'utf8');
  console.log('원본 저장:', RAW_FILE);
}

function build() {
  if (!fs.existsSync(RAW_FILE)) {
    throw new Error(`원본 파일이 없습니다: ${RAW_FILE}`);
  }
  const raw = JSON.parse(fs.readFileSync(RAW_FILE, 'utf8'));
  const tree = transform(raw);
  const meta = {
    updatedAt: new Date().toISOString(),
    source: SOURCE_URL,
    version: tree.length,
  };
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({ meta, tree }, null, 2),
    'utf8',
  );
  console.log('변환 완료:', OUT_FILE, `(${tree.length}개 시도)`);
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const shouldDownload = process.argv.includes('--download');
  if (shouldDownload) {
    await downloadRaw();
  }
  build();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
