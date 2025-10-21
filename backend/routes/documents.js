const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 모든 라우트에 인증 미들웨어 적용
router.use(authenticateToken);

// 내 문서 목록 조회 (본인 문서 + 초대받은 문서)
router.get('/my-documents', (req, res) => {
  try {
    const userId = req.user.id;

    // 본인 문서
    const ownDocuments = db.get('documents')
      .filter({ owner_id: userId })
      .map(doc => {
        const owner = db.get('users').find({ id: doc.owner_id }).value();
        return {
          ...doc,
          owner_username: owner ? owner.username : 'Unknown',
          owner_public_key: owner ? owner.public_key : '',
          relationship: 'owner'
        };
      })
      .value();

    // 초대받은 문서
    const sharedDocs = db.get('document_shares')
      .filter({ shared_with_user_id: userId })
      .map(share => {
        const doc = db.get('documents').find({ id: share.document_id }).value();
        if (!doc) return null;
        const owner = db.get('users').find({ id: doc.owner_id }).value();
        return {
          ...doc,
          owner_username: owner ? owner.username : 'Unknown',
          owner_public_key: owner ? owner.public_key : '',
          relationship: 'shared'
        };
      })
      .filter(doc => doc !== null)
      .value();

    res.json({
      ownDocuments,
      sharedDocuments: sharedDocs
    });
  } catch (error) {
    console.error('Get my documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// 모든 문서 조회 (대시보드용 - 제목과 설명만)
router.get('/all-documents', (req, res) => {
  try {
    const documents = db.get('documents')
      .map(doc => {
        const owner = db.get('users').find({ id: doc.owner_id }).value();
        return {
          id: doc.id,
          title: doc.title,
          description: doc.description,
          owner_id: doc.owner_id,
          owner_username: owner ? owner.username : 'Unknown',
          created_at: doc.created_at
        };
      })
      .value();

    res.json(documents);
  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// 특정 문서 상세 조회
router.get('/documents/:id', (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const userId = req.user.id;

    const document = db.get('documents').find({ id: documentId }).value();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 권한 확인: 소유자이거나 공유받은 사용자인지
    const isOwner = document.owner_id === userId;
    const isShared = db.get('document_shares')
      .find({ document_id: documentId, shared_with_user_id: userId })
      .value();

    if (!isOwner && !isShared) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const owner = db.get('users').find({ id: document.owner_id }).value();

    res.json({
      ...document,
      owner_username: owner ? owner.username : 'Unknown',
      owner_public_key: owner ? owner.public_key : ''
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to get document' });
  }
});

// 문서 업로드
router.post('/documents', (req, res) => {
  try {
    const { title, description, filename, encryptedData, signature } = req.body;
    const userId = req.user.id;

    if (!title || !filename || !encryptedData || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 새 문서 ID 생성
    const documents = db.get('documents').value();
    const newId = documents.length > 0 ? Math.max(...documents.map(d => d.id)) + 1 : 1;

    const newDocument = {
      id: newId,
      owner_id: userId,
      title,
      description: description || '',
      filename,
      encrypted_data: encryptedData,
      signature,
      created_at: new Date().toISOString()
    };

    db.get('documents').push(newDocument).write();

    res.status(201).json({
      message: 'Document uploaded successfully',
      documentId: newId
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// 문서 공유 (초대)
router.post('/documents/:id/share', (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const { targetUserId } = req.body;
    const userId = req.user.id;

    // 문서 소유자 확인
    const document = db.get('documents').find({ id: documentId }).value();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== userId) {
      return res.status(403).json({ error: 'Only owner can share documents' });
    }

    // 이미 공유되었는지 확인
    const existingShare = db.get('document_shares')
      .find({ document_id: documentId, shared_with_user_id: targetUserId })
      .value();

    if (existingShare) {
      return res.status(409).json({ error: 'Document already shared with this user' });
    }

    // 새 공유 ID 생성
    const shares = db.get('document_shares').value();
    const newId = shares.length > 0 ? Math.max(...shares.map(s => s.id)) + 1 : 1;

    // 공유 추가
    const newShare = {
      id: newId,
      document_id: documentId,
      shared_with_user_id: targetUserId,
      shared_by_user_id: userId,
      created_at: new Date().toISOString()
    };

    db.get('document_shares').push(newShare).write();

    res.json({ message: 'Document shared successfully' });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ error: 'Failed to share document' });
  }
});

// 문서 공유 취소
router.delete('/documents/:id/share/:userId', (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const userId = req.user.id;

    // 문서 소유자 확인
    const document = db.get('documents').find({ id: documentId }).value();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== userId) {
      return res.status(403).json({ error: 'Only owner can unshare documents' });
    }

    // 공유 삭제
    db.get('document_shares')
      .remove({ document_id: documentId, shared_with_user_id: targetUserId })
      .write();

    res.json({ message: 'Document unshared successfully' });
  } catch (error) {
    console.error('Unshare document error:', error);
    res.status(500).json({ error: 'Failed to unshare document' });
  }
});

// 문서의 공유 사용자 목록 조회
router.get('/documents/:id/shares', (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const userId = req.user.id;

    // 문서 소유자 확인
    const document = db.get('documents').find({ id: documentId }).value();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.owner_id !== userId) {
      return res.status(403).json({ error: 'Only owner can view share list' });
    }

    // 공유된 사용자 목록
    const shares = db.get('document_shares')
      .filter({ document_id: documentId })
      .map(share => {
        const user = db.get('users').find({ id: share.shared_with_user_id }).value();
        return user ? {
          id: user.id,
          username: user.username,
          shared_at: share.created_at
        } : null;
      })
      .filter(user => user !== null)
      .value();

    res.json(shares);
  } catch (error) {
    console.error('Get shares error:', error);
    res.status(500).json({ error: 'Failed to get shares' });
  }
});

// 공유 요청 보내기
router.post('/share-requests', (req, res) => {
  try {
    const { documentId, toUserId } = req.body;
    const fromUserId = req.user.id;

    if (!documentId || !toUserId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 문서 존재 확인
    const document = db.get('documents').find({ id: documentId }).value();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 요청자가 문서 소유자인지 확인
    if (document.owner_id !== fromUserId) {
      return res.status(403).json({ error: 'Only owner can send share requests' });
    }

    // 이미 요청이 있는지 확인
    const existingRequest = db.get('share_requests')
      .find({ 
        document_id: documentId, 
        from_user_id: fromUserId, 
        to_user_id: toUserId,
        status: 'pending' 
      })
      .value();

    if (existingRequest) {
      return res.status(409).json({ error: 'Share request already sent' });
    }

    // 새 요청 ID 생성
    const requests = db.get('share_requests').value();
    const newId = requests.length > 0 ? Math.max(...requests.map(r => r.id)) + 1 : 1;

    const newRequest = {
      id: newId,
      document_id: documentId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    db.get('share_requests').push(newRequest).write();

    res.json({ message: 'Share request sent successfully' });
  } catch (error) {
    console.error('Send share request error:', error);
    res.status(500).json({ error: 'Failed to send share request' });
  }
});

module.exports = router;
