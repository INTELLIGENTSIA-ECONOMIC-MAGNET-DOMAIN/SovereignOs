/**
 * identityRegistry.js
 * SOVEREIGN_MEMBER_DIRECTORY // OS_V1.2.9
 * MANAGED_BY: MEMBERSHIP_DEVOPS // SECURE_UPLINK_ENABLED
 */

    const RANKS = {
        "CG.SNR.": "Chief In General Senior",
        "CAO": "Chief Authenticating Officer",
        "AO": "Authenticating Officer",
        "SAAO": "Senior Assistant Authenticating Officer",
        "JAAO": "Junior Assistant Authenticating Officer",
        "SM": "Senior Mentor",
        "JM": "Junior Mentor",
        "M": "Mentee",
        "S": "Seed"
    }; 


    const RANK_SCHEMA = [
    { abbr: "CG.SNR.", name: "Chief In General Senior", clearance: 10 },
    { abbr: "CAO", name: "Chief Authenticating Officer", clearance: 8 },
    { abbr: "AO", name: "Authenticating Officer", clearance: 7 },
    { abbr: "SAAO", name: "Senior Assistant Authenticating Officer", clearance: 6 },
    { abbr: "JAAO", name: "Junior Assistant Authenticating Officer", clearance: 5 },
    { abbr: "SM", name: "Senior Mentor", clearance: 4 },
    { abbr: "JM", name: "Junior Mentor", clearance: 3 },
    { abbr: "M", name: "Mentee", clearance: 2 },
    { abbr: "S", name: "Seed", clearance: 1 }
];

export class IdentityManager {
    constructor(container, apiBridge) {
        this.container = container;
        this.bridge = apiBridge;
        this.members = []; // Start empty
        this.isLoading = true;
        this.selectedMember = null;
        this.isRegistering = false;
        this.vaultUnlocked = false;
        this.pendingApprovals = [];
        this.viewMode = 'DIRECTORY'; // Modes: DIRECTORY, DOSSIER, GATEWAY, VAULT
        this.tokenVault = [
        { code: "DEVOPS-K8J2-X91L", status: "UNUSED", issuedAt: "2026-01-27", recipient: null },
        { code: "DEVOPS-M4N1-P0ZQ", status: "UNUSED", issuedAt: "2026-01-27", recipient: "Sector 7 Lead" }
    ];
        // System Activity Ledger
        this.systemLogs = [
            { time: "16:20:05", msg: "CORE_SYSTEM_INITIALIZED", type: "system" },
            { time: "16:20:10", msg: "MEMBERSHIP_DEVOPS_UPLINK_ESTABLISHED", type: "security" }
        ];

        this.isEditing = false; // Controls visibility of admin tools
        this.searchQuery = ""; // Tracks the filter string
        this.filters = {
            rank: "ALL",
            recognition: "ALL",
            gender: "ALL",
            status: "ALL" // Required for the Pending filter
            };
        this.isExporting = false; // Tracks the visual export state
        this.loginHistory = {}; // Stores logs keyed by member UID
        this.ipBlacklist = ["192.168.1.666", "10.0.0.13"]; // Add known hostile IPs here
        this.honeyPotLogs = []; // Initialize the Honey-pot tracker
        this.tacticalDirectory = []; // Array of AC objects, each containing a .tlcs array
        this.expandedAC = null;      // Tracks which AC card is currently open
        this.tacticalSearchQuery = "";


    }

    async init() {
        await this.syncWithCore();
        this.render();
    }

    async syncWithCore() {
    try {
        const url = this.searchQuery
            ? `http://localhost:3000/api/vpu/registry/members?q=${encodeURIComponent(this.searchQuery)}`
            : `http://localhost:3000/api/vpu/registry/members`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("GENESIS_DATA_RECEIVED:", data); // Debug here
        
        // Add validation to ensure data is an array
        this.members = Array.isArray(data) ? data : []; 
        this.isLoading = false;
        this.render();
    } catch (error) {
        console.error("SYNC_ERROR:", error);
        this.addLog("CRITICAL: UPLINK_FAILURE", "security");
    }
}

    isIpBlacklisted(ip) {
    return this.ipBlacklist.includes(ip);
    }

    blacklistIp(ip) {
        if (!this.ipBlacklist.includes(ip)) {
            this.ipBlacklist.push(ip);
            this.addLog(`IP_BURNED: ${ip} added to blacklist.`, 'security');
            this.render();
        }
    }

    formatSovereignName(member) {
        const name = member.sovereignName;
        const honors = member.specialRecognition && member.specialRecognition.length > 0 
            ? ` ${member.specialRecognition.map(r => `(${r})`).join('')}` 
            : '';
        return `${name}${honors}`;
    }

    bestowRecognition(memberUid, recognitionCode) {
        const member = this.members.find(m => m.security.uid === memberUid);
        if (member) {
            if (!member.specialRecognition.includes(recognitionCode)) {
                member.specialRecognition.push(recognitionCode);
                this.render();
                console.log(`[DEVOPS_NOTICE]: ${recognitionCode} bestowed upon ${member.sovereignName}`);
            }
        }
    }

    updateMember(uid, updates) {
    const idx = this.members.findIndex(m => m.security.uid === uid);
    if (idx !== -1) {
        // 1. UPDATE MASTER LIST
        this.members[idx] = { ...this.members[idx], ...updates, __dirty: true};
        
        // 2. BIOME SYNCHRONIZATION (The Connection)
        // Propagate changes to the map immediately (AC/TLC moves or Frozen status)
        if (window.os && window.os.activeProcesses['biome']) {
            window.os.activeProcesses['biome'].syncRegistryData(this.members);
            this.addLog(`UPLINK_SYNC: Data for ${uid} propagated to Biome.`, 'system');
        }

        // 3. FORCE DISCONNECT / SECURITY LOGIC
        if (this.selectedMember && this.selectedMember.security.uid === uid) {
            if (updates.isFrozen === true) {
                this.addLog(`SECURITY: Force-disconnecting UID ${uid}. Signal severed.`, 'security');
                
                // Reset local state to trigger "Logout" from the dossier view
                this.selectedMember = null; 
                this.isEditing = false;
                this.vaultUnlocked = false; 
                
                alert(`SIGNAL_SEVERED: Identity ${uid} has been frozen and logged out.`);
            } else {
                // Update the current view's reference if they weren't frozen
                this.selectedMember = this.members[idx];
            }
        }

        // 4. FINAL LOGGING & UI REFRESH
        const statusMsg = updates.isFrozen ? 'SIGNAL_FROZEN' : 'SIGNAL_RESTORED';
        this.addLog(`${statusMsg}: ${uid}`, 'admin');
        
        this.render(); 
        return true;
    }
    return false;
}

    addLog(msg, type = 'info') {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    this.systemLogs.unshift({ time, msg, type });
    
        // Keep only the last 15 logs for performance
        if (this.systemLogs.length > 15) this.systemLogs.pop();
    }

    renderSystemLog() {
    return `
        <div class="reg-label" style="margin-top:40px; color:#444; border-color:#222;">Live_System_Activity_Ledger</div>
        <div style="background:#050505; border:1px solid #111; padding:15px; font-family:monospace; font-size:10px; height:120px; overflow-y:hidden; display:flex; flex-direction:column; gap:5px;">
            ${this.systemLogs.map(log => `
                <div style="display:flex; gap:15px;">
                    <span style="color:#333;">[${log.time}]</span>
                    <span style="color:${log.type === 'security' ? 'var(--id-green)' : log.type === 'admin' ? 'var(--id-gold)' : '#666'};">
                        ${log.msg}
                    </span>
                </div>
            `).join('')}
        </div>
    `;
}

    renderDossier() {
    const m = this.selectedMember;
    const isFrozen = m.isFrozen || false;
    const isStaged = m.location.country === "PENDING_UPLINK";
    const history = this.loginHistory[m.security.uid] || [];

    // Helper for Advanced Editable Rows
    const editableRow = (label, value, id, type = "text", isSelect = false, options = []) => {
        if (this.isEditing) {
            if (isSelect) {
                return `
                <div class="reg-row">
                    <span>${label}</span>
                    <select id="edit-${id}" class="sovereign-input" style="width:60%; height:22px; font-size:10px;">
                        ${options.map(opt => `<option value="${opt.a}" ${m.security.abbr === opt.a ? 'selected' : ''}>${opt.a} // ${opt.n}</option>`).join('')}
                    </select>
                </div>`;
            }
            return `
            <div class="reg-row">
                <span>${label}</span>
                <input id="edit-${id}" type="${type}" value="${value || ''}" class="sovereign-input" style="width:60%; height:20px; font-size:10px; padding:2px 5px;">
            </div>`;
        }
        return `<div class="reg-row"><span>${label}</span><span style="color:#fff">${value || 'N/A'}</span></div>`;
    };

    const recognitions = m.specialRecognition || [];
    const recognitionSuffix = recognitions.length > 0 ? ' ' + recognitions.map(r => `(${r})`).join('') : '';
    const fullSovereignName = `${m.sovereignName}${recognitionSuffix}`;
    // Prepare Tactical Options (Parent/Child r/tn)
    const acOptions = this.tacticalDirectory.map(ac => ({ val: ac.id, label: ac.name }));
    const currentAC = this.tacticalDirectory.find(ac => ac.id === m.actionCenter);
    const tlcOptions = currentAC ? currentAC.tlcs.map(t => ({ val: t.id, label: t.name })) : [];

    const rankOptions = [
        { a: "CG.SNR.", n: "Chief In General Senior" },
        { a: "CAO", n: "Chief Authenticating Officer" },
        { a: "AO", n: "Authenticating Officer" },
        { a: "SAAO", n: "Senior Assistant Authenticating Officer" },
        { a: "JAAO", n: "Junior Assistant Authenticating Officer" },
        { a: "SM", n: "Senior Mentor" },
        { a: "JM", n: "Junior Mentor" },
        { a: "M", n: "Mentee" },
        { a: "S", n: "Seed" }
    ];

    return `
    <div class="registry-view">
        <div class="registry-wrapper" style="animation: slideUp 0.4s ease-out;">
            <div class="registry-header">
                <div style="flex: 1;">
                    <div class="rank-tag" style="background: var(--id-gold); color: #000; margin-bottom: 10px;">
                        ${m.security.abbr} // ${m.security.rank}
                    </div>
                    <h2 style="font-size: 2.2rem; margin: 0; letter-spacing: 1px; color: var(--id-gold);">
                        ${fullSovereignName}
                    </h2>
                    <div style="color: var(--id-green); font-size: 11px; letter-spacing: 1px;">SYSTEM_UID: ${m.security.uid}</div>
                    ${isStaged ? `<div style="color:var(--id-red); font-size:9px; margin-top:5px;">[ STATUS: PENDING_UPLINK_STAGING ]</div>` : ''}
                </div>
                <div style="text-align: right;">
                    <button id="toggle-edit-mode" style="background:${this.isEditing ? 'var(--id-green)' : 'transparent'}; border:1px solid ${this.isEditing ? 'var(--id-green)' : 'var(--id-gold)'}; color:${this.isEditing ? '#000' : 'var(--id-gold)'}; padding:8px 15px; font-size:9px; cursor:pointer; letter-spacing:1px; margin-bottom:15px; font-family:inherit; font-weight:bold;">
                        ${this.isEditing ? '[ COMMIT_SYSTEM_CHANGES ]' : '[ UPDATE_MEMBER ]'}
                    </button>
                    <div class="clearance-stamp">LEVEL 0${m.security.clearance}</div>
                    <div style="color: #444; font-size: 10px; margin-top:10px;">AUTHORIZED_SINCE: ${m.security.since}</div>
                </div>
            </div>

            <div class="registry-grid">
                <div class="biometric-col">
                    <div class="reg-label">Biometric_Profile</div>
                    <div style="width:100%; height:280px; border:1px solid var(--id-gold); background:url(${m.media.profile}) center/cover; position:relative;">
                        <div style="position:absolute; inset:0; background:linear-gradient(transparent, #000); opacity:0.7;"></div>
                    </div>
                    
                    <div class="reg-label">Sovereign_Attributes</div>
                    ${editableRow("POSITION", m.position, "position")}
                    ${editableRow("TITLES", m.titles ? m.titles.join(', ') : '', "titles")}
                    ${editableRow("RANK_CLASS", m.security.abbr, "rank", "text", true, rankOptions)}
                    ${editableRow("RECOGNITION", m.specialRecognition ? m.specialRecognition.join(', ') : '', "specialRec")}

                    <div class="reg-label">Verification_Vault</div>
                    <div class="device-entry ${this.vaultUnlocked ? 'active' : ''}" id="toggle-vault" style="cursor:pointer;">
                        <div style="display:flex; align-items:center;">
                            <div class="d-status-dot"></div>
                            <span style="font-size:10px; letter-spacing:1px;">${this.vaultUnlocked ? 'CONCEAL_SCAN_DATA' : 'REQUEST_ID_ACCESS'}</span>
                        </div>
                    </div>
                    ${this.vaultUnlocked ? `
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px; animation: fadeIn 0.3s ease;">
                            <img src="${m.media.idFront}" style="width:100%; border:1px solid var(--id-gold); opacity:0.8;">
                            <img src="${m.media.idBack}" style="width:100%; border:1px solid var(--id-gold); opacity:0.8;">
                        </div>
                    ` : ''}
                </div>

                <div class="data-col">
                    <div class="reg-label">Tactical_Deployment</div>
                    ${editableRow("ACTION_CENTER", m.actionCenter, "ac_id", "text", true, acOptions)}
                    ${editableRow("TLC_NODE", m.tlca, "tlc_id", "text", true, tlcOptions)}
                    ${editableRow("RANK_DATE", m.rankDate, "rankDate", "date")}
                    ${editableRow("REMARKS", m.remarks, "remarks")}
                    
                    <div class="reg-label">Citizen_Core_Identity</div>
                    <div class="reg-row"><span>FULL_LEGAL_NAME</span><span style="color:#fff">${m.officialName}</span></div>
                    <div class="reg-row"><span>GOVERNMENT_ID_REF</span><span style="color:#fff">${m.documentId}</span></div>
                    <div class="reg-row"><span>DEMOGRAPHICS</span><span style="color:#fff">${m.demographics.dob} / ${m.demographics.gender}</span></div>
                    <div class="reg-row"><span>CONTACT_PH</span><span style="color:#fff">${m.contact.phone || 'N/A'}</span></div>
                    <div class="reg-row"><span>PRIMARY_UPLINK</span><span style="color:#fff">${m.contact.email}</span></div>

                    <div class="reg-label">Service_History</div>
                    <div class="reg-row"><span>ORIGIN_DATE</span><span style="color:#fff">${m.joinedThealcohesion || 'N/A'}</span></div>
                    ${editableRow("JOINED_AC", m.joinedAC, "joinedAC", "date")}
                    ${editableRow("JOINED_TLC", m.joinedTLC, "joinedTLC", "date")}

                    <div class="reg-label">Sovereign_Lineage</div>
                    <div class="reg-row">
                        <span>AUTHORIZATION_KEY</span>
                        <span style="color:var(--id-gold); font-weight:bold;">${m.security.authorizationKey || 'LEGACY_ALLOTMENT'}</span>
                    </div>

                    <div class="reg-label">Hardware_Binding</div>
                    <div class="device-entry active">
                        <div>
                            <div style="color:#fff; font-size:11px;">${m.security.deviceFingerprint || 'CORE_WORKSTATION'}</div>
                            <div style="color:var(--id-gold); font-size:9px;">IP: ${m.security.ipBinding || '0.0.0.0'}</div>
                        </div>
                        <div class="d-status-dot"></div>
                    </div>

                    <div class="reg-label">Active_System_Awards</div>
                    <div style="margin-top:10px; display:flex; gap:5px; flex-wrap:wrap;">
                        ${m.awards && m.awards.length > 0 
                            ? m.awards.map(a => `<span class="award-pill">${a}</span>`).join('') 
                            : '<span style="color:#444; font-size:9px;">NO_AWARDS_RECORDED</span>'}
                    </div>

                    <div style="padding: 10px; margin-top: 25px; background: ${isFrozen ? 'rgba(255, 69, 69, 0.1)' : 'rgba(0, 255, 65, 0.05)'}; border: 1px solid ${isFrozen ? 'var(--id-red)' : 'var(--id-green)'}; color: ${isFrozen ? 'var(--id-red)' : 'var(--id-green)'}; font-size: 10px; text-align: center; font-family: monospace;">
                        ${isFrozen ? 'SIGNAL_STATUS: ACCESS_RESTRICTED // LOGIN_DISABLED' : 'SIGNAL_STATUS: UPLINK_ACTIVE // LOGIN_ENABLED'}
                    </div>

                    <div class="reg-label">Access_&_Uplink_History</div>
                    <div style="background:rgba(0,0,0,0.3); border:1px solid #222; padding:10px; max-height:120px; overflow-y:auto;">
                        ${history.length > 0 ? history.map(log => `
                            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #111; padding:3px 0; font-size:9px;">
                                <span style="color:var(--id-green);">[${log.event}]</span>
                                <span style="color:#444;">${log.timestamp}</span>
                            </div>
                        `).join('') : '<div style="color:#444; font-size:9px; text-align:center;">NO_LOGS_FOUND</div>'}
                    </div>

                    <div style="margin-top: 20px; display:flex; gap:10px;">
                        <button id="toggle-freeze" style="flex:1; padding:10px; background:transparent; border:1px solid ${isFrozen ? 'var(--id-green)' : 'var(--id-red)'}; color:${isFrozen ? 'var(--id-green)' : 'var(--id-red)'}; cursor:pointer; font-size:10px; letter-spacing:1px;">
                            ${isFrozen ? '[ UNFREEZE_SIGNAL ]' : '[ FREEZE_SIGNAL ]'}
                        </button>
                        <button id="close-dossier" style="flex:1; background:transparent; border:1px solid #222; color:#555; padding:10px; cursor:pointer; font-size:10px;">[ RETURN_TO_INDEX ]</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}
    renderGateway() {
        // Filter only UNUSED keys for the dropdown
        const availableKeys = this.tokenVault.filter(t => t.status === 'UNUSED');
        return `
            <div class="registry-view">
                <div class="registry-wrapper" style="animation: slideUp 0.4s ease-out;">
                    <div class="registry-header">
                        <div>
                            <h1 style="color:var(--id-gold); margin:0; letter-spacing:4px;">CITIZEN_ONBOARDING</h1>
                            <div style="font-size:10px; color:var(--id-green);">SECURE_UPLINK_ENCRYPTED</div>
                        </div>
                        <button id="cancel-reg" style="background:transparent; border:1px solid var(--id-red); color:var(--id-red); font-size:10px; padding:5px 10px; cursor:pointer;">[ ABORT ]</button>
                    </div>

                    <form id="registration-form" class="gateway-form">
                        <div class="input-group" style="grid-column: span 2;">
                            <label>Authorized Access Token (Select from Vault)</label>
                        <select name="referralCode" class="sovereign-input" required style="background:rgba(212,175,55,0.05); border-color:var(--id-gold); color:var(--id-gold);">
                            <option value="">-- SELECT_ACTIVE_TOKEN --</option>
                            ${availableKeys.length > 0 
                                ? availableKeys.map(t => `<option value="${t.code}">${t.code} (${t.recipient || 'Public'})</option>`).join('')
                                : `<option disabled>NO_UNUSED_KEYS_IN_VAULT</option>`
                            }
                                </select>
                                <div style="font-size:8px; color:#444; margin-top:5px;">*If no keys appear, generate them in the Token Vault first.</div>
                            </div>

                        <div class="input-group">
                            <label>Assigned Rank</label>
                            <select name="rankAbbr" class="sovereign-input">
                                <option value="S">Seed (S)</option>
                                <option value="M">Mentee (M)</option>
                                <option value="JM">Junior Mentor (JM)</option>
                                <option value="SM">Senior Mentor (SM)</option>
                                <option value="JAAO">Junior Assistant Authenticating Officer (JAAO)</option>
                                <option value="SAAO">Senior Assistant Authenticating Officer (SAAO)</option>
                                <option value="AO">Authenticating Officer (AO)</option>
                                <option value="CAO">Chief Authenticating Officer (CAO)</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Sovereign Name (Non-English Preferred)</label>
                            <input type="text" name="sovereignName" class="sovereign-input" placeholder="e.g. MTU_WA_MIFUMO" required>
                        </div>
                        <div class="input-group">
                            <label>Official Legal Name</label>
                            <input type="text" name="officialName" class="sovereign-input" placeholder="John Doe" required>
                        </div>
                        <div class="input-group">
                            <label>Legal Gender</label>
                            <select name="gender" class="sovereign-input">
                                <option value="MALE">MALE</option>
                                <option value="FEMALE">FEMALE</option>
                                <option value="OTHER">OTHER</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>Username (System Alias)</label>
                            <input type="text" name="userName" class="sovereign-input" placeholder="ARCHON_01" required>
                        </div>
                        <div class="input-group">
                            <label>Contact Email</label>
                            <input type="email" name="email" class="sovereign-input" placeholder="uplink@sovereign.os" required>
                        </div>
                        <div class="input-group">
                            <label>Date of Birth</label>
                            <input type="date" name="dob" class="sovereign-input" required>
                        </div>
                        <div class="input-group">
                            <label>Government ID Reference</label>
                            <input type="text" name="documentId" class="sovereign-input" placeholder="ID-XXXXXX" required>
                        </div>
                        
                        <div class="input-group" style="grid-column: span 2;">
                            <label>Identity Verification (Front & Back Scans)</label>
                            <div style="display:flex; gap:10px; margin-top:10px;">
                                <div class="file-uplink" style="flex:1;">
                                    <span style="font-size:10px; color:#555;">UPLOAD_ID_FRONT</span>
                                </div>
                                <div class="file-uplink" style="flex:1;">
                                    <span style="font-size:10px; color:#555;">UPLOAD_ID_BACK</span>
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="btn-primary">Initialize Sovereign Protocol</button>
                    </form>
                </div>
            </div>
        `;
    }

   render() {
    // Determine which view to generate
    const mainContent = this.getCurrentView();
    const overlay = this.isExporting ? this.renderProcessingOverlay() : '';
    let content = "";
    if (this.viewMode === 'DOSSIER') {
        content = this.renderDossier();
    } else if (this.viewMode === 'GATEWAY') {
        content = this.renderGateway();
    } else if (this.viewMode === 'TACTICAL') { // INJECT THIS BLOCK
        content = this.renderTacticalCommand(); 
    } else {
        content = this.renderDirectory(); // This is why it was defaulting to Index
    }
    this.container.innerHTML = `
        <div class="os-layout" style="display: flex; height: 100vh; overflow: hidden; background: #000;">
            ${overlay}
            
            <aside class="admin-sidebar" style="width: 320px; border-right: 1px solid #222; display: flex; flex-direction: column; background: #050505; z-index: 100;">
                <div style="padding: 20px; border-bottom: 1px solid #222;">
                    <div style="font-size: 10px; color: var(--id-gold); letter-spacing: 2px;">DEVOPS_STATION_ALPHA</div>
                    <div style="color: #fff; font-weight: bold; margin-top: 5px; font-size:12px;">ROOT_ADMIN // SECURE</div>
                </div>

                <div style="padding: 20px; flex: 0 0 auto; display: flex; flex-direction: column; gap: 10px;">
                    <button id="sb-index" class="sidebar-btn ${(!this.isRegistering && this.viewMode === 'DIRECTORY') ? 'active' : ''}">[ DIRECTORY_INDEX ]</button>
                    <button id="sb-reg" class="sidebar-btn ${this.isRegistering ? 'active' : ''}">[ + ] REGISTER_NEW</button>
                    <button id="nav-tactical" class="sidebar-btn ${this.viewMode === 'TACTICAL' ? 'active' : ''}">[ TACTICAL ]</button>
                    <button id="sb-vault" class="sidebar-btn ${this.viewMode === 'VAULT' ? 'active' : ''}">[ TOKEN_VAULT ]</button>
                    <button id="sb-honeypot" class="sidebar-btn ${this.viewMode === 'HONEYPOT' ? 'active' : ''}" style="border-color:var(--id-red); color:var(--id-red);">[ HONEY_POT_LOGS ]</button>
                    <button id="sb-lockdown" class="sidebar-btn" style="border-color:var(--id-red); background:rgba(255,0,0,0.1); color:var(--id-red); font-weight:bold;">[!] MASS_LOCKDOWN</button>
                    <button id="sb-export" class="sidebar-btn green">[ EXPORT_MANIFEST ]</button>
                    
                    <button id="clear-filters" style="background:transparent; border:1px solid #333; color:#444; font-size:9px; padding:8px; cursor:pointer; margin-top:10px;">
                        RESET_ALL_FILTERS
                    </button>
                </div>

                <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; border-top: 1px solid #111;">
                    <div class="reg-label" style="margin: 15px 20px 5px; border: none; font-size: 9px; color: #444;">LIVE_SYSTEM_LOGS</div>
                    <div id="terminal-stream">
                        ${this.systemLogs.map(log => `
                            <div style="margin-bottom: 8px; display: flex; gap: 10px;">
                                <span style="color: #333;">${log.time}</span>
                                <span style="color: ${log.type === 'security' ? 'var(--id-green)' : 'var(--id-gold)'};">${log.msg}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </aside>

            <main id="main-viewport" style="flex: 1; overflow-y: auto; position: relative; background:#000;">
                ${mainContent}
            </main>
        </div>
    `;

    this.attachEvents();
}

getCurrentView() {
    if (this.isRegistering) return this.renderGateway();
    if (this.viewMode === 'TACTICAL') return this.renderTacticalCommand();
    if (this.viewMode === 'VAULT') return this.renderTokenVault();
    if (this.viewMode === 'HONEYPOT') return this.renderHoneyPot();
    if (this.selectedMember) return this.renderDossier();
    return this.renderDirectory();
}

resetFilters() {
    this.searchQuery = "";
    this.filters = { rank: "ALL", recognition: "ALL", gender: "ALL", status: "ALL" };
    this.addLog("SYSTEM_FILTERS_RESET", "system");
    this.render();
}

renderDirectory() {
    const filteredMembers = this.members.filter(m => {
        const query = this.searchQuery.toLowerCase();
        const matchSearch = m.sovereignName.toLowerCase().includes(query) || m.security.uid.toLowerCase().includes(query);
        const matchRank = this.filters.rank === "ALL" || m.security.abbr === this.filters.rank;
        const matchGender = this.filters.gender === "ALL" || m.demographics.gender === this.filters.gender;
        
        // FIXED: Recognition Filter (Checking if the array contains the selected code)
        const matchRec = this.filters.recognition === "ALL" || 
                        (m.specialRecognition && m.specialRecognition.includes(this.filters.recognition));
        
        const matchStatus = this.filters.status === "ALL" || 
                           (this.filters.status === "FROZEN" && m.isFrozen === true) || // New check
                           (this.filters.status === "PENDING" && m.location.country === "PENDING_UPLINK") ||
                           (this.filters.status === "ACTIVE" && m.location.country !== "PENDING_UPLINK");

        return matchSearch && matchRank && matchGender && matchRec && matchStatus;
    });

    return `
        <div class="registry-view" style="padding: 40px;">
            <div class="registry-header" style="border-left: 4px solid var(--id-gold); padding-left: 20px; margin-bottom: 40px;">
                <h1 style="color:var(--id-gold); margin:0; letter-spacing:8px; font-size: 1.2rem;">REGISTRY_INDEX</h1>
                <div style="font-size: 9px; color: #444; letter-spacing: 2px; margin-top: 5px;">
                    ACTIVE_UPLINKS: ${filteredMembers.length} // TOTAL_DATABASE: ${this.members.length}
                </div>
            </div>
            <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap:10px; margin-bottom:30px;">
                <input type="text" id="directory-search" placeholder="SEARCH..." value="${this.searchQuery}" class="sovereign-input">
                
                <select class="filter-select" data-filter="status">
                    <option value="ALL">STATUS: ALL</option>
                    <option value="ACTIVE" ${this.filters.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE_ONLY</option>
                    <option value="PENDING" ${this.filters.status === 'PENDING' ? 'selected' : ''}>QUARANTINED</option>
                    <option value="FROZEN" ${this.filters.status === 'FROZEN' ? 'selected' : ''}>FROZEN_LOCK</option>
                </select>

                <select class="filter-select" data-filter="rank">
                    <option value="ALL">RANK: ALL</option>
                    ${RANK_SCHEMA.map(r => `<option value="${r.abbr}" ${this.filters.rank === r.abbr ? 'selected' : ''}>${r.abbr}</option>`).join('')}
                </select>

                <select class="filter-select" data-filter="recognition">
                    <option value="ALL">RECOG: ALL</option>
                    <option value="BLD" ${this.filters.recognition === 'BLD' ? 'selected' : ''}>BLD</option>
                    <option value="TRT" ${this.filters.recognition === 'TRT' ? 'selected' : ''}>TRT</option>
                    <option value="PTP" ${this.filters.recognition === 'PTP' ? 'selected' : ''}>PTP</option>
                </select>

                <select class="filter-select" data-filter="gender">
                    <option value="ALL">GENDER: ALL</option>
                    <option value="MALE" ${this.filters.gender === 'MALE' ? 'selected' : ''}>MALE</option>
                    <option value="FEMALE" ${this.filters.gender === 'FEMALE' ? 'selected' : ''}>FEMALE</option>
                </select>
            </div>

            <div style="margin-top:20px;">
                ${filteredMembers.map(m => {
                const isFrozen = m.isFrozen || false;
                return `
                    <div class="device-entry member-row" data-idx="${this.members.indexOf(m)}" 
                        style="cursor:pointer; display: flex; justify-content: space-between; align-items: center; 
                        opacity: ${isFrozen ? '0.3' : '1'}; 
                        filter: ${isFrozen ? 'grayscale(1)' : 'none'};
                        background: rgba(255,255,255,0.01); border-left: 2px solid ${isFrozen ? '#444' : 'rgba(212, 175, 55, 0.2)'}; 
                        padding: 15px 25px;">
                        
                        <div style="display:flex; align-items:center; gap: 20px;">
                            <div class="d-status-dot" style="background:${isFrozen ? '#555' : (m.location.country === 'PENDING_UPLINK' ? 'var(--id-red)' : 'var(--id-green)')};"></div>
                            <div>
                                <div style="color:#fff; font-size:13px; font-weight:bold;">${m.sovereignName} ${isFrozen ? '[LOCKED]' : ''}</div>
                                <div style="color:#444; font-size:9px;">${m.security.uid} // ${isFrozen ? 'SIGNAL_ENCRYPTED' : m.location.country}</div>
                            </div>
                        </div>
                        <div class="rank-tag">${m.security.rank}</div>
                    </div>
                `;
            }).join('')}
            </div>
            ${this.renderApprovalQueue()}
        </div>
    `;
}
    /**
     * ADMINISTRATIVE_IDENTITY_MODIFICATION
     * Updates member attributes and syncs with the Sovereign Registry.
     */
    updateMemberAttribute(type, value) {
        if (!this.selectedMember) return;

        if (type === 'RANK') {
            const [abbr, fullName] = value.split('|');
            this.selectedMember.security.abbr = abbr;
            this.selectedMember.security.rank = fullName;

            // Protocol: Auto-assign clearance based on hierarchy
            const clearanceMap = { 
                'CG.SNR.': 10, 'CAO': 8, 'AO': 7, 'SAAO': 6, 
                'JAAO': 5, 'SM': 4, 'JM': 3, 'M': 2, 'S': 1 
            };
            this.selectedMember.security.clearance = clearanceMap[abbr] || 1;
            
            console.log(`[OS_HIERARCHY]: ${this.selectedMember.sovereignName} rank set to ${abbr}`);
        }

        if (type === 'RECOGNITION') {
            if (!this.selectedMember.specialRecognition) {
                this.selectedMember.specialRecognition = [];
            }

            const index = this.selectedMember.specialRecognition.indexOf(value);
            if (index > -1) {
                // REMOVE Protocol
                this.selectedMember.specialRecognition.splice(index, 1);
            } else {
                // ADD Protocol
                this.selectedMember.specialRecognition.push(value);
            }
        }

        this.render(); // Refresh the Dossier to show changes instantly
    }


    handleRegistration(e) {
        e.preventDefault();
        
        // NEW: Network-level IP check
        const userIp = "192.168.1.666"; // Simulated captured IP
        if (this.ipBlacklist && this.ipBlacklist.includes(userIp)) {
            this.blacklistIp(userIp, "HOSTILE_REGISTRATION_ATTEMPT"); // Logs to Honey-pot
            this.addLog(`BLOCK_EVENT: Blacklisted IP attempt [${userIp}]`, 'security');
            alert("NETWORK_ERROR: Your IP has been blacklisted by Sovereign DevOps.");
            return; // Signal Severed
        }
        
        const formData = new FormData(e.target);
        const entryKey = formData.get('referralCode');
        const uid = formData.get('uid');

        // SECURITY CHECK: Block if the identity is flagged as FROZEN
        const existingMember = this.members.find(m => m.security.uid === uid);
        if (existingMember && existingMember.isFrozen) {
            this.addLog(`ACCESS_DENIED: Identity ${uid} is currently FROZEN.`, 'error');
            alert("CRITICAL_ERROR: Your sovereign signal has been locked by DEVOPS. Access denied.");
            return; // Terminate the process
        }

        // PROTOCOL: Validate Key against the Vault
        const vaultToken = this.tokenVault.find(t => t.code === entryKey);

        if (!vaultToken) {
            this.addLog(`SECURITY_ALERT: Invalid Key Attempt [${entryKey}]`, 'admin');
            alert("[ACCESS_DENIED]: The provided Authorization Key does not exist in the Vault.");
            return;
        }

        if (vaultToken.status === "USED") {
            this.addLog(`SECURITY_ALERT: Burned Key Re-use Attempt [${entryKey}]`, 'admin');
            alert("[ACCESS_DENIED]: This key has already been used and is no longer valid.");
            return;
        }

        const rankAbbr = formData.get('rankAbbr');
        const selectedRank = RANK_SCHEMA.find(r => r.abbr === rankAbbr) || RANK_SCHEMA[RANK_SCHEMA.length - 1]; // Default to lowest rank if error

        // If validation passes, create the citizen object
        const newCitizen = {
            userName: formData.get('userName'),
            officialName: formData.get('officialName'),
            sovereignName: formData.get('sovereignName'),
            demographics: { 
                dob: formData.get('dob'), 
                gender: formData.get('gender') || "PENDING" 
            },
            documentId: formData.get('documentId'),
            contact: { email: formData.get('email'), phone: "AWAITING_VERIFICATION" },
            location: { country: "PENDING_UPLINK", sector: "UNASSIGNED" },
            media: { 
                profile: `https://api.dicebear.com/7.x/bottts/svg?seed=${formData.get('userName')}`,
                cover: "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1200",
                idFront: "BLOB_UPLOADED",
                idBack: "BLOB_UPLOADED"
            },
            security: {
                uid: `NAT-${Math.floor(1000 + Math.random() * 9000)}-X`,
                ipBinding: "AUTO_CAPTURING...",
                deviceFingerprint: "FETCHING...",
                status: "AWAITING_VOUCH",
                since: new Date().toISOString().split('T')[0],
                rank: selectedRank.name,
                abbr: rankAbbr,
                clearance: selectedRank.clearance,
                authorizationKey: entryKey 
            },
            specialRecognition: [],
            awards: ["GENESIS_WAITLIST"]
        };

        // Add to quarantine queue
        this.pendingApprovals.push(newCitizen); 
        
        // Note: We don't mark the key as USED yet. 
        // We do that in vouchForCitizen() when the admin signs off.
        
        this.isRegistering = false;
        this.addLog(`NEW_SIGNAL_QUARANTINED: ${newCitizen.sovereignName}`, 'security');
        this.render();
        
        alert(`[OS_NOTICE]: Key Accepted. Identity bound to ${entryKey}. Awaiting final signature from DevOps.`);
    }

    renderApprovalQueue() {
        if (this.pendingApprovals.length === 0) return '';

        return `
            <div class="reg-label" style="margin-top:40px; color:var(--id-red); border-color:var(--id-red);">Pending_Approvals_Queue // Quarantined</div>
            ${this.pendingApprovals.map(p => `
                <div class="device-entry" style="border: 1px double var(--id-red); background: rgba(255, 69, 69, 0.05);">
                    <div style="flex:1;">
                        <div style="color:#fff; font-size:12px; font-weight:bold;">${p.sovereignName}</div>
                        <div style="font-size:9px; color:var(--id-red); letter-spacing:1px;">TEMP_UID: ${p.security.uid} | REF: ${p.security.authorizationKey}</div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="vouch-btn" data-uid="${p.security.uid}" 
                                style="background:var(--id-green); border:none; color:#000; padding:5px 12px; cursor:pointer; font-size:9px; font-weight:bold;">
                            [ SIGN_OFF ]
                        </button>
                        <button class="purge-btn" data-uid="${p.security.uid}" 
                                style="background:transparent; border:1px solid var(--id-red); color:var(--id-red); padding:5px 12px; cursor:pointer; font-size:9px;">
                            [ PURGE ]
                        </button>
                    </div>
                </div>
            `).join('')}
        `;
    }

    /**
     * PURGE_SIGNAL_PROTOCOL
     * Irreversibly deletes a pending registration from the quarantine queue.
     */
    purgeSignal(tempUid) {
        const index = this.pendingApprovals.findIndex(p => p.security.uid === tempUid);
        if (index > -1) {
            // Log the purge for security audits
            console.warn(`[SECURITY_ALERT]: Signal ${tempUid} purged from gateway.`);
            
            // Remove from queue
            this.pendingApprovals.splice(index, 1);
            
            this.render();
            alert("[OS_WARNING]: Connection terminated. Signal purged from registry.");
        }
    }

    /**
     * DEVOPS_ISSUE_TOKEN
     * Generates a unique entry key for a new citizen.
     */
    generateDevOpsToken() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `DEVOPS-${timestamp}-${entropy}`;
        
        console.log(`[MEMBERSHIP_DEVOPS]: New Entry Key Issued: ${code}`);
        return code;
    }


    renderInviteModule() {
        const m = this.selectedMember;
        return `
            <div class="reg-label" style="margin-top:30px;">Invite_Protocol</div>
            <div class="device-entry" style="border-style: dashed; border-color: var(--id-gold);">
                <div id="invite-display" style="color:var(--id-gold); font-size:12px; font-weight:bold; letter-spacing:2px;">
                    GENERATE_TOKEN_...
                </div>
                <button id="gen-invite-btn" style="background:var(--id-gold); color:#000; border:none; padding:5px 10px; font-size:9px; cursor:pointer; font-weight:bold;">
                    GEN_UPLINK
                </button>
            </div>
            <div style="font-size:8px; color:#444; margin-top:5px;">*Share this token for self-onboarding. Usage is logged to your UID.</div>
        `;
    }


    issueNewKey() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newKey = {
        code: `DEVOPS-${timestamp}-${entropy}`,
        status: "UNUSED",
        issuedAt: new Date().toISOString().split('T')[0],
        recipient: null
    };
    this.tokenVault.unshift(newKey);
    this.render();
    }

    shareKey(idx) {
        const key = this.tokenVault[idx];
        const recipient = prompt("[SYSTEM_INPUT]: Assign this key to (Name/Sector)?");
        if (recipient) {
            key.recipient = recipient;
            // Logic to copy to clipboard
            navigator.clipboard.writeText(key.code);
            alert(`[OS_SUCCESS]: Key ${key.code} assigned to ${recipient} and copied to clipboard.`);
            this.render();
        }
    }

    // MUST BE CALLED INSIDE vouchForCitizen()
    markKeyAsUsed(code) {
        const key = this.tokenVault.find(t => t.code === code);
        if (key) {
            key.status = "USED";
            key.recipient = "IDENTITY_BOUND";
        }
    }

    renderTokenVault() {
    return `
        <div class="registry-view">
            <div class="registry-wrapper" style="animation: slideUp 0.4s ease-out;">
                <div class="registry-header">
                    <div>
                        <h1 style="color:var(--id-gold); margin:0; letter-spacing:4px;">TOKEN_MANAGEMENT_VAULT</h1>
                        <div style="font-size:10px; color:var(--id-green);">DEVOPS_AUTHORIZED_ONLY</div>
                    </div>
                    <button id="close-vault" style="background:transparent; border:1px solid #444; color:#444; padding:5px 10px; cursor:pointer;">[ EXIT_VAULT ]</button>
                </div>

                <div style="background:rgba(212,175,55,0.05); border:1px solid var(--id-gold); padding:20px; margin-bottom:30px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:var(--id-gold); font-size:11px; font-weight:bold;">GENERATE_NEW_ENTRY_KEY</div>
                        <div style="color:#666; font-size:9px;">Allocates a unique cryptographic token for self-registration.</div>
                    </div>
                    <button id="generate-key-btn" class="btn-primary" style="margin:0; width:auto; padding:10px 25px;">ISSUE_TOKEN</button>
                </div>

                <div class="reg-label">Active_Inventory</div>
                <div style="max-height:400px; overflow-y:auto;">
                    ${this.tokenVault.map((t, idx) => `
                        <div class="device-entry ${t.status === 'UNUSED' ? 'active' : ''}" style="opacity: ${t.status === 'USED' ? '0.5' : '1'}">
                            <div style="flex:1;">
                                <div style="color:${t.status === 'UNUSED' ? 'var(--id-gold)' : '#555'}; font-weight:bold; letter-spacing:1px;">${t.code}</div>
                                <div style="font-size:9px; color:#444;">ISSUED: ${t.issuedAt} | RECIPIENT: ${t.recipient || 'UNASSIGNED'}</div>
                            </div>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span style="font-size:9px; color:${t.status === 'UNUSED' ? 'var(--id-green)' : 'var(--id-red)'}">${t.status}</span>
                                ${t.status === 'UNUSED' ? `
                                    <button class="share-key-btn" data-idx="${idx}" style="background:transparent; border:1px solid var(--id-green); color:var(--id-green); padding:4px 8px; font-size:9px; cursor:pointer;">SHARE</button>
                                ` : `<span style="font-size:9px; color:#444;">[ BURNED ]</span>`}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

renderHoneyPot() {
    return `
        <div class="registry-view">
            <div class="registry-wrapper" style="animation: slideUp 0.4s ease-out;">
                <h1 style="color:var(--id-red); letter-spacing:4px;">HONEY_POT_MONITOR</h1>
                <div class="reg-label" style="color:var(--id-red); border-color:var(--id-red);">Blocked_Network_Attempts</div>
                <div style="max-height:400px; overflow-y:auto; background:rgba(255,0,0,0.05); border:1px solid #300; padding:15px;">
                    ${this.honeyPotLogs.length > 0 ? this.honeyPotLogs.map(log => `
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #200; padding:10px; font-family:monospace; font-size:11px;">
                            <span style="color:var(--id-red); font-weight:bold;">[${log.event}]</span>
                            <span style="color:#666;">IP: ${log.ip}</span>
                            <span style="color:#444;">${log.timestamp}</span>
                        </div>
                    `).join('') : '<div style="color:#444; text-align:center; padding:20px;">NO_HOSTILE_ATTEMPTS_RECORDED</div>'}
                </div>
                <button id="close-honey" class="sidebar-btn" style="margin-top:30px;">[ RETURN_TO_DIRECTORY ]</button>
            </div>
        </div>
    `;
}


    /**
     * PROTOCOL: GLOBAL_SIGNAL_SEVER
     * Emergency lockdown of all non-Archon identities.
     */
    triggerMassLockdown() {
        this.addLog("CRITICAL: INITIATING_GLOBAL_LOCKDOWN", "security");
        
        this.members.forEach(m => {
            // Protect clearance level 10 (Archan Supreme)
            if (m.security.clearance < 10) {
                m.isFrozen = true;
            }
        });

        this.selectedMember = null; // Sever active admin view
        this.viewMode = 'DIRECTORY';
        this.render();
        
        alert("SYSTEM_WIDE_LOCKDOWN: All non-Archon signals have been severed.");
    }

    /**
     * HONEY-POT PROTOCOL
     * Records and blocks hostile IP signals.
     */
    blacklistIp(ip, reason = "MANUAL_BAN") {
        if (ip && !this.ipBlacklist.includes(ip)) {
            this.ipBlacklist.push(ip);
            this.honeyPotLogs.unshift({
                timestamp: new Date().toLocaleString(),
                ip: ip,
                event: reason
            });
            this.addLog(`IP_BURNED: ${ip} added to blacklist.`, 'security');
            this.render();
        }
    }

    /**
     * VOUCH_CITIZEN_PROTOCOL
     * Authorizes a pending registration via cryptographic signature.
     */
    vouchForCitizen(tempUid, voucherUid) {
    const member = this.members.find(m => m.security.uid === tempUid);
    
    if (member && member.isFrozen) {
        this.addLog(`VOUCH_FAILED: Cannot approve FROZEN_SIGNAL ${uid}`, 'error');
        return;
    }
    const index = this.pendingApprovals.findIndex(p => p.security.uid === tempUid);
    if (index > -1) {
        const citizen = this.pendingApprovals[index];

        // 1. Burn the key in the vault
        this.markKeyAsUsed(citizen.security.authorizationKey);
        
        // 2. Finalize status
        citizen.security.status = "ACTIVE";
        citizen.security.vouchedBy = voucherUid;
        
        // 3. PUSH TO MAIN LIST (This is where the "Saving" happens)
        this.members.push(citizen);
        
        // 4. Remove from quarantine
        this.pendingApprovals.splice(index, 1);
        
        this.addLog(`MEMBER_ACTIVATED: ${citizen.sovereignName}`, 'admin');
        this.render();
    }
}

    renderProcessingOverlay() {
    return `
        <div style="position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
            <div style="border:1px solid var(--id-green); padding:40px; text-align:center; min-width:300px;">
                <div class="d-status-dot" style="background:var(--id-green); margin:0 auto 20px; width:15px; height:15px;"></div>
                <div style="color:var(--id-green); font-family:monospace; letter-spacing:3px; font-size:14px;">COMPILING_MANIFEST...</div>
                <div style="color:#444; font-size:10px; margin-top:10px;">ENCRYPTING_IDENTITY_RECORDS</div>
            </div>
        </div>
    `;
}

async exportRegistryManifest() {
    this.isExporting = true;
    this.render(); // Show "Start" visual
    this.addLog("MANIFEST_COMPILE_START", "admin");

    // Artificial delay for system "feel"
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dataStr = JSON.stringify(this.members, null, 4);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `SOVEREIGN_REGISTRY_${timestamp}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.addLog("MANIFEST_COMPILE_COMPLETE", "security");
    } catch (err) {
        this.addLog("MANIFEST_EXPORT_FAILED", "error");
    } finally {
        this.isExporting = false;
        this.render(); // End visual
    }
}

//To complete registration
finalizeCitizenUplink(memberUid, country, ip) {
    const member = this.members.find(m => m.security.uid === memberUid);
    
    if (member) {
        // Update the member record
        member.location.country = country;
        member.security.ipBinding = ip;
        member.security.deviceFingerprint = `HW_ID_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Record the login event
        if (!this.loginHistory[memberUid]) this.loginHistory[memberUid] = [];
        this.loginHistory[memberUid].unshift({
            timestamp: new Date().toLocaleString(),
            event: "INITIAL_HARDWARE_UPLINK",
            location: country,
            ip: ip
        });

        this.addLog(`HARDWARE_BINDING_COMPLETE: ${member.sovereignName}`, 'security');
        this.render();
        return true;
    }
    return false;
}

renderTacticalCommand() {
    const query = (this.tacticalSearchQuery || "").toLowerCase();
    
    // Perform Deep-Search across ACs and their nested TLCs
    const filteredTactical = this.tacticalDirectory.filter(ac => {
        // Match AC Level
        const acMatch = ac.name.toLowerCase().includes(query) || 
                        ac.id.toLowerCase().includes(query) ||
                        ac.areaCode.toLowerCase().includes(query);
        
        // Match TLC Level
        const tlcMatch = ac.tlcs.some(tlc => 
            tlc.name.toLowerCase().includes(query) || 
            tlc.id.toLowerCase().includes(query) ||
            tlc.areaCode.toLowerCase().includes(query)
        );

        return acMatch || tlcMatch;
    });

    // AUTO-EXPAND LOGIC: If a search is active and matches a TLC, open that AC
    if (query.length > 2 && filteredTactical.length === 1) {
        this.expandedAC = filteredTactical[0].id;
    }

    return `
    <div class="registry-wrapper" style="background:#000; padding:25px; font-family:monospace;">
            <div id="tactical-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:1000; align-items:center; justify-content:center;">
            <div id="modal-content" style="background:#050505; border:1px solid var(--id-gold); width:450px; padding:30px; box-shadow: 0 0 50px rgba(212,175,55,0.1);">
                <div id="modal-form-target"></div>
                <button id="btn-modal-cancel" style="width:100%; margin-top:10px; background:transparent; border:1px solid #333; color:#555; padding:10px; cursor:pointer; font-family:inherit;">[ ABORT_OPERATION ]</button>
            </div>
        </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h2 style="color:var(--id-gold);">[ TACTICAL_ASSET_DIRECTORY ]</h2>
            <div style="display:flex; gap:10px;">
                <button id="btn-show-ac" class="award-pill" style="background:var(--id-gold); color:#000;">+ HUB_AC</button>
                <button id="btn-show-tlc" class="award-pill" style="border:1px solid var(--id-green); color:var(--id-green); background:transparent;">+ NODE_TLC</button>
            </div>
        </div>
        <div id="tactical-form-target" style="display:none; margin-bottom:20px; border:1px solid #222; padding:15px;"></div>
        <div style="margin-bottom: 20px; position: relative;">
            <input type="text" id="tactical-search" value="${this.tacticalSearchQuery || ''}" 
                   placeholder="SEARCH_BY_AC_OR_TLC_NAME..." 
                   style="width: 100%; background: #080808; border: 1px solid #222; color: var(--id-gold); padding: 12px; font-family: monospace; outline: none; border-left: 4px solid var(--id-gold);">
        </div>
        <div style="display:flex; flex-direction:column; gap:15px;">
            ${filteredTactical.map(ac => {
                const stats = this.getNodeTelemetry(ac.id);
                const isExpanded = this.expandedAC === ac.id;
                return `
                <div style="border:1px solid ${isExpanded ? 'var(--id-gold)' : '#111'}; background:#050505;">
                    <div class="ac-card" data-id="${ac.id}" style="display:grid; grid-template-columns: 1.5fr 1fr 1.5fr 1fr; padding:15px; cursor:pointer;">
                        <div>
                            <div style="color:var(--id-gold); font-weight:bold;">${ac.name}</div>
                            <div style="font-size:9px; color:#444;">${ac.id} // AREA: ${ac.areaCode}</div>
                        </div>
                        <div>
                            <div style="color:#555; font-size:9px;">NATIVES/TLCs</div>
                            <div style="color:var(--id-green);">${stats.count} / ${ac.tlcs.length}</div>
                        </div>
                        <div style="font-size:9px;">
                            <div style="color:#555;">RANK_BREAKDOWN / GENDER</div>
                            <div style="color:#888;">${stats.rankBreakdown}</div>
                            <div style="color:#666;">${stats.gender}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="color:var(--id-gold); font-size:10px;">${this.getPhysicalLocation(ac.lat, ac.lng)}</div>
                            <div style="color:#333; font-size:9px;">${ac.lat}, ${ac.lng}</div>
                        </div>
                    </div>

                    ${isExpanded ? `
                        <div style="padding:15px; background:rgba(0,255,65,0.02); border-top:1px dashed #222; display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:10px;">
                            ${ac.tlcs.map(tlc => {
                                const tStats = this.getNodeTelemetry(tlc.id);
                                return `
                                <div style="border:1px solid #222; padding:10px; border-left:3px solid var(--id-green);">
                                    <div style="color:#fff; font-size:11px;">${tlc.name}</div>
                                    <div style="color:#333; font-size:8px; margin-bottom:5px;">${tlc.id} // ${tlc.areaCode}</div>
                                    <div style="font-size:9px; color:var(--id-green);">${tStats.count} NATIVES</div>
                                    <div style="font-size:8px; color:#444; margin-top:5px;">${tStats.rankBreakdown}</div>
                                    <div style="text-align:right; font-size:8px; color:#222; margin-top:5px;">${this.getPhysicalLocation(tlc.lat, tlc.lng)}</div>
                                </div>`;
                            }).join('')}
                        </div>
                    ` : ''}
                </div>`;
            }).join('')}
        </div>
    </div>`;
}


handleTacticalSubmit(type) {
    // 1. Common Data Extraction
    const name = document.getElementById('node-name').value;
    const lat = parseFloat(document.getElementById('node-lat').value);
    const lng = parseFloat(document.getElementById('node-lng').value);

    // Basic Validation
    if (!name || isNaN(lat) || isNaN(lng)) {
        alert("ERROR: INCOMPLETE_COORDINATE_DATA");
        return;
    }

    if (type === 'AC') {
        // --- ACTION CENTER LOGIC ---
        // Auto-generate Area Code: AC-7828 pattern
        const areaCode = this.generateAreaCode('AC'); 
        
        const newAC = {
            id: `T-${areaCode}`,
            name: name,
            areaCode: areaCode,
            lat: lat,
            lng: lng,
            physicalLocation: this.getPhysicalLocation(lat, lng), // Real-world name
            tlcs: []
        };

        this.tacticalDirectory.push(newAC);
        this.addLog(`AC_ESTABLISHED: ${newAC.id} @ ${newAC.physicalLocation}`, 'admin');

    } else if (type === 'TLC') {
        // --- TLC NODE LOGIC ---
        const parentId = document.getElementById('parent-ac-id').value;
        const parentAC = this.tacticalDirectory.find(ac => ac.id === parentId);
        
        if (!parentAC) {
            alert("ERROR: INVALID_PARENT_AC_ID");
            return;
        }

        // REINFORCE 100KM RADIUS
        const distance = this.calculateDistance(parentAC.lat, parentAC.lng, lat, lng);
        if (distance > 100) {
            this.addLog(`SECURITY_ALERT: TLC_PROXIMITY_VIOLATION (${distance.toFixed(2)}km)`, 'security');
            alert(`DEPLOYMENT_FAILED: Node outside authorized 100km radius (Distance: ${distance.toFixed(2)}km).`);
            return;
        }

        // Auto-generate TLC Area Code: AC_CODE-2929 pattern
        const areaCode = this.generateAreaCode('TLC', parentAC.areaCode);

        const newTLC = {
            id: `T-${areaCode}`,
            name: name,
            areaCode: areaCode,
            lat: lat,
            lng: lng,
            physicalLocation: this.getPhysicalLocation(lat, lng)
        };

        parentAC.tlcs.push(newTLC);
        this.addLog(`TLC_DEPLOYED: ${newTLC.id} linked to ${parentId}`, 'admin');
    }

    // 3. Finalize UI State
    const modal = document.getElementById('tactical-modal');
    if (modal) modal.style.display = 'none';
    
    this.render(); // Refresh cards and search results
    this.addLog(`${type}_NODE_ESTABLISHED_SUCCESSFULLY`, 'admin');
}

// --- GEOGRAPHIC & ID GENERATION HELPERS ---
// --- ADVANCED TACTICAL ENGINE ---

// Calculates distance in KM (Haversine Formula)
calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

// Generates Sovereign IDs: T-AC-#### or T-AC-####-TLC-####
generateId(type, areaCode, parentId = null) {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return type === 'AC' ? `T-AC-${suffix}` : `${parentId}-TLC-${suffix}`;
}

// --- SOVEREIGN TACTICAL ENGINE ---

// Generates Area Codes based on provided patterns
generateAreaCode(type, parentCode = null) {
    const random = Math.floor(1000 + Math.random() * 8999);
    return type === 'AC' ? `AC-${random}` : `${parentCode}-${random}`;
}

// Maps coordinates to real physical names
getPhysicalLocation(lat, lng) {
    // In a production environment, you would call a Reverse Geocoding API.
    // Here we provide a localized sector mapping.
    const sectors = {
        "-1": "NAIROBI_METRO",
        "1": "ESTONIA_CORE",
        "34": "JOHANNESBURG_SOUTH"
    };
    const base = sectors[Math.floor(lat).toString()] || "UNKNOWN_SECTOR";
    return `${base}_GRID_${Math.abs(Math.floor(lng))}E`;
}

// Comprehensive Rank & Demographic Telemetry
getNodeTelemetry(nodeId) {
    const natives = this.members.filter(m => m.actionCenter === nodeId || m.tlca === nodeId);
    
    // Explicit Rank Audit (Required Ranks)
    const schema = ["CG.SNR.", "CAO", "AO", "SAAO", "JAAO", "SM", "JM", "M", "S"];
    const rankCounts = {};
    schema.forEach(r => rankCounts[r] = 0);
    
    natives.forEach(m => {
        const r = m.security.abbr || "S";
        if (rankCounts[r] !== undefined) rankCounts[r]++;
    });

    // Formatting for display
    const rankStr = Object.entries(rankCounts)
        .filter(([_, count]) => count > 0)
        .map(([r, c]) => `${r}:${c}`).join(' | ');

    return {
        count: natives.length,
        rankBreakdown: rankStr || "NO_RANKED_ASSETS",
        gender: `M:${natives.filter(m => m.demographics.gender === 'MALE').length} F:${natives.filter(m => m.demographics.gender === 'FEMALE').length}`
    };
}



    attachEvents() {
    // 1. Define the Navigation Helper (Unified for Sidebar and Buttons)
    const setView = (mode, isReg = false) => {
        this.viewMode = mode;
        this.isRegistering = isReg;
        this.selectedMember = null; // Close any open dossier when navigating
        this.render();
    };

    // 2. Sidebar & Global Bindings
    const bind = (id, action) => {
        const el = this.container.querySelector(id);
        if (el) el.onclick = action;
    };

    bind('#sb-index', () => setView('DIRECTORY'));
    bind('#sb-reg', () => setView('DIRECTORY', true)); // Gateway view
    bind('#sb-vault', () => setView('VAULT'));
    bind('#sb-export', () => this.exportRegistryManifest());
    bind('#clear-filters', () => this.resetFilters());
    
    // Legacy Button Support
    bind('#start-registration', () => setView('DIRECTORY', true));
    bind('#cancel-reg', () => setView('DIRECTORY'));
    bind('#open-vault', () => setView('VAULT'));
    bind('#close-vault', () => setView('DIRECTORY'));

    // 3. Dossier & Modification Console (Restored)
    bind('#toggle-edit-mode', () => {
        this.isEditing = !this.isEditing;
        this.render();
    });

    bind('#sb-honeypot', () => {
    this.viewMode = 'HONEYPOT';
    this.isRegistering = false;
    this.selectedMember = null;
    this.render();
    });

    bind('#sb-lockdown', () => {
        if(confirm("CRITICAL: Sever ALL non-Archon signals immediately?")) {
            this.triggerMassLockdown();
        }
    });

    const rankChanger = this.container.querySelector('#rank-changer');
    if (rankChanger) {
        rankChanger.onchange = (e) => {
            const [abbr, name] = e.target.value.split('|');
            this.updateMember(this.selectedMember.security.uid, {
                security: { ...this.selectedMember.security, abbr, rank: name }
            });
        };
    }

    this.container.querySelectorAll('.recognition-toggle').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            const currentRecs = [...(this.selectedMember.specialRecognition || [])];
            const newRecs = currentRecs.includes(type)
                ? currentRecs.filter(r => r !== type)
                : [...currentRecs, type];
            this.updateMember(this.selectedMember.security.uid, { specialRecognition: newRecs });
        };
    });

    // 4. Directory Row Selection
    this.container.querySelectorAll('.member-row').forEach(row => {
        row.onclick = () => {
            const idx = row.dataset.idx;
            this.selectedMember = this.members[idx];
            this.vaultUnlocked = false; 
            this.render();
        };
    });

    bind('#close-dossier', () => {
        this.selectedMember = null;
        this.isEditing = false;
        this.render();
    });

    // 5. Registration Form Logic
    const regForm = this.container.querySelector('#registration-form');
    if (regForm) {
        regForm.onsubmit = (e) => this.handleRegistration(e);
    }

    // 6. Search & Filters (Preserved with Focus Fix)
    const searchInput = this.container.querySelector('#directory-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            this.searchQuery = e.target.value;
            this.render();
            const input = this.container.querySelector('#directory-search');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        };
    }

    this.container.querySelectorAll('.filter-select').forEach(select => {
        select.onchange = (e) => {
            this.filters[e.target.dataset.filter] = e.target.value;
            this.render();
        };
    });

    // 7. Token Vault Tools
    bind('#generate-key-btn', () => this.issueNewKey());
    bind('#toggle-vault', () => { this.vaultUnlocked = !this.vaultUnlocked; this.render(); });
    
    this.container.querySelectorAll('.share-key-btn').forEach(btn => {
        btn.onclick = () => this.shareKey(btn.dataset.idx);
    });

    // 8. Pending Quarantine Logic
    this.container.querySelectorAll('.vouch-btn').forEach(btn => {
        btn.onclick = () => this.vouchForCitizen(btn.dataset.uid, "DEVOPS_ROOT");
    });
    this.container.querySelectorAll('.purge-btn').forEach(btn => {
        btn.onclick = () => this.purgeSignal(btn.dataset.uid);
    });

    // --- FREEZE/UNFREEZE LOGIC ---
    // Bind Global Lockdown button
    const lockdownBtn = this.container.querySelector('#sb-lockdown');
    if (lockdownBtn) {
        lockdownBtn.onclick = () => {
            if(confirm("CRITICAL: Are you sure you want to sever ALL non-Archon signals?")) {
                this.triggerMassLockdown();
            }
        };
    }

    // Closses honeypot
    const closeHoney = this.container.querySelector('#close-honey');
    if (closeHoney) {
        closeHoney.onclick = () => {
            this.viewMode = 'DIRECTORY';
            this.render();
        };
    }

    // Updated Freeze button to also Blacklist the member's IP
    const freezeBtn = this.container.querySelector('#toggle-freeze');
    if (freezeBtn) {
        freezeBtn.onclick = () => {
            const m = this.selectedMember;
            const currentStatus = m.isFrozen || false;
            
            // 1. Perform the data update
            this.updateMember(m.security.uid, { isFrozen: !currentStatus });

            // 2. SOVEREIGN_AUTO_BURN: If freezing, blacklist their IP
            if (!currentStatus && m.security.ipBinding) {
                this.blacklistIp(m.security.ipBinding, `FROZEN_ID_SEVERED_${m.security.uid}`);
            }
        };
    }

    // Navigation
    const tacticalBtn = this.container.querySelector('#nav-tactical');
if (tacticalBtn) {
    tacticalBtn.onclick = () => {
        this.viewMode = 'TACTICAL';
        this.selectedMember = null;
        this.isRegistering = false;
        this.addLog("TACTICAL_COMMAND_INTERFACE_ENTERED", "admin");
        this.render();
    };
}

    // 2. Tactical Submission Events
    if (this.viewMode === 'TACTICAL') {
        const subAC = this.container.querySelector('#submit-ac');
        if (subAC) subAC.onclick = () => this.handleTacticalSubmit('AC');
        
        const subTLC = this.container.querySelector('#submit-tlc');
        if (subTLC) subTLC.onclick = () => this.handleTacticalSubmit('TLC');
    }

    this.container.querySelectorAll('.ac-card').forEach(card => {
    card.onclick = (e) => {
        // Don't expand if clicking an input inside
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        
        const acId = card.dataset.id;
        this.expandedAC = this.expandedAC === acId ? null : acId; // Toggle
        this.render();
    };
});

if (this.viewMode === 'TACTICAL') {
    const tacSearch = this.container.querySelector('#tactical-search');
    if (tacSearch) {
        tacSearch.oninput = (e) => {
            this.tacticalSearchQuery = e.target.value;
            this.render(); // Update the UI in real-time
            
            // Re-focus the search bar after render to maintain typing flow
            const refocused = document.getElementById('tactical-search');
            if (refocused) {
                refocused.focus();
                refocused.setSelectionRange(e.target.value.length, e.target.value.length);
            }
        };
    }}

if (this.viewMode === 'TACTICAL') {
    // Correct target for form injection
    
const modal = this.container.querySelector('#tactical-modal');
const modalTarget = this.container.querySelector('#modal-form-target');

// Helper to open modal
const openModal = (html) => {
    modal.style.display = 'flex';
    modalTarget.innerHTML = html;
};

// AC Modal Trigger
const btnShowAC = this.container.querySelector('#btn-show-ac');
if (btnShowAC) {
    btnShowAC.onclick = () => {
        openModal(`
            <div style="color:var(--id-gold); margin-bottom:15px;">> INITIALIZING_AC_HUB_PROTOCOL</div>
            <input id="node-name" placeholder="AC_NAME" class="sovereign-input" style="margin-bottom:10px; width:100%;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <input id="node-lat" placeholder="LATITUDE" class="sovereign-input">
                <input id="node-lng" placeholder="LONGITUDE" class="sovereign-input">
            </div>
            <button id="submit-ac" class="award-pill" style="width:100%; margin-top:15px; background:var(--id-gold); color:#000;">ESTABLISH_AC</button>
        `);

        // CRITICAL FIX: Bind the click event AFTER the HTML is injected
        const submitBtn = document.getElementById('submit-ac');
        if (submitBtn) {
            submitBtn.onclick = () => this.handleTacticalSubmit('AC');
        }
    };
}

// TLC Modal Trigger
this.container.querySelector('#btn-show-tlc').onclick = () => {
    openModal(`
        <div style="color:var(--id-green); margin-bottom:15px;">> DECOUPLING_TLC_SUB_NODE</div>
        <input id="node-name" placeholder="TLC_NAME" class="sovereign-input" style="margin-bottom:10px; width:100%;">
        <input id="parent-ac-id" placeholder="PARENT_AC_ID (e.g. T-AC-7828)" class="sovereign-input" style="margin-bottom:10px; width:100%;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <input id="node-lat" placeholder="LATITUDE" class="sovereign-input">
            <input id="node-lng" placeholder="LONGITUDE" class="sovereign-input">
        </div>
        <div style="color:#444; font-size:9px; margin-bottom:10px;">PROXIMITY_ENFORCEMENT: MAX_100KM_FROM_PARENT</div>
        <button id="submit-tlc" class="award-pill" style="width:100%; margin-top:15px; border:1px solid var(--id-green); color:var(--id-green); background:transparent;">DEPLOY_TLC</button>
    `);
    this.container.querySelector('#submit-tlc').onclick = () => this.handleTacticalSubmit('TLC');
};

// Universal Cancel Action
this.container.querySelector('#btn-modal-cancel').onclick = () => {
    modal.style.display = 'none';
};


}

// Admin making changed to a member
// Inside attachEvents()
const commitBtn = this.container.querySelector('#toggle-edit-mode');
if (commitBtn) {
    commitBtn.onclick = () => {
        if (this.isEditing) {
            // --- DATA COLLECTION & COMMIT ---
            const m = this.selectedMember;
            
            // Collect standard text and date fields
            const updates = {
                position: document.getElementById('edit-position').value,
                actionCenter: document.getElementById('edit-ac_id').value,
                tlca: document.getElementById('edit-tlc_id').value,
                rankDate: document.getElementById('edit-rankDate').value,
                remarks: document.getElementById('edit-remarks').value,
                joinedAC: document.getElementById('edit-joinedAC').value,
                joinedTLC: document.getElementById('edit-joinedTLC').value
            };

            // Handle Array fields (Titles & Special Recognition) 
            // Splits by comma and cleans up whitespace
            updates.titles = document.getElementById('edit-titles').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t !== "");

            updates.specialRecognition = document.getElementById('edit-specialRec').value
                .split(',')
                .map(r => r.trim())
                .filter(r => r !== "");

            // Handle Rank Change & Security Synchronization
            const rankSelect = document.getElementById('edit-rank');
            const selectedAbbr = rankSelect.value;
            
            // Assuming RANK_SCHEMA is defined globally or within your class scope
            const rankInfo = RANK_SCHEMA.find(r => r.abbr === selectedAbbr);
            
            updates.security = {
                ...m.security,
                abbr: selectedAbbr,
                rank: rankInfo ? rankInfo.name : m.security.rank,
                clearance: rankInfo ? rankInfo.clearance : m.security.clearance
            };

            // Execute master list update
            this.updateMember(m.security.uid, updates);
            
            // Exit edit mode and log action
            this.isEditing = false;
            this.addLog(`SYSTEM_UPDATE: CID_${m.security.uid} record modified by administrator.`, 'admin');
        } else {
            // Enter edit mode
            this.isEditing = true;
        }
        this.render();
    };
}

// --- TACTICAL HIERARCHY LISTENER ---
// Ensures that if Action Center is changed during edit, the TLC dropdown updates its children
const acDropdown = this.container.querySelector('#edit-ac_id');
if (acDropdown) {
    acDropdown.onchange = (e) => {
        const selectedACId = e.target.value;
        const tlcDropdown = document.getElementById('edit-tlc_id');
        
        // Find the AC in your tacticalDirectory to get its specific TLCs
        const acData = this.tacticalDirectory.find(ac => ac.id === selectedACId);
        
        if (tlcDropdown && acData) {
            tlcDropdown.innerHTML = acData.tlcs.map(t => 
                `<option value="${t.id}">${t.name}</option>`
            ).join('');
        }
    };
}
    
}
}

