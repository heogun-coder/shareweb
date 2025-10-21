@echo off
echo ======================================
echo Share Web MVP - 실행 스크립트
echo ======================================
echo.

echo 백엔드 의존성 확인 중...
cd backend
if not exist "node_modules" (
    echo 백엔드 패키지 설치 중 (lowdb 사용 - 빌드 불필요)...
    call npm install
) else (
    echo 백엔드 패키지가 이미 설치되어 있습니다.
)

echo.
echo 프론트엔드 의존성 확인 중...
cd ..\frontend

REM 오래된 public 폴더 제거
if exist "public\index.html" (
    echo 오래된 public 폴더 정리 중...
    rmdir /s /q public 2>nul
)

if not exist "node_modules" (
    echo 프론트엔드 패키지 설치 중 (Vite 사용 - 빠른 설치)...
    call npm install
) else (
    echo 프론트엔드 패키지가 이미 설치되어 있습니다.
)

echo.
echo ======================================
echo 서버 시작 중...
echo ======================================
echo 백엔드 (Express): http://localhost:5000
echo 프론트엔드 (Vite): http://localhost:3000
echo.
echo 종료하려면 Ctrl+C를 누르세요.
echo ======================================
echo.

cd ..\backend
start "Share Web Backend" cmd /k "npm start"

timeout /t 3 /nobreak > nul

cd ..\frontend
start "Share Web Frontend" cmd /k "npm start"

echo.
echo 서버가 시작되었습니다!
echo 잠시 후 브라우저에서 http://localhost:3000 을 열어주세요.
echo.
pause

