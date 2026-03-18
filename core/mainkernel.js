/**
 * core/kernel.js
 * VPU KERNEL - SOVEREIGN OS (MODULAR_V2)
 */
import { events } from './eventBus.js';
import { state } from './state.js';
import { WindowManager } from '../system/window-manager.js';
import { AuthManager } from '../security/auth.js';
import { InputHandler } from '../system/input-handler.js';
import { ProcessManager } from '../system/process-manager.js';
import { Taskbar } from '../ui/panels/taskbar.js';
import { setupContextMenu } from '../ui/context-menu.js'
import { bootShell } from '../ui/dock.js'
import { TopBar } from '../ui/top-bar.js'
import { unlockSystem, lockSystem } from '../security/lock-screen.js'
import { provisionInitialFiles } from '../system/provisioning.js'
import { FileOps } from '../system/file-ops.js';
import { KernelLog } from '../system/kernel-log.js';
import { ThemeEngine } from '../ui/theme.js';
import { AuditLog } from '../system/audit-log.js';
import { SecurityMonitor } from '../security/attestation.js';
import { RecoverySystem } from '../system/recovery.js';
import { TaskOverview } from '../system/task-overview.js';
import { SovereignAuth } from './auth.js';
import { SystemTray } from './tray.js';
import { NeuralWallpaper } from '../ui/wallpaper.js';
import { registry } from './registry-v2.js';
import { SovereignVFS } from '../system/vfs.js';
import { startBootSequence } from './boot.js'; // Refined boot sequence
import { VFS } from "../system/vfs/vfs-manager.js";
import { MemoryDriver } from "../system/vfs/drivers/memory-driver.js";
import { ProcDriver } from '../system/vfs/drivers/proc-driver.js';


class TLC_Kernel {
    constructor() {
        this.events = events;
        // Departments
        this.pm = new ProcessManager(); // Registry and Memory
        this.wm = new WindowManager();  // Tiling and Windows
        this.runningApps = new Set();
        window.kernel = this;
        this.version = "2.0.0-MODULAR";
        this.ui = {
            taskbar: new Taskbar() // Visual shell is now active
        };
        this.auth = new AuthManager(this);
        this.input = new InputHandler();
        this.version = "2.0.0-MODULAR";
        this.isBooted = false;
        ThemeEngine.init(this);
        this.logEvent = (msg, type) => KernelLog.log(msg, type);
        this.setupContextMenu = () => setupContextMenu(this);
        this.bootShell = () => bootShell(this);
        this.unlockSystem = () => unlockSystem(this);
        this.lockSystem = () => lockSystem(this);
        this.TopBar = () => TopBar(this);
        this.provisionInitialFiles = () => provisionInitialFiles(this);
        // Initialize the Nervous System
        // BIND SECURE FILE BRIDGE
        this.openSecureFile = (path) => FileOps.openSecureFile(this, path);
        // BIND AUDIT LOGGER
        this.logEvent = (type, message) => AuditLog.log(this, type, message);
        // Bind the shred method so it can be called from anywhere
        this.shredAndLock = (reason) => SecurityMonitor.shredAndLock(this, reason);
        //Overview
        this.overview = new TaskOverview(this);
        this.registry = [...registry, ...JSON.parse(localStorage.getItem('vpu_local_registry') || '[]')];//For DevCenter
        this.vpuExpiry = 86400000; // Define the 24-hour window
        // Start the background security monitors
        this.checkDeadDrop();
        this.state = state;

         this.vfs = new VFS(this);

        this.initVFS();

        // Mount the Virtual Process System
        const procData = new ProcDriver(this);
        this.vfs.mount("/system/proc", procData);

        console.log("PROC_FS: Mounted at /system/proc");

        this.init();
        
    }

    initVFS() {

        const temp = new MemoryDriver();

        this.vfs.mount("/temp", temp);

    }

    onLoginSuccess(signature) {
        SecurityMonitor.startPulse(this, signature);
    }

    toggleOverview() {
        this.overview.toggle();
    }

    /**
     * CORE BOOT SEQUENCE
     * Transition from Hardware Handshake to Authenticated Enclave
     */
     async boot() {   
        console.log("Kernel: Ignition sequence initiated...");
    
        // 2. Start the wallpaper immediately
        try {
            this.wallpaper = new NeuralWallpaper('neural-canvas', this);
        } catch (e) {
            console.error("Wallpaper failed to start:", e);
        }
            
        // 1. HARDWARE HANDSHAKE / PROVISIONING
        const hasHardwareKey = await this.verifyHardwareSignature();
        
        if (!hasHardwareKey) {
            // Instead of immediate panic, we check if we should allow provisioning
            const loginGate = document.getElementById('login-gate');
            if (loginGate) {
                console.warn("Kernel: Device not provisioned. Intercepting Login Gate.");
                
                loginGate.style.display = 'flex';
                loginGate.style.opacity = '1';
                
                loginGate.innerHTML = `
                    <div class="provision-container" style="text-align:center; color:#00ff41; font-family:monospace; padding:30px; border:1px solid #00ff41; background:rgba(0,10,0,0.95); box-shadow: 0 0 20px rgba(0,255,65,0.2);">
                        <h2 style="letter-spacing:3px; margin-bottom:10px;">HARDWARE_PROVISIONING</h2>
                        <div style="height:2px; background:#00ff41; width:50px; margin: 0 auto 20px auto;"></div>
                        <p style="font-size:12px; margin-bottom:25px; color:#888;">No Genesis Key [SIG_2025_12_26] detected on this terminal.</p>
                        <button id="provision-btn" style="background:#00ff41; color:#000; border:none; padding:12px 24px; cursor:pointer; font-weight:bold; font-family:monospace; transition:0.3s;">
                            GENERATE_ENCLAVE_KEY
                        </button>
                    </div>
                `;
                
                document.getElementById('provision-btn').onclick = () => {
                    localStorage.setItem('VPU_HW_ID', "SIG_2025_12_26_ALPHA_GENESIS");
                    this.logEvent('INFO', 'Hardware Signature provisioned to local storage.');
                    location.reload(); // Hard reboot to validate signature
                };
                return; // HALT BOOT: Wait for provisioning
            }
        }
    
        // 2. CHECK FOR POST-PANIC RECOVERY
        const lastPanic = localStorage.getItem('LAST_PANIC_CODE');
        if (lastPanic) {
            await RecoverySystem.run(lastPanic);
            // Log recovery after the sequence finishes
            this.logEvent('WARN', `System recovered from critical halt: ${lastPanic}`); 
        }
    
        // 3. TRIGGER THE SPLASH SCREEN / HANDOVER
        startBootSequence(() => {
            console.log("Kernel: Handover complete. Enabling Identity Access.");
            
            const loginGate = document.getElementById('login-gate');
            if(loginGate) {
                loginGate.style.display = 'flex';
                setTimeout(() => loginGate.style.opacity = '1', 50);
            }
            
            this.init(); 
            this.systemTray = new SystemTray(this);
            this.setupIdleLock(300000); 
            this.isBooted = true;
    
            // Log recovery only once here
            if (lastPanic) {
                this.logEvent('WARN', `System recovered from critical halt: ${lastPanic}`); 
            }
        }); // End of boot()
    
        const gateContainer = document.getElementById('login-gate'); // The div in your HTML
        
        // LINKING: Pass 'this' (the kernel instance) to the Auth class
        this.auth = new SovereignAuth(gateContainer, this); 
        
        // RENDER: Show the purple Enclave UI
        this.auth.render();
        
    }

    async init() {
        console.log(`%c [SYSTEM]: INITIATING_MODULAR_BOOT_SEQUENCE_${this.version}`, "color: #d4af37; font-weight: bold;");
        
        try {
            // 1. Hook into Global Events
            this.setupGlobalListeners();
            
            // 2. Identify the Hardware (Android/Desktop)
            this.events.emit('SYSTEM_BOOTING', { time: Date.now() });

            this.isBooted = true;
            console.log("%c [SYSTEM]: KERNEL_UPLINK_STABLE", "color: #00ff41;");
        } catch (error) {
            console.error("CRITICAL_KERNEL_PANIC:", error);
        }
    }

checkDeadDrop() {
    setInterval(() => {
        // GUARD 1: If no one is logged in, don't check for expiry
        if (!this.isLoggedIn) return; 

        const lastAuth = localStorage.getItem('vpu_last_auth');
        
        // GUARD 2: If logged in but timestamp is missing, that's a real breach
        if (!lastAuth) {
            this.shredAndLock("AUTH_TIMESTAMP_MISSING-TEMPORAL_DEAD_DROP_TRIGGERED");
            return;
        }

        const elapsed = Date.now() - parseInt(lastAuth);
        if (elapsed > this.vpuExpiry) {
            this.logEvent('SEC', 'Session expired via Temporal Dead Drop.');
            this.shredAndLock("TEMPORAL_DEAD_DROP_TRIGGERED");
        }
    }, 60000); 
}


  forceLockdown(reason) {
        this.lastAuthError = reason;
        
        // 1. Clear the session key (Wipe sensitive data from memory)
        this.sessionKey = null;
        
        // 2. Clear the desktop/apps
        document.getElementById('os-root').style.display = 'none';
        
        // 3. FORCE-SHOW the auth.js form immediately
        const gate = document.getElementById('login-gate');
        gate.style.display = 'flex';
        gate.style.opacity = '1';
        
        if (!this.auth) {
            this.auth = new SovereignAuth(gate, this);
        }
        this.auth.render();
        
        // 4. Update the status to show WHY they were kicked out
        const status = document.querySelector('#auth-status');
        if (status) {
            // Map the reason to the display text
            if (reason === "HARDWARE_ID_REJECTED") {
                status.innerText = "SECURITY_INTERCEPT: HARDWARE_MISMATCH";
            } else if (reason === "NETWORK_UPLINK_REJECTED") {
                status.innerText = "SECURITY_INTERCEPT: NETWORK_MISMATCH";
            } else {
                status.innerText = "CRITICAL_RE-AUTH: " + reason;
            }
            status.style.color = "#ff4444";
        }
    }  

      

async verifyHardwareSignature() {
    // We check for a specific 'hardware_id' in local storage 
    // that only a genuine member would have provisioned
    const hwid = localStorage.getItem('VPU_HW_ID');
    return hwid === "SIG_2025_12_26_ALPHA_GENESIS";
}

    /**
     * SECURE ENCLAVE BRIDGE
     * gatekeeper for all VFS communication
     */
    async enclaveBridge(appId, request) {
    // SECURITY GUARD 01: Verify App Identity
    if (!this.runningApps.has(appId)) {
        console.error(`Security Violation: Unregistered App [${appId}] attempted VFS access.`);
        return null;
    }

    // SECURITY GUARD 02: Session Integrity
    if (!this.sessionKey) {
        console.warn("Bridge Refused: No active encryption session.");
        return null;
    }

    // SECURITY GUARD 03: Operation Routing
    try {
        switch (request.operation) {
            case 'READ_SECURE':
                // 1. Audit Logging (Article 13 Compliance)
                this.logEvent('WARN', `SEC_AUDIT: [${appId}] accessed path: ${request.path}`);
                
                // 2. Consolidated Rank Check (The Guard Dog)
                const isRestrictedPath = request.path.includes('SEC.TAC') || request.path.includes('vaultfiles');
                
                if (isRestrictedPath && this.userRole !== 'OFFICER') {
                    this.logEvent('ERROR', `RANK_VIOLATION: ${this.userRole} denied access to ${request.path}`);
                    throw new Error("PRIVILEGE_ESCALATION_PREVENTED: Insufficient Rank.");
                }

                // 3. Execution
                return await SovereignVFS.read(request.path, this.sessionKey);
                            
            case 'WRITE_SECURE':
                return await SovereignVFS.write(request.path, request.data, this.sessionKey);

            default:
                return null;
        }
    } catch (err) {
        this.logEvent('ERROR', `Bridge Handshake Failed: ${err.message}`);
        return null;
    }
}

    // Method to register apps when they start
    registerApp(appId) {
        this.runningApps.add(appId);
        this.logEvent('SYS', `Process [${appId}] registered.`);
    }

    init() {

    // HARD GATE: Prevent UI initialization if not authenticated
    if (!this.isBooted) {
        console.log("Kernel: Standby mode active. Awaiting Handshake.");
        return; 
    }

    console.log("KERNEL: Identity Verified. Initializing Sovereign Environment...");
    this.initDOM();
    this.initTray();
    this.initClock();

    const loginBtn = document.getElementById('login-btn');
    const status = document.getElementById('auth-status');

    if (!loginBtn) return;

    

    // 4. PERSISTENT SYSTEM LISTENERS
    this.setupContextMenu();

    // Quick Lock: Ctrl + L
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
            e.preventDefault();
            this.lockSystem(); 
        }
    });

    // Bind the Unlock Button
        const unlockBtn = document.getElementById('unlock-btn');
        if (unlockBtn) {
            unlockBtn.onclick = () => this.unlockSystem();
        }

        // Bind the Enter Key specifically for the Lock Screen input
        const lockInput = document.getElementById('lock-pass-input');
        if (lockInput) {
            lockInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.unlockSystem();
                }
            });
        }

        // Allow "Enter" key to unlock
        document.getElementById('lock-pass-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.unlockSystem();
        });        
}

    /**
 * SHUTDOWN_SOVEREIGN
 * Graceful termination of Level 0 and Level 1 processes.
 */
shutdownSovereign() {
    //idempotency guard
    if (this._shutdownInProgress) return;
    this._shutdownInProgress = true;

    // 1. Authorization Gate
    if (!confirm("SHUTDOWN: Terminate all secure sessions and exit Enclave?")) {
        this._shutdownInProgress = false; 
        return;}

    console.warn("Kernel: Initiating Hardware Shutdown...");


    // 2. Clear Persistence Buffer
    // We clear the "LAST_PANIC" data on a graceful shutdown so 
    // it doesn't trigger a 'Recovery' message on the next clean boot.
    localStorage.removeItem('LAST_PANIC_CODE');

    // VISUAL OWNERSHIP LOCK (CRITICAL)
    document.body.style.background = '#000';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    // Now render shutdown ritual
    this.renderShutdownRitual();
    requestAnimationFrame(() => {
        document.body.classList.add('crt-shutdown');
    });

    // 3. Trigger visual CRT collapse
    document.body.classList.add('crt-shutdown');

    // 4. Physical Shutdown Sequence (Matches your 600ms CSS transition)
    setTimeout(() => {
    this.sessionKey = null;
    this.isLoggedIn = false;

    if (this.runningApps instanceof Set) {
        this.runningApps.clear();
    } else {
        this.runningApps = {};
    }

    // Attempt HARD browser exit (only works in trusted contexts / PWA)
    try {
        window.close();
    } catch (e) {}
}, 600);

// 6. FINAL HALT (finite, intentional)
    setTimeout(() => {
        document.body.innerHTML = `
            <div id="halt-screen" style="
                background:#000;
                height:100vh;
                width:100vw;
                display:flex;
                flex-direction:column;
                align-items:center;
                justify-content:center;
                color:#333;
                font-family:monospace;
                user-select:none;
                text-align:center;
            ">
                <p>System Halted</p>
                <p style="font-size:10px; opacity:0.4;">
                    Integrity Maintained · 0x20251226_CLEAN_EXIT
                </p>

                <p style="margin-top:18px; font-size:9px; opacity:0.25;">
                    Power control returned to user
                </p>

                <button onclick="location.reload()" style="
                    margin-top:24px;
                    background:transparent;
                    border:1px solid #222;
                    color:#222;
                    padding:6px 14px;
                    cursor:pointer;
                ">
                    REBOOT
                </button>
            </div>
        `;

        document.body.style.backgroundColor = "#000";
        console.log("Kernel: System halted cleanly.");
    }, 2600);

}

renderShutdownRitual() {
    document.body.innerHTML = `
        <div id="shutdown-ritual" style="
            position:fixed;
            inset:0;
            background:black;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            font-family:monospace;
            color:#aaa;
            text-align:center;
        ">
            <div style="opacity:0.9; margin-bottom:18px; font-size:14px;">
                ⏻ THEALCOHESION OS
            </div>

            <div style="font-size:11px; opacity:0.6; line-height:1.6;">
                Terminating VPUs…<br>
                Flushing volatile memory…<br>
                Revoking session keys…<br>
                Sealing enclave…
            </div>

            <div style="
                margin-top:28px;
                width:22px;
                height:22px;
                border:2px solid #222;
                border-top:2px solid #888;
                border-radius:50%;
                animation: spin 1s linear infinite;
            "></div>

            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
        </div>
    `;
}
   

    setupGlobalListeners() {
        // Listen for an app wanting to open
        this.events.on('PROCESS_START', (appId) => {
            console.log(`[KERNEL]: Allocating resources for ${appId}...`);
        });

        // Listen for security locks
        this.events.on('SECURITY_LOCK', () => {
            this.state.isLocked = true;
            console.warn("[SECURITY]: SYSTEM_LOCKED_BY_USER");
        });
    }


    async attemptLogin(id, pass) {
    try {
        // Capture THIS machine's unique hardware signature
        const hwSig = await this.getHardwareEntropy();

        const response = await fetch('http://localhost:3000/api/vpu/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: id,             // Matches 'user_name' in SQL
                password: pass,           // Matches server variable
                machineFingerprint: hwSig, // Matches server variable
                ipAddress: "127.0.0.1"    // Explicitly provided
            })
        });

        const data = await response.json();

        if (data.success) {
            // Success: Server verified credentials + hardware
            localStorage.setItem('vpu_last_auth', Date.now());
            await this.transitionToShell(id, pass);
            return true;
        } else {
            this.lastAuthError = data.message;
            return false;
        }
    } catch (e) {
        this.lastAuthError = "SERVER_OFFLINE";
        return false;
    }
}
}

// Instantiate and attach to window for backward compatibility with legacy apps
window.os = new TLC_Kernel();


document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-btn');
    const status = document.getElementById('auth-status');
    const box = document.querySelector('.login-box');
    const userField = document.getElementById('username');
    const passField = document.getElementById('pass-input');

    if (loginBtn) {
        loginBtn.onclick = async () => {
            const user = userField.value;
            const pass = passField.value;

            // 1. Enter Secure State (Single Impact Shake)
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.5';
            loginBtn.innerHTML = `<span class="btn-text">UPLINKING TO VPU...</span>`;
            box.classList.add('impact-shake', 'uplink-glow');
            setTimeout(() => box.classList.remove('impact-shake'), 500);

            // 2. Start Database Auth in background immediately
            const authPromise = window.kernel.attemptLogin(user, pass);

            // 3. Visual Cryptographic Sequence
            const sequence = [
                { msg: "» REQUESTING_HANDSHAKE...", delay: 600 },
                { msg: "» SCANNING_HARDWARE_SIGNATURE...", delay: 800 }, // Machine Binding
                { msg: "» VERIFYING_NETWORK_UPLINK...", delay: 800 },    // IP Binding
                { msg: "» DERIVING_BOUND_ENCLAVE_KEY...", delay: 1000 },
                { msg: "» DERIVING_GENESIS_ENTROPY...", delay: 800 },
                { msg: "» VALIDATING_MEMBER_SIGNATURE...", delay: 600 },
                { msg: "» MOUNTING_VFS_PARTITION_2025_12_26...", delay: 1000 },
                { msg: "» ALLOTMENT_ENCLAVE_SYNCHRONIZED.", delay: 400 },
                { msg: "» SYNCHRONIZING_BIRTHRIGHT...", delay: 400 },
                { msg: "» UPLINKING TO VPU TERMINAL", delay: 400 }
            ];

            for (const step of sequence) {
                status.innerText = step.msg;
                status.style.color = "#00ff41";
                box.style.borderColor = '#00ff41';
                await new Promise(r => setTimeout(r, step.delay));
                box.style.borderColor = '#004411';
            }

            // 4. THE UPDATED VERIFICATION CHECK
            const success = await authPromise;

            if (success) {
                status.innerHTML = `<span style="color: #bcff00;">ACCESS_GRANTED. INITIALIZING_SHELL...</span>`;
                loginBtn.innerHTML = `<span class="btn-text">UPLINK ACCEPTED</span>`;
                box.style.borderColor = '#bcff00';
                
                await new Promise(r => setTimeout(r, 800));
                await window.kernel.transitionToShell(); 
                
           } else {
                // 1. Trigger Rejection Visuals
                box.classList.remove('uplink-glow');
                box.classList.add('impact-shake');
                
                // 2. LOGIC FIX: Determine exactly what to say
                if (window.kernel.lastAuthError === "HARDWARE_ID_REJECTED") {
                    status.innerText = "SECURITY_DENIAL: UNAUTHORIZED_HARDWARE";
                } else if (window.kernel.lastAuthError === "NETWORK_UPLINK_REJECTED") {
                    status.innerText = "SECURITY_DENIAL: UNAUTHORIZED_NETWORK";
                } else {
                    // THIS WAS MISSING: Handles wrong password or general failure
                    status.innerText = "HANDSHAKE_FAILED: INVALID_CREDENTIALS";
                }

                // 3. Apply Rejection Styling
                status.style.color = "#ff4444";
                box.style.borderColor = '#ff4444';
                
                // 4. Reset Button
                loginBtn.innerHTML = `<span class="btn-text">INITIATE_HANDSHAKE</span>`;
                loginBtn.disabled = false;
                loginBtn.style.opacity = '1';

                // 5. Return to Standby after 3 seconds
                setTimeout(() => {
                    box.classList.remove('impact-shake');
                    status.innerText = "STANDBY: Awaiting Credentials...";
                    status.style.color = "#00ff41"; 
                    box.style.borderColor = '#004411';
                }, 3000);
            }
        };
    }
});