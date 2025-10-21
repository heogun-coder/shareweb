import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { generateKeyPair, savePrivateKey } from '../utils/crypto';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      // ECC 키 쌍 생성
      const { publicKey, privateKey } = generateKeyPair();
      
      // Alert로 키 생성 메시지 표시
      alert(`ECC 키 쌍이 생성되었습니다!\n공개키: ${publicKey.substring(0, 20)}...\n개인키는 안전하게 저장됩니다.`);

      // 회원가입
      await authAPI.register(username, password, publicKey);
      
      // 개인키를 로컬 스토리지에 저장
      savePrivateKey(username, privateKey);

      setSuccess('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다...');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Share Web</h1>
        <p>안전한 문서 공유 플랫폼</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사용자명</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="사용자명을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <div className="form-group">
            <label>비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ color: '#666' }}>
            이미 계정이 있으신가요?{' '}
            <Link to="/login" style={{ color: '#667eea', fontWeight: '600' }}>
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;

