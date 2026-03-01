
import { ChatSession } from "../types";

const DB_NAME = 'CanvasDB';
const DB_VERSION = 2;
const STORE_NAME = 'sessions';
const META_STORE_NAME = 'metadata';

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const oldVersion = event.oldVersion;
            
            if (oldVersion < 1) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            }
            
            if (oldVersion < 2) {
                if (!db.objectStoreNames.contains(META_STORE_NAME)) {
                    db.createObjectStore(META_STORE_NAME, { keyPath: 'key' });
                }
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const DB = {
    async getAllSessions(): Promise<ChatSession[]> {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => {
                    const sessions = (request.result as ChatSession[]) || [];
                    resolve(sessions.sort((a, b) => b.timestamp - a.timestamp));
                };
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error("DB Read Error", e);
            return [];
        }
    },

    async getSession(id: string): Promise<ChatSession | undefined> {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result as ChatSession);
                request.onerror = () => reject(request.error);
            });
        } catch(e) {
            console.error("DB Get Single Error", e);
            return undefined;
        }
    },

    async saveSession(session: ChatSession): Promise<void> {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(session);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error("DB Save Error", e);
        }
    },

    async deleteSession(id: string): Promise<void> {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error("DB Delete Error", e);
        }
    },

    async clearAllSessions(): Promise<void> {
        try {
            const db = await openDB();
            await new Promise<void>((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            localStorage.removeItem('gemini_auto_save');
            localStorage.removeItem('gemini_current_session_id');
        } catch (e) {
            console.error("DB Clear Error", e);
            throw e;
        }
    },

    async getMetadata(key: string): Promise<string | undefined> {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(META_STORE_NAME, 'readonly');
                const store = transaction.objectStore(META_STORE_NAME);
                const request = store.get(key);
                request.onsuccess = () => {
                    const result = request.result as { key: string; value: string } | undefined;
                    resolve(result?.value);
                };
                request.onerror = () => reject(request.error);
            });
        } catch {
            return undefined;
        }
    },

    async setMetadata(key: string, value: string): Promise<void> {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(META_STORE_NAME, 'readwrite');
                const store = transaction.objectStore(META_STORE_NAME);
                const request = store.put({ key, value });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error("DB Set Metadata Error", e);
        }
    },

    async exportData(): Promise<string> {
        const sessions = await this.getAllSessions();
        const data = {
            version: DB_VERSION,
            exportDate: new Date().toISOString(),
            sessions
        };
        return JSON.stringify(data, null, 2);
    },

    async importData(jsonData: string): Promise<{ success: boolean; count: number; error?: string }> {
        try {
            const data = JSON.parse(jsonData);
            if (!data.sessions || !Array.isArray(data.sessions)) {
                return { success: false, count: 0, error: '无效的数据格式' };
            }
            
            let count = 0;
            for (const session of data.sessions) {
                if (session.id && session.messages) {
                    await this.saveSession(session);
                    count++;
                }
            }
            
            return { success: true, count };
        } catch (e) {
            return { success: false, count: 0, error: String(e) };
        }
    }
};
