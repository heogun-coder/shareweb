import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="navbar">
      <div className="navbar-content">
        <h2>Share Web</h2>
        <div className="navbar-menu">
          <span style={{ color: '#666' }}>안녕하세요, {user.username}님</span>
          <Link to="/myboard">내 보드</Link>
          <Link to="/dashboard">대시보드</Link>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
      </div>
    </div>
  );
}

export default Navbar;

