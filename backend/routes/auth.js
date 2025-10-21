const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { username, password, publicKey } = req.body;

    if (!username || !password || !publicKey) {
      return res.status(400).json({ error: 'Username, password, and public key are required' });
    }

    // 사용자명 중복 확인
    const existingUser = db.get('users').find({ username }).value();
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // 비밀번호 해시화
    const passwordHash = await bcrypt.hash(password, 10);

    // 새 사용자 ID 생성
    const users = db.get('users').value();
    const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;

    // 사용자 생성
    const newUser = {
      id: newId,
      username,
      password_hash: passwordHash,
      public_key: publicKey,
      created_at: new Date().toISOString()
    };

    db.get('users').push(newUser).write();

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: newId
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 사용자 조회
    const user = db.get('users').find({ username }).value();

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 비밀번호 검증
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        publicKey: user.public_key
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// 사용자 목록 조회 (다른 사용자 검색용)
router.get('/users', (req, res) => {
  try {
    const users = db.get('users')
      .map(u => ({ id: u.id, username: u.username, public_key: u.public_key }))
      .value();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// 특정 사용자 조회
router.get('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = db.get('users').find({ id: userId }).value();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      public_key: user.public_key
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;

