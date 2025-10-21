const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');

const app = express();
const PORT = 5000;

// 미들웨어
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api', documentRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'Share Web API Server' });
});

// 에러 핸들링
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

