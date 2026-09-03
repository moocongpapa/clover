/**
 * Clover Database Provider Switcher
 * 
 * Usage:
 *   node scripts/switch-db.js postgresql  -> Switch to PostgreSQL (Supabase / Neon / AWS RDS)
 *   node scripts/switch-db.js sqlite      -> Switch back to SQLite (local dev & E2E testing)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetProvider = (process.argv[2] || '').toLowerCase();
const validProviders = ['postgresql', 'sqlite'];

if (!validProviders.includes(targetProvider)) {
  console.error('\n❌ 사용법 오류: 대상 데이터베이스 프로바이더를 지정해 주세요.');
  console.error('   예: node scripts/switch-db.js postgresql');
  console.error('   예: node scripts/switch-db.js sqlite\n');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

if (!fs.existsSync(schemaPath)) {
  console.error(`❌ schema.prisma 파일을 찾을 수 없습니다: ${schemaPath}`);
  process.exit(1);
}

let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Regex to find:
// datasource db {
//   provider = "sqlite" | "postgresql"
//   url      = env("DATABASE_URL")
// }
const datasourceRegex = /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"([^"]+)"[\s\S]*?\}/;
const match = schemaContent.match(datasourceRegex);

if (!match) {
  console.error('❌ schema.prisma에서 datasource db 블록을 찾지 못했습니다.');
  process.exit(1);
}

const currentProvider = match[1];

if (currentProvider === targetProvider) {
  console.log(`\nℹ️  이미 prisma/schema.prisma의 provider가 "${targetProvider}"로 설정되어 있습니다.`);
} else {
  const newDatasource = match[0].replace(
    /provider\s*=\s*"[^"]+"/,
    `provider = "${targetProvider}"`
  );
  schemaContent = schemaContent.replace(datasourceRegex, newDatasource);
  fs.writeFileSync(schemaPath, schemaContent, 'utf8');
  console.log(`\n✅ prisma/schema.prisma의 provider가 "${currentProvider}"에서 "${targetProvider}"(으)로 안전하게 전환되었습니다!`);
}

console.log('\n🔄 Prisma Client 생성(generate)을 진행합니다...');
try {
  execSync('npx prisma generate', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
  console.log('\n🎉 Prisma Client가 성공적으로 재생성되었습니다.');
  
  if (targetProvider === 'postgresql') {
    console.log('\n[다음 단계 안내]');
    console.log('1. .env 또는 배포 플랫폼(Vercel/Railway)의 DATABASE_URL을 PostgreSQL 주소로 설정하세요.');
    console.log('   예: DATABASE_URL="postgresql://postgres:암호@db.xxxx.supabase.co:5432/postgres?sslmode=require"');
    console.log('2. 클라우드 DB에 테이블을 생성하려면 다음 명령을 실행하세요:');
    console.log('   npx prisma db push\n');
  } else {
    console.log('\n[안내] 로컬 SQLite(dev.db) 모드로 복귀되었습니다.\n');
  }
} catch (err) {
  console.error('❌ Prisma generate 중 오류 발생:', err.message);
  process.exit(1);
}
