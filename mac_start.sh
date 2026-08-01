#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # 색상 초기화

echo -e "${BLUE}=== Clover 웹 서비스 시작 스크립트 ===${NC}"

# 1. 포트 확인 및 기존 프로세스 정리
echo -e "${YELLOW}[1/4] 기존 실행 중인 백엔드(3000/3500) 및 프론트엔드(5174) 포트 정리 중...${NC}"
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :3500 | xargs kill -9 2>/dev/null
lsof -ti :5174 | xargs kill -9 2>/dev/null

# 2. 백엔드 실행
echo -e "${YELLOW}[2/4] 백엔드 NestJS 서버 시작 중...${NC}"
cd backend
# 혹시 prisma client가 생성되지 않았다면 생성 시도
if [ ! -d "node_modules/.prisma" ]; then
    echo -e "${YELLOW}Prisma client가 존재하지 않아 생성을 시도합니다...${NC}"
    npx prisma generate
fi
npm run start:dev > server.stdout 2> server.stderr &
BACKEND_PID=$!
cd ..

# 3. 프론트엔드 실행
echo -e "${YELLOW}[3/4] 프론트엔드 Vite dev 서버 시작 중...${NC}"
cd frontend
npm run dev > dev.stdout 2> dev.stderr &
FRONTEND_PID=$!
cd ..

# 4. 서버 기동 대기 및 브라우저 열기
echo -e "${YELLOW}[4/4] 서버 안정화 대기 중 (5초)...${NC}"
sleep 5

echo -e "${GREEN}백엔드 PID: $BACKEND_PID${NC}"
echo -e "${GREEN}프론트엔드 PID: $FRONTEND_PID${NC}"
echo -e "${GREEN}로컬 주소: http://localhost:5174${NC}"

# 브라우저 열기 (macOS open 명령어 사용)
open http://localhost:5174

echo -e "${BLUE}=======================================${NC}"
echo -e "${GREEN}서버가 백그라운드에서 실행 중입니다.${NC}"
echo -e "로그 확인: ${YELLOW}backend/server.stdout${NC} 또는 ${YELLOW}frontend/dev.stdout${NC}"
echo -e "서버를 종료하려면 터미널에 ${YELLOW}kill $BACKEND_PID $FRONTEND_PID${NC} 또는 스크립트를 재실행해 주세요."

# 프로세스가 죽지 않도록 유지
wait
