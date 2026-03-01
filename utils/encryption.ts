const ENCRYPTION_KEY_NAME = 'app_encryption_key';

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(ENCRYPTION_KEY_NAME);
  
  if (stored) {
    try {
      const keyData = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
      return crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch {
      localStorage.removeItem(ENCRYPTION_KEY_NAME);
    }
  }
  
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const exportedKey = await crypto.subtle.exportKey('raw', key);
  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
  localStorage.setItem(ENCRYPTION_KEY_NAME, keyBase64);
  
  return key;
}

export async function encryptData(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  
  try {
    const key = await getOrCreateEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(plaintext);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );
    
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('数据加密失败，请检查浏览器是否支持 Web Crypto API');
  }
}

export async function decryptData(encrypted: string): Promise<string> {
  if (!encrypted) return '';
  
  try {
    const key = await getOrCreateEncryptionKey();
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    if (combined.length <= 12) {
      throw new Error('无效的加密数据');
    }
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('数据解密失败，数据可能已损坏');
  }
}

export function isEncrypted(value: string): boolean {
  try {
    const decoded = atob(value);
    return decoded.length > 12;
  } catch {
    return false;
  }
}

export async function safeEncrypt(plaintext: string): Promise<string> {
  try {
    return await encryptData(plaintext);
  } catch {
    console.warn('Encryption not available, data will not be encrypted');
    return plaintext;
  }
}

export async function safeDecrypt(encrypted: string): Promise<string> {
  try {
    return await decryptData(encrypted);
  } catch {
    return encrypted;
  }
}
