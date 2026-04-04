import { MFS } from '../../core/mfs.js';

class FilingSystemView {
    constructor(container, model) {
        this.container = container;
        this.model = model;
        this.activeCategory = 'Personal';
        this.activeSub = null;
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

    async navigateTo(cat, sub = null) {
        this.activeCategory = cat;
        this.activeSub = sub;
        const list = this.container.querySelector('#file-mesh-list');
        const breadcrumb = this.container.querySelector('#breadcrumb');
        const targetPath = sub ? `${this.model.cwd}/${cat}/${sub}` : `${this.model.cwd}/${cat}`;

        const entries = await this.model.vfs.list(targetPath).catch(() => []);
        
        const cwd = this.model.getCwd ? this.model.getCwd() : this.model.cwd;
        const { driver } = this.model.vfs.mounts.resolve(cwd);
        const usageMB = (driver.size / (1024 * 1024)).toFixed(2);
        const quotaLimit = 100.00;
        
        const pathHtml = `<span class="path-root">DEVICE_STORAGE</span> / ${cat.toUpperCase()} ${sub ? ` / ${sub}` : ''}`;
        
        const quotaHtml = cat === 'Personal' ? `
            <div class="quota-monitor">
                <span class="quota-label">STORAGE_MESH:</span>
                <div class="silo-bar">
                <div class="silo-fill" style="width: ${usageMB > quotaLimit ? 100 : (usageMB / quotaLimit) * 100}%"></div>
            </div>
            <span class="quota-val">${usageMB} / ${quotaLimit} MB</span>
        </div>
        ` : '';

        breadcrumb.innerHTML = `<div style="display: flex; width: 100%; align-items: center;">
            ${pathHtml} ${quotaHtml}
        </div>`;

        let html = '';
        if (!sub) {
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
                            <div class="stat-row"><span>TOTAL_SIZE:</span><span class="val">${this.model.formatBytes(totalSizeBytes)}</span></div>
                        </div>
                        <div class="card-footer">MOUNT_VOLUME</div>
                    </div>
                `;
            });
            html = (await Promise.all(cardPromises)).join('');
        } else {
            list.className = 'explorer-grid'; 
            
            const targetPath = MFS.getProtocolPath(cat, sub);
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
                const folio = i + 1;
                const fullRef = `${targetPath}${folio}`;
                const isRecent = (new Date() - new Date(f.modified)) < 86400000;
                const fakeHash = `MD5:${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
                
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
            this.renderRecycleView();
        }
        
        this.applyScrambleEffect();
        this.setupTableEvents();
    }

    renderRecycleView() {
        const list = this.container.querySelector('#file-mesh-list');
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
                        max="${Math.max(this.model.undoStack.length - 1, 0)}"
                        value="${Math.max(this.model.undoStack.length - 1, 0)}"
                        oninput="app.previewUndo(this.value)" />
                    <button class="restore-btn" onclick="app.restoreByTimeline()">
                        RESTORE_POINT
                    </button>
                </div>
            </div>
        `;

        const fileCards = files.length ? files.map((f, i) => {
            const maxDays = 30;
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
                    style="--ttl:${ttlPercent}" data-days="${remainingDays}">
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
        
        document.querySelectorAll('.ttl-ring-wrapper').forEach(wrapper => {
            let ttl = parseFloat(wrapper.style.getPropertyValue('--ttl')) || 100;
            const ring = wrapper.querySelector('.ttl-ring');

            const interval = setInterval(() => {
                ttl -= 0.5;
                if (ttl < 0) ttl = 0;

                ring.style.setProperty('--ttl', ttl);

                if(ttl <= 20) {
                    wrapper.setAttribute('data-fracture', 'true');
                }

                if(ttl <= 0) clearInterval(interval);
            }, 100);
        });
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
                    el.innerText = original;
                }
                iterations += 1/3;
            }, 30);
        });
    }

    setupSearch() {
        const searchInput = this.container.querySelector('#mesh-search');
        const list = this.container.querySelector('#file-mesh-list');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query === "") {
                this.navigateTo(this.activeCategory);
                return;
            }

            let resultsHtml = '';
            
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
        const list = this.container.querySelector('#file-mesh-list');
        list.className = 'explorer-grid';
        
        const categories = ['Comms', 'Records', 'Finance', 'Personnel', 'Projects', 'Logistics'];
        const totalFiles = MFS.manifest.files.length;

        list.innerHTML = categories.map((cat, i) => {
            const sectorFiles = MFS.manifest.files.filter(f => f.category === cat);
            const count = sectorFiles.length;
            const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0;
            
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

    renderLedger() {
        const list = this.container.querySelector('#file-mesh-list');
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

    updateTelemetry() {
        setInterval(() => {
            const el = this.container.querySelector('#sys-telemetry');
            if (el) el.innerHTML = `SYNC_ID: ${Math.random().toString(16).slice(2, 8).toUpperCase()}<br>ENTROPY: 0.99${Math.floor(Math.random()*9)}`;
        }, 3000);
    }

    setupTableEvents() {
        this.container.querySelectorAll('.protocol-card').forEach(card => {
            card.onclick = () => this.navigateTo(card.dataset.cat, card.dataset.sub);
        });
    }

    setupSidebar() {
        this.container.querySelectorAll('.nav-node').forEach(node => {
            node.onclick = () => {
                this.container.querySelectorAll('.nav-node').forEach(n => n.classList.remove('active'));
                node.classList.add('active');
                if (node.dataset.cat) {
                    this.navigateTo(node.dataset.cat);
                }
                if (node.id === 'view-stats') {
                    this.renderAnalytics();
                }
            };
        });
    }

    previewUndo(index) {
        const entry = this.model.undoStack[index];
        this.model.notify(`PREVIEW: ${entry.name}`);
    }

    restoreByTimeline() {
        if (!this.model.undoStack.length) return;
        const entry = this.model.undoStack.pop();
        MFS.manifest.recycleBin = MFS.manifest.recycleBin.filter(f => f !== entry);
        MFS.manifest.files.push(entry);
        this.model.notify(`RESTORED: ${entry.name}`);
        this.navigateTo(entry.category, entry.path.split('/')[1]);
    }
}

export { FilingSystemView };
