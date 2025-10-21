import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// 토큰을 헤더에 추가
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 인증 API
export const authAPI = {
  register: async (username, password, publicKey) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      username,
      password,
      publicKey
    });
    return response.data;
  },

  login: async (username, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password
    });
    return response.data;
  },

  getUsers: async () => {
    const response = await axios.get(`${API_BASE_URL}/auth/users`);
    return response.data;
  },

  getUser: async (userId) => {
    const response = await axios.get(`${API_BASE_URL}/auth/users/${userId}`);
    return response.data;
  }
};

// 문서 API
export const documentAPI = {
  getMyDocuments: async () => {
    const response = await axios.get(`${API_BASE_URL}/my-documents`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getAllDocuments: async () => {
    const response = await axios.get(`${API_BASE_URL}/all-documents`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  getDocument: async (documentId) => {
    const response = await axios.get(`${API_BASE_URL}/documents/${documentId}`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  uploadDocument: async (title, description, filename, encryptedData, signature) => {
    const response = await axios.post(`${API_BASE_URL}/documents`, {
      title,
      description,
      filename,
      encryptedData,
      signature
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  shareDocument: async (documentId, targetUserId, encryptedDataForRecipient) => {
    const response = await axios.post(`${API_BASE_URL}/documents/${documentId}/share`, {
      targetUserId,
      encryptedDataForRecipient
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  unshareDocument: async (documentId, userId) => {
    const response = await axios.delete(
      `${API_BASE_URL}/documents/${documentId}/share/${userId}`,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  getDocumentShares: async (documentId) => {
    const response = await axios.get(`${API_BASE_URL}/documents/${documentId}/shares`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  sendShareRequest: async (documentId) => {
    const response = await axios.post(`${API_BASE_URL}/share-requests`, {
      documentId
    }, {
      headers: getAuthHeaders()
    });
    return response.data;
  }
};

export default {
  authAPI,
  documentAPI
};

