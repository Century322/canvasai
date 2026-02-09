
import { ChatSession } from "../types";

const DB_NAME = 'CanvasDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const DB = {
    // Fetches all sessions but meant for summary (logic handled in App to strip content)
    // Note: IDB 'getAll' fetches everything, real IO optimization would require a separate metadata store.
    // However, we optimize the memory usage in React State by stripping data after fetch.
    async getAllSessions(): Promise<ChatSession[]> {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => {
                    // Sort by timestamp desc
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
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (e) {
            console.error("DB Clear Error", e);
        }
    }
};
