const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// uploads 폴더 생성
const uploadsDir = path.join(__dirname, '..', '..', 'instance', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
          id: doc.id,
          owner_id: doc.owner_id,
          title: doc.title,
          description: doc.description,
          filename: doc.filename,
          signature: doc.signature,
          created_at: doc.created_at,
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
          id: doc.id,
          owner_id: doc.owner_id,
          title: doc.title,
          description: doc.description,
          filename: doc.filename,
          signature: doc.signature,
          created_at: doc.created_at,
          owner_username: owner ? owner.username : 'Unknown',
          owner_public_key: owner ? owner.public_key : '',
          relationship: 'shared',
          encrypted_data_for_me: share.encrypted_data_for_recipient // 받는 사람용 암호화 데이터
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

// 특정 문서 상세 조회 (암호화된 데이터 포함)
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
    const shareInfo = db.get('document_shares')
      .find({ document_id: documentId, shared_with_user_id: userId })
      .value();

    if (!isOwner && !shareInfo) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const owner = db.get('users').find({ id: document.owner_id }).value();

    // 파일 읽기
    let encryptedData = '';
    if (isOwner) {
      // 소유자는 원본 파일 읽기
      if (document.file_path) {
        // 새 방식: 파일에서 읽기
        const filePath = path.join(uploadsDir, document.file_path);
        if (fs.existsSync(filePath)) {
          encryptedData = fs.readFileSync(filePath, 'utf8');
        }
      } else if (document.encrypted_data) {
        // 구 방식: DB에 직접 저장된 데이터 (하위 호환성)
        encryptedData = document.encrypted_data;
      }
    } else {
      // 공유받은 사용자는 재암호화된 데이터 사용
      encryptedData = shareInfo.encrypted_data_for_recipient || '';
    }

    res.json({
      id: document.id,
      owner_id: document.owner_id,
      title: document.title,
      description: document.description,
      filename: document.filename,
      encrypted_data: encryptedData,
      signature: document.signature,
      created_at: document.created_at,
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

    // 파일을 uploads 폴더에 저장
    const fileUuid = uuidv4();
    const filePath = `${fileUuid}.enc`;
    const fullPath = path.join(uploadsDir, filePath);
    fs.writeFileSync(fullPath, encryptedData, 'utf8');

    const newDocument = {
      id: newId,
      owner_id: userId,
      title,
      description: description || '',
      filename,
      file_path: filePath,  // 파일 경로만 저장
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

// 문서 공유 (초대) - 재암호화 데이터 포함
router.post('/documents/:id/share', (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const { targetUserId, encryptedDataForRecipient } = req.body;
    const userId = req.user.id;

    if (!encryptedDataForRecipient) {
      return res.status(400).json({ error: 'Encrypted data for recipient is required' });
    }

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

    // 공유 추가 (재암호화된 데이터 포함)
    const newShare = {
      id: newId,
      document_id: documentId,
      shared_with_user_id: targetUserId,
      shared_by_user_id: userId,
      encrypted_data_for_recipient: encryptedDataForRecipient, // 받는 사람의 공개키로 암호화된 데이터
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

// 공유 요청 보내기 (일반 사용자가 문서 소유자에게 요청)
router.post('/share-requests', (req, res) => {
  try {
    const { documentId } = req.body;
    const fromUserId = req.user.id; // 요청을 보내는 사람 (일반 사용자)

    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }

    // 문서 존재 확인
    const document = db.get('documents').find({ id: documentId }).value();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const toUserId = document.owner_id; // 받는 사람 (문서 소유자)

    // 본인 문서에는 요청 불가
    if (document.owner_id === fromUserId) {
      return res.status(400).json({ error: 'Cannot request access to your own document' });
    }

    // 이미 공유받은 문서인지 확인
    const alreadyShared = db.get('document_shares')
      .find({ document_id: documentId, shared_with_user_id: fromUserId })
      .value();

    if (alreadyShared) {
      return res.status(409).json({ error: 'You already have access to this document' });
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

// 내가 받은 공유 요청 조회
router.get('/share-requests', (req, res) => {
  try {
    const userId = req.user.id;

    // 내가 소유한 문서에 대한 pending 요청들
    const myDocuments = db.get('documents')
      .filter({ owner_id: userId })
      .map(d => d.id)
      .value();

    const requests = db.get('share_requests')
      .filter(r => myDocuments.includes(r.document_id) && r.status === 'pending')
      .map(request => {
        const doc = db.get('documents').find({ id: request.document_id }).value();
        const requester = db.get('users').find({ id: request.from_user_id }).value();
        return {
          id: request.id,
          document_id: request.document_id,
          document_title: doc ? doc.title : 'Unknown',
          from_user_id: request.from_user_id,
          requester_username: requester ? requester.username : 'Unknown',
          created_at: request.created_at
        };
      })
      .value();

    res.json(requests);
  } catch (error) {
    console.error('Get share requests error:', error);
    res.status(500).json({ error: 'Failed to get share requests' });
  }
});

// 공유 요청 응답 (수락/거절)
router.put('/share-requests/:id', (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { status } = req.body;
    const userId = req.user.id;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = db.get('share_requests').find({ id: requestId }).value();

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // 문서 소유자 확인
    const document = db.get('documents').find({ id: request.document_id }).value();
    if (!document || document.owner_id !== userId) {
      return res.status(403).json({ error: 'Only document owner can respond to requests' });
    }

    // 요청 상태 업데이트
    db.get('share_requests')
      .find({ id: requestId })
      .assign({ status, updated_at: new Date().toISOString() })
      .write();

    res.json({ message: `Request ${status}` });
  } catch (error) {
    console.error('Respond share request error:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

module.exports = router;
