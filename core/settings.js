/**
 * core/settings.js
 * SOVEREIGN OS - ADVANCED SYSTEM CONFIGURATION
 * VPU_UI_VERSION: 2.1.1 (Hardware Bridge Integration)
 */
export class SettingsApp {
    constructor(container, sessionKey) {
        this.container = container;
        this.key = sessionKey;
        this.kernel = window.kernel; // Reference the global kernel
        this.vfs = window.SovereignVFS;
        this.activeTab = 'account'; 
        
        // Ensure global instance for navigation stability
        window.SettingsAppInstance = this;

        // Initialize discovery listener
        this.setupHardwareListeners();
    }

    async init() {
        this.render();
    }

    /** --- HARDWARE LOGIC --- **/

    setupHardwareListeners() {
        // Listen for the bridge discovery events from the Kernel
        this.kernel.on('BT_DEVICE_FOUND', (device) => {
            const list = document.getElementById('bt-device-list');
            if (list && this.activeTab === 'hardware') {
                // Remove scanning placeholder if it exists
                const placeholder = list.querySelector('.scan-placeholder');
                if (placeholder) placeholder.remove();

                // Check if device is already listed
                if (document.getElementById(`dev-${device.address.replace(/:/g, '')}`)) return;

                const item = document.createElement('div');
                item.id = `dev-${device.address.replace(/:/g, '')}`;
                item.className = 'sov-card';
                item.style.cssText = "margin-top: 10px; padding: 15px; border-left: 3px solid #7C3AED; cursor: pointer; display: flex; justify-content: space-between; align-items: center;";
                
                item.innerHTML = `
                    <div>
                        <div style="font-size: 14px; color: #fff;">${device.name || 'Unknown Node'}</div>
                        <div style="font-size: 10px; color: #555;">${device.address}</div>
                    </div>
                    <div style="color: #7C3AED; font-size: 10px;">RSSI: ${device.rssi}dBm</div>
                `;
                
                item.onclick = () => this.pairDevice(device);
                list.appendChild(item);
            }
        });
    }

    pairDevice(device) {
        if (this.kernel.vpuBridgeSocket && this.kernel.vpuBridgeSocket.readyState === WebSocket.OPEN) {
            this.kernel.vpuBridgeSocket.send(JSON.stringify({
                type: 'SET_TARGET',
                address: device.address
            }));
            this.kernel.notify("ANCHOR_LOCKED", `Hardware anchor set to ${device.name}`);
        }
    }

    switchTab(tabId) {
        this.activeTab = tabId;
        this.render();
        if (tabId === 'security') setTimeout(() => this.runSecurityAudit(), 50);
        if (tabId === 'usage') setTimeout(() => this.calculateStorage(), 50);
        if (tabId === 'hardware') this.kernel.initHardwarePairing();
    }

    /** --- LOGIC MODULES --- **/

    applyTheme(bg, color, font) {
        document.body.style.backgroundColor = bg;
        document.body.style.color = color;
        document.body.style.fontFamily = font;
        this.vfs.writeFile("sys/user_prefs.json", JSON.stringify({ bg, color, font }));
        if (window.showNotification) window.showNotification(`UI_SKIN: ${font.toUpperCase()} LOADED`, "success");
    }

    async runSecurityAudit() {
        const statusEl = document.getElementById('audit-status-text');
        if (!statusEl) return;
        statusEl.innerHTML = "<span class='blink'>[ SCANNING_ENCLAVE ]</span>";
        try {
            const rootCheck = await this.vfs.read("sys/kernel.log", this.key);
            statusEl.innerHTML = rootCheck ? "✅ ENCLAVE_INTEGRITY: SECURE" : "📡 STATUS: GENESIS_MODE";
            statusEl.style.color = rootCheck ? "#00ff41" : "#3498db";
        } catch (e) {
            statusEl.innerHTML = "⚠️ SECURITY_ALERT: LOCKED";
            statusEl.style.color = "#ff4444";
        }
    }

    async calculateStorage() {
        const storageEl = document.getElementById('storage-usage');
        if (!storageEl) return;
        // Mocking VFS storage calculation
        const used = Math.floor(Math.random() * 40) + 10; 
        storageEl.innerHTML = `${used} MB / 100 MB (TOTAL_BIRTHRIGHT_CAPACITY)`;
    }

    /** --- RENDER ENGINE --- **/

    render() {
        this.container.innerHTML = `
            <div class="settings-app-container" style="display: flex; height: 100%; background: #000; font-family: 'Courier New', monospace; color: #fff; overflow: hidden;">
                
                <div class="settings-sidebar" style="width: 260px; background: #050505; border-right: 2px solid #1a1a1a; display: flex; flex-direction: column;">
                    <div style="padding: 30px 20px; border-bottom: 2px solid #1a1a1a;">
                        <div style="color: #7C3AED; font-weight: bold; font-size: 10px; letter-spacing: 3px; opacity: 0.7;">VPU_PRIMARY_NODE</div>
                        <div style="font-size: 18px; color: #fff; margin-top: 5px; font-family: 'Orbitron', sans-serif;">CORE_CONFIG</div>
                    </div>
                    
                    <nav style="flex-grow: 1; padding-top: 10px; overflow-y: auto;">
                        ${this.renderNavBtn('account', 'Account & Rank', 'fa-user-circle')}
                        ${this.renderNavBtn('hardware', 'Hardware Bridge', 'fa-bluetooth')}
                        ${this.renderNavBtn('personalization', 'Interface', 'fa-palette')}
                        ${this.renderNavBtn('security', 'Security Vault', 'fa-shield-alt')}
                        ${this.renderNavBtn('usage', 'System Usage', 'fa-microchip')}
                    </nav>

                    <div style="padding: 20px; border-top: 1px solid #1a1a1a; background: #0a0000;">
                         <button onclick="window.SettingsAppInstance.purgeVFS()" style="background: transparent; color: #ff4444; border: 1px solid #ff4444; padding: 12px; width: 100%; cursor: pointer; font-size: 10px; font-weight: bold; text-transform: uppercase;">
                            Purge Enclave
                        </button>
                    </div>
                </div>

                <div class="settings-main" style="flex: 1; padding: 50px; overflow-y: auto;">
                    <div style="max-width: 800px;">
                        ${this.renderContent()}
                    </div>
                </div>
            </div>
        `;
    }

    renderNavBtn(id, label, icon) {
        const isActive = this.activeTab === id;
        const activeColor = id === 'hardware' ? '#7C3AED' : '#00ff41';
        return `
            <div onclick="window.SettingsAppInstance.switchTab('${id}')" 
                 style="padding: 15px 25px; cursor: pointer; font-size: 11px; display: flex; align-items: center; gap: 15px; border-bottom: 1px solid #111; transition: 0.2s; text-transform: uppercase; letter-spacing: 1px; 
                 background: ${isActive ? activeColor : 'transparent'};
                 color: ${isActive ? '#000' : '#888'};">
                <i class="fas ${icon}" style="width: 18px;"></i>
                <span>${label}</span>
            </div>
        `;
    }

    renderContent() {
        switch(this.activeTab) {
            case 'hardware':
                return `
                    <h1 style="font-family: 'Orbitron', sans-serif; color: #7C3AED;">HARDWARE_BRIDGE</h1>
                    <p style="font-size: 12px; color: #888; margin-bottom: 25px;">Scan for physical Bluetooth anchors to enable Proximity-based Authentication.</p>
                    
                    <div id="bt-device-list" style="min-height: 200px;">
                        <div class="scan-placeholder" style="padding: 40px; text-align: center; border: 1px dashed #333; color: #555;">
                            <i class="fas fa-sync fa-spin" style="margin-bottom: 10px;"></i><br>
                            INITIALIZING_SCAN...
                        </div>
                    </div>

                    <div class="sov-card" style="margin-top: 30px; border-top: 1px solid #7C3AED;">
                        <h3 style="font-size: 10px; color: #7C3AED;">BRIDGE_STATUS</h3>
                        <div style="font-size: 12px; margin-top: 10px;">
                            PROTOCOL: BLE_HANDSHAKE_V3<br>
                            ENCRYPTION: SHA-256 HMAC<br>
                            PORT: 3000 (UNIFIED)
                        </div>
                    </div>
                `;
            case 'account':
                return `
                    <h1 style="font-family: 'Orbitron', sans-serif; color: #00ff41;">MEMBER_IDENTITY</h1>
                    <div class="sov-card" style="border-left: 4px solid #00ff41;">
                        <div style="font-size: 18px; margin-bottom: 5px;">ARCHAN_SUPREME</div>
                        <div style="color: #888; font-size: 12px; margin-bottom: 20px;">CID: 774900X-VPU-01</div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 13px;">
                            <div>FORMATION: <span style="color:#00ff41;">COMCENT_PRIME</span></div>
                            <div>RANK: <span style="color:#00ff41;">OFFICER_STAR_1</span></div>
                            <div>POSITION: <span style="color:#fff;">SUPREME_SAGE</span></div>
                            <div>STATUS: <span style="color:#00ff41;">ACTIVE_NODE</span></div>
                        </div>
                    </div>
                `;

            case 'personalization':
                return `
                    <h1 style="font-family: 'Orbitron', sans-serif; color: #00ff41;">INTERFACE_SKINS</h1>
                    <div class="sov-card">
                        <h3 style="font-size: 10px; color: #555; margin-bottom: 15px;">SELECT_VIRTUAL_AESTHETIC</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <button onclick="window.SettingsAppInstance.applyTheme('#000000', '#00ff41', 'Courier New')" class="sov-btn">PURE_BLACK [OS_V1]</button>
                            <button onclick="window.SettingsAppInstance.applyTheme('#1a001a', '#e0b0ff', 'Orbitron, sans-serif')" class="sov-btn" style="color:#e0b0ff; border-color:#e0b0ff;">DARK_PURPLE [ROYAL]</button>
                        </div>
                        <h3 style="font-size: 10px; color: #555; margin-top: 25px; margin-bottom: 10px;">TYPOGRAPHY_CORE</h3>
                        <select onchange="document.body.style.fontFamily = this.value" style="width:100%; background:#000; color:#00ff41; border:1px solid #333; padding:12px;">
                            <option value="'Courier New', monospace">COURIER_TERMINAL</option>
                            <option value="'Orbitron', sans-serif">ORBITRON_TACTICAL</option>
                            <option value="'Cinzel', serif">CINZEL_SOVEREIGN</option>
                        </select>
                    </div>
                `;

            case 'security':
                return `
                    <h1 style="font-family: 'Orbitron', sans-serif; color: #ff4444;">ENCLAVE_SHIELD</h1>
                    <div class="sov-card">
                        <div id="audit-status-text" style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">[ STANDBY ]</div>
                        <button onclick="window.SettingsAppInstance.runSecurityAudit()" class="sov-btn" style="width:100%;">RUN_CRYPTOGRAPHIC_AUDIT</button>
                        <div style="margin-top:20px; font-size:11px; color:#555; line-height:1.6;">
                            ENCRYPTION: AES-GCM-256<br>SESSION_LOCK: ACTIVE<br>LOCAL_VFS: ENCRYPTED
                        </div>
                    </div>
                `;

            case 'usage':
                return `
                    <h1 style="font-family: 'Orbitron', sans-serif; color: #00ff41;">SYSTEM_VITALITY</h1>
                    <div class="sov-card">
                        <h3 style="font-size: 10px; color: #555; margin-bottom: 15px;">STORAGE_RESOURCES</h3>
                        <div id="storage-usage" style="font-size: 20px; color: #fff; margin-bottom: 10px;">Calculating...</div>
                        <div style="height: 10px; background: #111; border: 1px solid #333;">
                            <div style="width: 45%; height: 100%; background: #00ff41;"></div>
                        </div>
                        <p style="font-size: 11px; color: #555; margin-top: 15px;">CPU_VPU_LOAD: 12% | MEMORY_BUFFER: 256MB</p>
                    </div>
                `;

            case 'language':
                return `
                    <h1 style="font-family: 'Orbitron', sans-serif; color: #00ff41;">LINGUISTIC_ADAPTER</h1>
                    <div class="sov-card">
                        <h3 style="font-size: 10px; color: #555; margin-bottom: 15px;">SYSTEM_LANGUAGE</h3>
                        <select style="width:100%; background:#000; color:#fff; border:1px solid #333; padding:12px;">
                            <option value="en">ENGLISH (SOVEREIGN_STANDARD)</option>
                            <option value="sw">SWAHILI (REGION_EAST_AFRICA)</option>
                            <option value="fr">FRENCH (REGION_WEST_AFRICA)</option>
                        </select>
                        <p style="font-size: 11px; color: #555; margin-top: 15px;">Note: Translation affects all Core Bureaus and Manifests.</p>
                    </div>
                `;

            case 'data':
                return `
                    <h1 style="font-family: 'Orbitron', sans-serif; color: #00ff41;">VAULT_PORTABILITY</h1>
                    <div class="sov-card" style="text-align:center;">
                        <i class="fas fa-database" style="font-size: 30px; color: #222; margin-bottom: 20px;"></i>
                        <p style="font-size: 12px; color: #888; margin-bottom: 20px;">Create an encrypted snapshot of your entire Sovereign VFS.</p>
                        <button onclick="window.SettingsAppInstance.exportEnclave()" class="sov-btn" style="width:100%; background:#00ff41; color:#000; font-weight:bold;">DOWNLOAD_ENCLAVE_BACKUP (.JSON)</button>
                    </div>
                `;
        }
    }

    async exportEnclave() {
        try {
            const db = await this.vfs.init();
            const tx = db.transaction("vault", "readonly");
            const store = tx.objectStore("vault");
            const allRecords = await new Promise(res => { store.getAll().onsuccess = (e) => res(e.target.result); });
            const blob = new Blob([JSON.stringify(allRecords)], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SOVEREIGN_BACKUP_${Date.now()}.json`;
            a.click();
        } catch (err) { alert("ERROR: VAULT_ACCESS_DENIED"); }
    }

    purgeVFS() {
        if (confirm("PROTOCOL_ZERO: Permanently destroy all local data?")) {
            indexedDB.deleteDatabase("SovereignCore_VFS");
            window.location.reload();
        }
    }
}