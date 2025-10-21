import { ec as EC } from 'elliptic';
const ec = new EC('secp256k1');

// ECC 키 쌍 생성
export function generateKeyPair() {
  const keyPair = ec.genKeyPair();
  const publicKey = keyPair.getPublic('hex');
  const privateKey = keyPair.getPrivate('hex');
  
  return {
    publicKey,
    privateKey
  };
}

// 데이터를 개인키로 서명
export function signData(data, privateKeyHex) {
  try {
    const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
    const hash = hashData(data);
    const signature = keyPair.sign(hash);
    return signature.toDER('hex');
  } catch (error) {
    console.error('Sign error:', error);
    throw error;
  }
}

// 공개키로 서명 검증
export function verifySignature(data, signatureHex, publicKeyHex) {
  try {
    const keyPair = ec.keyFromPublic(publicKeyHex, 'hex');
    const hash = hashData(data);
    return keyPair.verify(hash, signatureHex);
  } catch (error) {
    console.error('Verify error:', error);
    return false;
  }
}

// 간단한 해시 함수 (실제로는 SHA-256 등을 사용해야 함)
function hashData(data) {
  let hash = 0;
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// 파일을 Base64로 인코딩
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Base64를 Blob으로 디코딩
export function base64ToBlob(base64, mimeType) {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([ab], { type: mimeType });
}

// 간단한 암호화 (XOR 기반 - 데모용, 실제로는 AES 등 사용)
export function encryptData(data, publicKeyHex) {
  // 실제로는 공개키를 사용한 하이브리드 암호화를 구현해야 함
  // 여기서는 간단히 Base64 인코딩으로 대체
  const encoded = btoa(unescape(encodeURIComponent(data)));
  return encoded;
}

// 간단한 복호화
export function decryptData(encryptedData, privateKeyHex) {
  // 실제로는 개인키를 사용한 복호화를 구현해야 함
  // 여기서는 간단히 Base64 디코딩으로 대체
  try {
    const decoded = decodeURIComponent(escape(atob(encryptedData)));
    return decoded;
  } catch (error) {
    console.error('Decrypt error:', error);
    return null;
  }
}

// 로컬 스토리지에 개인키 저장 (실제로는 더 안전한 방법 사용)
export function savePrivateKey(username, privateKey) {
  localStorage.setItem(`privateKey_${username}`, privateKey);
}

// 로컬 스토리지에서 개인키 로드
export function loadPrivateKey(username) {
  return localStorage.getItem(`privateKey_${username}`);
}

export default {
  generateKeyPair,
  signData,
  verifySignature,
  fileToBase64,
  base64ToBlob,
  encryptData,
  decryptData,
  savePrivateKey,
  loadPrivateKey
};

