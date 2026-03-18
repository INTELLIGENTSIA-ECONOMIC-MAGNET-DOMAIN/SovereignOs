/**
 * encrypted-driver.js
 */
const MAX_DISK_SIZE = 100 * 1024 * 1024;

export class EncryptedDiskDriver {
    constructor(engine, userId) {
        this.engine = engine;
        this.userId = userId;
        this.disk = {};      // The file data
        this.size = 0;       // Current usage
        this.isInitialized = false; // Persistent "Genesis" flag
    }

    calculateSize() {
        let total = 0;
        for (let key in this.disk) {
            // Include key length and value length for realistic quota
            total += key.length + JSON.stringify(this.disk[key]).length;
        }
        this.size = total;
    }

    async load() {
        const db = await this.engine.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("disks", "readonly");
            const store = tx.objectStore("disks");
            const req = store.get(this.userId);

            req.onsuccess = () => {
                // If the record exists, it will be { disk, isInitialized }
                const result = req.result || {};
                this.disk = result.disk || {};
                this.isInitialized = result.isInitialized || false;
                
                this.calculateSize();
                resolve();
            };
            req.onerror = reject;
        });
    }

    async save() {
        const db = await this.engine.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("disks", "readwrite");
            const store = tx.objectStore("disks");
            
            // CRITICAL: We save both the files AND the initialization state
            const payload = {
                disk: this.disk,
                isInitialized: this.isInitialized
            };

            const req = store.put(payload, this.userId);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async write(path, data) {
        const entrySize = path.length + JSON.stringify(data).length;

        // Check quota (subtract old version size if overwriting)
        const oldSize = this.disk[path] ? (path.length + JSON.stringify(this.disk[path]).length) : 0;
        
        if ((this.size - oldSize) + entrySize > MAX_DISK_SIZE) {
            throw new Error("DISK_QUOTA_EXCEEDED");
        }

        this.disk[path] = data;
        this.calculateSize(); // Recalculate accurately
        await this.save();
    }

    async read(path) {
        return this.disk[path];
    }

    async delete(path) {
        if (this.disk.hasOwnProperty(path)) {
            delete this.disk[path];
            this.calculateSize();
            await this.save();
        }
    }

    async list(path) {
        // Ensure normalization for consistent prefix matching
        const normalizedSearch = path.endsWith('/') ? path : path + '/';
        const keys = Object.keys(this.disk);
        
        const results = keys
            .filter(p => p.startsWith(normalizedSearch) || p === path)
            .map(p => {
                // Get the part of the path after the current directory
                const relative = p.slice(normalizedSearch.length);
                if (!relative) return null; 
                
                // If there's a slash in the relative path, it's a sub-folder
                const parts = relative.split("/");
                return parts[0]; 
            })
            .filter(item => item !== null);

        // Return unique items (set)
        return [...new Set(results)];
    }

    exists(path) {
        return this.disk.hasOwnProperty(path);
    }
}