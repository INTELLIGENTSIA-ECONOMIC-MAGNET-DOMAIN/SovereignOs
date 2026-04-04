export class CommsView {
    constructor(container, api) {
        this.container = container;
        this.api = api;
        this.activeTab = 'inbound';
    }

    setActiveTab(tab) {
        this.activeTab = tab;
    }

    render(transmissions) {
        const filteredTransmissions = transmissions.filter(tx => {
            if (this.activeTab === 'inbound') return tx.status === 'RECEIVED' || tx.status === 'PENDING_DISPATCH';
            if (this.activeTab === 'outbound') return tx.status === 'SENT';
            if (this.activeTab === 'relays') return tx.status === 'RELAYING';
            return true;
        });

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
                            <span class="nav-count">${transmissions.filter(t => t.status === 'RECEIVED').length}</span>
                        </div>
                        <div class="comms-nav-item ${this.activeTab === 'outbound' ? 'active' : ''}" id="nav-outbound">
                            <span class="nav-icon">📤</span> <span class="nav-label">OUTBOUND_PULSE</span>
                            <span class="nav-count">${transmissions.filter(t => t.status === 'SENT').length}</span>
                        </div>
                        <div class="comms-nav-item ${this.activeTab === 'relays' ? 'active' : ''}" id="nav-relays">
                            <span class="nav-icon">📡</span> <span class="nav-label">ACTIVE_RELAYS</span>
                            <span class="nav-count">${transmissions.filter(t => t.status === 'RELAYING').length}</span>
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
                        <button class="aux-btn" onclick="window.commsApp.clearSentHistory()" title="Purge Sent Pulse History">
                            <span class="icon">🧹</span> <span>PURGE_SENT</span>
                        </button>
                        <button class="aux-btn" onclick="window.commsApp.downloadAudit()" title="Download Constitutional Record">
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
                            ${this.renderTransmissions(filteredTransmissions)}
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
        const navIn = this.container.querySelector('#nav-inbound');
        const navOut = this.container.querySelector('#nav-outbound');
        const navRel = this.container.querySelector('#nav-relays');

        if(navIn) navIn.onclick = () => window.commsApp.switchTab('inbound');
        if(navOut) navOut.onclick = () => window.commsApp.switchTab('outbound');
        if(navRel) navRel.onclick = () => window.commsApp.switchTab('relays');
    }

    renderTransmissions(transmissions) {
        if (transmissions.length === 0) return `<div class="empty-state">NO_ACTIVE_DATA_PACKETS</div>`;

        return transmissions.map((tx, i) => {
            const pLevel = tx.priority || 'NORMAL';
            const priorityClass = tx.priority ? tx.priority.toLowerCase() : 'normal';
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
                            `<button class="broadcast-trigger-tactical" onclick="window.commsApp.openRoutingConsole('${tx.id}')">
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

    renderRoutingModal(file, formationGroups) {
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

        modal.querySelector('#confirm-beam').onclick = () => window.commsApp.processRouting(file.id);
        modal.querySelector('#cancel-modal').onclick = () => modal.remove();
    }

    updateRelayVisualizer() {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = `<div class="multi-relay-viz"><div class="relay-status">BEAMING_PACKETS...</div></div>`;
        }
    }
}