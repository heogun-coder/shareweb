# Share Web - 수동 설치 및 실행 가이드

## 설치 방법

### 1. 백엔드 설치

PowerShell 또는 CMD에서:

```powershell
cd shareweb/frontend
# 기존 node_modules가 있다면 삭제 (선택사항)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force public -ErrorAction SilentlyContinue

# 패키지 설치
npm install
```

### 2. 프론트엔드 설치

새 터미널에서:

```powershell
cd shareweb/backend
# 기존 node_modules가 있다면 삭제 (선택사항)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue

# 패키지 설치
npm install
```

## 실행 방법

### 터미널 1 - 백엔드

```powershell
cd shareweb/backend
npm start
```

출력 예시:
```
Database initialized at: C:\...\shareweb\instance\app.db.json
Server is running on http://localhost:5000
```

### 터미널 2 - 프론트엔드

```powershell
cd shareweb/frontend
npm start
```

출력 예시:
```
  VITE v5.0.11  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## 접속

브라우저에서 `http://localhost:3000` 접속

## 폴더 정리 (선택사항)

오래된 public 폴더가 남아있다면 삭제:

```powershell
cd shareweb/frontend
Remove-Item -Recurse -Force public -ErrorAction SilentlyContinue
```

## 문제 해결

### 포트가 이미 사용 중인 경우

**백엔드 (5000 포트):**
- `vite.config.js`에서 proxy target 포트 변경
- `server.js`에서 PORT 변경

**프론트엔드 (3000 포트):**
- `vite.config.js`에서 `server.port` 변경

### 설치 실패 시

1. Node.js 버전 확인: `node -v` (v16 이상 권장)
2. npm 캐시 정리: `npm cache clean --force`
3. 재설치: 위의 설치 과정 반복

## 주요 변경사항

### 백엔드
- ❌ better-sqlite3 (네이티브 빌드 필요)
- ✅ lowdb (JSON 기반, 설치 간편)

### 프론트엔드
- ❌ react-scripts (무겁고 deprecated 패키지 많음)
- ✅ Vite (빠르고 가벼움, 최신 빌드 도구)

## 필요한 패키지만 사용

### 백엔드 (6개)
- express
- cors
- bcrypt
- jsonwebtoken
- lowdb
- uuid

### 프론트엔드 (5개 + 2개 dev)
- react
- react-dom
- react-router-dom
- axios
- elliptic
- @vitejs/plugin-react (dev)
- vite (dev)

총 13개의 핵심 패키지만 사용!

