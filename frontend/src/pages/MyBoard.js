import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { documentAPI, authAPI } from '../utils/api';
import { fileToBase64, signData, encryptData, decryptData, loadPrivateKey, base64ToBlob } from '../utils/crypto';

function MyBoard() {
  const [ownDocuments, setOwnDocuments] = useState([]);
  const [sharedDocuments, setSharedDocuments] = useState([]);
  const [shareRequests, setShareRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [users, setUsers] = useState([]);
  const [sharedUsers, setSharedUsers] = useState([]);
  
  // 업로드 폼 상태
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadDocuments();
    loadUsers();
    loadShareRequests();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await documentAPI.getMyDocuments();
      setOwnDocuments(data.ownDocuments);
      setSharedDocuments(data.sharedDocuments);
    } catch (error) {
      alert('문서를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await authAPI.getUsers();
      setUsers(usersData.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadShareRequests = async () => {
    try {
      const requests = await documentAPI.getShareRequests();
      setShareRequests(requests);
    } catch (error) {
      console.error('Failed to load share requests:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.file) {
      alert('파일을 선택해주세요.');
      return;
    }

    try {
      // 파일을 Base64로 변환
      const fileData = await fileToBase64(uploadForm.file);
      
      // 개인키 로드
      const privateKey = loadPrivateKey(user.username);
      if (!privateKey) {
        alert('개인키를 찾을 수 없습니다. 다시 로그인해주세요.');
        return;
      }

      // 데이터 암호화 (공개키 사용)
      const encryptedData = encryptData(fileData, user.publicKey);
      
      // 전자서명 생성 (개인키 사용)
      const signature = signData(fileData, privateKey);

      // 서버에 업로드
      await documentAPI.uploadDocument(
        uploadForm.title,
        uploadForm.description,
        uploadForm.file.name,
        encryptedData,
        signature
      );

      alert('문서가 성공적으로 업로드되었습니다!');
      setShowUploadModal(false);
      setUploadForm({ title: '', description: '', file: null });
      loadDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      alert('문서 업로드에 실패했습니다.');
    }
  };

  const handleDownload = async (doc) => {
    try {
      // 개인키 로드
      const privateKey = loadPrivateKey(user.username);
      if (!privateKey) {
        alert('개인키를 찾을 수 없습니다.');
        return;
      }

      // 서버에서 암호화된 데이터 가져오기
      const docDetail = await documentAPI.getDocument(doc.id);
      
      // 공유받은 문서의 경우 재암호화된 데이터 사용
      const encryptedData = doc.relationship === 'shared' 
        ? (doc.encrypted_data_for_me || docDetail.encrypted_data)
        : docDetail.encrypted_data;

      if (!encryptedData) {
        alert('암호화된 데이터를 찾을 수 없습니다.');
        return;
      }

      // 복호화
      const decryptedData = decryptData(encryptedData, privateKey);
      if (!decryptedData) {
        alert('문서 복호화에 실패했습니다.');
        return;
      }

      // 다운로드
      const blob = base64ToBlob(decryptedData, 'application/octet-stream');
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('문서 다운로드에 실패했습니다: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleShareClick = async (document) => {
    setSelectedDocument(document);
    setShowShareModal(true);
  };

  const handleShare = async (targetUserId) => {
    try {
      // 개인키 로드
      const privateKey = loadPrivateKey(user.username);
      if (!privateKey) {
        alert('개인키를 찾을 수 없습니다.');
        return;
      }

      // 대상 사용자 정보 가져오기
      const targetUser = await authAPI.getUser(targetUserId);
      if (!targetUser || !targetUser.public_key) {
        alert('대상 사용자 정보를 찾을 수 없습니다.');
        return;
      }

      // 문서의 암호화된 데이터 가져오기
      const docDetail = await documentAPI.getDocument(selectedDocument.id);
      
      // 1. 내 개인키로 복호화
      const decryptedData = decryptData(docDetail.encrypted_data, privateKey);
      if (!decryptedData) {
        alert('문서 복호화에 실패했습니다.');
        return;
      }

      // 2. 대상 사용자의 공개키로 재암호화
      const reencryptedData = encryptData(decryptedData, targetUser.public_key);

      // 3. 서버에 공유 (재암호화된 데이터 포함)
      await documentAPI.shareDocument(selectedDocument.id, targetUserId, reencryptedData);
      
      alert('문서가 성공적으로 공유되었습니다!');
      setShowShareModal(false);
      loadDocuments();
    } catch (error) {
      console.error('Share error:', error);
      alert(error.response?.data?.error || '문서 공유에 실패했습니다.');
    }
  };

  const handleShowUserList = async (document) => {
    setSelectedDocument(document);
    try {
      const shares = await documentAPI.getDocumentShares(document.id);
      setSharedUsers(shares);
      setShowUserListModal(true);
    } catch (error) {
      alert('공유 사용자 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleUnshare = async (userId) => {
    try {
      await documentAPI.unshareDocument(selectedDocument.id, userId);
      alert('공유가 취소되었습니다.');
      const shares = await documentAPI.getDocumentShares(selectedDocument.id);
      setSharedUsers(shares);
      loadDocuments();
    } catch (error) {
      alert('공유 취소에 실패했습니다.');
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      // 개인키 로드
      const privateKey = loadPrivateKey(user.username);
      if (!privateKey) {
        alert('개인키를 찾을 수 없습니다.');
        return;
      }

      // 요청자 정보 가져오기
      const requester = await authAPI.getUser(request.from_user_id);
      if (!requester || !requester.public_key) {
        alert('요청자 정보를 찾을 수 없습니다.');
        return;
      }

      // 문서의 암호화된 데이터 가져오기
      const docDetail = await documentAPI.getDocument(request.document_id);
      
      // 1. 내 개인키로 복호화
      const decryptedData = decryptData(docDetail.encrypted_data, privateKey);
      if (!decryptedData) {
        alert('문서 복호화에 실패했습니다.');
        return;
      }

      // 2. 요청자의 공개키로 재암호화
      const reencryptedData = encryptData(decryptedData, requester.public_key);

      // 3. 공유 처리
      await documentAPI.shareDocument(request.document_id, request.from_user_id, reencryptedData);
      
      // 4. 요청 수락 처리
      await documentAPI.respondShareRequest(request.id, 'accepted');
      
      alert('초대 요청을 수락했습니다!');
      loadShareRequests();
      loadDocuments();
    } catch (error) {
      console.error('Accept request error:', error);
      alert('요청 수락에 실패했습니다: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await documentAPI.respondShareRequest(requestId, 'rejected');
      alert('초대 요청을 거절했습니다.');
      loadShareRequests();
    } catch (error) {
      alert('요청 거절에 실패했습니다.');
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
          <h1>{user.username}'s Documents</h1>
          <p>내 문서와 공유받은 문서를 관리하세요</p>
          {shareRequests.length > 0 && (
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '15px' }}
              onClick={() => setShowRequestsModal(true)}
            >
              📬 초대 요청 ({shareRequests.length})
            </button>
          )}
        </div>

        <h2 style={{ color: 'white', marginBottom: '20px' }}>내 문서</h2>
        <div className="documents-grid">
          {ownDocuments.map(doc => (
            <div key={doc.id} className="document-card">
              <span className="badge badge-owner">내 문서</span>
              <h3>{doc.title}</h3>
              <p>{doc.description || '설명 없음'}</p>
              <div className="document-info">
                <span>{doc.filename}</span>
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
              <div className="document-actions">
                <button className="btn-small btn-download" onClick={() => handleDownload(doc)}>
                  다운로드
                </button>
                <button className="btn-small btn-share" onClick={() => handleShareClick(doc)}>
                  + 초대
                </button>
                <button className="btn-small" onClick={() => handleShowUserList(doc)}>
                  📄 사용자 목록
                </button>
              </div>
            </div>
          ))}
          
          <div className="add-document-card" onClick={() => setShowUploadModal(true)}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p>문서 추가</p>
          </div>
        </div>

        {sharedDocuments.length > 0 && (
          <>
            <h2 style={{ color: 'white', marginTop: '40px', marginBottom: '20px' }}>
              공유받은 문서
            </h2>
            <div className="documents-grid">
              {sharedDocuments.map(doc => (
                <div key={doc.id} className="document-card">
                  <span className="badge badge-shared">공유받음</span>
                  <h3>{doc.title}</h3>
                  <p>{doc.description || '설명 없음'}</p>
                  <div className="document-info">
                    <span>소유자: {doc.owner_username}</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="document-actions">
                    <button className="btn-small btn-download" onClick={() => handleDownload(doc)}>
                      다운로드
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 업로드 모달 */}
        {showUploadModal && (
          <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>문서 업로드</h2>
              <form onSubmit={handleUpload}>
                <div className="form-group">
                  <label>제목</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>설명</label>
                  <input
                    type="text"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>파일</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">업로드</button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 공유 모달 */}
        {showShareModal && (
          <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>사용자 초대</h2>
              <p>문서를 공유할 사용자를 선택하세요.</p>
              <ul className="user-list">
                {users.map(u => (
                  <li key={u.id} className="user-item">
                    <span>{u.username}</span>
                    <button 
                      className="btn-small btn-share"
                      onClick={() => handleShare(u.id)}
                    >
                      초대
                    </button>
                  </li>
                ))}
              </ul>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowShareModal(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 사용자 목록 모달 */}
        {showUserListModal && (
          <div className="modal-overlay" onClick={() => setShowUserListModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>공유된 사용자</h2>
              {sharedUsers.length === 0 ? (
                <p>아직 공유된 사용자가 없습니다.</p>
              ) : (
                <ul className="user-list">
                  {sharedUsers.map(share => (
                    <li key={share.id} className="user-item">
                      <span>{share.username}</span>
                      <button 
                        className="btn-small btn-delete"
                        onClick={() => handleUnshare(share.id)}
                      >
                        - 삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowUserListModal(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 초대 요청 모달 */}
        {showRequestsModal && (
          <div className="modal-overlay" onClick={() => setShowRequestsModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>받은 초대 요청</h2>
              {shareRequests.length === 0 ? (
                <p>받은 초대 요청이 없습니다.</p>
              ) : (
                <ul className="user-list">
                  {shareRequests.map(request => (
                    <li key={request.id} className="user-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                      <div>
                        <strong>{request.requester_username}</strong>님이 <strong>{request.document_title}</strong> 문서에 대한 접근을 요청했습니다.
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          className="btn-small btn-share"
                          onClick={() => handleAcceptRequest(request)}
                        >
                          ✓ 수락
                        </button>
                        <button 
                          className="btn-small btn-delete"
                          onClick={() => handleRejectRequest(request.id)}
                        >
                          ✗ 거절
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowRequestsModal(false)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default MyBoard;

