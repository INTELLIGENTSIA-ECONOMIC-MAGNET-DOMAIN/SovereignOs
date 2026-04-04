/**
 * COMMS_HUB // SEC.TAC PROTOCOL
 * Sovereign Class Application - Integrated Routing
 */
export class CommsApp {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.id = 'comms';
        this.activeTab = 'inbound';
        
        this.transmissions = [
            { id: 'TX-101', subject: 'INITIAL_ALLOTMENT_MEMO', sender: 'SYSTEM', status: 'RECEIVED', priority: 'NORMAL', time: '09:00', size: '12.4 KB' },
            { id: 'TX-772', subject: 'INVESTOR_SHARE_DISTRIBUTION', sender: 'FINANCE_DIV', status: 'RECEIVED', priority: 'HIGH', time: '11:45', size: '45.0 KB' }
        ];
    }

    async init() {
        window.app = this; 
        this.render();
        if (this.api.notify) this.api.notify("COMMS_HUB: UPLINK_STABLE");
    }

    render() {
        this.container.innerHTML = `
            <div class="comms-wrapper sovereign-ui">
                <aside class="comms-sidebar">
                    <div class="comms-brand-group">
                        <div class="comms-brand">COMMS_HUB // SEC.TAC</div>
                        <div class="system-id">ID: ${Math.random().toString(16).slice(2, 8).toUpperCase()}</div>
                    </div>
                    
                    <nav class="comms-nav">
                        <div class="comms-nav-item ${this.activeTab === 'inbound' ? 'active' : ''}" id="nav-inbound">
                            <span class="nav-icon">📥</span> <span class="nav-label">INBOUND_MESH</span>
                            <span class="nav-count">${this.transmissions.filter(t => t.status === 'RECEIVED').length}</span>
                        </div>
                        <div class="comms-nav-item ${this.activeTab === 'outbound' ? 'active' : ''}" id="nav-outbound">
                            <span class="nav-icon">📤</span> <span class="nav-label">OUTBOUND_PULSE</span>
                            <span class="nav-count">${this.transmissions.filter(t => t.status === 'SENT').length}</span>
                        </div>
                        <div class="comms-nav-item ${this.activeTab === 'relays' ? 'active' : ''}" id="nav-relays">
                            <span class="nav-icon">📡</span> <span class="nav-label">ACTIVE_RELAYS</span>
                            <span class="nav-count">${this.transmissions.filter(t => t.status === 'RELAYING').length}</span>
                        </div>
                    </nav>

                    <div class="sidebar-footer">
                    <div class="active-officer-tag">
                        <div class="officer-label">OFFICER_IN_CHARGE</div>
                        <div class="officer-name">
                            ${this.api.getSignature ? this.api.getSignature() : 'ADMIN_CORE_01'}
                        </div>
                    </div>

                    <div class="sidebar-aux-actions">
                        <button class="aux-btn" onclick="app.clearSentHistory()" title="Purge Sent Pulse History">
                            <span class="icon">🧹</span> <span>PURGE_SENT</span>
                        </button>
                        <button class="aux-btn" onclick="app.downloadAudit()" title="Download Constitutional Record">
                            <span class="icon">📜</span> <span>DOWNLOAD_AUDIT</span>
                        </button>
                    </div>
                </div>
                </aside>

                <main class="comms-main">
                    <header class="comms-status-bar">
                        <div class="status-left">
                            <span class="status-indicator active"></span> 
                            <span class="terminal-text">UPLINK: STABLE // 48.2kbps</span>
                        </div>
                        <div class="status-right">SEC_LEVEL: <span class="clearance-text">${this.api.getRole()}</span></div>
                    </header>

                    <div class="transmission-container">
                        <div class="scanline"></div>
                        <div class="transmission-list" id="tx-list">
                            ${this.renderTransmissions()}
                        </div>
                    </div>

                    <footer class="comms-footer-telemetry">
                        <div class="tel-item"><span class="pulse-sync-label">PULSE_SYNC:</span> <span class="pulse-sync-bar">[||||||||||||||||||||]</span> <span class="tel-value">100%</span></div>
                        <div class="tel-item"><span class="pulse-sync-label">ENC:</span> <span class="tel-value">AES-XTS-256</span></div>
                        <div class="tel-item time-sync">${new Date().toLocaleTimeString()}</div>
                    </footer>
                </main>
            </div>
        `;
        this.attachListeners();
    }

    attachListeners() {
        // Only select elements that actually exist in your render()
        const navIn = this.container.querySelector('#nav-inbound');
        const navOut = this.container.querySelector('#nav-outbound');
        const navRel = this.container.querySelector('#nav-relays');

        if(navIn) navIn.onclick = () => this.switchTab('inbound');
        if(navOut) navOut.onclick = () => this.switchTab('outbound');
        if(navRel) navRel.onclick = () => this.switchTab('relays');
    }

    renderTransmissions() {
        const filtered = this.transmissions.filter(tx => {
            if (this.activeTab === 'inbound') return tx.status === 'RECEIVED' || tx.status === 'PENDING_DISPATCH';
            if (this.activeTab === 'outbound') return tx.status === 'SENT';
            if (this.activeTab === 'relays') return tx.status === 'RELAYING';
            return true;
        });

        if (filtered.length === 0) return `<div class="empty-state">NO_ACTIVE_DATA_PACKETS</div>`;

        return filtered.map((tx, i) => {
            const pLevel = tx.priority || 'NORMAL';
            const priorityClass = tx.priority ? tx.priority.toLowerCase() : 'normal';
            // SEAL
            const authStamp = tx.status === 'SENT' ? `
                <div class="auth-seal">
                    <div class="seal-inner">AUTHENTICATED</div>
                    <div class="seal-code">${tx.auth_code || 'VERIFIED'}</div>
                </div>
            ` : '';
            return `
                <div class="comms-card ${priorityClass}">
                    ${authStamp}<div class="card-header">
                        <span class="tx-id-tag">${tx.id}</span>
                        <span class="priority-tag">${pLevel.replace('_', ' ')} // ${tx.time}</span>
                    </div>
                    <div class="card-body">
                        <div class="tx-subject">${tx.subject}</div>
                        <div class="routing-details">
                            <div class="detail-item">
                                <span class="label">ROUTING_OFFICER:</span>
                                <span class="value officer-name">${tx.sender}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">RECIPIENTS:</span>
                                <div class="recipient-tags">
                                    ${tx.recipients ? tx.recipients.map(r => `<span class="r-tag">${r}</span>`).join('') : '<span class="r-tag">AWAITING_ROUTING</span>'}
                                </div>
                            </div>
                            <div class="relay-log-container" id="logs-${tx.id}" style="display:none;">
                            <div class="log-header">INTERNAL_RELAY_HISTORY</div>
                            ${this.renderLogs(tx)}
                        </div>
                        <button class="log-toggle" onclick="document.getElementById('logs-${tx.id}').style.display = 
                            document.getElementById('logs-${tx.id}').style.display === 'none' ? 'block' : 'none'">
                            VIEW_RELAY_LOGS
                        </button>
                        </div>
                    </div>
                    <div class="card-footer">
                        ${tx.status !== 'SENT' ? 
                            `<button class="broadcast-trigger-tactical" onclick="app.openRoutingConsole('${tx.id}')">
                                <span class="btn-scanner"></span>
                                <span class="btn-text">INITIALIZE_BROADCAST</span>
                            </button>` : 
                            `<div class="archived-status">TRANSMISSION_COMPLETE</div>`
                        }
                    </div>
                </div>
            `;
        }).join('');
        
        
    }
    // Helper to handle log toggling without re-rendering the whole app
    toggleLogs(id) {
        const el = document.getElementById(`logs-${id}`);
        if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.render();
    }

    //It removes the files that have already been beamed, keeping your OUTBOUND_PULSE clean.
    clearSentHistory() {
    const sentCount = this.transmissions.filter(t => t.status === 'SENT').length;
    
    if (sentCount === 0) {
        this.api.notify("CLEANUP_ABORTED: NO_SENT_RECORDS_FOUND", "normal");
        return;
    }

    if (confirm(`PERMANENTLY PURGE ${sentCount} SENT RECORDS FROM VPU?`)) {
        this.transmissions = this.transmissions.filter(t => t.status !== 'SENT');
        this.api.notify(`SYSTEM_PURGE: ${sentCount} RECORDS ARCHIVED TO PERMANENT STORAGE`);
        this.render();
    }
}

    openRoutingConsole(fileId) {
    const file = this.transmissions.find(t => t.id === fileId);
    
    // Complete mapping of all Formations from the Constitution
    const formationGroups = {
        "EXECUTIVE (COMCENT)": [
            "ULTIMATE_DEVOPS", "OFFICE_DEVOPS", "MEMBERSHIP_DEVOPS", 
            "TRANSPORT_DEVOPS", "SWIFT_RESPONSE_DEVOPS"
        ],
        "LEGISLATIVE (THA)": [
            "THA_DEVOPS", "THA_RESOLUTION_HOUSE", "THA_MEDIATION_HOUSE",
            "THA_FINANCE", "THA_RESEARCH", "THA_ETHICS", "THA_HEALTH", "THA_EDUCATION"
        ],
        "AUTHORITY (TAO)": [
            "SDA_IEMD", "SDA_PHILOMSCI", "SDA_ATINFINITY", "SDA_NITMOI",
            "ESVA_MEGA", "ESVA_SHRA", "ESVA_EIHA"
        ],
        "BUREAU (TBO)": [
            "LCB_LEGAL", "ACB_ACCOUNTS", "WCB_WELFARE", 
            "ICB_INFO", "CCB_CONTROL", "TTB_THINKTANK", "OCB_OPERATIONS"
        ],
        "FINANCE (TNFI)": [
            "ANTI_FRAUD_DEVOPS", "LOAN_DEVOPS", "INVESTMENT_DEVOPS", 
            "MARKET_DEVOPS", "FUNDING_DEVOPS"
        ],
        "COMMUNITY & BRANCHES": [
            "TB_BRANCHES", "COV_DEVOPS", "CABOS_DEVOPS", "NGLS_DEVOPS", "STUDIO_DEVOPS"
        ]
    };

    const modal = document.createElement('div');
    modal.className = 'sov-modal-overlay';
    modal.innerHTML = `
        <div class="sov-modal comms-modal">
            <div class="modal-header">📡 DATA_ROUTING_PROTOCOL: ${file.id}</div>
            <div class="modal-body">
                <div class="file-summary">
                    <div class="label">FILE_FOLIO:</div>
                    <div class="value">${file.subject}</div>
                </div>

                <div class="selection-header">
                    <label class="section-label">SELECT_TARGET_FORMATIONS</label>
                    <button class="select-all-btn" id="select-all-formations">SELECT_ALL_UNITS</button>
                </div>

                <div class="formation-selection-zone">
                    ${Object.entries(formationGroups).map(([group, list]) => `
                        <div class="formation-group">
                            <div class="group-title">${group}</div>
                            <div class="chip-container">
                                ${list.map(f => `<div class="formation-chip" data-id="${f}">${f}</div>`).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="routing-config">
                    <label>PRIORITY_LEVEL</label>
                    <select id="route-priority">
                        <option value="NORMAL">ROUTINE</option>
                        <option value="HIGH">PRIORITY_ALPHA</option>
                        <option value="CRITICAL">EMERGENCY_OMEGA</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button class="beam-btn" id="confirm-beam">EXECUTE_MULTI_PULSE_BEAM</button>
                <button class="wipe-btn" id="cancel-modal">ABORT_ROUTING</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Click Handlers
    modal.querySelectorAll('.formation-chip').forEach(chip => {
        chip.onclick = () => chip.classList.toggle('selected');
    });

    modal.querySelector('#select-all-formations').onclick = () => {
        modal.querySelectorAll('.formation-chip').forEach(c => c.classList.add('selected'));
    };

    modal.querySelector('#confirm-beam').onclick = () => this.processRouting(fileId);
    modal.querySelector('#cancel-modal').onclick = () => modal.remove();
}

    async processRouting(fileId) {
    const selected = Array.from(document.querySelectorAll('.formation-chip.selected')).map(c => c.dataset.id);
    const officer = this.api.getSignature ? this.api.getSignature() : "CHIEF_OFFICER_01";
    const selectedPriority = document.getElementById('route-priority').value; // Get the user's choice
    
    if (selected.length === 0) return;

    const fileIndex = this.transmissions.findIndex(t => t.id === fileId);
    const modalBody = document.querySelector('.modal-body');

    // Start Visualizer
    modalBody.innerHTML = `<div class="multi-relay-viz"><div class="relay-status">BEAMING_PACKETS...</div></div>`;
    
    // Initialize Event Log if it doesn't exist
    if (!this.transmissions[fileIndex].logs) this.transmissions[fileIndex].logs = [];

    // Log the initiation
    this.transmissions[fileIndex].logs.push({
        action: "ROUTING_INITIATED",
        officer: officer,
        timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
        details: `Targets: ${selected.join(', ')}`
    });

    this.transmissions[fileIndex].status = 'RELAYING';
    this.render();

    await new Promise(r => setTimeout(r, 2000));

    // Finalize
    this.transmissions[fileIndex].status = 'SENT';
    this.transmissions[fileIndex].recipients = selected;
    this.transmissions[fileIndex].priority = selectedPriority; // This fixes the Outbound display
    
    this.transmissions[fileIndex].logs.push({
        action: "BEAM_STABILIZED",
        officer: "SYSTEM_VPU",
        timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
        details: "Handshake confirmed by all target nodes."
    });

    document.querySelector('.sov-modal-overlay').remove();
    this.render();
}

renderLogs(tx) {
    if (!tx.logs || tx.logs.length === 0) return `<div class="no-logs">NO_HISTORY_FOUND</div>`;
    
    return tx.logs.map(log => `
        <div class="log-entry">
            <span class="log-time">[${log.timestamp}]</span>
            <span class="log-action">${log.action}</span>
            <div class="log-details">${log.details} by ${log.officer}</div>
        </div>
    `).join('');
}
}