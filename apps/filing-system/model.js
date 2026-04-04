import { MFS } from '../../core/mfs.js';

export class FilingSystemModel {
    static COMM_TEMPLATES = {
        OFFICIAL_LETTER: {
            name: "NATIVE_ALLOTMENT_DECREE.txt",
            icon: "⚖️",
            label: "OFFICIAL_LETTER",
            content: (id) => `SOVEREIGN_ADMINISTRATION // NATIVE_PROVISIONING\nCLASSIFICATION: RESTRICTED // THEALCOHESION_CORE\n------------------------------------------\nDATE: ${new Date().toLocaleDateString()}\nREF_ID: NAT_ALLOT_100MB_${Math.floor(Math.random()*1000)}\n\nSUBJECT: INITIAL_STORAGE_ALLOTMENT_DECREE\n\n1. PROVISION: Total 100.00 MB Mesh Storage.\n2. ELIGIBILITY: Verified Natives of Thealcohesion.\n3. PROTOCOL: Managed via EPOS v2.0.\n\nSTAMP_AUTHORITY: TLC_KERNEL_V1.2.8\nDIGITAL_SIG: [NATIVE_ENCLAVE_VERIFIED]`
        },
        OTHER_LETTER: {
            name: "NATIVE_CORRESPONDENCE.txt",
            icon: "✉️",
            label: "OTHER_LETTER",
            content: (id) => `MEMORANDUM // NATIVE_CORRESPONDENCE\nDATE: ${new Date().toLocaleDateString()}\nFROM: ${id}\n\n[Salutation],\n\n[Body text for general Native communication.]`
        },
        SIGNAL: {
            name: "SIGNAL_BURST.txt",
            icon: "📡",
            label: "SIGNAL_BURST",
            content: () => `[SIGNAL_PRIORITY: HIGH]\n[ORIGIN]: ADMIN_CORE\n[DATA]: PING_NATIVE_MESH\n[PULSE_ID]: ${Math.random().toString(36).substring(7).toUpperCase()}\n[EOF]`
        }
    };

    constructor(kernel, governance) {
        this.kernel = kernel;
        this.governance = governance;
        this.vfs = this.kernel.vfs;
        this.cwd = null;
        this.undoStack = [];
    }

    getCwd() {
        if (this.cwd) return this.cwd;

        const identity = this.kernel.user?.identity;
        if (identity) {
            const candidate = `/users/${identity}`;
            try {
                this.vfs.mounts.resolve(candidate);
                this.cwd = candidate;
                return this.cwd;
            } catch (err) {
                // fallback to any available /users mount
            }
        }

        const mounts = Object.keys(this.vfs.mounts.mounts || {});
        const userMounts = mounts.filter(p => p.startsWith('/users/'));
        if (userMounts.length) {
            this.cwd = userMounts[0];
            return this.cwd;
        }

        if (mounts.length) {
            this.cwd = mounts[0];
            return this.cwd;
        }

        throw new Error('VFS_MOUNT_NOT_FOUND: Unable to resolve user root');
    }

    async getDeviceKey() {
        if (!localStorage.mfs_device_key) {
            const key = crypto.getRandomValues(new Uint8Array(32));
            localStorage.mfs_device_key = Array.from(key).join(',');
        }
        return new Uint8Array(localStorage.mfs_device_key.split(',').map(Number));
    }

    calculateBytes(data) {
        if (data instanceof File) return data.size;
        return new Blob([data]).size;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0.00 KB';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }

    async saveNewFile(name, content, category) {
        try {
            if (!name) throw new Error("VOID_IDENTIFIER");

            const path = `${this.getCwd()}/${category}/${name}`.replace(/\/+/g, '/');
            
            await this.vfs.write(path, name, content, category); 
            
            this.kernel.emit('FILE_CREATED', {
                name: name,
                category: category,
                timestamp: new Date().toISOString(),
                clearance: 'RESTRICTED'
            });

            await this.navigateTo(category);
        } catch (err) {
            this.kernel.notify(`VFS_WRITE_ERR: ${err.message}`, "high");
        }
    }

    async navigateTo(cat, sub = null) {
        this.activeCategory = cat;
        this.activeSub = sub;
        const targetPath = sub ? `${this.getCwd()}/${cat}/${sub}` : `${this.getCwd()}/${cat}`;

        const entries = await this.vfs.list(targetPath);
        return entries;
    }

    async tacticalRoute(fileName, size, index) {
        this.kernel.emit('FILE_CREATED', { 
            name: fileName,
            category: this.activeCategory,
            size: size,
            timestamp: new Date().toISOString(),
            isManualRoute: true
        });
    }

    triggerSuccessAnimation(fileOrData, cat, sub, clearance) {
        const isTemplate = fileOrData.isTemplate || false;
        const fileName = isTemplate ? fileOrData.name : fileOrData.name;
        const fileContent = isTemplate ? fileOrData.content : fileOrData;
        const auth = document.getElementById('new-file-auth')?.value || "NATIVE_ADMIN";
        const integrityHash = crypto.randomUUID();
        
        try {
            const fileBytes = this.calculateBytes(fileContent);
            const sizeStr = this.formatBytes(fileBytes);
            const newFile = {
                name: fileName,
                path: MFS.getProtocolPath(cat, sub),
                category: cat,
                type: fileName.split('.').pop() || 'txt',
                sizeBytes: fileBytes,
                size: sizeStr,
                author: auth,
                urgency: (clearance === 'CONFIDENTIAL' || clearance === 'TOP_SECRET') ? 'high' : 'normal',
                clearance: clearance,
                created: new Date().toISOString().split('T')[0],
                modified: new Date().toISOString().split('T')[0],
                hash: integrityHash,
                views: 0,
                content: isTemplate ? fileContent : null,
                versions: [{
                    hash: integrityHash,
                    timestamp: Date.now(),
                    sizeBytes: fileBytes
                }],
            };

            if (cat === 'Personal') {
                const used = MFS.manifest.personalUsage || 0;
                const limit = MFS.manifest.personalQuota;

                if ((used + fileBytes) > limit) {
                    this.notify("QUOTA_EXCEEDED: PERSONAL_MESH_LIMIT", "high");
                    document.querySelector('.sov-modal-overlay')?.remove();
                    return;
                }
            }

            MFS.manifest.files.push(newFile);

            if (cat === 'Personal') {
                MFS.manifest.personalUsage += fileBytes;
            }
            
            this.kernel.emit('FILE_CREATED', newFile);

        } catch (err) {
            console.error("CRITICAL_SYNC_ERROR:", err);
            this.notify("SYNC_FAILURE: DATA_PERSISTENCE_ERR", "high");
        }
    }

    viewVersions(fileName) {
        const file = MFS.manifest.files.find(f => f.name === fileName);
        if (!file || !file.versions) return;
        alert(file.versions.map(v =>
            `HASH: ${v.hash}\nTIME: ${new Date(v.timestamp)}`
        ).join("\n\n"));
    }

    async wipe(fileName) {
        const source = `${this.getCwd()}/${this.activeCategory}/${fileName}`.replace(/\/+/g, '/');
        const recycleDir = `${this.getCwd()}/Recycle`.replace(/\/+/g, '/');
        const destination = `${recycleDir}/${fileName}`;

        if (!confirm(`MOVE ${fileName.toUpperCase()} TO RECYCLE_BIN?`)) return;

        try {
            if (!(await this.vfs.exists(recycleDir))) {
                await this.vfs.write(recycleDir, {}); // Create folder if missing
            }

            await this.vfs.move(source, destination);

            this.notify(`OBJECT_RELOCATED: ${fileName} -> RECYCLE_BIN`, "normal");
            
            await this.navigateTo(this.activeCategory, this.activeSub);
        } catch (e) {
            this.notify(`RELOCATION_FAILURE: ${e.message}`, "high");
        }
    }

    async move(sourcePath, destinationPath) {
        try {
            const content = await this.read(sourcePath);
            await this.write(destinationPath, content);
            await this.delete(sourcePath);
            return true;
        } catch (e) {
            throw new Error(`VFS_MOVE_FAULT: ${e.message}`);
        }
    }

    undoDelete() {
        if (!this.undoStack.length) {
            this.notify("UNDO_BUFFER_EMPTY");
            return;
        }
        const file = this.undoStack.pop();

        file.category = file._recycleMeta.originalCategory;
        file.path = file._recycleMeta.originalPath;
        delete file._recycleMeta;

        if (file.category === 'Personal') {
            MFS.manifest.personalUsage += file.sizeBytes;
        }

        MFS.manifest.recycleBin = MFS.manifest.recycleBin.filter(f => f !== file);
        MFS.manifest.files.push(file);

        this.notify(`UNDO_SUCCESS: ${file.name}`);
        this.navigateTo(file.category, file.path.split('/')[1]);
    }

    async restoreFromRecycle(fileName, targetCategory) {
        const source = `${this.getCwd()}/Recycle/${fileName}`.replace(/\/+/g, '/');
        const destination = `${this.getCwd()}/${targetCategory}/${fileName}`.replace(/\/+/g, '/');

        try {
            await this.vfs.move(source, destination);
            this.notify(`RESTORE_COMPLETE: ${fileName} returned to ${targetCategory}`);
            await this.navigateTo('Recycle');
        } catch (e) {
            this.notify(`RESTORE_FAULT: ${e.message}`, "high");
        }
    }

    runRecycleMaintenance() {
        const now = Date.now();
        const ttl = (MFS.manifest.recyclePolicy.autoPurgeDays || 30) * 86400000;

        MFS.manifest.recycleBin = MFS.manifest.recycleBin.filter(file => {
            if (!file._recycleMeta?.deletedAt) return true;
            return (now - file._recycleMeta.deletedAt) < ttl;
        });
    }

    permanentDelete(index) {
        const files = MFS.manifest.recycleBin;
        const file = files[index];
        if (!file) return;

        if (!confirm(`FINAL_DELETE: ${file.name}? NO_RECOVERY`)) return;

        files.splice(index, 1);
        this.undoStack = this.undoStack.filter(f => f !== file);
        
        setTimeout(() => {
            MFS.manifest.recycleBin.splice(index, 1);
            this.navigateTo('Recycle');
            this.notify("DATA_PURGED_PERMANENTLY", "high");
        }, 400);
    }

    notify(msg, priority = "normal") {
        const color = priority === "high" ? "#ff4545" : "#00ff41";
        console.log(`%c[SYS_MSG]: ${msg}`, `color: ${color}; font-weight: bold;`);
    }
}
