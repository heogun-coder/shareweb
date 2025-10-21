import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { documentAPI } from '../utils/api';

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadAllDocuments();
  }, []);

  const loadAllDocuments = async () => {
    try {
      const data = await documentAPI.getAllDocuments();
      // 다른 사용자의 문서만 표시
      setDocuments(data.filter(doc => doc.owner_id !== user.id));
    } catch (error) {
      alert('문서를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestInvite = async (documentId, ownerId) => {
    try {
      await documentAPI.sendShareRequest(documentId, ownerId);
      alert('초대 요청이 전송되었습니다!\n(현재 버전에서는 문서 소유자가 직접 공유해야 합니다)');
    } catch (error) {
      alert(error.response?.data?.error || '초대 요청에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <p style={{ textAlign: 'center', color: 'white', marginTop: '50px' }}>
            로딩 중...
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="board-header">
          <h1>대시보드</h1>
          <p>모든 사용자의 문서를 탐색하고 초대를 요청하세요</p>
        </div>

        {documents.length === 0 ? (
          <div className="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>문서가 없습니다</h3>
            <p>아직 다른 사용자가 공유한 문서가 없습니다.</p>
          </div>
        ) : (
          <div className="documents-grid">
            {documents.map(doc => (
              <div key={doc.id} className="document-card">
                <h3>{doc.title}</h3>
                <p>{doc.description || '설명 없음'}</p>
                <div className="document-info">
                  <span>소유자: {doc.owner_username}</span>
                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>
                <div className="document-actions">
                  <button 
                    className="btn-small btn-share"
                    onClick={() => handleRequestInvite(doc.id, doc.owner_id)}
                  >
                    👤 초대 요청
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default Dashboard;

