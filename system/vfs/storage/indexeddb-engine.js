/**
 * indexeddb-engine.js - LOW LEVEL STORAGE
 * Handles raw byte/object persistence for the VFS.
 */
export class IndexedDBEngine {
    constructor() {
        this.dbName = "SovereignOS";
        this.storeName = "disks";
    }

    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };

            request.onsuccess = e => resolve(e.target.result);
            request.onerror = e => reject(e.target.error);
        });
    }

    /**
     * SAVE: Persists a user's entire disk image
     * @param {string} userId 
     * @param {Object} diskData 
     */
    async saveDisk(userId, diskData) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.put(diskData, userId); // userId is the key

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * LOAD: Retrieves a user's disk image
     * @param {string} userId 
     */
    async loadDisk(userId) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.get(userId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }
}