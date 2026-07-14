const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Parse .env manually to avoid extra dependencies
let token = '';
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^\s*KAKAO_CHANNEL_ACCESS_TOKEN\s*=\s*["']?(.*?)["']?\s*$/m);
    if (match && match[1]) {
      token = match[1];
    }
  }
} catch (err) {
  console.error('Failed to read .env file:', err);
}

if (!token) {
  console.error('Error: KAKAO_CHANNEL_ACCESS_TOKEN is not set in backend/.env');
  console.log('Please set KAKAO_CHANNEL_ACCESS_TOKEN in your .env file first.');
  process.exit(1);
}

async function getFriends() {
  try {
    const response = await axios.get('https://kapi.kakao.com/v1/api/talk/friends', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log('\n=========================================');
    console.log('       카카오 친구 목록 (UUID 조회)');
    console.log('=========================================');

    const friends = response.data.elements || [];
    if (friends.length === 0) {
      console.log('조회된 친구가 없습니다.');
      console.log('\n[확인 사항]');
      console.log('1. 메시지를 받을 친구가 카카오 디벨로퍼스 [내 애플리케이션] > [일반] > [팀 관리]에 "팀원"으로 등록되어 있나요?');
      console.log('2. 친구가 서비스 로그인 시 "카카오 서비스 내 친구 목록 조회" 및 "카카오톡 메시지 전송" 권한에 동의했나요?');
      console.log('3. 친구가 발신자(토큰 계정)와 카카오톡 친구 상태인가요?');
    } else {
      friends.forEach((friend, index) => {
        console.log(`[${index + 1}] 닉네임: ${friend.profile_nickname}`);
        console.log(`    UUID  : ${friend.uuid}`);
        console.log('-----------------------------------------');
      });
      console.log('위 UUID 중 알림을 전송할 사용자의 UUID를 복사하여 데이터베이스의 "kakaoChannelUserKey"에 저장하세요.');
    }
  } catch (error) {
    console.error('API 호출 실패:');
    if (error.response) {
      console.error(`- 상태 코드: ${error.response.status}`);
      console.error('- 에러 정보:', error.response.data);
    } else {
      console.error('-', error.message);
    }
  }
}

getFriends();
