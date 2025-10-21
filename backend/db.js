const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

// instance 폴더가 없으면 생성
const instanceDir = path.join(__dirname, '..', 'instance');
if (!fs.existsSync(instanceDir)) {
  fs.mkdirSync(instanceDir, { recursive: true });
}

const dbPath = path.join(instanceDir, 'app.db.json');
const adapter = new FileSync(dbPath);
const db = low(adapter);

// 초기 데이터 구조 설정
db.defaults({
  users: [],
  documents: [],
  document_shares: [],
  share_requests: []
}).write();

console.log('Database initialized at:', dbPath);

module.exports = db;

