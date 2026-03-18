import { MFS } from '../apps/mfs.js';

export class FilesApp {
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
    constructor(container, kernel) {
        this.container = container;
        this.kernel = kernel;
        this.vfs = kernel.vfs; // Link the global VFS
        this.activeCategory = 'Personal';
        this.cwd = `/users/${kernel.user.identity}`; // Set base directory
        this.activeSub = null;
        this.undoStack = [];; // for UNDO
        window.app = this; // CRITICAL: Makes app.download() etc work from HTML strings

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                app.undoDelete();
            }
        });

    }

    async getDeviceKey() {
    if (!localStorage.mfs_device_key) {
        const key = crypto.getRandomValues(new Uint8Array(32));
        localStorage.mfs_device_key = Array.from(key).join(',');
    }
    return new Uint8Array(localStorage.mfs_device_key.split(',').map(Number));

}


    async init() {
        this.renderBase();
        this.navigateTo('Personal');
        this.updateTelemetry();
        MFS.recalculatePersonalUsage();
        this.runRecycleMaintenance();
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
                // 1. Integrity Check: Prevent empty/duplicate manifests
                if (!name) throw new Error("VOID_IDENTIFIER");

                // Resolve the full VFS path
                const path = `${this.cwd}/${category}/${name}`.replace(/\/+/g, '/');
                
                // 2. Write through the VFS (this triggers Quota and Permissions)
                await this.vfs.write(path, name, content, category); 
                
                // 3. Dispatch via Kernel: Decoupled communication
                this.kernel.emit('FILE_CREATED', {
                    name: name,
                    category: category,
                    timestamp: new Date().toISOString(),
                    clearance: 'RESTRICTED'
                });

                // 4. Atomic UI Refresh: Don't reload everything, just the folder
                await this.navigateTo(category);
            } catch (err) {
                this.kernel.notify(`VFS_WRITE_ERR: ${err.message}`, "high");
            }
        }


   async navigateTo(cat, sub = null) {
    this.activeCategory = cat;
    this.activeSub = sub;
    const list = document.getElementById('file-mesh-list');
    const breadcrumb = document.getElementById('breadcrumb');
    const targetPath = sub ? `${this.cwd}/${cat}/${sub}` : `${this.cwd}/${cat}`;

    // Safety Check: Prevent crash if DOM isn't ready
    const entries = await this.vfs.list(targetPath);
    
    //QUOTA TA
    // 1. Calculate Usage for Personal Sector
    const { driver } = this.vfs.mounts.resolve(this.cwd);
    const usageMB = (driver.size / (1024 * 1024)).toFixed(2);
    const quotaLimit = 100.00; // Native Birthright
    
    // 2. Build Tactical Breadcrumb
    const pathHtml = `<span class="path-root">DEVICE_STORAGE</span> / ${cat.toUpperCase()} ${sub ? ` / ${sub}` : ''}`;
    
    // 3. Build Integrated Quota Monitor
    const quotaHtml = cat === 'Personal' ? `
        <div class="quota-monitor">
            <span class="quota-label">STORAGE_MESH:</span>
            <div class="silo-bar">
            <div class="silo-fill" style="width: ${quotaPct}%"></div>
        </div>
        <span class="quota-val">${usageMB} / ${quotaLimit} MB</span>
    </div>
    ` : '';

    // Set the full header
    breadcrumb.innerHTML = `<div style="display: flex; width: 100%; align-items: center;">
        ${pathHtml} ${quotaHtml}
    </div>`;

    let html = '';
    if (!sub) {
        // --- VIEW: PROTOCOL FOLDER CARDS ---
        list.className = 'explorer-grid'; 
        const subs = await MFS.getSubFolders(cat);
        
        const cardPromises = subs.map(async (s, i) => {
            const path = MFS.getProtocolPath(cat, s);
            const remark = MFS.getProtocolRemark(cat, s);
            const folderFiles = MFS.manifest.files.filter(f => f.category === cat && f.path.startsWith(path));
            const totalSizeBytes = folderFiles.reduce((acc, f) => {
                if (typeof f.sizeBytes !== 'number') return acc;
                return acc + f.sizeBytes;
            }, 0);
            
            return `
                <div class="protocol-card" data-cat="${cat}" data-sub="${s}" 
                     style="animation: slideIn 0.3s forwards ${i * 0.08}s; opacity: 0;">
                    <div class="card-header">
                        <span class="card-icon">⬢</span>
                        <span class="card-title">${s}</span>
                    </div>
                    <div class="card-body">
                        <div class="stat-row"><span>PROTOCOL:</span><span class="val">${path}</span></div>
                        <div class="stat-row remark-box">
                        <span>REMARKS:</span>
                        <div class="remark-text">${remark}</div>
                    </div>
                        <div class="stat-row"><span>TOTAL_FILES:</span><span class="val">${folderFiles.length}</span></div>
                        <div class="stat-row"><span>TOTAL_SIZE:</span><span class="val">${this.formatBytes(totalSizeBytes)}</span></div>
                    </div>
                    <div class="card-footer">MOUNT_VOLUME</div>
                </div>
            `;
        });
        html = (await Promise.all(cardPromises)).join('');
    } else {
        // --- VIEW: SOVEREIGN TACTICAL FILE CARDS ---
        list.className = 'explorer-grid'; 
        
        const targetPath = MFS.getProtocolPath(cat, sub);
        // Important: Sort by date so Folio numbers are consistent
        const files = MFS.manifest.files
            .filter(f => f.category === cat && f.path.startsWith(targetPath))
            .sort((a, b) => new Date(a.created) - new Date(b.created));

        const getIcon = (type) => {
            const icons = { 'json': '⛁', 'pdf': '🗒', 'key': '🔐', 'txt': '⬡' };
            return icons[type] || '⬡';
        };

        const getClearance = (cat) => {
            if (cat === 'Finance' || cat === 'Personnel') return 'CONFIDENTIAL';
            if (cat === 'Records') return 'RESTRICTED';
            return 'UNRESTRICTED';
        };

        html = files.length > 0 ? files.map((f, i) => {
            // FIX: Define folio and fullRef before using them
            const folio = i + 1;
            const fullRef = `${targetPath}${folio}`;
            const isRecent = (new Date() - new Date(f.modified)) < 86400000;
            const fakeHash = `MD5:${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
            
            return `
            <div class="file-card ${f.urgency}" style="animation: slideIn 0.3s forwards ${i * 0.05}s; opacity: 0;">
                <div class="file-card-header">
                    <span class="file-ext">${getIcon(f.type)} ${f.type.toUpperCase()}</span>
                    <span class="clearance-tag">${f.clearance || getClearance(f.category)}</span>
                    <span class="folio-tag">FOLIO_${folio}</span>
                </div>
                <div class="file-card-body">
                    <div class="file-title">
                        ${isRecent ? '<span class="pulse-dot"></span>' : ''}
                        <span class="scramble-text">${f.name}</span>
                    </div>
                    <div class="file-telemetry">
                        <div class="t-row ref-row"><span>REF:</span> <span class="val">${fullRef}</span></div>
                        <div class="t-row"><span>AUTH:</span> <span class="val">${f.author}</span></div>
                        <div class="t-row"><span>SIZE:</span> <span class="val">${f.size || '0.00 KB'}</span></div>
                        <div class="t-row"><span>INTEGRITY:</span> <span class="val" style="font-size:7px">${fakeHash}</span></div>
                        <div class="t-row"><span>CREATED:</span> <span class="val">${f.created}</span></div>
                        <div class="t-row"><span>MODIFIED:</span> <span class="val">${f.modified}</span></div>
                        <div class="t-row"><span>VIEWS:</span> <span class="val">${f.views || 0}</span></div>
                        <div class="route-container" id="route-box-${i}">
                        <div class="route-progress-bar">
                            <div class="route-progress-fill" id="fill-${i}"></div>
                        </div>
                        <span class="route-icon" onclick="app.tacticalRoute('${f.name}', '${f.size || '0.00 KB'}', ${i})" title="INITIATE_UPLINK">
                            📡
                        </span>
                        </div>
                    </div>
                </div>
                <div class="file-card-footer">
                    <div class="default-footer">STATUS_ENCRYPTED</div>
                    <div class="card-actions">
                        <span onclick="app.download('${f.name}')" title="PULL_DATA">⤓</span>
                        <span onclick="app.copyPath('${fullRef}')" title="COPY_PATH">🔗</span>
                        <span onclick="app.wipe('${f.name}')" title="TERMINATE" class="wipe-btn">⊗</span>
                    </div>
                </div>
            </div>`;
        }).join('') : `
            <div class="empty-state-warning">
                <div class="pulse-icon">!</div>
                <span>NO_RECORDS_FOUND_IN_SECTOR</span>
            </div>`;
    }
    
    list.innerHTML = html || '<div class="mesh-row">NO_DATA_PULSE</div>';
    
    
    if (cat === 'Recycle') {
    const list = document.getElementById('file-mesh-list');
    const files = MFS.manifest.recycleBin || [];

    list.className = 'explorer-grid recycle-view';

    const recycleHeader = `
        <div class="recycle-command-header" style="grid-column: 1 / -1;">
            <div class="recycle-title">♻ DATA_RECOVERY_ZONE</div>
            <div class="recycle-subtitle">ORPHANED_OBJECTS // TIME-SENSITIVE</div>

            <div class="undo-timeline">
                <label class="timeline-label">UNDO_TIMELINE</label>
                <input type="range"
                    min="0"
                    max="${Math.max(this.undoStack.length - 1, 0)}"
                    value="${Math.max(this.undoStack.length - 1, 0)}"
                    oninput="app.previewUndo(this.value)" />
                <button class="restore-btn" onclick="app.restoreByTimeline()">
                    RESTORE_POINT
                </button>
            </div>
        </div>
    `;

    const fileCards = files.length ? files.map((f, i) => {
        const maxDays = 30; // retention policy
        const remainingDays = Math.max(
            0,
            Math.ceil((new Date(f.expiryAt).getTime() - Date.now()) / 86400000)
        );
        const ttlPercent = Math.min(100, (remainingDays / maxDays) * 100);

        const decay = Math.floor(Math.random() * 5);

        return `
        <div class="file-card recycle-status decay-${decay}"
             style="animation: slideIn 0.3s forwards ${i * 0.05}s; opacity: 0;">
             
            <div class="file-card-header">
                <span class="status-tag">ORPHANED_DATA</span>
                <span class="decay-tag">DECAY_${decay}%</span>
            </div>
            
            <div class="file-card-body">
                <div class="file-title">
                    <span class="scramble-text">${f.name}</span>
                </div>
            <div class="ttl-ring-wrapper"
                style="--ttl:${ttlPercent}"
                data-days="${remainingDays}">
                <div class="ttl-ring"></div>
            </div>

                <div class="file-telemetry">
                    <div class="t-row">
                        <span>PREV_SECTOR:</span>
                        <span class="val">${f.category.toUpperCase()}</span>
                    </div>
                    <div class="t-row">
                        <span>SIZE:</span>
                        <span class="val">${f.size}</span>
                    </div>
                </div>
            </div>

            <div class="file-card-footer recycle-actions">
                <div class="action-trigger restore"
                     onclick="app.restoreFromRecycle(${i})">
                    ↩ RESTORE
                </div>

                <div class="action-trigger purge wipe-btn"
                     onclick="app.permanentDelete(${i})">
                    ⊗ PURGE
                </div>

                <div class="version-trigger"
                     title="VERSION_HISTORY"
                     onclick="app.viewVersions('${f.name}')">
                    🕘
                </div>
            </div>

            <div class="scanline"></div>
        </div>`;
    }).join('') : `
        <div class="empty-state recycle-empty" style="grid-column: 1 / -1;">
            <div class="pulse-icon">♻</div>
            <div class="empty-title">RECYCLE_BIN_CLEAR</div>
            <div class="empty-sub">NO_ORPHANED_DATA_PRESENT</div>
        </div>
    `;

    list.innerHTML = recycleHeader + fileCards;
    //RING COUNTDOWN HERE
    document.querySelectorAll('.ttl-ring-wrapper').forEach(wrapper => {
        let ttl = parseFloat(wrapper.style.getPropertyValue('--ttl')) || 100; // start from current TTL
        const ring = wrapper.querySelector('.ttl-ring');

        const interval = setInterval(() => {
            ttl -= 0.5; // decrease by 0.5% per tick
            if (ttl < 0) ttl = 0;

            ring.style.setProperty('--ttl', ttl);

            // Trigger fracture mode if TTL < 20%
            if(ttl <= 20) {
                wrapper.setAttribute('data-fracture', 'true');
            }

            // Stop interval if TTL is 0
            if(ttl <= 0) clearInterval(interval);
        }, 100); // 100ms per tick
    });

    return;
}


    // Trigger effects after innerHTML is set
    this.applyScrambleEffect();
    this.setupTableEvents();
}

previewUndo(index) {
    const entry = this.undoStack[index];
    this.notify(`PREVIEW: ${entry.name}`);
}

restoreByTimeline() {
    if (!this.undoStack.length) return;
    const entry = this.undoStack.pop();
    MFS.manifest.recycleBin = MFS.manifest.recycleBin.filter(f => f !== entry);
    MFS.manifest.files.push(entry);
    this.notify(`RESTORED: ${entry.name}`);
    this.navigateTo(entry.category, entry.path.split('/')[1]);
}

renderLedger() {
    const list = document.getElementById('file-mesh-list');
    list.className = 'explorer-grid';
    list.innerHTML = MFS.manifest.deleteLedger.map((l, i) => `
        <div class="analytics-card">
            <div class="card-header">🧾 DELETE_EVENT_${i}</div>
            <div class="card-body">
                <div>FILE: ${l.name}</div>
                <div>PATH: ${l.path}</div>
                <div>ACTOR: ${l.actor}</div>
                <div>TIME: ${l.deletedAt}</div>
                <div>HASH: ${l.hash}</div>
            </div>
        </div>
    `).join('');
}


    async tacticalRoute(fileName, size, index) {
        const routeBox = document.getElementById(`route-box-${index}`);
        const fill = document.getElementById(`fill-${index}`);
        const icon = routeBox.querySelector('.route-icon');

        // 1. Prevent double-firing
        if (routeBox.classList.contains('transmitting')) return;
        
        routeBox.classList.add('transmitting');
        this.notify(`ESTABLISHING_UPLINK: ${fileName.toUpperCase()}`, "normal");

        // 2. Calculate "Beam Time" (Best Practice: Weight based on KB/MB)
        const sizeVal = parseFloat(size);
        const weight = size.includes('MB') ? 1000 : 10;
        const duration = Math.min(Math.max(sizeVal * weight, 800), 3000); // Between 0.8s and 3s

        // 3. Animate the progress bar
        fill.style.transition = `width ${duration}ms linear`;
        setTimeout(() => { fill.style.width = '100%'; }, 50);

        // 4. Wait for "Beaming" to complete
        await new Promise(res => setTimeout(res, duration));

        // 5. Secure Signal via Kernel (Unified Bridge)
        this.kernel.emit('FILE_CREATED', { 
            name: fileName,
            category: this.activeCategory,
            size: size,
            timestamp: new Date().toISOString(),
            isManualRoute: true
        });

        // 6. Finalize UI State
        icon.innerHTML = '✔️';
        this.notify(`UPLINK_SUCCESS: ${fileName.toUpperCase()}`);
        
        setTimeout(() => {
            routeBox.classList.remove('transmitting');
            fill.style.width = '0%';
            icon.innerHTML = '📡';
        }, 2000);
    }
    applyScrambleEffect() {
        const elements = this.container.querySelectorAll('.scramble-text');
        elements.forEach(el => {
            const original = el.innerText;
            const chars = "!<>-_\\/[]{}—=+*^?#________";
            let iterations = 0;
            
            const interval = setInterval(() => {
                el.innerText = original.split("")
                    .map((char, index) => {
                        if(index < iterations) return original[index];
                        return chars[Math.floor(Math.random() * chars.length)];
                    }).join("");
                
                if(iterations >= original.length) {
                    clearInterval(interval);
                    el.innerText = original; // Ensure final text is perfect
                }
                iterations += 1/3;
            }, 30);
        });
    }

  renderBase() {
    this.container.innerHTML = `
        <div class="explorer-wrapper">
            <aside class="explorer-sidebar" id="sidebar">
                <div class="explorer-brand">ENCLAVE_PRO // V1.0</div>
                <div class="telemetry-box" id="sys-telemetry">MESH_LOAD: ACTIVE</div>
                <nav class="explorer-nav">
                    ${['Personal', 'Comms', 'Records', 'Finance', 'Personnel', 'Projects', 'Logistics', 'Recycle'].map(cat => `
                        <div class="nav-node ${cat === this.activeCategory ? 'active' : ''}" data-cat="${cat}">${cat.toUpperCase()}</div>
                    `).join('')}
                    <div class="nav-separator"></div>
                    <div class="nav-node analytics-trigger" id="view-stats">📊 DATA_ANALYTICS</div>
                </nav>
            </aside>
            <main class="explorer-content">
                <header class="tactical-header">
                    <div class="tier-primary">
                        <div class="breadcrumb-zone">
                            <span class="root-label">STORAGE_MESH</span>
                            <span class="path-separator">/</span>
                            <span id="breadcrumb" class="current-path">ROOT</span>
                        </div>
                        <div id="quota-display" class="quota-zone"></div>
                    </div>

                    <div class="tier-actions">
                        <button class="create-btn" onclick="app.openFolioDirector()">
                            <span class="plus-icon">+</span> INITIALIZE_FOLIO
                        </button>
                        <div class="search-scanner">
                            <span class="cmd-prefix">></span>
                            <input type="text" id="mesh-search" placeholder="SCAN_DATABASE..." spellcheck="false" autocomplete="off" />
                            <div class="scanner-glow"></div>
                        </div>
                    </div>
                </header>
                <div id="file-mesh-list" class="explorer-table"></div>
            </main>
        </div>
    `;
    this.setupSidebar();
    this.setupSearch();
}  

routeToComms(fileName, size = '0.00 KB') {
    this.notify(`PREPARING_DISPATCH: ${fileName.toUpperCase()}`, "normal");
    
    // Secure Dispatch via Kernel
    this.kernel.emit('FILE_CREATED', { 
        name: fileName,
        category: this.activeCategory,
        size: size,
        timestamp: new Date().toISOString(),
        isManualRoute: true
    });
}

// Triggered by the INITIALIZE_FOLIO button
    openFolioDirector() {
        const modal = document.createElement('div');
        modal.className = 'sov-modal-overlay';
        modal.innerHTML = `
            <div class="sov-modal folio-director">
                <div class="modal-header">INITIALIZE_FOLIO_SYSTEM</div>
                <div class="modal-body">
                    <div class="folio-choice-grid">
                        <div class="choice-card" onclick="app.generateNativeTemplate('OFFICIAL_LETTER')">
                            <div class="choice-icon">⚖️</div>
                            <div class="choice-label">OFFICIAL_LETTER</div>
                        </div>
                        <div class="choice-card" onclick="app.generateNativeTemplate('OTHER_LETTER')">
                            <div class="choice-icon">✉️</div>
                            <div class="choice-label">OTHER_LETTER</div>
                        </div>
                        <div class="choice-card" onclick="app.generateNativeTemplate('SIGNAL')">
                            <div class="choice-icon">📡</div>
                            <div class="choice-label">SIGNAL_BURST</div>
                        </div>
                        <div class="choice-card upload-path" onclick="app.bridgeToUpload()">
                            <div class="choice-icon">📤</div>
                            <div class="choice-label">UPLOAD_FILE</div>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="wipe-btn" onclick="this.closest('.sov-modal-overlay').remove()">ABORT</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Path A: The Templates
    generateNativeTemplate(type) {
        const template = FilesApp.COMM_TEMPLATES[type];
        const identity = this.kernel.user?.identity || "NATIVE_ADMIN";
        const content = template.content(identity);
        
        // Native routing logic
        const category = (type === 'OTHER_LETTER') ? 'Personal' : 'Comms';
        const sub = (type === 'SIGNAL') ? 'Signals' : 'Inbound';
        
        document.querySelector('.sov-modal-overlay').remove();

        this.triggerSuccessAnimation(
            { name: template.name, content: content, isTemplate: true }, 
            category, sub, 'RESTRICTED'
        );
    }

    // Path B: The Legacy Upload
    bridgeToUpload() {
        document.querySelector('.sov-modal-overlay').remove();
        this.openUniversalCreator(); // Calls your existing file upload modal
    }

async openUniversalCreator() {
    // 1. Ensure we pull the sector keys correctly
    const categories = Object.keys(MFS.protocols);
    
    const modal = document.createElement('div');
    modal.className = 'sov-modal-overlay';
    modal.innerHTML = `
        <div class="sov-modal">
            <div class="modal-header">SECURE_PROTOCOL_UPLOAD</div>
            <div class="modal-body">
                <label>SELECT_OBJECT</label>
                <input type="file" id="new-file-upload" class="file-input-tactical" />
                <div id="upload-progress-container" style="display: none; margin-top: 20px;">
                <div class="stat-row"><span id="upload-status-text">INITIALIZING_ENCRYPTION...</span> <span id="upload-pct">0%</span></div>
                <div class="silo-bar" style="width: 100%; height: 10px; margin-top: 5px;">
                    <div id="upload-progress-fill" class="silo-fill" style="width: 0%; background: var(--sov-purple);"></div>
                </div>
                </div>

                <label>TARGET_SECTOR</label>
                <select id="new-file-cat">
                    <option value="">-- SELECT SECTOR --</option>
                    ${categories.map(c => `<option value="${c}">${c.toUpperCase()}</option>`).join('')}
                </select>

                <label>TARGET_VOLUME</label>
                <select id="new-file-sub">
                    <option value="">-- SELECT SECTOR FIRST --</option>
                </select>

                <label>SECURITY_CLEARANCE</label>
                <select id="new-file-clearance">
                    <option value="UNRESTRICTED">UNRESTRICTED</option>
                    <option value="RESTRICTED">RESTRICTED</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="TOP_SECRET">TOP_SECRET</option>
                </select>

                <label>AUTHOR_SIGNATURE</label>
                <input type="text" id="new-file-auth" value="USER_ADMIN" />
            </div>
            <div class="modal-actions">
                <button class="create-btn" id="confirm-upload">UPLOAD_TO_MESH</button>
                <button class="wipe-btn" id="abort-upload">ABORT</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 2. STURDY EVENT LISTENERS (The "Correct" Way)
    const catSelect = modal.querySelector('#new-file-cat');
    const subSelect = modal.querySelector('#new-file-sub');
    
    catSelect.addEventListener('change', (e) => {
        const selectedCat = e.target.value;
        if (!selectedCat) {
            subSelect.innerHTML = '<option value="">-- SELECT SECTOR FIRST --</option>';
            return;
        }
        
        // Pull sub-folders directly from MFS
        const subs = Object.keys(MFS.protocols[selectedCat]);
        subSelect.innerHTML = subs.map(s => `<option value="${s}">${s}</option>`).join('');
    });

    modal.querySelector('#confirm-upload').onclick = () => this.executeUpload();
    modal.querySelector('#abort-upload').onclick = () => modal.remove();
}

async executeUpload() {
    const fileInput = document.getElementById('new-file-upload');
    const cat = document.getElementById('new-file-cat').value;
    const sub = document.getElementById('new-file-sub').value;
    const clearance = document.getElementById('new-file-clearance').value;

    if (!fileInput.files[0] || !cat || !sub) {
        alert("CRITICAL_ERR: MISSING_UPLOAD_DATA");
        return;
    }

    const progressContainer = document.getElementById('upload-progress-container');
    const progressFill = document.getElementById('upload-progress-fill');
    const statusText = document.getElementById('upload-status-text');
    const pctText = document.getElementById('upload-pct');
    const uploadBtn = document.getElementById('confirm-upload');

    // Start Simulation
    uploadBtn.disabled = true;
    progressContainer.style.display = 'block';
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        progressFill.style.width = `${progress}%`;
        pctText.innerText = `${Math.floor(progress)}%`;

        if (progress < 40) statusText.innerText = "FRAGMENTING_OBJECT...";
        else if (progress < 80) {
            statusText.innerText = "ENCRYPTING_BITSTREAM...";
            progressFill.style.background = "var(--sov-purple)";
        } 
        else statusText.innerText = "FINALIZING_PROTOCOL...";

        if (progress === 100) {
            clearInterval(interval);
            this.triggerSuccessAnimation(fileInput.files[0], cat, sub, clearance);
        }
    }, 150);
}


triggerSuccessAnimation(fileOrData, cat, sub, clearance) {
    const isTemplate = fileOrData.isTemplate || false;
    const fileName = isTemplate ? fileOrData.name : fileOrData.name;
    const fileContent = isTemplate ? fileOrData.content : fileOrData;
    const auth = document.getElementById('new-file-auth')?.value || "NATIVE_ADMIN";
    const modal = document.querySelector('.sov-modal');
    const integrityHash = crypto.randomUUID();
    
    
    // 1. Update UI to Success State
    modal.innerHTML = `
        <div class="success-anim-wrapper">
            <div class="success-hex">⬢</div>
            <div class="success-msg">OBJECT_SECURED</div>
            <div class="success-details">${fileName.toUpperCase()}</div>
        </div>
    `;

    try {
        // 2. Data Calculation
        // Pass the actual File object from the input to calculateSize
        const fileBytes = this.calculateBytes(fileContent);
        const sizeStr = this.formatBytes(fileBytes);
        const newFile = {
            name: fileName,
            path: MFS.getProtocolPath(cat, sub),
            category: cat,
            type: fileName.split('.').pop() || 'txt',
            sizeBytes: fileBytes,        // REAL NUMBER
            size: sizeStr,               // UI STRING
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

        // ENFORCE PERSONAL QUOTA
        if (cat === 'Personal') {
            const used = MFS.manifest.personalUsage || 0;
            const limit = MFS.manifest.personalQuota;

            if ((used + fileBytes) > limit) {
                this.notify("QUOTA_EXCEEDED: PERSONAL_MESH_LIMIT", "high");
                document.querySelector('.sov-modal-overlay')?.remove();
                return;
            }
        }

        // 3. Update Global Manifest
        MFS.manifest.files.push(newFile);

        // 🔻 Deduct quota
        if (cat === 'Personal') {
            MFS.manifest.personalUsage += fileBytes;
        }
        
        // 4. Signal the Comms Hub (The Nervous System)
        this.kernel.emit('FILE_CREATED', newFile);

    } catch (err) {
        console.error("CRITICAL_SYNC_ERROR:", err);
        this.notify("SYNC_FAILURE: DATA_PERSISTENCE_ERR", "high");
    }

    // 5. Guaranteed Cleanup
    setTimeout(() => {
        const overlay = document.querySelector('.sov-modal-overlay');
        if (overlay) overlay.remove();
        // Go to the folder where the file was just uploaded
        this.navigateTo(cat, sub);
    }, 2000);
}

viewVersions(fileName) {
    const file = MFS.manifest.files.find(f => f.name === fileName);
    if (!file || !file.versions) return;
    alert(file.versions.map(v =>
        `HASH: ${v.hash}\nTIME: ${new Date(v.timestamp)}`
    ).join("\n\n"));
}


setupSearch() {
    const searchInput = this.container.querySelector('#mesh-search');
    const list = this.container.querySelector('#file-mesh-list');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query === "") {
            this.navigateTo(this.activeCategory); // Reset view if search is empty
            return;
        }

        let resultsHtml = '';
        
        // --- 1. SEARCH PROTOCOLS (FOLDERS) ---
        Object.keys(MFS.protocols).forEach(cat => {
            Object.entries(MFS.protocols[cat]).forEach(([name, data]) => {
                if (name.toLowerCase().includes(query) || data.remark.toLowerCase().includes(query) || data.path.toLowerCase().includes(query)) {
                    resultsHtml += `
                        <div class="protocol-card search-hit" onclick="app.navigateTo('${cat}', '${name}')">
                            <div class="card-header"><span class="card-icon">📁</span> ${name}</div>
                            <div class="card-body">
                                <div class="stat-row"><span>REF:</span> <span class="val">${data.path}</span></div>
                                <div class="remark-text">${data.remark}</div>
                            </div>
                        </div>`;
                }
            });
        });

        // --- 2. SEARCH MANIFEST (FILES) ---
        const fileHits = MFS.manifest.files.filter(f => 
            f.name.toLowerCase().includes(query) || 
            f.author.toLowerCase().includes(query) ||
            f.path.toLowerCase().includes(query)
        );

        resultsHtml += fileHits.map(f => {
            const fakeHash = `MD5:${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
            return `
                <div class="file-card search-hit ${f.urgency}" onclick="app.navigateTo('${f.category}', '${f.path.split('/')[1]}')">
                    <div class="file-card-header">
                        <span class="file-ext">📄 ${f.type.toUpperCase()}</span>
                        <span class="folio-tag">SEARCH_RESULT</span>
                    </div>
                    <div class="file-card-body">
                        <div class="file-title">${f.name}</div>
                        <div class="file-telemetry">
                            <div class="t-row"><span>PATH:</span> <span class="val">${f.path}</span></div>
                            <div class="t-row"><span>HASH:</span> <span class="val">${fakeHash}</span></div>
                        </div>
                    </div>
                </div>`;
        }).join('');

        // --- 3. RENDER RESULTS ---
        list.className = 'explorer-grid search-mode';
        list.innerHTML = resultsHtml || `
            <div class="empty-state-warning">
                <div class="pulse-icon">?</div>
                <span>NO_MATCHES_FOUND_IN_MESH</span>
            </div>`;
            
        this.applyScrambleEffect();
    });
}


renderAnalytics() {
    const list = document.getElementById('file-mesh-list');
    list.className = 'explorer-grid'; // Use the grid for cards
    
    const categories = ['Comms', 'Records', 'Finance', 'Personnel', 'Projects', 'Logistics'];
    const totalFiles = MFS.manifest.files.length;

    list.innerHTML = categories.map((cat, i) => {
        const sectorFiles = MFS.manifest.files.filter(f => f.category === cat);
        const count = sectorFiles.length;
        const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
        
        // Dynamic status based on volume density
        let status = "OPTIMAL";
        if (count > 5) status = "HIGH_DENSITY";
        if (count === 0) status = "VACANT";

        return `
            <div class="analytics-card" style="animation: slideIn 0.3s forwards ${i * 0.08}s; opacity: 0;">
                <div class="card-header">
                    <span class="card-icon">📊</span>
                    <span class="card-title">${cat.toUpperCase()}</span>
                </div>
                <div class="card-body">
                    <div class="stat-main">
                        <span class="big-num">${percentage}</span><span class="percent-sign">%</span>
                    </div>
                    <div class="stat-details">
                        <div class="t-row"><span>FOLIO_COUNT:</span> <span class="val">${count}</span></div>
                        <div class="t-row"><span>SECTOR_STATUS:</span> <span class="val">${status}</span></div>
                        <div class="t-row"><span>INTEGRITY:</span> <span class="val">ENCLAVED</span></div>
                    </div>
                    <div class="mini-bar">
                        <div class="mini-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="card-footer">SECTOR_DENSITY_ANALYSIS</div>
            </div>
        `;
    }).join('');
}
    updateTelemetry() {
        setInterval(() => {
            const el = document.getElementById('sys-telemetry');
            if (el) el.innerHTML = `SYNC_ID: ${Math.random().toString(16).slice(2, 8).toUpperCase()}<br>ENTROPY: 0.99${Math.floor(Math.random()*9)}`;
        }, 3000);
    }

    // --- TACTICAL ACTIONS ---

    async download(fileName) {
    // 1. Construct the absolute VFS path based on current directory
    const fullPath = `${this.cwd}/${this.activeCategory}/${fileName}`.replace(/\/+/g, '/');
    
    console.log(`PULLING_LIVE_DATA: ${fullPath}...`);

    try {
        // 2. Read directly from VFS
        const content = await this.vfs.read(fullPath);
        
        // 3. Prepare the binary blob for the browser
        const blob = new Blob(
            [typeof content === 'string' ? content : JSON.stringify(content, null, 2)], 
            { type: 'text/plain' }
        );
        
        // 4. Trigger Native Download Sequence
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.notify(`DATA_PULL_COMPLETE: ${fileName}`);
    } catch (e) {
        // Catch permission or read errors from the kernel
        this.notify(`READ_FAULT: ${e.message || "DATA_UNREACHABLE"}`, "high");
    }
}

    copyPath(path) {
        navigator.clipboard.writeText(path).then(() => {
            this.notify(`PATH_REPLICATED: ${path}`);
        });
    }

 async wipe(fileName) {
    const source = `${this.cwd}/${this.activeCategory}/${fileName}`.replace(/\/+/g, '/');
    const recycleDir = `${this.cwd}/Recycle`.replace(/\/+/g, '/');
    const destination = `${recycleDir}/${fileName}`;

    if (!confirm(`MOVE ${fileName.toUpperCase()} TO RECYCLE_BIN?`)) return;

    try {
        // Ensure the Recycle directory exists
        if (!(await this.vfs.exists(recycleDir))) {
            await this.vfs.write(recycleDir, {}); // Create folder if missing
        }

        // Execute the VFS move
        await this.vfs.move(source, destination);

        this.notify(`OBJECT_RELOCATED: ${fileName} -> RECYCLE_BIN`, "normal");
        
        // Refresh the current view
        await this.navigateTo(this.activeCategory, this.activeSub);
    } catch (e) {
        this.notify(`RELOCATION_FAILURE: ${e.message}`, "high");
    }
}   


async move(sourcePath, destinationPath) {
    try {
        // 1. Extract the data from the source
        const content = await this.read(sourcePath);

        // 2. Write the data to the new location
        // This automatically handles encryption/decryption if crossing drivers
        await this.write(destinationPath, content);

        // 3. Purge the original entry once the transfer is verified
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
    const source = `${this.cwd}/Recycle/${fileName}`.replace(/\/+/g, '/');
    const destination = `${this.cwd}/${targetCategory}/${fileName}`.replace(/\/+/g, '/');

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
    const card = document.querySelectorAll('.file-card.recycle-status')[index];
    card.style.transition = 'all 0.4s';
    card.style.filter = 'contrast(2) brightness(2) hue-rotate(90deg)';
    card.style.transform = 'scale(0.8)';
    card.style.opacity = '0';

    const files = MFS.manifest.recycleBin;
    const file = files[index];
    if (!file) return;

    if (!confirm(`FINAL_DELETE: ${file.name}? NO_RECOVERY`)) return;

    files.splice(index, 1);
    this.undoStack = this.undoStack.filter(f => f !== file);
    
    setTimeout(() => {
        // Actual deletion logic here
        MFS.manifest.recycleBin.splice(index, 1);
        this.navigateTo('Recycle');
        this.notify("DATA_PURGED_PERMANENTLY", "high");
    }, 400);
}




    notify(msg, priority = "normal") {
        const color = priority === "high" ? "#ff4545" : "#00ff41";
        console.log(`%c[SYS_MSG]: ${msg}`, `color: ${color}; font-weight: bold;`);
        // If you have a toast system, trigger it here
    }


    setupTableEvents() {
    // Listen for Card clicks
    this.container.querySelectorAll('.protocol-card').forEach(card => {
        card.onclick = () => this.navigateTo(card.dataset.cat, card.dataset.sub);
    });
}

    setupSidebar() {
        this.container.querySelectorAll('.nav-node').forEach(node => {
            node.onclick = () => {
                this.container.querySelectorAll('.nav-node').forEach(n => n.classList.remove('active'));
                node.classList.add('active');
                this.navigateTo(node.dataset.cat);
                this.container.querySelector('#view-stats').onclick = () => this.renderAnalytics();
                if (node.id === 'view-stats') {
    this.renderLedger();
}
            };
        });
    }
}