/**
 * void_enclave.js - SOVEREIGN ISOLATION STATE (v3.2)
 * Features: Silent Admin Uplink, Honeypot Decoys, Hardware Heartbeat, Duress Protocol
 */

export class VoidEnclave {
    constructor(container, kernel) {
        this.container = container;
        this.kernel = kernel;
        this.purgeTimer = null;
        this.obsTimer = null;
        this.heartbeatTimer = null;
        this.secondsRemaining = 60; 
        this.intruderLog = [];
    }

    /**
     * ENTRANCE: Materialize the Isolation Zone
     */
    materialize(reason = "IDENTITY_MISMATCH") {
        // 1. SILENT ALARM: Alert Admin immediately via Telegram (Invisible to intruder)
        this.silentUplink(reason);

        // 2. LOGGING: Initial Breach Entry
        console.error(`» VOID_ENCLAVE_ACTIVATED: ${reason}`);
        this.logEvent("ENCLAVE_MATERIALIZED", { 
            reason,
            timestamp: new Date().toISOString(),
            vector: reason === "DURESS_IDENTITY_VIOLATION" ? "PANIC_PIN" : "SYSTEM_ANOMALY"
        });

        // 3. UI GENERATION
        const voidHTML = `
            <div id="void-surface" style="position:fixed; inset:0; background:#000; color:#333; z-index:999999; font-family:monospace; display:flex; flex-direction:column; overflow:hidden;">
                
                <div style="width:100%; padding:10px 20px; border-bottom:1px solid #100; font-size:9px; color:#300; display:flex; justify-content:space-between; background:#020000;">
                    <span>NODE: RANGWE_STATION_01</span>
                    <span style="animation: pulse 1s infinite; color:#600;">● LIVE_TRACKING_ACTIVE</span>
                    <span>LOC: -0.6224 / 34.5098</span>
                </div>

                <div style="flex:1; display:flex;">
                    <div id="void-sidebar" style="width:220px; border-right:1px solid #1a0000; padding:20px; background:#050000;">
                        <div style="color:#400; font-size:10px; margin-bottom:20px; letter-spacing:1px;">[DECOY_FILESYSTEM]</div>
                        <ul style="list-style:none; padding:0; font-size:11px; color:#222;">
                            <li class="decoy-file" data-name="epos_investor_ledger.pdf" style="margin-bottom:12px; cursor:pointer;">> epos_investors.pdf</li>
                            <li class="decoy-file" data-name="mtaagrid_shares.xlsx" style="margin-bottom:12px; cursor:pointer;">> mtaagrid_shares.xlsx</li>
                            <li class="decoy-file" data-name="private_keys.txt" style="margin-bottom:12px; cursor:pointer;">> private_keys.txt</li>
                        </ul>
                        <div id="decoy-status" style="margin-top:40px; font-size:9px; color:#1a0000;">VFS_READ_ONLY</div>
                    </div>

                    <div id="void-main" style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; background: radial-gradient(circle, rgba(25,0,0,1) 0%, rgba(0,0,0,1) 100%);">
                        
                        <div id="void-glitch-title" style="letter-spacing:12px; font-size:24px; color:#500; text-shadow: 0 0 10px #200;">VOID_ENCLAVE</div>
                        <div id="purge-clock" style="margin:20px 0; font-size:48px; color:#300; font-weight:bold; letter-spacing:5px;">00:60</div>
                        
                        <div id="void-telemetry" style="font-size:10px; color:#333; margin-bottom:30px; min-height:15px; text-transform:uppercase;">Initializing Observation...</div>

                        <div id="panic-grid" style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; width:320px;">
                            <button class="panic-sig" onclick="voidEnclave.triggerPanic('SMS')">SIG_SMS</button>
                            <button class="panic-sig" onclick="voidEnclave.triggerPanic('CALL')">SIG_VOICE</button>
                            <button class="panic-sig" onclick="voidEnclave.triggerPanic('TG')">SIG_TG</button>
                            <button class="panic-sig" onclick="voidEnclave.triggerPanic('WA')">SIG_WA</button>
                            <button class="panic-sig" onclick="voidEnclave.triggerPanic('X')">SIG_X</button>
                            <button class="panic-sig" onclick="voidEnclave.triggerPanic('MAIL')">SIG_MAIL</button>
                        </div>

                        <button id="rebind-btn" style="margin-top:40px; background:transparent; border:1px solid #200; color:#200; padding:12px 24px; cursor:pointer; font-family:inherit; font-size:10px; text-transform:uppercase; transition: 0.3s;">
                            Rebind Sovereign Identity
                        </button>
                    </div>
                </div>

                <style>
                    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
                    .panic-sig { background:#050000; border:1px solid #1a0000; color:#300; font-family:monospace; font-size:9px; padding:12px; cursor:pointer; transition:0.3s; text-transform:uppercase; }
                    .panic-sig:hover { border-color:#800; color:#f00; background:#100; box-shadow: 0 0 15px rgba(255,0,0,0.1); }
                    #rebind-btn:hover { border-color:#500; color:#500; }
                </style>
            </div>
        `;

        this.container.innerHTML = voidHTML;
        window.voidEnclave = this; // Global bridge for button clicks

        // 4. DAEMON INITIALIZATION
        this.startPurgeCountdown();
        this.startObservationTelemetry();
        this.startHardwareHeartbeat();
        this.attachHoneypotLogic();
        this.attachRecoveryLogic();
    }

    /**
     * SILENT UPLINK: Background fetch to Telegram Bot
     */
    async silentUplink(reason) {
        const BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"; 
        const CHAT_ID = "YOUR_ADMIN_CHAT_ID";
        const timestamp = new Date().toLocaleTimeString();
        
        const alertText = `🚨 VPU_BREACH_ALERT 🚨\nNode: RANGWE_STATION_ALPHA\nTime: ${timestamp}\nEvent: ${reason.toUpperCase()}\nStatus: VOID_ENCLAVE_ENGAGED`;

        try {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: CHAT_ID, text: alertText })
            });
            this.logEvent("SILENT_UPLINK", { status: "SUCCESS" });
        } catch (e) {
            this.logEvent("SILENT_UPLINK_FAULT", { error: e.message });
        }
    }

    /**
     * MANUAL PANIC: Opens protocol links
     */
    triggerPanic(type) {
        const message = encodeURIComponent("VPU_CRITICAL_ALERT: Sovereign Identity Breach Detected at Rangwe Station Hub. Executing Deadlock.");
        const phone = "+2547XXXXXXXX"; // Your secure admin line
        
        const protocols = {
            'SMS': `sms:${phone}?body=${message}`,
            'CALL': `tel:${phone}`,
            'TG': `https://t.me/share/url?url=${message}`,
            'WA': `https://wa.me/${phone}?text=${message}`,
            'X': `https://twitter.com/intent/tweet?text=${message}`,
            'MAIL': `mailto:admin@thealcohesion.org?subject=VPU_BREACH&body=${message}`
        };

        if (protocols[type]) {
            this.logEvent("PANIC_SIGNAL_SENT", { type });
            window.open(protocols[type], '_blank');
        }
    }

    /**
     * HONEYPOT: Trap intruder in fake file interactions
     */
    attachHoneypotLogic() {
        document.querySelectorAll('.decoy-file').forEach(file => {
            file.onclick = (e) => {
                const fileName = e.target.getAttribute('data-name');
                this.logEvent("HONEYPOT_ACCESS_ATTEMPT", { file: fileName });
                
                const tel = document.getElementById('void-telemetry');
                tel.innerText = `ACCESS_DENIED: ${fileName} IS ENCRYPTED`;
                tel.style.color = "#800";
                setTimeout(() => tel.style.color = "#333", 2000);
            };
        });

        window.onkeydown = (e) => this.logEvent("KEYSTROKE_OBSERVED", { key: e.key });
    }

    /**
     * HARDWARE HEARTBEAT: Checks for USB/Anchor presence
     */
    startHardwareHeartbeat() {
        this.heartbeatTimer = setInterval(async () => {
            const anchor = localStorage.getItem('TLC_HW_ANCHOR'); 
            if (anchor === "PRESENT") {
                this.dissolveVoid();
            } else {
                this.logEvent("HEARTBEAT_CHECK", { status: "ANCHOR_MISSING" });
            }
        }, 5000);
    }

    startPurgeCountdown() {
        const clock = document.getElementById('purge-clock');
        this.purgeTimer = setInterval(() => {
            this.secondsRemaining--;
            if (clock) {
                clock.innerText = `00:${this.secondsRemaining.toString().padStart(2, '0')}`;
                if (this.secondsRemaining <= 10) clock.style.color = "#f00";
            }
            if (this.secondsRemaining <= 0) this.executePurge();
        }, 1000);
    }

    async executePurge() {
        clearInterval(this.purgeTimer);
        clearInterval(this.heartbeatTimer);
        clearInterval(this.obsTimer);
        
        await this.saveIntruderLog();
        localStorage.removeItem('vpu_session_token');
        sessionStorage.clear();
        location.reload();
    }

    dissolveVoid() {
        clearInterval(this.purgeTimer);
        clearInterval(this.heartbeatTimer);
        clearInterval(this.obsTimer);
        const surface = document.getElementById('void-surface');
        if (surface) surface.remove();
    }

    logEvent(type, details) {
        this.intruderLog.push({ timestamp: Date.now(), type, details });
        console.warn(`» VOID_OBSERVATION: ${type}`, details);
    }

    async saveIntruderLog() {
        const request = indexedDB.open("SOVEREIGN_CORE_DB");
        request.onsuccess = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains('security_logs')) {
                const tx = db.transaction('security_logs', 'readwrite');
                tx.objectStore('security_logs').add({ id: `breach_${Date.now()}`, log: this.intruderLog });
            }
        };
    }

    startObservationTelemetry() {
        const telemetry = document.getElementById('void-telemetry');
        const logs = ["SCAN_HARDWARE...", "TRACE_IP_VECTOR...", "OBSERVE_INGRESS...", "MAPPING_VIOLATION...", "HEARTBEAT_STABLE..."];
        let i = 0;
        this.obsTimer = setInterval(() => {
            if (telemetry) telemetry.innerText = logs[i++ % logs.length];
        }, 3000);
    }

    attachRecoveryLogic() {
        const btn = document.getElementById('rebind-btn');
        if (!btn) return;
        btn.onclick = () => {
            if (window.kernel && window.kernel.auth) {
                this.dissolveVoid();
                window.kernel.auth.renderMountButton();
            } else {
                location.reload();
            }
        };
    }
}