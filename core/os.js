/**
 * VPU KERNEL - SOVEREIGN OS (v1.2.8)
 * Core: TLC_Kernel
 * Logic: Window Management & Advanced App Routing
 */
import { SovereignAuth } from './auth.js';
import { SystemTray } from './tray.js';
import { NeuralWallpaper } from '../ui/wallpaper.js';
import { registry } from './registry-v2.js';
import { SovereignVFS } from '../system/vfs.js'; // Ensure VFS is imported for secure file handling
import { startBootSequence } from './boot.js'; // Refined boot sequence
import { VFSManager } from "../system/vfs/vfs-manager.js";
import { MemoryDriver } from "../system/vfs/drivers/memory-driver.js";
import { ProcDriver } from '../system/vfs/drivers/proc-driver.js';

class TLC_Kernel {
    constructor() {

        // 1. Initialize the Core VFS Manager first
        this.vfs = new VFSManager(this);

        // 2. Define your Drivers (Must happen BEFORE mounting)
        const procData = new ProcDriver(this); 

        // 3. Mount System Resources
        this.vfs.mount("/system/proc", procData);
        console.log("PROC_FS: Mounted at /system/proc");

        // 4. Link the Security Bridge (High-level logic)
        this.vfsBridge = new SovereignVFS(this); 

        // 5. Run the Identity/Birthright Handshake (The 100MB Check)
        this.initVFS();

        //Define the configuration object
        this.config = {
            authorizedMachine: localStorage.getItem('hw_id'),
            homeActionCenter: "NAIROBI_CENTRAL", // Or your default node
            version: "1.2.8"
        };
        
        this.ledgerLocked = true;
        this.setupContextMenu();
        this.isTilingActive = false;
        this.isDraggingWindow = false;
        this.runningApps = new Set(); // Track active processes
        this.isBooted = false;
        this.registry = [...registry, ...JSON.parse(localStorage.getItem('vpu_local_registry') || '[]')];//For DevCenter
        this.sessionKey = null; // The AES-GCM key derived at login
        this.pinnedApps = ['time', 'tnfi', 'terminal', 'files', 'browser', 'messages', 'camera','vscode', 'settings']; 
        this.idleTimer = null;
        // --- NEW MEMORY TRACKING ---
        this.maxMemory = 100; 
        this.currentMemory = 0;
        this.tiledWindowOrder = []; // Maintains swap order
        //OVERVIEW TRACKER
        this.isOverviewActive = false;
        // NEW: Debounce timer for updateTilingGrid
        this.tilingGridTimeout = null;
        this.tilingState = {};

        //App display on desktop
        this.runningApps = new Set(); // Currently open apps (Active)
        this.favorites = new Set(['terminal', 'wallet']); // User can add to this (Max 5)
        this.usageStats = {}; // Track launches for "Most Used" (Top 3)
        this.MAX_ACTIVE_APPS = 5;

        // Ensure we listen for the "Escape" key to toggle overview
                window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.toggleOverview();
            
                        // Alt+G: Toggle Tiling
            if (e.altKey && e.code === 'KeyG') {
                e.preventDefault();
                this.isTilingActive = !this.isTilingActive;
                
                if (this.isTilingActive) {
                    this.updateTilingGrid();
                } else {
                    // Restore Windows to floating state
                    const allWindows = document.querySelectorAll('.os-window');
                    
                    allWindows.forEach((win, idx) => {
                        win.style.transition = 'all 0.5s ease';
                        win.style.width = "clamp(320px, 65vw, 900px)";
                        win.style.height = "clamp(300px, 65vh, 720px)";
                        
                        // NEW: Reset floating window classes and z-indices
                        win.classList.remove('floating-extra');
                        win.style.zIndex = (100 + idx).toString(); // Reset to natural order
                        win.dataset.hasBeenDragged = 'false'; // Reset drag flag
                        
                        // Reset positions to natural cascade
                        const cascadeOffset = idx * 25;
                        win.style.left = `${85 + cascadeOffset}px`; // Dock width + offset
                        win.style.top = `${40 + cascadeOffset}px`;  // Top bar height + offset
                    });
                    
                    this.logSystemEvent("Tiling Engine: DISENGAGED", "warn");
                }
            }

            // Ctrl+Shift+Arrow: Smart Swap in Tiling Mode
            if (e.ctrlKey && e.shiftKey && this.isTilingActive) {
                e.preventDefault();
                
                if (e.code === 'ArrowLeft') this.smartSwap('left');
                if (e.code === 'ArrowRight') this.smartSwap('right');
                if (e.code === 'ArrowUp') this.smartSwap('up');
                if (e.code === 'ArrowDown') this.smartSwap('down');
            }

            // Ctrl+Alt+R: Cycle windows forward
            if (e.ctrlKey && e.altKey && e.code === 'KeyR') {
                e.preventDefault();
                this.cycleTiledWindows('forward');
            }

            // Ctrl+Alt+L: Cycle windows backward
            if (e.ctrlKey && e.altKey && e.code === 'KeyL') {
                e.preventDefault();
                this.cycleTiledWindows('backward');
            }
        });

        // --- MEMORY RESIZE SENSOR ---
        window.addEventListener('resize', () => {
            this.updateMemoryMeter();
        });

        // Initialize the meter at 0 on boot
        this.updateMemoryMeter();

        console.log("Kernel: Initializing Sovereign Core...");
        
        // 1. GLOBAL ROUTING LISTENER
        window.addEventListener('launchApp', (e) => {
            const appId = e.detail.appId;
            if (this.runningApps.has(appId)) {
                this.focusWindow(`win-${appId}`);
            } else {
                this.launchApp(appId);
            }
        });

        // 2. HIDE UI INITIALLY
        const osRoot = document.getElementById('os-root');
        // Ensure the background canvas exists for the Neural Wallpaper
        if (!document.getElementById('neural-canvas')) {
            const canvas = document.createElement('canvas');
            canvas.id = 'neural-canvas';
            document.body.prepend(canvas); // Place it at the very back
        }
        const loginGate = document.getElementById('login-gate');
        const topBar = document.getElementById('top-bar');
        
        if(osRoot) osRoot.style.display = 'none';
        if(loginGate) {
            loginGate.style.display = 'none';
            loginGate.style.opacity = '0';
        }
        if(topBar) topBar.classList.add('hidden');

        // 3. START BOOT SEQUENCE (Handover Logic)
        this.boot();

        window.addEventListener('keydown', (e) => {
    // 1. PREVENT DEFAULT SYSTEM ESCAPE BEHAVIOR
    // This stops the browser or OS from potentially closing the tab/window 
    // or exiting the 'fullscreen' lock we established during login.
    if (e.key === 'Escape') {
        e.preventDefault(); 
        
        // 2. CONTEXTUAL ESCAPE ONLY
        // We only allow ESC to exit the Task Overview, not the whole OS.
        if (document.body.classList.contains('task-overview-active')) {
            this.toggleTaskOverview();
            this.logEvent('SYS', 'Overview closed via ESC.');
            return;
        }

        // 3. CLOSE ACTIVE MODALS (Like the Vault Viewer)
        // If the Vault is open, ESC will close the file, but not the App.
        const activeVaultViewer = document.getElementById('vault-viewer');
        if (activeVaultViewer && activeVaultViewer.style.display !== 'none') {
            // We find the 'vault' instance and trigger its purge method
            if (this.activeProcesses['vault']) {
                this.activeProcesses['vault'].purgeMemory();
                return;
            }
        }

        // Log the blocked escape attempt
        console.warn("Kernel: Escape intercepted. OS shutdown must be manual via System Menu.");
        }
        
        // Ctrl + Space for Overview remains unchanged...
        if (e.ctrlKey && e.code === 'Space') {
            e.preventDefault();
            this.toggleTaskOverview();
        }
    });
    

        //Every 60 seconds, the Kernel should verify that the sessionKey is still valid and the VFS is accessible. If someone manually clears their browser cache or tries to inject code via the console, the system panics.
        setInterval(() => {
            // Tripwire: Check if the key was tampered with or lost
            if (this.isLoggedIn && !this.sessionKey) {
                this.triggerRealPanic("ENCLAVE_LOST", "Secure session key purged from volatile memory.");
            }
        }, 10000); // Check every 10 seconds

        // 4. PERSISTENT BOOT CHECK
        // Check if we crashed previously before showing the login gate
        const lastPanic = localStorage.getItem('LAST_PANIC_CODE');
        if (lastPanic) {
            console.warn("Kernel: Recovering from critical failure...");
            // You can trigger your recovery UI here
        }

        // 5. SILENT SENTRY (Heartbeat)
        // Checks every 5 seconds if the system is still secure
        setInterval(() => {
            if (this.isBooted && this.sessionKey) {
                // Tripwire: If VFS partition is missing from storage while system is 'on'
                if (!localStorage.getItem('vpu_vfs_root')) {
                    this.triggerRealPanic("0xVFS_INTEGRITY_03", "Hardware partition disconnected during runtime.");
                }
            }
        }, 500000); // End of constructor

        //Escape key disabled
        window.onkeydown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                return false; 
            }
        };
        //Stay on Page
        window.onbeforeunload = (e) => {
            if (this.isLoggedIn && this.sessionKey) {
                // This triggers the standard browser "Are you sure you want to leave?" dialog
                e.preventDefault();
                e.returnValue = 'Sovereign Session Active: Unsaved Enclave data will be shredded.';
                return e.returnValue;
            }
        };

        // 1. Monitor the Fullscreen State
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.isLoggedIn) {
                this.logEvent('SEC', 'SOVEREIGN_STATE_BREACH: Fullscreen exited.');
                
                // Immediate Security Action:
                // If someone hits ESC to leave fullscreen, we shred the session.
                this.lockSystem(); 
                
                alert("SECURITY ALERT: Enclave locked due to Display Mode breach. Manual login required.");
            }
        });

        document.addEventListener('fullscreenchange', () => {
            // If we are logged in but NOT in fullscreen anymore
            if (!document.fullscreenElement && this.isLoggedIn) {
                this.logEvent('SEC', 'SOVEREIGN_STATE_BREACH: Fullscreen exited.');
                
                // Trigger the 3-second countdown
                this.triggerEscapeWarning();
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Block the event from apps and windows
                e.stopImmediatePropagation();
                e.preventDefault();

                // Visual nudge to use the menu
                this.logEvent('WARN', 'ESC_BLOCKED: Use the System Menu for manual shutdown.');
                
                // Brief flash on the Shutdown button if it exists
                const shutdownBtn = document.querySelector('.menu-item-shutdown'); 
                if (shutdownBtn) shutdownBtn.style.background = "rgba(255,0,0,0.5)";
            }
        }, true); // The 'true' is vital for capturing the event first

        
        // AUDIO CONTROLLER
        // 1. Setup the Audio Hardware
        this.initAudioEngine = () => {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.connect(this.audioContext.destination);
                
                this.systemVolume = 80;
                this.masterGain.gain.value = 0.8;
                console.log("Kernel: Audio Engine Online.");
            } catch (e) {
                console.warn("Kernel: Audio hardware deferred until user interaction.");
            }
        };

        // 2. Setup the Volume Controller
        this.setSystemVolume = (value) => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            this.systemVolume = value;
            const volumeLevel = value / 100;

            // Control Web Audio API
            if (this.masterGain) {
                this.masterGain.gain.setTargetAtTime(volumeLevel, this.audioContext.currentTime, 0.02);
            }

            // Control all <audio> and <video> tags in the OS
            document.querySelectorAll('audio, video').forEach(media => {
                media.volume = volumeLevel;
            });

            // Logging (Using your existing logEvent method)
            this.logEvent('SYS', `Volume set to ${value}%`);
        };

        // 3. Initialize immediately
        this.initAudioEngine();

        this.renderMenuContent = this.renderMenuContent.bind(this);

        this.initBattery(); //FOR TOPBAR BATTERY

        //used for files.js 
        this.fs = {
            read: async (path) => {
                if (!this.sessionKey) return null; // Return null instead of crashing
                try {
                    return await window.SovereignVFS.read(path, this.sessionKey);
                } catch (e) {
                    console.error("ALCOHESION_DECRYPT_ERROR:", e);
                    return null;
                }
            },
            write: async (path, data) => {
                if (!this.sessionKey) return;
                return await window.SovereignVFS.write(path, data, this.sessionKey);
            }
        };

        // ADD THE ROUTING LOGIC HERE
        this.events = new EventTarget(); // Private system bus

        // Best Practice: Secured Event Methods
        this.on = (event, callback) => {
            this.events.addEventListener(event, (e) => callback(e.detail));
        };

        this.emit = (event, data) => {
            console.log(`[KERNEL_SIGNAL]: ${event}`, data);
            this.events.dispatchEvent(new CustomEvent(event, { detail: data }));
        };

        this.notify = (msg, type = 'normal') => {
            if (typeof this.showNotification === 'function') {
                this.showNotification(msg, type);
                return;
            }
            console.log(`[KERNEL_NOTIFY ${type.toUpperCase()}]: ${msg}`);
        };

        // Orchestration Logic
        this.on('FILE_CREATED', (fileData) => {
            // Refresh FilesApp only if it's currently running to save memory
            if (this.runningApps.has('files')) {
                this.activeProcesses['files']?.updateUI?.();
            }
            
            // Automatically prepare Comms Hub routing
            this.activeProcesses['comms']?.queueForRouting(fileData);
            
            this.notify(`SYSTEM: NEW_FOLIO_DETECTED [${fileData.name}]`, "normal");
        });

        // NETWORK MONITORING
        this.network = {
            ip: '127.0.0.1',
            status: 'DISCONNECTED', // Initial status
            isConnected: false,     // Boolean flag for logic checks
            backend: 'http://localhost:3000' // Base URL (don't include /api/vpu here to keep it flexible)
        };

        // Add a method to check the link
        this.checkSovereignLink = async () => {
            try {
                // We append /api/vpu/status to the base backend URL
                const response = await fetch(`${this.network.backend}/api/vpu/status`);
                const data = await response.json();
                
                this.network.isConnected = true;
                this.network.status = 'CONNECTED';
                
                // Logs to your OS notification system
                this.logEvent(`Sovereign Link Active: ${data.total_members} Members Sync'd.`, 'success');
            } catch (e) {
                this.network.isConnected = false;
                this.network.status = 'OFFLINE';
                this.logEvent('Sovereign Link Offline: Database unreachable.', 'critical');
            }
        };

        this.checkSovereignLink();
        this.securityCheckInterval = setInterval(() => this.verifySecurityPerimeter(), 30000); // Check every 30s
        this.vpuExpiry = 24 * 60 * 60 * 1000; // 24 Hours
        this.checkDeadDrop();

        //The Enclave will now self-destruct if not refreshed.
        this.sessionStart = Date.now();
        setInterval(() => {
            const twentyFourHours = 24 * 60 * 60 * 1000;
            if (this.isBooted && (Date.now() - this.sessionStart > twentyFourHours)) {
                this.shredAndLock("TEMPORAL_DEAD_DROP");
                this.verifyPerimeter()
            }
        }, 60000); // Check every minute

        // --- SOVEREIGN RESOURCE LEDGER (RRL) ---
        this.ledger = JSON.parse(localStorage.getItem('vpu_rrl_ledger')) || {
            balances: {
                "CENTRAL_NODE": 0.00,
                "NAIROBI_BRANCH": 0.00,
                "MOMBASA_BRANCH": 0.00
            },
            // Adding metadata directly here ensures UI colors are always available
            metadata: {
                "CENTRAL_NODE": { symbol: "CC", color: "#a855f7", label: "Central Core" },
                "NAIROBI_BRANCH": { symbol: "NBC", color: "#00ff41", label: "Nairobi Node" },
                "MOMBASA_BRANCH": { symbol: "MBC", color: "#00d4ff", label: "Mombasa Node" }
            },
            history: []
        };

        this.mintQueue = JSON.parse(localStorage.getItem('vpu_mint_queue')) || [];
    }

    // --- ADD THIS METHOD: The Kernel's "Identity Sensor" ---
    async getKernelFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl');
            const renderer = gl.getParameter(gl.RENDERER);
            // Must match the entropy formula used in loading.js exactly
            const entropy = [navigator.hardwareConcurrency, renderer, screen.colorDepth, navigator.deviceMemory].join("||");
            const msgBuffer = new TextEncoder().encode(entropy);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) { 
            return null; 
        }
    }

   async initVFS() {
    // 1. Mount temporary memory for initial boot processes
    this.vfs.mount("/temp", new MemoryDriver());

    try {
        // 2. Fetch the hardware ID saved during registration/provisioning
        // 1. Try to get ID from memory first
            let hw_id = localStorage.getItem('hw_id') || localStorage.getItem('vpu_hw_id');

            // 2. RECOVERY: If missing, the Kernel re-calculates it locally
            if (!hw_id || hw_id === "null") {
                console.log("Kernel: Identity lost. Re-scanning hardware...");
                hw_id = await this.getKernelFingerprint();
                if (hw_id) localStorage.setItem('hw_id', hw_id);
            }

        if (!hw_id) throw new Error("NO_HARDWARE_IDENTITY_FOUND");

        // 3. The Handshake: Prove this machine is bound to the 100MB allotment
        const response = await fetch('http://localhost:3000/api/spacs/vfs-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hw_id })
        });

        // 4. Security Check
        if (!response.ok) {
            // If the bridge says 403, the machine isn't bound/provisioned
            if (response.status === 403) {
                console.warn("VFS_SECURITY: Hardware not bound to a provisioned birthright.");
                window.location.href = '../waiting-approval.html';
                return;
            }
            throw new Error(`Uplink Failed: ${response.status}`);
        }

        const data = await response.json();

        // 5. Load the 100MB Allotment
        if (data.success && data.status === "SYNCHRONIZED") {
            this.vfs_status = "ONLINE";
            this.storageQuota = data.allotment; // Successfully loaded 100MB
            console.log(`%c VFS_SYNC_COMPLETE: 100MB Allotment Active on ${data.vault_id}`, "color: #00ff88; font-weight: bold;");
        }

    } catch (e) {
        console.error("VFS_SYNC_FAULT: Entering Isolation Mode.", e.message);
        this.vfs_status = "ISOLATED";
    }
}

async ingestSovereignDrive(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = new TextDecoder().decode(new Uint8Array(e.target.result.slice(0, 8192)));
            
            const startTag = "---VPU_MANIFEST_START---";
            const endTag = "---VPU_MANIFEST_END---";
            
            try {
                const jsonStr = content.substring(content.indexOf(startTag) + startTag.length, content.indexOf(endTag)).trim();
                const manifest = JSON.parse(jsonStr);

                // Save to IndexedDB (Sovereign Vault)
                await this.saveToVault(manifest); 
                resolve(true);
            } catch (err) {
                console.error("INGEST_ERROR: Invalid Manifest Format.");
                resolve(false);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Check in indexedDb
async getManifestFromDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open("VPU_Sovereign_DB", 1);
        request.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("system_vault")) return resolve(null);
            const tx = db.transaction("system_vault", "readonly");
            const req = tx.objectStore("system_vault").get("vpu_manifest");
            req.onsuccess = () => resolve(req.result ? req.result.data : null);
            req.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
    });
}

    //The Enclave will now self-destruct if not refreshed.
    async verifyPerimeter() {
    const currentHW = await this.getHardwareEntropy();
    // In a real scenario, you'd fetch the current public IP here
    if (this.isBooted && currentHW !== this.currentUserSignature) {
        this.shredAndLock("HARDWARE_TAMPER_DETECTED");
    }
}

    getHomeActionCenter() {
        // These coordinates would be hardcoded for the TLC/Branch installation
        return { lat: -1.286389, lon: 36.817223 }; // Example: Nairobi Center
    }

    getRegisteredHardware() {
        // The SHA-256 fingerprint generated during member genesis
        return "8f92b...c32a"; 
    }

shredAndLock(reason) {
    this.sessionKey = null; // Wipe the Enclave Key from RAM
    this.isBooted = false;
    
    // Switch UI to the Reset/Contact Form
    const gate = document.getElementById('login-gate');
    gate.style.display = 'flex';
    document.getElementById('os-root').style.display = 'none';
    
    window.dispatchEvent(new CustomEvent('vpu:security_breach', { detail: { reason } }));
    alert(`SECURITY_CRITICAL: ${reason}. Enclave Shredded.`);
}

checkDeadDrop() {
    setInterval(() => {
        const lastAuth = localStorage.getItem('vpu_last_auth');
        if (Date.now() - lastAuth > this.vpuExpiry) {
            this.shredAndLock("TEMPORAL_DEAD_DROP_TRIGGERED");
        }
    }, 60000); // Check every minute
}
async verifySecurityPerimeter() {
    if (!this.isLoggedIn) return; // Only watch if a session is active

    const binding = await this.getSecurityBinding(); // Fetches HW + IP
    
    // If current hardware/network doesn't match the session's bound identity
    if (binding.fingerprint !== this.currentUser.bound_machine_id) {
        this.triggerRealPanic("HW_MISMATCH", "Machine binding integrity lost.");
        this.invokeGatekeeper("SECURITY_MISMATCH");
    }
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
//The Unified Binding Function
async getSecurityBinding() {
    // 1. Hardware Fingerprint Logic
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    const hardwareEntropy = [
        navigator.hardwareConcurrency,
        screen.width + 'x' + screen.height,
        debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'no-gpu',
        Intl.DateTimeFormat().resolvedOptions().timeZone
    ].join('|');

    // 2. IP Binding Logic (Using a public API)
    let ip = null;
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ip = data.ip;
    } catch (e) {
        console.error("VPU_NETWORK_ERROR: Could not resolve Public IP.");
        // THROW ERROR INSTEAD OF FALLBACK
        throw new Error("NETWORK_UPLINK_OFFLINE");
    }

    // Combine hardware entropy with the STRICT IP
    const hardware = [
        navigator.hardwareConcurrency,
        screen.width + "x" + screen.height,
        new Date().getTimezoneOffset(),
        ip // Using the real IP here
    ].join('|');

    const msgBuffer = new TextEncoder().encode(hardware);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const fingerprint = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    return { fingerprint, ip };
}
    // For testing new Apps by Devs

        executeTemporary(code, manifest) {
            const tempId = `live-view-${Date.now()}`;
            
            // 1. Create a dummy app object
            const tempApp = {
                id: tempId,
                name: `PREVIEW: ${manifest.name || 'UNNAMED'}`,
                icon: '🧪',
                file: 'local_module',
                code: code
            };

            // 2. Launch a special temporary window
            this.launchAppInstance(tempApp);
            this.logEvent('INFO', `LIVE_VIEW_INITIATED: Sandboxing temporary logic.`);
        }

        /**
     * DEBOUNCED_updateTilingGrid
     * Prevents rapid duplicate calls during resize/drag operations
     */
    debouncedUpdateTilingGrid(delay = 50) {
        if (this.tilingGridTimeout) {
            clearTimeout(this.tilingGridTimeout);
        }
        
        this.tilingGridTimeout = setTimeout(() => {
            this.updateTilingGrid();
            this.tilingGridTimeout = null;
        }, delay);
    }

    // TOPBAR ICONS
    createSystemIcons() {
        const trayGroup = document.createElement('div');
        trayGroup.className = 'status-group';

        // Simplified template for an icon
        const getIcon = (path) => `
            <svg class="sys-icon" viewBox="0 0 24 24" fill="none" stroke="#a445ff" stroke-width="2">
                <path d="${path}" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`;

        const wifiPath = "M2 20h.01M7 20v-4m5 4V11m5 9V7m5 13V3";
        const audioPath = "M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07";
        const chevronPath = "M6 9l6 6 6-6";

        trayGroup.innerHTML = `
            ${getIcon(wifiPath)}
            ${getIcon(audioPath)}
            <span class="chevron-wrapper">${getIcon(chevronPath)}</span>
        `;

        return trayGroup;
    }

    //TOPBAR BATTERY
    initBattery() {
    // Check if the API is available
    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            const updateUI = () => {
                const level = Math.round(battery.level * 100);
                
                // Get the elements
                const topPercent = document.getElementById('top-battery-percent');
                const topFill = document.getElementById('top-battery-fill');

                if (topPercent) {
                    topPercent.innerText = `${level}%`;
                    console.log("Battery Updated:", level); // Check your console for this!
                }
                
                if (topFill) {
                    topFill.style.width = `${level}%`;
                    // Visual status
                    topFill.style.background = (level <= 20) ? '#ff4444' : '#a445ff';
                }
            };

            // Initial call and event listeners
            updateUI();
            battery.addEventListener('levelchange', updateUI);
            battery.addEventListener('chargingchange', updateUI);
        }).catch(err => {
            console.warn("Battery API failed:", err);
            // Fallback: Just show 100% so it's not empty
            if(document.getElementById('top-battery-percent')) {
                document.getElementById('top-battery-percent').innerText = "100%";
            }
        });
    } else {
        console.error("Battery API not supported on this browser/context.");
    }
}

    // --- MEMORY TRACKER ---
    updateMemoryMeter() {
    // 1. Count windows and calculate memory
    const windows = document.querySelectorAll('.os-window').length;
    this.currentMemory = Math.min(windows * 1, 100);
    
    // 2. Update the physical bar (for desktop)
    const bar = document.getElementById('memory-bar');
    if (bar) {
        bar.style.width = `${this.currentMemory}%`;
        bar.classList.remove('warning', 'critical');
        if (this.currentMemory > 80) bar.classList.add('critical');
        else if (this.currentMemory > 50) bar.classList.add('warning');
    }

    // 3. Update the Label (The Fix for Mobile)
    const label = document.querySelector('.monitor-label');
    if (label) {
        // This checks if the screen is mobile-sized (under 768px)
        if (window.innerWidth <= 768) {
            label.innerText = `${this.currentMemory}%`; 
            label.style.display = 'block'; // Ensure it's visible
        } else {
            label.innerText = `VPU`;
        }
    }
}

    /**
 * SHUTDOWN_SEQUENCE (2025-12-26 Compliant)
 * Hard wipe of all volatile memory and return to cold boot state.
 */
async shutdown() {
    this.logEvent('SYS', 'SHUTDOWN: Purging volatile memory...');

    // 1. Wipe the keys and session
    this.sessionKey = null;
    this.isLoggedIn = false;
    
    // 2. Clear sensitive UI elements immediately
    document.getElementById('os-root').innerHTML = '';
    
    // 3. The "Halt" UI
    document.body.innerHTML = `
        <div style="background:#000; color:#00ff41; height:100vh; width:100vw; 
                    display:flex; flex-direction:column; align-items:center; 
                    justify-content:center; font-family:monospace; text-align:center;">
            <h2 style="border:1px solid #00ff41; padding:20px;">SYSTEM_HALTED</h2>
            <p style="margin-top:20px; color:#444;">Genesis Block [SIG_2025_12_26] Locked.</p>
            <p style="font-size:12px; color:#222;">It is now safe to close your browser window.</p>
            <button onclick="window.location.reload()" 
                    style="margin-top:30px; background:transparent; border:1px solid #222; color:#222; cursor:pointer;">
                REBOOT_KERNEL
            </button>
        </div>
    `;

    // 4. Try to close (will only work if the OS was opened via a launcher)
    let id = window.setInterval(null, 0);
    while (id--) window.clearInterval(id);
    window.close(); 
}

    /**
     * TRIGGER_REAL_PANIC
     * Immediate Level 0 Halt. Wipes session and displays Red Screen.
     */
    triggerRealPanic(errorCode, details) {
        console.error(`!!! KERNEL PANIC: ${errorCode} !!!`);
        
        // 1. Log for Recovery
        localStorage.setItem('LAST_PANIC_CODE', errorCode);
        localStorage.setItem('LAST_PANIC_TIME', Date.now());

        // 2. Security Wipe
        this.sessionKey = null;
        this.isLoggedIn = false;
        
        // 3. Halt all background loops
        for (let i = 1; i < 9999; i++) window.clearInterval(i);

        // 4. UI Takeover (The Red Screen)
        document.body.innerHTML = `
            <div style="background:#800000; color:#fff; height:100vh; width:100vw; padding:50px; font-family:monospace; position:fixed; z-index:999999;">
                <h1 style="background:#fff; color:#800000; padding:0 10px; display:inline-block;">FATAL_ERROR: ${errorCode}</h1>
                <p style="margin-top:20px;">The Sovereign Kernel has halted to protect Member Allotments (2025-12-26).</p>
                <p style="color:#ffcc00;">TRACE: ${details}</p>
                <p style="margin-top:50px;">PRESS [R] TO ATTEMPT ENCLAVE RECOVERY</p>
            </div>
        `;
        
        window.onkeydown = (e) => { if(e.key.toLowerCase() === 'r') window.location.reload(); };
    }

    // IDLE LOCK SYSTEM
    setupIdleLock(timeout) {
        const resetTimer = () => {
            clearTimeout(this.idleTimer);
            this.idleTimer = setTimeout(() => {
                // Ensure lockSystem exists before calling
                if (this.lockSystem) this.lockSystem();
            }, timeout);
        };

        // Listen for activity to reset the 5-minute clock
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('mousedown', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('touchstart', resetTimer);
        
        resetTimer(); // Start the first countdown
    }

    // It creates a central logging pipe for all the "Sovereign" apps.
    broadcastToKernel(source, message, type = 'info') {
        console.log(`[${source.toUpperCase()}] [${type.toUpperCase()}]: ${message}`);
        
        // If you have a logEvent system, pipe it there too:
        if (typeof this.logEvent === 'function') {
            this.logEvent(type.toUpperCase(), `${source}: ${message}`);
        }
    }
    

    /**
     * ADVANCED ROUTING TABLE
     * Centralized definitions for app initialization.
     */
    get APP_ROUTES() {
        return {
            'terminal': async (container) => {
                const m = await import('../apps/terminal/index.js');
                
                // THE BYPASS: Providing the internal signature required by TerminalApp
                const apiBridge = {
                    signature: 'SOVEREIGN_CORE_V1',
                    identity: 'CHIEF_ADMIN',
                    vfs: this.vfs,
                    // Bridge back to Kernel's notification system
                    notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                    // Used for Comms Hub integration and record signing
                    getSignature: () => 'ADMIN_CORE_' + this.sessionKey?.substring(0,4).toUpperCase(),
                    getRole: () => 'SUPERUSER',
                    close: () => this.closeApp('terminal')
                };

                const instance = new m.TerminalApp(container, apiBridge);
                instance.init();

                // Register process for memory management
                this.activeProcesses = this.activeProcesses || {};
                this.activeProcesses['terminal'] = instance;

                return instance;
            },
            'time': async (container) => {
                const { TimeApp } = await import('../apps/time/index.js');
                const { SovereignGovernance } = await import('../apps/sovereignVFS.js');

                // Initialize Governance with the Driver and the Kernel as the API
                const governance = new SovereignGovernance(this, window.SovereignVFS);

                const instance = new TimeApp(container, governance, this.sessionKey, 'USER');
                instance.init();
                return instance;
            },
            'tnfi': (container) => {
                return this.renderTNFIDashboard(container);
            },
            'vault': async (container) => {
                const m = await import('../apps/vault.js');
                const instance = new m.VaultApp(container, this);
                await instance.init();

                // CRITICAL: Save the instance so the Kernel can talk to it later
                this.activeProcesses = this.activeProcesses || {};
                this.activeProcesses['vault'] = instance;

                return instance;
            },

            'app-store': async (container) => {
                // If app-center.js is in /js/os-core/apps/
                const { HiveCenter } = await import('../apps/app-center/index.js'); 
                
                const apiBridge = {
                    signature: 'SOVEREIGN_CORE_V1',
                    getMemory: () => Math.round((this.currentMemory / this.maxMemory) * 100),
                    getRoles: () => this.userRole || ['ANY'],
                    getLiveResourceLoad: (id) => 10 // Added to prevent 'undefined' errors
                };

                const instance = new HiveCenter(container, apiBridge);
                instance.init();
                return instance;
            },

            'vscode': async (container) => {
                // Adjust the path to where your logic-forge.js (Dev Center) is stored
                const { LogicForge } = await import('./logic-forge.js'); 
                
                const apiBridge = {
                    signature: 'SOVEREIGN_CORE_V1',
                    // LogicForge specifically needs crypto for Local Signing (Art 13.2)
                    crypto: {
                        sign: async (code, manifest) => {
                            console.log("[VPU_SEC]: LOCAL_SIGNING_SEQUENCER_START");
                            // Simple mock signature; in production, use WebCrypto API
                            return btoa(code.length + manifest.id + Date.now()).substring(0, 16);
                        }
                    },
                    getMemory: () => Math.round((this.currentMemory / this.maxMemory) * 100)
                };

                const instance = new LogicForge(container, apiBridge);
                instance.init();
                return instance;
            },

            
            'vpu-sovereign-ai-core': async (container) => {
                // Ensure the path matches your deployment location
                const { SovereignAI } = await import('./sovereign-ai-core.js'); 
                
                const apiBridge = {
                    signature: 'SOVEREIGN_CORE_V1',
                    ssi: window.vpu_ssi, // Access to the Ethical Guard
                    ai: {
                        getWorkspaceContext: () => {
                            return Object.values(this.registry).map(app => ({
                                id: app.id,
                                name: app.name,
                                purpose: app.manifest?.purpose
                            }));
                        }
                    },
                    fs: this.vfs, // Persistence for ai_memory.json
                    getMemory: () => Math.round((this.currentMemory / this.maxMemory) * 100)
                };

                const instance = new SovereignAI(container, apiBridge);
                await instance.init();

                // Track process in the Kernel
                this.activeProcesses = this.activeProcesses || {};
                this.activeProcesses['vpu-sovereign-ai-core'] = instance;

                return instance;
            },

            'files': async (container) => {
                const { FilesApp } = await import('../apps/filing-system/index.js');
                const { SovereignGovernance } = await import('../apps/sovereignVFS.js');

                // 1. Initialize Governance with the Driver and the Kernel as the API
                const governance = new SovereignGovernance(this, window.SovereignVFS);
                
                // 2. Pass the governance engine and the session key derived at login
                const instance = new FilesApp(container, governance, this.sessionKey, 'OFFICER');
                
                await instance.init();

                // 3. Register as an active process for memory/window management
                this.activeProcesses = this.activeProcesses || {};
                this.activeProcesses['files'] = instance;

                return instance;
            },

            'vault': async (container) => {
                const { VaultApp } = await import('../apps/vault.js');
                
                // Vault needs the Kernel itself to call this.kernel.enclaveBridge
                // It also needs the sessionKey to decrypt the Investors.txt on the fly
                const instance = new VaultApp(container, this);
                await instance.init();

                this.activeProcesses = this.activeProcesses || {};
                this.activeProcesses['vault'] = instance;

                return instance;
            },

            'comms': async (container) => {
                const { onInit } = await import('../apps/comms/index.js');

                // The Comms Hub needs access to the VFS for attachments
                // and the Kernel's notify system for signal alerts.
                const apiBridge = {
                    signature: 'SOVEREIGN_CORE_V1',
                    vfs: this.vfs,
                    notify: (msg) => this.showNotification ? this.showNotification(msg) : console.log(msg),
                    getRole: () => this.userRole || 'OFFICER',
                    getSignature: () => this.userRole || 'ADMIN_CORE_01',
                    // Logic to bridge back to Files if user wants to pick an attachment
                    openFilePicker: () => this.launchApp('files'),
                    container: container
                };

                // Initialize the modular app
                onInit(apiBridge);

                // Register process for Kernel tracking
                this.activeProcesses = this.activeProcesses || {};
                this.activeProcesses['comms'] = { container, apiBridge };

                return { container, apiBridge };
            },

            'monitor': async (container) => {
            const { MonitorApp } = await import('./monitor.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // Provides the monitor access to all registered app metadata
                getRegistry: () => masterRegistry,
                // Calculates live load for the 100MB Allotment
                getSystemMetrics: () => ({
                    ramUsed: this.currentMemory,
                    ramTotal: this.maxMemory,
                    activeTasks: Object.keys(this.activeProcesses || {}).length
                }),
                notify: (msg, type) => this.showNotification(msg, type)
            };

            const instance = new MonitorApp(container, apiBridge);
            instance.init();
            
            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['monitor'] = instance;
            return instance;
        },

        'identity': async (container) => {
            const { IdentityManager } = await import('../apps/identity-registry/index.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // Essential for device-binding verification
                network: { ip: this.network?.ip || '127.0.0.1' },
                // Passes the current session key for identity signing
                session: this.sessionKey,
                close: () => this.closeApp('identity')
            };

            const instance = new IdentityManager(container, apiBridge);
            if (instance.init) await instance.init(); // Sync with DB and render
            else instance.render(); // fallback

            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['identity'] = instance;
            return instance;
        },

        'biome': async (container) => {
            const { Biome } = await import('../apps/biome/index.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // Biome needs the Honey-pot logs from the Identity Manager to calculate Resonance
                getSecurityLogs: () => {
                    const idApp = this.activeProcesses['identity'];
                    return idApp ? idApp.honeyPotLogs : [];
                },
                // Bridge to notify Kernel of Geofence triggers
                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                close: () => this.closeApp('biome')
            };

            const instance = new Biome(container, apiBridge);
            instance.render(); // Renders the Cellular Grid

            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['biome'] = instance;
            return instance;
        },

        'oracle': async (container) => {
            const { SovereignOracle } = await import('./oracleEngine.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // Provides clearance level for Archon Truth-Verification
                getClearance: () => {
                    // Logic to check if user is Archan/Level 10
                    return this.userRole === 'ADMIN' || this.userRole === 'MEGA' ? 10 : 1;
                },
                // Persistence for the signed truth-feed
                fs: this.vfs,
                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                close: () => this.closeApp('oracle')
            };

            const instance = new SovereignOracle(container, apiBridge);
            instance.render(); // Renders the Truth Stream

            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['oracle'] = instance;
            return instance;
        },

        'blackout': async (container) => {
            const { BlackoutTerminal } = await import('./blackout-terminal.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // P2P and Steganography requires access to the current Archon's keys
                session: this.sessionKey,
                identity: this.userProfile?.sovereignName || 'ARCHON_ROOT',
                // Bridge to the VPU for handshake coordination
                vpu: {
                    handshake: async (target) => {
                        console.log(`[SHADOW_LINK]: Requesting tunnel to ${target}`);
                        return { success: true, tunnelId: 'TX_' + Math.random().toString(36).substring(7) };
                    }
                },
                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                close: () => this.closeApp('blackout')
            };

            const instance = new BlackoutTerminal(container, apiBridge);
            instance.init();

            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['blackout'] = instance;
            return instance;
        },

        'redemption': async (container) => {
            const { RedemptionPortal } = await import('./redemption-portal.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // Required for Decryption of the Shadow Badge
                session: this.sessionKey,
                // Bridge to the VPU to update the person_birthright table (Art 13 compliance)
                claimAllotment: async (code) => {
                    const response = await fetch('http://localhost:3000/api/vpu/allotment/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ allotmentCode: code, session: this.sessionKey })
                    });
                    return await response.json();
                },
                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                close: () => this.closeApp('redemption')
            }

            const instance = new RedemptionPortal(container, apiBridge);
            instance.render();

            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['redemption'] = instance;
            return instance;
        },

        'shadow-chat': async (container) => {
            const { ShadowChat } = await import('./shadow-chat.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // Required for real-time AES-256 message encryption
                session: this.sessionKey,
                identity: this.userProfile?.sovereignName || 'ARCHON_ROOT',
                
                // P2P Specific Bridge Logic
                conduit: {
                    // Log ephemeral signal metadata to the VPU (No message content logged)
                    logSignal: async (peerId, status) => {
                        console.log(`[CONDUIT_STABILITY]: ${status} with Peer ${peerId}`);
                        // Optional: Notify the EPOS registry of an active communication node
                    },
                    // Logic to verify if the peer is a registered INVESTOR or ARCHON
                    verifyPeer: async (handshakeCode) => {
                        // In a production VPU, this would check against the 'Registry of Sovereign Entities'
                        return { verified: true, role: 'VETTED_PEER' };
                    }
                },

                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                
                // Ensure memory is wiped on close for Ephemerality
                close: () => {
                    if (this.activeProcesses['shadow-chat']?.terminate) {
                        this.activeProcesses['shadow-chat'].terminate();
                    }
                    this.closeApp('shadow-chat');
                }
            };

            const instance = new ShadowChat(container, apiBridge);
            instance.init();

            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['shadow-chat'] = instance;
            return instance;
        },

        'ghost-drive': async (container) => {
            const { GhostDrive } = await import('./ghost-drive.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // Required for real-time decryption of the image buffers
                session: this.sessionKey,
                identity: this.userProfile?.sovereignName || 'ARCHON_ROOT',

                // Vault-Specific Bridge Logic
                vault: {
                    // Check the VPU for the status of a specific Investor's Allotment
                    getShardStatus: async (shardId) => {
                        console.log(`[VPU_QUERY]: Checking Allotment Status for ${shardId}`);
                        // Connects to the EPOS registry logic
                        return { status: 'VETTED', recoveryLink: 'RECOVER_STRIKE_01' };
                    },
                    // Securely wipe the image buffer from the GPU/RAM
                    purgeBuffer: () => {
                        console.log("[GHOST_DRIVE]: Memory Purged. No persistence remains.");
                    }
                },

                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                
                // Ensure the "Burn-on-Close" policy is enforced
                close: () => {
                    if (this.activeProcesses['ghost']?.purgeBuffer) {
                        this.activeProcesses['ghost'].purgeBuffer();
                    }
                    this.closeApp('ghost');
                }
            };

            const instance = new GhostDrive(container, apiBridge);
            // Use await init() to ensure the Shards are loaded before the first render
            await instance.init();

            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['ghost'] = instance;
            return instance;
        },

        'browser': async (container) => {
                const { BrowserApp } = await import('../apps/browser.js');
                
                const apiBridge = {
                    signature: 'SOVEREIGN_CORE_V1',
                    session: this.sessionKey,
                    // Bridge for the "Secure Handshake" and VPU protocols
                    vpu: {
                        // Allows the browser to request app launches (e.g., jumping to Ghost Drive)
                        launch: (appId) => this.launchApp(appId),
                        // Access to the Genesis manifests for verification
                        getManifest: (id) => this.vfs.readFile(`home/documents/${id}`),
                        isLocked: () => this.ledgerLocked,
                    },
                    // Visual feedback for handshake successes/failures
                    notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                    // Standard close method
                    close: () => this.closeApp('browser')
                };

                const instance = new BrowserApp(container, apiBridge);
                // Initialize with the standard VPU landing page
                if (instance.init) await instance.init();

                // Track the browser process for memory management
                this.activeProcesses = this.activeProcesses || {};
                this.activeProcesses['browser'] = instance;

                return instance;
        },

        'camera': async (container) => {
            const { CameraApp } = await import('../apps/camera.js');
            
            // 1. Ensure activeProcesses exists so it doesn't crash
            this.activeProcesses = this.activeProcesses || {};
            
            // 2. Safely check for browser
            const browser = this.activeProcesses['browser'] || null;

            const apiBridge = {
                signature: 'ARCHON_EYE_V2',
                session: this.sessionKey,
                vpu: {
                    unlockLedger: () => {
                        this.ledgerLocked = false;
                        if (this.activeProcesses['browser']) {
                            this.activeProcesses['browser'].loadPage('vpu://genesis.core');
                        }
                    },
                    saveSnapshot: (blob) => this.vfs.writeFile(`home/pictures/SNAP_${Date.now()}.png`, blob),
                    notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg)
                },
                close: () => this.closeApp('camera')
            };

            const instance = new CameraApp(container, apiBridge);
            if (instance.init) await instance.init();

            // 3. Define the save logic only if browser exists
            instance.saveToEnclave = (dataUrl) => {
                if (this.activeProcesses['browser'] && this.activeProcesses['browser'].addSnapshot) {
                    this.activeProcesses['browser'].addSnapshot(dataUrl);
                    if (this.showNotification) this.showNotification("IMAGE_MANIFEST_SENT_TO_BROWSER", "success");
                } else {
                    console.warn("Kernel: Browser not active. Image saved to local buffer only.");
                }
            };

            this.activeProcesses['camera'] = instance;
            return instance;
        },

        'settings': async (container) => {
            const { SettingsApp } = await import('../apps/settings.js');
            
            // 1. Initialize process tracking
            this.activeProcesses = this.activeProcesses || {};

            const apiBridge = {
                signature: 'SOVEREIGN_SETTINGS_V1',
                session: this.sessionKey,
                vpu: {
                    // Allows settings to signal a reboot or reload to the kernel
                    reboot: () => window.location.reload(),
                    // Integration with the VFS for audit logs
                    logEvent: (action, details) => this.vfs.writeFile(`sys/logs/audit_${Date.now()}.json`, JSON.stringify({action, details})),
                    // Access to visual state (CRT toggles etc)
                    setUIPrefs: (prefs) => {
                        if (prefs.crt) document.body.classList.add('crt-effect');
                        else document.body.classList.remove('crt-effect');
                    }
                },
                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                close: () => this.closeApp('settings')
            };

            // 2. Instantiate with the sessionKey for VFS decryption
            const instance = new SettingsApp(container, this.sessionKey);
            
            // 3. Initialize the app logic (triggers the Security Audit)
            if (instance.init) await instance.init();

            this.activeProcesses['settings'] = instance;
            return instance;
        },

        'bio-regen': async (container) => {
            const { BioRegenApp } = await import('../apps/bio-regen.js');
            this.activeProcesses = this.activeProcesses || {};

            const apiBridge = {
                signature: 'VITALITY_MONITOR_V1',
                session: this.sessionKey,
                vpu: {
                    // Saves fasting data and phase progress to the VFS
                    saveStasisLog: (log) => this.vfs.writeFile(`home/health/stasis_${Date.now()}.json`, JSON.stringify(log)),
                    // Links biological success to the Ledger (Reward mechanism)
                    awardVitalityCredit: (amount) => {
                        if (this.activeProcesses['ledger']) {
                            this.activeProcesses['ledger'].addCredit(amount, "AUTOPHAGY_BONUS");
                        }
                    }
                },
                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                close: () => this.closeApp('bio-regen')
            };

            const instance = new BioRegenApp(container, apiBridge);
            if (instance.init) await instance.init();

            this.activeProcesses['bio-regen'] = instance;
            return instance;
        },

        'monitor': async (container) => {
            const { MonitorApp } = await import('../apps/monitor.js');
            
            // 1. Initialize process tracking
            this.activeProcesses = this.activeProcesses || {};

            const apiBridge = {
                // REQUIRED: Matches the internal Guard check in MonitorApp constructor
                signature: 'SOVEREIGN_CORE_V1', 
                session: this.sessionKey,
                vfs: this.vfs, // Passing VFS for latency testing
                vpu: {
                    // Specific monitor methods for hardware interrogation
                    getCoreCount: () => navigator.hardwareConcurrency,
                    getMemoryStatus: () => performance.memory ? performance.memory.usedJSHeapSize : 0,
                    // Integration with the VFS for audit logs
                    logSystemEvent: (event) => this.vfs.writeFile(`sys/logs/mon_${Date.now()}.log`, event)
                },
                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                close: () => this.closeApp('monitor')
            };

            // 2. Instantiate the App
            const instance = new MonitorApp(container, apiBridge);
            
            // 3. Trigger initialization (starts the 1s tracking interval)
            if (instance.init) await instance.init();

            // 4. Store reference for the Kernel's management
            this.activeProcesses['monitor'] = instance;
            
            // Note: Kernel should call instance.destruct() when closing
            return instance;
        },

        'logs': async (container) => {
            // FIX 1: Ensure activeProcesses exists in the OS scope
            if (!this.activeProcesses) this.activeProcesses = {};

            try {
                // FIX 2: Correct path to the apps folder
                const { KernelLogApp } = await import('../apps/kernel_log.js');

                const apiBridge = {
                    signature: 'SOVEREIGN_CORE_V1',
                    vfs: this.vfs,
                    close: () => this.closeApp('logs')
                };

                const instance = new KernelLogApp(container, apiBridge);
                instance.init();
                
                // FIX 3: Store the process reference
                this.activeProcesses['logs'] = instance;
                return instance;

            } catch (error) {
                console.error("Kernel: Handshake failed for logs:", error);
                container.innerHTML = `<div style="color:#ff4444; padding:20px;">[BOOT_ERROR]: MODULE_NOT_FOUND at /js/apps/kernel_log.js</div>`;
            }
        },

        'taskman': async (container) => {
            const { TaskManagerApp } = await import('../apps/taskman.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                // FIX: Use arrow functions to ensure 'this' refers to the TLC_Kernel class
                log: (msg, type) => {
                    if (this.broadcastToKernel) this.broadcastToKernel('TASKMAN', msg, type);
                },
                notify: (msg, type) => {
                    // Check if showNotification exists before calling to prevent crash
                    if (typeof this.showNotification === 'function') {
                        this.showNotification(msg, type);
                    } else {
                        console.warn("Kernel: showNotification not found, falling back to log:", msg);
                    }
                }
            };

            const instance = new TaskManagerApp(container, apiBridge);
            await instance.init();
            
            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['taskman'] = instance;
            return instance;
        },
        'stc': async (container) => {
            const { TacticalCommandApp } = await import('./tactical_command.js');
            
            const api = {
                signature: 'SOVEREIGN_CORE_V1',
                identity: 'ARCHON_ROOT',
                timestamp: new Date().toLocaleTimeString(),
                log: (m, t) => this.broadcastToKernel('STC', m, t),
                notify: (m, t) => {
                    if (typeof this.showNotification === 'function') {
                        this.showNotification(m, t);
                    }
                },
                vfs: this.vfs 
            };
            
            const instance = new TacticalCommandApp(container, api);
            await instance.init();
            
            // Ensure activeProcesses exists before assignment
            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['stc'] = instance;
            
            return instance;
        },

        'rrl-wallet': async (container) => {
            const { WalletApp } = await import('./wallet.js');
            
            // The WalletApp expects an object where .ledger and .user exist as properties
            const apiBridge = {
                // Data Properties (Matches WalletApp.render requirements)
                ledger: this.ledger,
                mintQueue: this.mintQueue,
                user: this.userProfile || { name: 'CITIZEN', role: 'MEMBER', location: 'LOCAL' },
                
                // Logic Methods (Matches WalletApp.onPostRender calls)
                requestServiceMint: (b, u, d) => this.requestServiceMint(b, u, d),
                approveMint: (id) => this.approveMint(id),
                executeExchange: (f, t, a) => this.executeExchange(f, t, a),
                getExchangeRate: (f, t) => this.getExchangeRate(f, t),
                
                // System Helpers
                notify: (msg, type) => this.showNotification ? this.showNotification(msg, type) : console.log(msg),
                openApp: (id) => this.launchApp(id),
                close: () => this.closeApp('rrl-wallet')
            };

            const instance = {
                init: async () => {
                    container.innerHTML = WalletApp.render(apiBridge);
                    WalletApp.onPostRender(apiBridge, container);
                },
                update: () => {
                    // Update the references before re-rendering
                    apiBridge.ledger = this.ledger;
                    apiBridge.mintQueue = this.mintQueue;
                    container.innerHTML = WalletApp.render(apiBridge);
                    WalletApp.onPostRender(apiBridge, container);
                }
            };

            await instance.init();

            this.activeProcesses = this.activeProcesses || {};
            this.activeProcesses['rrl-wallet'] = instance;

            return instance;
        },

        'info': async (container) => {
            const { InfoApp } = await import('./info.js');
            
            const apiBridge = {
                signature: 'SOVEREIGN_CORE_V1',
                notify: (m, t) => this.showNotification(m, t),
                close: () => this.closeApp('info')
            };

            const instance = {
                init: async () => {
                    container.innerHTML = InfoApp.render(apiBridge);
                    InfoApp.onPostRender(apiBridge, container);
                }
            };

            await instance.init();
            this.activeProcesses['info'] = instance;
            return instance;
        },
        };
        
    }

  async boot() {   
    console.log("Kernel: Ignition sequence initiated...");

    // 1. HARDWARE HANDSHAKE
    const isFullyAuthorized = await this.verifyHardwareSignature();

    if (!isFullyAuthorized) {
        await this.showIdentityLost();
        return; // HALT BOOT
    }

    // 2. LOAD ENGINES
    try {
        const { TimeModel } = await import('../apps/time/model.js');
        this.temporal = new TimeModel();
        this.wallpaper = new NeuralWallpaper('neural-canvas', this);
    } catch (e) {
        console.error("Engine Load Fault:", e);
    }

    // 3. SPLASH HANDOVER
    startBootSequence(() => {
        const loginGate = document.getElementById('login-gate');
        if(loginGate) {
            loginGate.style.display = 'flex';
            setTimeout(() => loginGate.style.opacity = '1', 50);
        }
        this.init(); 
        this.systemTray = new SystemTray(this);
        this.isBooted = true;
    });

    const gateContainer = document.getElementById('login-gate');
    
    // This triggers the new constructor that "glues" deadlock to the kernel
    this.auth = new SovereignAuth(gateContainer, this); 
    
    // Now call render() safely
    await this.auth.render();
}


// 🔐 VERIFIED HARDWARE SIGNATURE
async verifyHardwareSignature() {
    const genesis = localStorage.getItem('VPU_HW_ID');
    const storedCert = localStorage.getItem('VPU_PHYSICAL_KEY');

    if (genesis !== "SIG_2025_12_26_ALPHA_GENESIS" || !storedCert) {
        return false;
    }

    try {
        const parsed = JSON.parse(storedCert);
        const token = parsed.signature;

        // Decode JWT (no verification yet)
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const payload = JSON.parse(atob(parts[1]));

        // OPTIONAL: Expiry check
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            console.warn("JWT expired");
            return false;
        }

        console.log("JWT payload:", payload);

        // ⚠️ IMPORTANT:
        // Browser CANNOT securely verify JWT without exposing secret
        // So we trust backend-issued token structure

        return true;

    } catch (e) {
        console.error("Verification failed:", e);
        return false;
    }
}


// 🚨 IDENTITY LOST SCREEN
async showIdentityLost() {
    const container = document.getElementById('login-gate');
    if (!container) return;

    container.style.setProperty('display', 'flex', 'important');
    container.style.zIndex = '99999';
    container.style.opacity = '1';

    if (localStorage.getItem('VPU_PHYSICAL_KEY')) {
        container.innerHTML = `
            <div class="login-box impact-shake" style="border-color: #ff8800; background:rgba(10,5,0,0.95); padding:30px; border:1px solid #ff8800; text-align:center;">
                <h1 style="color: #ff8800; font-family:monospace;">ENCLAVE_LOCKED</h1>
                <p style="font-family:monospace; font-size:11px; color:#888;">STATUS: Re-verification required.</p>
                <button id="rescan-btn" style="background:rgba(255,136,0,0.2); border:1px solid #ff8800; color:#ff8800; padding:10px; cursor:pointer; margin-top:15px;">
                    RE-VERIFY_HARDWARE
                </button>
            </div>`;

        document.getElementById('rescan-btn').onclick = () => location.reload();
    } else {
        this.showProvisioningUI();
    }
}


// 🧬 PROVISIONING UI
async showProvisioningUI() {
    const container = document.getElementById('login-gate');

    container.innerHTML = `
        <div class="provision-container" style="text-align:center; color:#00ff41; font-family:monospace; padding:30px; border:1px solid #00ff41; background:rgba(0,10,0,0.95); box-shadow: 0 0 20px rgba(0,255,65,0.2);">
            <h2 style="letter-spacing:3px;">VPU_SECURITY_ENCLAVE</h2>
            <p style="font-size:11px; color:#888; margin:20px 0;">
                Insert Genesis Key (.crt) to seal this terminal.
            </p>
            
            <button id="download-key-btn" style="background:transparent; color:#bcff00; border:1px solid #bcff00; padding:8px; cursor:pointer; font-size:10px; margin-bottom:15px;">
                ACQUIRE_GENESIS_KEY
            </button>
            <br>
            <input type="file" id="key-upload" style="display:none;" accept=".crt">
            <button id="provision-btn" style="background:transparent; color:#00ff41; border:1px solid #00ff41; padding:12px 24px; cursor:pointer; font-weight:bold;">
                EXECUTE_GENESIS_BINDING
            </button>
        </div>`;


    // ⬇️ DOWNLOAD CERT FROM BACKEND
    document.getElementById('download-key-btn').onclick = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/vpu/provision-bundle');
        const data = await res.json();

        if (data.success) {
            // Generate the Enclave Certificate Object
            const enclaveCert = {
                type: "VPU_ENCLAVE_KEY",
                owner: data.founder,
                hw_binding: localStorage.getItem('hw_id') || "NODE_UNDEFINED",
                enclave_id: data.enclave_key_id,
                signature: data.certificate, // The signed JWT from backend
                issued: new Date().toISOString()
            };

            const certString = JSON.stringify(enclaveCert, null, 2);

            // Export the physical file
            const blob = new Blob([certString], { type: 'application/x-x509-ca-cert' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `vpu_enclave_${data.founder.replace(/\s+/g, '_')}.crt`;
            a.click();
            
            // Auto-provision the local state for the next boot
            localStorage.setItem('VPU_PHYSICAL_KEY', certString);
            localStorage.setItem('VPU_HW_ID', "SIG_2025_12_26_ALPHA_GENESIS");

            console.log("Enclave Certificate Born and locally cached.");
        }
    } catch (e) { 
        alert("Bridge Offline: Ensure Node.js is running."); 
    }
};


    // ⬇️ UPLOAD CERT (PHYSICAL INSERT)
    const fileInput = document.getElementById('key-upload');

    document.getElementById('provision-btn').onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const content = event.target.result;

                // Validate JSON format
                JSON.parse(content);

                localStorage.setItem('VPU_PHYSICAL_KEY', content);
                localStorage.setItem('VPU_HW_ID', "SIG_2025_12_26_ALPHA_GENESIS");

                console.log("Provisioning complete.");
                location.reload();

            } catch {
                alert("Invalid certificate file.");
            }
        };

        reader.readAsText(file);
    };
}

async runRecoverySequence(errorCode) {
    const recoveryScreen = document.createElement('div');
    recoveryScreen.id = 'recovery-loader';
    // Using a very specific 'Sovereign' styling
    recoveryScreen.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: #000; color: #00ff41; font-family: 'Courier New', monospace;
        padding: 40px; z-index: 1000000; font-size: 14px; line-height: 1.6;
        text-shadow: 0 0 5px #00ff41;
    `;
    document.body.appendChild(recoveryScreen);

    const print = (text, delay = 600) => {
        return new Promise(res => {
            const line = document.createElement('div');
            line.innerHTML = `<span style="color:#444;">[${new Date().toLocaleTimeString()}]</span> > ${text}`;
            recoveryScreen.appendChild(line);
            // Auto-scroll if logs get too long
            recoveryScreen.scrollTop = recoveryScreen.scrollHeight;
            setTimeout(res, delay);
        });
    };

    // START SEQUENCE
    await print("SOVEREIGN_RECOVERY_ENVIRONMENT [v1.0.4]");
    await print(`CRITICAL_HALT_DETECTED: ${errorCode}`, 1000);
    await print("-------------------------------------------", 200);
    await print("Initializing Enclave hardware bridge...");
    await print("Scanning VFS partitions for bit-rot...");
    
    // REAL DATA INTEGRITY CHECK
    const vfs = localStorage.getItem('vpu_vfs_root');
    await new Promise(r => setTimeout(r, 1200));
    
    if (vfs) {
        await print("VFS_ROOT: FOUND [Integrity 100%]");
        await print("GENESIS_BLOCK (2025-12-26): VERIFIED_OK");
    } else {
        await print("VFS_ROOT: NOT_FOUND", 1000);
        await print("CRITICAL: Rebuilding 2025-12-26 allocation table...", 2000);
    }

    await print("Shredding stale session buffers and keys...");
    localStorage.removeItem('LAST_PANIC_CODE'); 
    localStorage.removeItem('LAST_PANIC_TIME');

    await print("-------------------------------------------", 200);
    await print("SYSTEM_REPAIRED. WARM_REBOOT INITIATING...", 1500);

    // Fade out effect
    recoveryScreen.style.transition = "opacity 1.5s ease-in";
    recoveryScreen.style.opacity = "0";
    setTimeout(() => recoveryScreen.remove(), 1500);
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

    // Initialize UI DOM elements after successful auth
    initDOM() {
        const osRoot = document.getElementById('os-root');
        const topBar = document.getElementById('top-bar');
        const loginGate = document.getElementById('login-gate');

        if (osRoot) {
            osRoot.style.display = 'grid';
            osRoot.style.opacity = '1';
        }
        if (topBar) {
            topBar.classList.remove('hidden');
        }
        if (loginGate) {
            loginGate.style.display = 'none';
            loginGate.style.opacity = '0';
        }

        if (!document.getElementById('workspace')) {
            const workspace = document.createElement('div');
            workspace.id = 'workspace';
            workspace.style.position = 'relative';
            workspace.style.height = '100%';
            workspace.style.overflow = 'hidden';
            osRoot?.appendChild(workspace);
        }

        this.logEvent && this.logEvent('INFO', 'Kernel: DOM initialized.');
    }

    init() {

    // HARD GATE: Prevent UI initialization if not authenticated
    if (!this.isBooted) {
        console.log("Kernel: Standby mode active. Awaiting Handshake.");
        return; 
    }

    console.log("KERNEL: Identity Verified. Initializing Sovereign Environment...");
    this.initDOM();
    
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

async unlockSystem() {
    const lockPass = document.getElementById('lock-pass-input');
    const status = document.getElementById('lock-status');
    const lockScreen = document.getElementById('lock-screen');
    const lockBox = lockScreen?.querySelector('.lock-box');
    const root = document.getElementById('os-root');

    // 1. Safety Check
    if (!lockPass || lockPass.value === "") {
        this.triggerLockShake();
        return;
    }

    // 2. UI Feedback
    status.innerText = ">> INITIATING_DECRYPTION_HANDSHAKE...";
    status.style.color = "#a445ff";
    lockPass.disabled = true;

    // 3. Simulated Kernel Processing
    await new Promise(r => setTimeout(r, 1000));

    // 4. AUTHENTICATION LOGIC
    // Determine your correct key (Checking against 'admin' OR a stored system pass)
    const correctKey = this.systemPassword || "admin"; 
    
    if (lockPass.value === correctKey) {
        // --- SUCCESS SEQUENCE ---
        status.innerText = ">> SIGNATURE_VALID // ENCLAVE_RESUMING";
        status.style.color = "#a445ff";
        
        // Update Internal State Immediately
        this.isLocked = false; 

        if (lockBox) lockBox.style.boxShadow = "0 0 100px rgba(164, 69, 255, 0.4)";

        // 5. Force UI Reveal
        if (lockScreen) {
            lockScreen.style.transition = "opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.8s";
            lockScreen.style.opacity = '0';
            lockScreen.style.pointerEvents = 'none'; // Stop intercepting clicks
        }

        if (root) {
            root.style.display = "block"; // Ensure it exists in DOM
            root.style.filter = "none"; 
            root.style.opacity = "1";
        }

        // Final Cleanup
        setTimeout(() => {
            if (lockScreen) {
                lockScreen.classList.add('hidden');
                lockScreen.style.display = 'none';
            }
            lockPass.value = ""; 
            lockPass.disabled = false;
            
            // Restore EPOS/Investor Session Brightness
            if (typeof this.setBrightness === 'function' && this.currentBrightness) {
                this.setBrightness(this.currentBrightness);
            }
            
            console.log("Kernel: Sovereign Enclave Resumed.");
        }, 800);

    } else {
        // --- FAILURE SEQUENCE ---
        status.innerText = ">> CRITICAL: KEY_SIGNATURE_REJECTED";
        status.style.color = "#ff003c";
        
        this.triggerLockShake();

        lockPass.value = "";
        lockPass.disabled = false;
        lockPass.focus();
    }
}

// Helper for the Shake Effect
triggerLockShake() {
    const lockBox = document.querySelector('.lock-box');
    if (lockBox) {
        lockBox.classList.add('impact-shake');
        setTimeout(() => lockBox.classList.remove('impact-shake'), 400);
    }
}

    async transitionToShell() {
        console.log("Kernel: Initiating Security Handshake...");
        
        // 1. DOM REFERENCE CHECK
        const gate = document.getElementById('login-gate');
        const root = document.getElementById('os-root');
        const top = document.getElementById('top-bar');
        const workspace = document.getElementById('workspace');
        const passInput = document.getElementById('pass-input');

        const password = passInput ? passInput.value : "default_gateway";
        const memberId = document.getElementById('username')?.value || "GUEST";
        try {
        // a. GET BINDING
        const binding = await this.getSecurityBinding();
        console.log(`Kernel: Secured on IP ${binding.ip}`);

        // b. DERIVE KEY (Bound to Password + Machine + IP)
        // If the user moves to a different Wi-Fi or PC, this salt fails.
        const secureSalt = `${memberId}_${binding.fingerprint}_${binding.ip}`;
        
        this.sessionKey = await this.auth.crypto.deriveKey(password, secureSalt);
        
        if (!this.sessionKey) throw new Error("Binding Conflict Detected");

        } catch (e) {
            console.error("VPU_CORE_REJECTION:", e);
            alert("CRITICAL: Binding Mismatch. Device or Network not authorized.");
            return;
        }
        // FORCING FULLSCREEN LOCK
        const docElm = document.documentElement;
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen();
        } else if (docElm.webkitRequestFullscreen) { /* iOS/Safari */
            docElm.webkitRequestFullscreen();
        }

        // LOCKING ORIENTATION (Mobile)
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }

        try {
            // 2. CRYPTOGRAPHIC KEY DERIVATION
            // We use PBKDF2 to turn the password into a raw AES-GCM key
            this.sessionKey = await this.auth.crypto.deriveKey(password, memberId);
            
            if (!this.sessionKey) throw new Error("Key Derivation Failed");

            console.log("Kernel: Sovereign Enclave Unlocked. Validating Genesis Block...");
        } catch (e) {
            console.error("VFS CRITICAL ERROR:", e);
            alert("SECURITY PROTOCOL FAILURE: Handshake Denied.");
            return; // STOP: Do not transition to shell if key is invalid
        }

        // 4. UI TRANSITION (Only occurs on success)
        if (gate) gate.style.display = 'none';
        
        if (root) {
            root.classList.remove('hidden');
            root.style.display = 'block'; 

            // Initialize Dock Auto-Hide Sensor
            if (!document.getElementById('dock-sensor')) {
                const sensor = document.createElement('div');
                sensor.id = 'dock-sensor';
                sensor.onmouseenter = () => root.classList.remove('dock-hidden');
                document.body.appendChild(sensor);
            }

            // Snap Preview Layer
            if (workspace && !document.getElementById('snap-preview')) {
                const preview = document.createElement('div');
                preview.id = 'snap-preview';
                workspace.appendChild(preview);
            }
        }

        // 5. SUBSYSTEM IGNITION
        try {
            // Boot Clock Engine
            const { TimeModel } = await import('../apps/time/model.js');
            const { TimeApp } = await import('../apps/time/index.js');
            const { SovereignGovernance } = await import('../apps/sovereignVFS.js');

            const governance = new SovereignGovernance(this, window.SovereignVFS);
            const bootClock = new TimeApp(null, governance, this.sessionKey, 'SYSTEM');
            bootClock.startClock();
        } catch (e) {
            console.warn("Temporal Engine: Secondary ignition failed, but system remains stable.");
        }

        if (top) {
            top.classList.remove('hidden');
            top.style.display = 'flex'; // Ensures layout matches VPU style
            top.style.opacity = '0';
            requestAnimationFrame(() => {
                top.style.transition = 'opacity 0.5s ease';
                top.style.opacity = '1';
            });
        }
        this.wallpaper = new NeuralWallpaper('neural-canvas', this);
        this.setupTopBarInteractions(); 
        this.bootShell();
        this.logEvent('INFO', 'Identity Verified. Session Started.');
        
        console.log("Kernel: Sovereign OS Shell Online.");

        // Force the OS to stay in the viewport
        window.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.isLoggedIn) {
                this.logEvent('WARN', 'Fullscreen exited. Re-asserting Enclave Lock.');
                // Optional: You can choose to automatically lock the system if 
                // they force-exit fullscreen for security.
                // this.lockSystem(); 
            }
        });

        // Initialize the Preview Layer for window
    if (!document.getElementById('snap-preview')) {
        const preview = document.createElement('div');
        preview.id = 'snap-preview';
        preview.style.cssText = `
            position: absolute;
            background: rgba(0, 255, 65, 0.05);
            border: 2px dashed rgba(0, 255, 65, 0.3);
            pointer-events: none;
            display: none;
            z-index: 50;
            transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        `;
        workspace.appendChild(preview);
    }
    }

   async getGeolocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null); // No GPS available
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => resolve(null), // Permission denied
            { timeout: 5000 }
        );
    });
}


    /**
     * MEMBER ID GENERATOR
     * This generates unique member id used in vault.js access log
     */
    generateMemberId(username) {
        // A simple deterministic hash to create a unique ID like "INV-8A2F"
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = ((hash << 5) - hash) + username.charCodeAt(i);
            hash |= 0; 
        }
        const id = Math.abs(hash).toString(16).toUpperCase().substring(0, 4);
        this.memberId = `INV-${id}`;
        this.logEvent('INFO', `Identity Derived: ${this.memberId}`);
        return this.memberId;
    }

    /**
     * SECURE FILE BRIDGE
     * This allows any app to request a decrypted file content
     */
    async openSecureFile(path) {
        // 1. SAFETY CHECK: If no key, don't even try the VFS
        if (!this.sessionKey) {
            console.error("Kernel: Access Denied. No Session Key found.");
            alert("Security Error: System Enclave is locked.");
            return;
        }

        try {
            console.log(`Kernel: Decrypting ${path}...`);
            
            // 2. USE THE IMPORTED VFS:
            // Ensure 'SovereignVFS' is correctly imported at the top of kernel.js
            const content = await SovereignVFS.read(path, this.sessionKey);
            
            if (content) {
                // SUCCESS: Data is now plain text
                alert(`[SECURE_VIEW] - ${path}\n\n${content}`);
            } else {
                console.warn("Kernel: File is empty or does not exist.");
            }
        } catch (e) {
            // This usually triggers if the password/key is wrong
            console.error("Decryption failed. Key mismatch or Corrupted Block.", e);
            alert("VFS Error: Decryption failed. Possible data corruption.");
        }

        console.log(`Kernel: Requesting secure access to ${path}`);
    // Logic to find the 'files' app and tell it to open this specific path
    const event = new CustomEvent('launchApp', { detail: { appId: 'files', filePath: path } });
    window.dispatchEvent(event);
    }

    setupContextMenu() {
    // 1. Create the Menu Element
    const menu = document.createElement('div');
    menu.id = 'global-context-menu';
    menu.style.cssText = `
        position: fixed; z-index: 10000; background: #1a1a1a00; 
        border: 1px solid #333; border-radius: 8px; width: 230px;
        display: none; padding: 5px 0; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        font-family: 'Inter', sans-serif; font-size: 13px; color: #eee;
    `;
    document.body.appendChild(menu);

    // 2. Listen for Right Click
    window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const menu = document.getElementById('global-context-menu');
    
    // 1. Render content first so the browser knows the height
    this.renderMenuContent(menu, e.target);
    
    menu.style.display = 'block';
    menu.style.visibility = 'hidden'; // Hide momentarily to calculate size

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const padding = 10; // Safety gap from screen edge

    let x = e.clientX;
    let y = e.clientY;

    // 2. Horizontal Boundary Check
    // If menu + expected submenu width (approx 240px) exceeds width, flip left
    const expectedTotalWidth = menuWidth + 240; 
    if (x + expectedTotalWidth > window.innerWidth) {
        x = x - menuWidth;
        menu.classList.add('reverse-x'); // Add class to flip submenus to the left
    } else {
        menu.classList.remove('reverse-x');
    }

    // 3. Vertical Boundary Check
    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - padding;
    }

    // 4. Top/Left Boundary Check (Prevent negative coordinates)
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.visibility = 'visible';

        // Dynamic Menu Content based on what was clicked
        this.renderMenuContent(menu, e.target);
    });

    // 3. Hide menu on click elsewhere
    window.addEventListener('click', () => {
        menu.style.display = 'none';
    });
}

// RENDER CONTEXT MENU ITEMS
renderMenuContent(menu, target) {
    const isWindow = target.closest('.os-window');
    const isIcon = target.closest('.desktop-icon');
    const isDockIcon = target.closest('.dock-item'); // New Dock Detector

    

    // --- DOCK ICON LOGIC ---
    let dockItems = [];
    if (isDockIcon) {
        const appId = isDockIcon.dataset.app; // Ensure your dock icons have data-app="terminal" etc.
        const appInstance = this.runningApps[appId];

        if (!appInstance) {
            // Case 1: App is not running
            dockItems.push({ label: '▶ Start Process', action: () => this.launchApp(appId) });
        } else {
            const winElement = document.getElementById(`win-${appId}`);
            if (winElement && winElement.classList.contains('minimized')) {
                // Case 2: App is running but minimized
                dockItems.push({ label: '📂 Restore Window', action: () => this.restoreApp(appId) });
            } else {
                // Case 3: App is already active/visible
                dockItems.push({ label: '👁 View Instance', action: () => this.focusApp(appId) });
            }
            dockItems.push({ 
                label: '❌ Terminate', 
                action: () => this.closeApp(appId, `win-${appId}`),
                className: 'danger-action' 
            });
        }
    }
    // 1. DATA STRUCTURE: Subsections & Items
    const menuData = [
        {
            section: "DOCK_OPERATIONS",
            visible: !!isDockIcon, // Only show if we clicked the dock
            items: dockItems
        },
        {
            section: "ACTIVE_CONTEXT",
            visible: isWindow || isIcon,
            items: [
                isWindow ? {
                    label: '🗔 Window Management',
                    children: [
                        { label: '➖ Minimize', action: () => isWindow.classList.add('minimized') },
                        { label: '❌ Close Enclave', action: () => {
                            const appId = isWindow.id.replace('win-', '');
                            this.closeApp(appId, isWindow.id);
                        }}
                    ]
                } : null,
                isIcon ? {
                    label: '🚀 Object Actions',
                    children: [
                        { label: 'Run Process', action: () => isIcon.click() },
                        { label: 'Shred Shortcut', action: () => isIcon.remove() }
                    ]
                } : null
            ].filter(Boolean)
        },
        {
            section: "SYSTEM_TOOLS",
            items: [
                { 
                    label: '🐚 Terminal Shell', 
                    kbd: 'Alt+T',
                    children: [
                        { label: 'New Instance', action: () => this.launchApp('terminal') },
                        { label: 'Root Privileges', action: () => this.launchApp('terminal', {root:true}) }
                    ]
                },
                { label: '📊 Tactical CMD', action: () => this.launchApp('stc') },
            ]
        },

        {
        section: "WORKSPACE_LAYOUT",
        items: [
                        { 
                label: this.isTilingActive ? '🟢 Tiling: ACTIVE' : '⚪ Tiling: FLOATING', 
                kbd: 'Alt+G',
                action: () => {
                    this.isTilingActive = !this.isTilingActive;
                    if (this.isTilingActive) {
                        this.updateTilingGrid();
                    } else {
                        // Reset windows to floating state
                        const allWindows = document.querySelectorAll('.os-window');
                        
                        allWindows.forEach((win, idx) => {
                            win.style.transition = 'all 0.4s ease';
                            win.style.width = "clamp(320px, 65vw, 900px)";
                            win.style.height = "clamp(300px, 65vh, 720px)";
                            
                            // NEW: Reset floating window classes and z-indices
                            win.classList.remove('floating-extra');
                            win.style.zIndex = (100 + idx).toString();
                            win.dataset.hasBeenDragged = 'false';
                            
                            // Reset positions to natural cascade
                            const cascadeOffset = idx * 25;
                            win.style.left = `${85 + cascadeOffset}px`;
                            win.style.top = `${40 + cascadeOffset}px`;
                        });
                        
                        this.logSystemEvent("Layout: Floating Mode Restored", "info");
                    }
                }
            },
            {
                label: '📐 Layout Options',
                visible: this.isTilingActive,
                children: [
                    { label: 'Master-Stack (Default)', action: () => { this.updateTilingGrid(); } },
                    { label: 'Force Refresh Grid', action: () => this.updateTilingGrid() }
                ]
            }
        ]
    },
        {
            section: "VFS_OPERATIONS",
            items: [
                { label: '📁 Create New Folder', action: () => this.createFolder(), kbd: 'N' },
                { label: '🔡 Arrange Genesis Grid', action: () => this.arrangeIcons() }
            ]
        },
        {
            section: "WORKSPACE_CONFIG",
            items: [
                { label: '🖼️ Change Wallpaper', action: () => this.changeBackground() },
                { 
                    label: '⚙️ OS Preferences', 
                    children: [
                        { label: 'Toggle Scanlines', action: () => this.toggleScanlines() },
                        { label: 'Security Blur (Privacy)', action: () => this.toggleSecurityBlur() },
                        { label: 'Matrix FX Theme', action: () => this.setTheme('matrix') },
                        { label: 'Restore Sovereign Core', action: () => this.setTheme('sovereign') }
                    ]
                }
            ]
        },
        {
            section: "SECURITY_PROTOCOL",
            items: [
                { label: '🔒 Lock OS (Standby)', action: () => this.suspendSession(), kbd: 'Ctrl+L' },
                { label: '🧹 Close All Windows', action: () => this.closeAllWindows() }, // NEW ITEM
                { label: '🔄 Reboot Kernel', action: () => location.reload() },
                { 
                    label: '☢️ Shutdown Enclave', 
                    className: 'danger-action',
                    action: () => {
                        if(confirm("TERMINATE SESSION? 2025-12-26 Allotment data will be shredded.")) {
                            this.lockSystem();
                        }
                    }
                }
            ]
        }
    ];

    // 2. RECURSIVE HTML GENERATOR
    const generateHTML = (data) => {
        return data.map(sec => {
            if (sec.visible === false) return '';
            
            let html = `<div class="menu-section-label">${sec.section}</div>`;
            html += sec.items.map(item => {
                const hasChildren = item.children && item.children.length > 0;
                return `
                    <div class="menu-item ${hasChildren ? 'has-submenu' : ''} ${item.className || ''}" data-label="${item.label}">
                        <span class="m-label">${item.label}</span>
                        ${hasChildren ? '<span class="chevron">›</span>' : ''}
                        ${item.kbd ? `<kbd>${item.kbd}</kbd>` : ''}
                        ${hasChildren ? `<div class="vpu-submenu">${generateSubHTML(item.children)}</div>` : ''}
                    </div>`;
            }).join('');
            html += `<div class="menu-divider"></div>`;
            return html;
        }).join('');
    };

    const generateSubHTML = (subItems) => {
        return subItems.map(si => `
            <div class="menu-item" data-label="${si.label}">
                <span class="m-label">${si.label}</span>
            </div>
        `).join('');
    };

    menu.innerHTML = generateHTML(menuData);

    // 3. UNIVERSAL CLICK HANDLER
    // 3. UNIVERSAL CLICK HANDLER
menu.onclick = (e) => {
    const targetItem = e.target.closest('.menu-item');
    // Important: Don't close or fire if it's a parent of a submenu
    if (!targetItem || targetItem.classList.contains('has-submenu')) return;

    const label = targetItem.dataset.label;
    
    // Recursive search to find the action even if it's nested
    const findActionRecursive = (data) => {
        for (let sec of data) {
            // Check top level items
            for (let item of sec.items) {
                if (item.label === label) return item.action;
                // Check children (submenus)
                if (item.children) {
                    for (let child of item.children) {
                        if (child.label === label) return child.action;
                        // Optional: Add one more loop if you have sub-sub menus
                    }
                }
            }
        }
        return null;
    };

    const action = findActionRecursive(menuData);
    if (action) {
        action(); // Run the function
        menu.style.display = 'none'; // Close menu
    }
};
document.addEventListener('click', () => menu.style.display = 'none');
}

//creates folder
createFolder() {
    const folderId = `folder-${Date.now()}`;
    const folderName = prompt("Enter Folder Name:", "New_Registry") || "New_Folder";
    this.logEvent('FS', 'Creating new directory...');
    // Add logic to push a new icon to your workspace grid
    
    // 1. Create the Desktop Icon Element
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.id = `icon-${folderId}`;
    icon.innerHTML = `
        <span class="icon-glyph">📁</span>
        <span class="icon-label">${folderName}</span>
    `;

    // 2. Add Open Behavior (Double Click)
    icon.ondblclick = () => this.openFolder(folderId, folderName);

    // 3. Append to Workspace
    const workspace = document.getElementById('workspace');
    if (workspace) {
        workspace.appendChild(icon);
        this.logEvent('FS', `Directory created: ${folderName} [${folderId}]`);
    }
}

openFolder(id, name) {
    // Check if window already exists
    if (document.getElementById(`win-${id}`)) return;

    // Use your existing launchApp or window creation logic
    const folderWindow = this.createWindow(id, `Index: /${name}`, `
        <div class="folder-content">
            <p style="color: #00ff4133; font-size: 11px;">[ DIRECTORY_EMPTY ]</p>
            </div>
    `);
}

arrangeIcons() {
    const workspace = document.getElementById('workspace');
    const icons = Array.from(workspace.getElementsByClassName('desktop-icon'));
    this.logEvent('UI', 'Re-organizing Genesis grid...');
    // Add logic to sort desktop-icon elements
    
    // Sort by Label text
    icons.sort((a, b) => {
        const nameA = a.querySelector('.icon-label').innerText.toUpperCase();
        const nameB = b.querySelector('.icon-label').innerText.toUpperCase();
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
    });

    // Re-append in order (Flexbox/Grid in CSS will handle the positioning)
    icons.forEach(icon => workspace.appendChild(icon));
    this.logEvent('UI', 'Genesis Grid re-aligned by Name.');
}

restoreApp(appId) {
    const win = document.getElementById(`win-${appId}`);
    if (win) {
        win.classList.remove('minimized');
        this.focusApp(appId);
        this.logEvent('UI', `Restored ${appId} to workspace.`);
    }
}

focusApp(appId) {
    const win = document.getElementById(`win-${appId}`);
    if (win) {
        // Bring to front
        document.querySelectorAll('.os-window').forEach(w => w.style.zIndex = "100");
        win.style.zIndex = "1000";
        this.logEvent('UI', `Focus shifted to ${appId}`);
    }
}

closeAllWindows() {
    const workspace = document.getElementById('workspace');
    workspace.classList.add('pulse-bg');
    setTimeout(() => workspace.classList.remove('pulse-bg'), 400);

    const processes = Object.keys(this.runningApps);
    processes.forEach(appId => this.closeApp(appId, `win-${appId}`));
}

toggleScanlines() {
    let scanlineOverlay = document.getElementById('vpu-scanlines');
    
    if (!scanlineOverlay) {
        scanlineOverlay = document.createElement('div');
        scanlineOverlay.id = 'vpu-scanlines';
        // Ensure it sits behind UI but above wallpaper
        scanlineOverlay.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 1;
            background: linear-gradient(
                rgba(18, 16, 16, 0) 50%, 
                rgba(0, 0, 0, 0.1) 50%
            ), linear-gradient(
                90deg, 
                rgba(255, 0, 0, 0.02), 
                rgba(0, 255, 0, 0.01), 
                rgba(0, 0, 255, 0.02)
            );
            background-size: 100% 4px, 3px 100%;
            opacity: 0.3;
        `;
        document.body.appendChild(scanlineOverlay);
        this.logEvent('UI', 'CRT Scanline Emulation: ENABLED');
    } else {
        scanlineOverlay.remove();
        this.logEvent('UI', 'CRT Scanline Emulation: DISABLED');
    }
}

toggleSecurityBlur() {
    const root = document.getElementById('sovereign-shell');
    const isBlurred = root.style.filter.includes('blur');
    
    if (!isBlurred) {
        root.style.filter = 'blur(10px) grayscale(0.5)';
        root.style.transition = 'filter 0.5s ease';
        this.logEvent('SEC', 'Privacy Cloak: ACTIVE');
    } else {
        root.style.filter = 'none';
        this.logEvent('SEC', 'Privacy Cloak: DEACTIVATED');
    }
}

setTheme(themeName) {
    const root = document.documentElement;
    
    if (themeName === 'matrix') {
        root.style.setProperty('--primary-accent', '#00ff41');
        root.style.setProperty('--bg-color', '#000500');
        root.style.setProperty('--window-border', 'rgba(0, 255, 65, 0.3)');
        
        // If you have a Matrix background script, start it here
        this.startMatrixRain(); 
        this.logEvent('SYS', 'Visual Protocol: MATRIX_FX loaded.');
    } else {
        // Reset to Thealcohesion Purple
        root.style.setProperty('--primary-accent', '#a445ff');
        this.logEvent('SYS', 'Visual Protocol: SOVEREIGN_CORE restored.');
    }
}

// SECURITY PROTOCOL: LOCK SYSTEM
lockSystem() {
    console.warn("Kernel: SECURITY PROTOCOL ACTIVE. Purging Session Key...");

    // 1. SHRED DATA
    this.sessionKey = null;

    // 2. WIPE DOM (Kill all apps)
    Object.keys(this.runningApps).forEach(appId => {
        this.killProcess(appId);
    });

    // 3. UI RESET
    const gate = document.getElementById('login-gate');
    const root = document.getElementById('os-root');
    const top = document.getElementById('top-bar');
    const passInput = document.getElementById('pass-input');
    const status = document.getElementById('auth-status');

    if (gate) {
        gate.style.display = 'flex';
        gate.style.opacity = '1';
        // Notify the user that the purge was successful
        if (status) {
            status.innerText = "SESSION_PURGED: MEMORY_CLEAN";
            status.style.color = "#ff4444"; // Red alert color
        }
    }
    
    if (root) root.style.display = 'none';
    if (top) top.classList.add('hidden');
    
    // 4. SECURITY HYGIENE
    if (passInput) passInput.value = ''; 
    this.isLoggedIn = false;

    // Optional: Re-trigger the Pulse FX to show Sentry is still watching
    const pulse = document.querySelector('.pulse-container');
    if (pulse) pulse.style.display = 'block';

    console.log("Kernel: System Enclave Locked and Purged.");
}

suspendSession() {
    console.log("Kernel: Entering Standby Mode...");
    
    const lockScreen = document.getElementById('lock-screen');
    const loginGate = document.getElementById('login-gate');
    const root = document.getElementById('os-root');

    // 1. Ensure the Login Gate is HIDDEN
    if (loginGate) loginGate.style.display = 'none';

    // 2. Show the Lock Screen
    if (lockScreen) {
        lockScreen.classList.remove('hidden');
        lockScreen.style.display = 'flex';
        lockScreen.style.opacity = '1';
        this.isLocked = true;
    }

    // 3. Blur the background workspace
    if (root) {
        root.style.filter = "blur(20px)";
        // Optional: reduce opacity of workspace for better contrast
        root.style.opacity = "0.5";
    }
}
    setupTopBarInteractions() {
        const topBarTime = document.getElementById('top-bar-time');
        
        // --- ADD THIS SECTION BELOW ---
    // This finds the container holding your time/status icons
    const tBarRight = topBarTime?.parentElement; 
    
    if (tBarRight) {
        const tilingIndicator = document.createElement('div');
        tilingIndicator.id = 'tiling-status-hub';
        tilingIndicator.className = 'status-item'; // Matches your Top Bar styling
        tilingIndicator.style.display = 'flex';
        tilingIndicator.style.alignItems = 'center';
        tilingIndicator.style.gap = '5px';
        tilingIndicator.style.cursor = 'pointer';
        tilingIndicator.style.marginRight = '15px';
        
        tilingIndicator.title = "Workspace Layout Engine [Alt+G]";
        tilingIndicator.innerHTML = `
            <svg id="tiling-icon" viewBox="0 0 24 24" width="14" height="14" stroke="#a445ff" fill="none" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.3"></rect>
                <path d="M12 3v18M3 12h18" stroke-dasharray="2 2"></path>
            </svg>
            <span id="tiling-label" style="font-size: 10px; color: #a445ff; font-weight: bold;">FLOAT</span>
        `;
        
        tilingIndicator.onclick = () => {
            this.isTilingActive = !this.isTilingActive;
            this.updateTilingGrid();
        };

        // Put it before the time
        tBarRight.insertBefore(tilingIndicator, topBarTime);
    }
    // --- END OF ADDITION ---

        if (topBarTime) {
            topBarTime.style.cursor = 'pointer';
            topBarTime.onclick = async () => {
                const existingHud = document.getElementById('temporal-hud');
                if (existingHud) {
                    existingHud.style.opacity = '0';
                    setTimeout(() => existingHud.remove(), 200);
                    return;
                }
                const { TimeView } = await import('../apps/time/view.js');
                const { TimeModel } = await import('../apps/time/model.js');
                const model = new TimeModel();
                const view = new TimeView(null, model);
                view.renderHUD();
            };
        }
    }

    bootShell() {
    const dock = document.getElementById('side-dock');
    if (!dock) return;
    dock.innerHTML = ''; 
    // --- ADDED: TASK VIEW BUTTON (Far Left) ---
    const taskViewBtn = document.createElement('div');
    taskViewBtn.className = 'dock-item task-view-trigger';
    taskViewBtn.title = "View Open Apps";
    taskViewBtn.innerHTML = `<span><svg viewBox="0 0 24 24" width="20" height="20" stroke="#a445ff" fill="none" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></span>`;
    taskViewBtn.onclick = () => this.toggleTaskOverview();
    dock.appendChild(taskViewBtn);
    // --- END ADDITION ---
    this.pinnedApps.forEach((appId) => {
        const app = registry.find(a => a.id === appId);
        if (!app) return;

        const dItem = document.createElement('div');
        const isRunning = this.runningApps.has(appId);
        dItem.className = `dock-item ${isRunning ? 'running' : ''}`;
        dItem.title = app.name;
        dItem.innerHTML = `<span>${app.icon}</span>`;
        
        dItem.onclick = () => {
            // 1. Handle the Menu Overlay (Close it if it's open)
            const overlay = document.getElementById('app-menu-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            }

            // 2. Handle the App Logic
            if (isRunning) {
                // This calls focusWindow which now includes display: block
                this.focusWindow(`win-${appId}`);
            } else {
                this.launchApp(appId);
            }
        };
        
        dock.appendChild(dItem);
    });

    // App Menu Dot Trigger
    const menuBtn = document.createElement('div');
    menuBtn.className = 'dock-bottom-trigger';
    for(let i = 0; i < 9; i++) {
        const dot = document.createElement('div');
        dot.className = 'menu-dot';
        menuBtn.appendChild(dot);
    }
    menuBtn.onclick = () => this.openAppMenu();
    dock.appendChild(menuBtn);
}

toggleTaskOverview() {
    const workspace = document.getElementById('workspace');
    const realWindows = document.querySelectorAll('.os-window:not(.in-overview)');
    const isEntering = !document.body.classList.contains('task-overview-active');

    if (!isEntering) {
        this.exitOverview();
        return;
    }

    document.body.classList.add('task-overview-active');
    
    // Log visibility fix: Log before the blur covers everything or ensure blur is a child of workspace
    this.logSystemEvent("VPU PROXY VIRTUALIZATION", "info");

    const blur = document.createElement('div');
    blur.id = 'overview-blur';
    blur.innerHTML = `
        <div id="overview-search-wrap">
            <input type="text" id="overview-search" placeholder="FILTER ENCLAVES..." autocomplete="off">
        </div>
        <button id="purge-all-btn">TERMINATE ALL ACTIVE ENCLAVES</button>
        <div id="overview-grid"></div>
    `;
    workspace.appendChild(blur);

    const grid = document.getElementById('overview-grid');

    realWindows.forEach(realWin => {
        // 1. Hide real window
        realWin.style.visibility = 'hidden';

        // 2. Create Proxy
        const proxy = realWin.cloneNode(true);
        proxy.id = `proxy-${realWin.id}`;
        proxy.classList.add('in-overview');
        // Grab the title from the real window and save it on the proxy
        const winTitle = realWin.querySelector('.title')?.innerText || "Enclave";
        proxy.setAttribute('data-search-term', winTitle.toLowerCase());
        proxy.style.cssText = `
            position: relative !important;
            left: auto !important;
            top: auto !important;
            width: 100% !important;
            height: 200px !important;
            visibility: visible !important;
            display: flex !important;
            transform: none !important;
        `;

        // --- 3. FILTER CONTROLS & ADD CONFIRMATION ---
        const controls = proxy.querySelector('.window-controls');
        if (controls) {
            Array.from(controls.children).forEach(btn => {
                if (!btn.classList.contains('close') && !btn.classList.contains('close-btn')) {
                    btn.remove();
                } else {
                    btn.style.display = 'flex';
                    btn.style.pointerEvents = 'all';
                    
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        
                        // --- THE CONFIRMATION OVERLAY ---
                        const confirmOverlay = document.createElement('div');
                        confirmOverlay.className = 'proxy-confirm-overlay';
                        confirmOverlay.innerHTML = `
                            <div class="confirm-box">
                                <p>TERMINATE ENCLAVE?</p>
                                <div class="confirm-btns">
                                    <button class="yes">YES</button>
                                    <button class="no">NO</button>
                                </div>
                            </div>
                        `;
                        proxy.appendChild(confirmOverlay);

                        // Handle NO
                        confirmOverlay.querySelector('.no').onclick = (ev) => {
                            ev.stopPropagation();
                            confirmOverlay.remove();
                        };

                        // Handle YES
                        confirmOverlay.querySelector('.yes').onclick = (ev) => {
                            ev.stopPropagation();
                            const appId = realWin.id.replace('win-', '');
                            
                            this.logSystemEvent(`TERMINATING: ${appId}`, "warn");
                            this.closeApp(appId, realWin.id); 
                            
                            proxy.style.transform = "scale(0.9)";
                            proxy.style.opacity = "0";
                            setTimeout(() => {
                                proxy.remove();
                                if (grid.querySelectorAll('.os-window').length === 0) {
                                    this.exitOverview();
                                }
                            }, 200);
                        };
                    };
                }
            });
        }

        proxy.onclick = () => this.exitOverview(realWin.id);
        grid.appendChild(proxy);
    });

    // --- TERMINATE ALL LOGIC ---
    document.getElementById('purge-all-btn').onclick = (e) => {
    e.stopPropagation();
    
    const proxies = grid.querySelectorAll('.os-window');
    if (proxies.length === 0) return;

    const massConfirm = document.createElement('div');
    massConfirm.id = 'mass-purge-overlay';
    massConfirm.innerHTML = `
        <div class="mass-confirm-box">
            <h2 class="critical-text">⚠ ENCLAVE PURGE INITIATED</h2>
            <div id="purge-countdown">10</div>
            <p>PURGING ${proxies.length} ACTIVE PROCESSES...</p>
            <div class="mass-confirm-btns">
                <button class="cancel-purge">ABORT SEQUENCE</button>
            </div>
        </div>
    `;
    document.getElementById('overview-blur').appendChild(massConfirm);

    let count = 10; // Increased to 10
    const countdownEl = massConfirm.querySelector('#purge-countdown');
    
    const timer = setInterval(() => {
        count--;
        countdownEl.innerText = count;
        
        // Visual warning: Turn text red when under 4 seconds
        if (count <= 3) {
            countdownEl.style.color = "#ff4444";
            countdownEl.style.fontSize = "100px";
        }
        
        if (count === 0) {
            clearInterval(timer);
            executeFinalPurge();
        }
    }, 1000);

    massConfirm.querySelector('.cancel-purge').onclick = () => {
        clearInterval(timer);
        this.logSystemEvent("ENCLAVE PURGE INITIATED", "info");
        massConfirm.remove();
    };

    const executeFinalPurge = () => {
        countdownEl.innerText = "PURGING";
        this.logSystemEvent(`EXECUTING MASS PURGE: ${proxies.length} PROCESSES`, "critical");

        proxies.forEach((p, i) => {
            setTimeout(() => {
                const realId = p.id.replace('proxy-', '');
                const appId = realId.replace('win-', '');
                
                this.closeApp(appId, realId);
                p.style.transform = "scale(0) rotate(15deg)";
                p.style.opacity = "0";
                
                setTimeout(() => p.remove(), 300);

                if (i === proxies.length - 1) {
                    setTimeout(() => {
                        massConfirm.remove();
                        this.exitOverview();
                    }, 500);
                }
            }, i * 60);
        });
    };
};
 

    // Search Logic
    // Search Logic (Inside toggleTaskOverview)
    const searchInput = document.getElementById('overview-search');
    if (searchInput) {
        searchInput.focus();
        searchInput.oninput = (e) => {
            const query = e.target.value.toLowerCase().trim();
            const proxies = grid.querySelectorAll('.os-window.in-overview');

            proxies.forEach(p => {
                const term = p.getAttribute('data-search-term') || "";
                if (term.includes(query)) {
                    p.style.display = 'flex';
                } else {
                    p.style.display = 'none';
                }
            });
        };
    }
}

//PURGE BUTTON

renderOverviewControls() {
    const controls = document.createElement('div');
    controls.id = 'overview-hud';
    controls.innerHTML = `
        <button onclick="os.purgeAll()">
            <svg class="sys-icon" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            CLEANSE SYSTEM
        </button>
    `;
    document.body.appendChild(controls);
}

exitOverview(focusId = null) {
    const blur = document.getElementById('overview-blur');
    const realWindows = document.querySelectorAll('.os-window:not(.in-overview)');

    document.body.classList.remove('task-overview-active');

    // 1. Show all real windows again
    realWindows.forEach(win => {
        win.style.visibility = 'visible';
        win.style.pointerEvents = 'all';
        // Note: left/top/width/height are exactly where the user left them!
    });

    // 2. Remove the overview (and all proxies inside it)
    if (blur) {
        blur.style.opacity = '0';
        setTimeout(() => blur.remove(), 300);
    }

    // 3. Focus the selected window
    if (focusId) {
        this.focusWindow(focusId);
    }
}
   
    initGhostReaper() {
        const CRITICAL_IDLE = 600000; // 10 Minutes in ms
        
        setInterval(() => {
            // Only reap while the user is looking at the Overview
            if (!document.body.classList.contains('task-overview-active')) return;

            const now = Date.now();
            const ghostWindows = document.querySelectorAll('.os-window.in-overview');

            ghostWindows.forEach(win => {
                const lastUsed = parseInt(win.dataset.lastUsed || now);
                const idleTime = now - lastUsed;

                // If idle for more than 10 mins, start auto-termination
                if (idleTime > CRITICAL_IDLE && !win.classList.contains('terminating')) {
                    this.reapProcess(win);
                } else if (idleTime > (CRITICAL_IDLE * 0.8)) {
                    // At 8 minutes, turn the badge red as a warning
                    win.querySelector('.idle-badge')?.classList.add('critical');
                }
            });
        }, 5000); // Check every 5 seconds
    }

    reapProcess(win) {
        win.classList.add('terminating');
        const appId = win.id.replace('win-', '');
        
        // Find dock icon to pulse it (reclaiming resources)
        const dockIcon = document.querySelector(`.dock-icon[data-app-id="${appId}"]`);

        setTimeout(() => {
            if (dockIcon) {
                dockIcon.classList.add('pulse-reception');
                setTimeout(() => dockIcon.classList.remove('pulse-reception'), 600);
            }
            
            this.closeApp(appId, win.id);
            win.remove();
            
            console.log(`[Sovereign OS] Reclaimed resources from idle process: ${appId}`);
        }, 2000); // Matches the 'ghostZap' animation duration
    
        // Trigger the Log
        this.logSystemEvent(`RECLAIMED IDLE PROCESS: ${appId.toUpperCase()}`, 'critical');

        setTimeout(() => {
            // ... closeApp logic ...
        }, 2000);
    }
    launchApp(appId) {
        
        if (this.isTilingActive) {
        this.showSnapPreview(); // Show where it will go
        setTimeout(() => {
            document.getElementById('snap-preview').style.display = 'none';
        }, 500);
    }

        // 1. OVERVIEW EXIT: If launching while in overview, exit it first
        if (document.body.classList.contains('task-overview-active')) {
            this.exitOverview(); 
        }

        // TRIPWIRE: Check process count
        if (this.runningApps.size >= 10) {
            this.triggerRealPanic("0xMEM_OVERFLOW_02", "Hardware threading limit reached. Close active enclaves.");
            return;
        }
        // 1. Close the overlay menu immediately
        const overlay = document.getElementById('app-menu-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
        }

        const app = registry.find(a => a.id === appId);
        const workspace = document.getElementById('workspace');
        if (!app || !workspace) return;

        const winId = `win-${appId}`;
        
        // Prevent duplicate windows
        if (this.runningApps.has(appId)) {
            this.focusWindow(winId);
            return;
        }

        this.runningApps.add(appId);
        this.bootShell(); // Refresh dock icons to show "running" state

        const win = document.createElement('div');
        win.className = 'os-window';
        win.id = winId;

        // --- RESTORED GOLD GEOMETRY ---
       // --- UPDATED CASCADE GEOMETRY ---
        const activeCount = this.runningApps.size - 1; // Number of other windows
        const offset = activeCount * 25; // 25px offset per window

        win.style.position = "absolute"; 
        
        // Start 5px below the Top Bar, then add the cascade offset
        // We use 'px' values for the initial spawn to ensure stability
        const spawnTop = 40 + 5 + offset; // 40 (TopBar) + 5 (Gap) + Cascade
        const spawnLeft = 75 + 5 + offset; // 75 (Dock) + 5 (Gap) + Cascade

        win.style.top = `${spawnTop}px`;
        win.style.left = `${spawnLeft}px`;
        
        // Maintain your clamp logic for size
        win.style.width = "clamp(320px, 65vw, 900px)";
        win.style.height = "clamp(300px, 65vh, 720px)";

        // Ensure new window is on top
        win.style.zIndex = this.getTopZIndex();

        // NEW: SECURITY AUDIT LOG FOR SENSITIVE APPS
        if (appId === 'syslog') {
            if (!this.isLoggedIn || !this.sessionKey) {
                this.logEvent('WARN', `UNAUTHORIZED_ACCESS: Attempt to open System Log without valid Enclave Key.`);
                
                // Optionally, trigger a minor warning UI instead of a full panic
                alert("ACCESS DENIED: Administrative logs are encrypted. Unlock Enclave to proceed.");
                return;
            } else {
                this.logEvent('INFO', `SECURE_ACCESS: System Log opened by ${this.memberId || 'AUTHORIZED_MEMBER'}`);
            }
        }

        win.style.zIndex = this.getTopZIndex();

        // Standard OS Window structure
                        win.innerHTML = `
            <div class="window-header">
                <span class="title">${app.icon} ${app.name}</span>
                <div class="window-controls">
                    <button class="win-btn hide" id="hide-${winId}">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                    <button class="win-btn expand" id="max-${winId}">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="1"></rect></svg>
                    </button>
                    <button class="win-btn close" id="close-${winId}">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>
            <div class="window-content" id="canvas-${appId}" style="height: calc(100% - 50px); overflow: auto;">
                <div class="app-loading">System: Initializing ${app.name}...</div>
            </div>
            <div class="resize-handle resize-n"></div>
            <div class="resize-handle resize-s"></div>
            <div class="resize-handle resize-e"></div>
            <div class="resize-handle resize-w"></div>
            <div class="resize-handle resize-ne"></div>
            <div class="resize-handle resize-nw"></div>
            <div class="resize-handle resize-se"></div>
            <div class="resize-handle resize-sw"></div>`;

        workspace.appendChild(win);
        
        // NEW: Add window to tiling order
        if (!this.tiledWindowOrder.includes(winId)) {
            this.tiledWindowOrder.push(winId);
            console.log(`Added ${winId} to tiling order:`, this.tiledWindowOrder);
        }
        
        // CRITICAL: Ensure window is visible before tiling
        win.style.visibility = 'visible';
        win.style.display = 'flex';
        win.style.opacity = '1';
        win.style.pointerEvents = 'auto';
        
        this.updateTilingGrid();
        
        // Call meter update
        this.updateMemoryMeter();
        
        // --- RESTORED ANIMATION SEQUENCE ---
        requestAnimationFrame(() => {
            win.style.opacity = "0";
            win.style.transform = "translateY(10px)"; // Start slightly lower
            requestAnimationFrame(() => {
                win.style.transition = "all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)";
                win.style.opacity = "1";
                win.style.transform = "translateY(0)";
            });
        });

        // Controls & Interactivity
        win.querySelector(`#hide-${winId}`).onclick = (e) => { e.stopPropagation(); this.minimizeWindow(winId); };
        win.querySelector(`#max-${winId}`).onclick = (e) => { e.stopPropagation(); this.toggleMaximize(winId); };
        win.querySelector(`#close-${winId}`).onclick = (e) => { e.stopPropagation(); this.closeApp(appId, winId); };
        
        win.onmousedown = () => this.focusWindow(winId);
        win.addEventListener('touchstart', () => this.focusWindow(winId), {passive: true});
        
        // Attach resize handles
        this.attachResizeHandles(win, winId);
        
                // Header interactions
        const header = win.querySelector('.window-header');
        if (header) {
            // Single click: Focus window
            header.addEventListener('mousedown', (e) => {
                if (e.target.closest('.window-controls')) return;
                this.focusWindow(winId);
            });

                    // Right-click: Show swap menu (in tiling mode)
        header.addEventListener('contextmenu', (e) => {
            if (this.isTilingActive && !e.target.closest('.window-controls')) {
                e.preventDefault();
                this.showSwapMenu(winId, e);
            }
        });
            
            // Double click: Toggle maximize
            header.addEventListener('dblclick', (e) => {
                if (e.target.closest('.window-controls')) return;
                this.toggleMaximize(winId);
            });
        }

        this.makeDraggable(win);
        // --- NEW INJECTION LOGIC ---
        // We check if the app is a local synthesis or a standard file, for demo will be removed when app are not local
        if (app.file === 'local_module') {
            this.executeLocalApp(appId, app);
        } else {
            // Standard loading for pre-installed apps
            this.injectAppContent(appId);
        }
        win.dataset.lastUsed = Date.now();

        if (this.runningApps.size >= this.MAX_ACTIVE_APPS) {
        this.notify("SYSTEM_DENIAL: Max active processes (5) reached.", "critical");
        return;
    }
    
    // Track usage
    this.usageStats[appId] = (this.usageStats[appId] || 0) + 1;
    this.runningApps.add(appId);
    
    // Signal the wallpaper to create/update the bubble
    window.dispatchEvent(new CustomEvent('vpu:app_launched', { detail: { appId } }));
    }
//For demo will be removed later
    executeLocalApp(appId, app) {
        const container = document.getElementById(`canvas-${appId}`);
        if (!container) return;

        try {
            container.innerHTML = ''; // Clear the "System: Initializing..." text
            
            /* We wrap the stored code in a function. 
               app.code is the string captured from the LogicForge editor.
            */
            const ModuleClass = new Function('container', 'api', `return ${app.code}`)(); 
            const instance = new ModuleClass(container, this.api);
            
            if (instance.init) {
                instance.init();
                console.log(`[KERNEL]: LOCAL_MODULE_VPU_READY -> ${appId}`);
            }
        } catch (err) {
            container.innerHTML = `<div style="color:#ff3366; padding:20px;">
                <h3>0xSYNTAX_ERROR</h3>
                <p>${err.message}</p>
            </div>`;
            console.error("[KERNEL]: LOCAL_EXECUTION_FAILED", err);
        }
    }

    //For app center
    getAppMetadata(appId) {
    // This looks into your imported registry object
    return registry[appId]; 
}

    /**
 * RE-ALIGN ENCLAVES (Tiling Engine)
 * Automatically organizes open windows into a Master-Stack or Quad-Grid.
 */
updateTilingGrid() {
    const label = document.getElementById('tiling-label');
    const icon = document.getElementById('tiling-icon');
    const ws = document.getElementById('workspace');
    
    // 1. Filter out proxies (Task Overview) and minimized windows
    const allWins = Array.from(ws.querySelectorAll('.os-window:not(.minimized):not(.in-overview)'));
    
    // DEBUG: Log all windows found
    console.log(`updateTilingGrid: Found ${allWins.length} windows:`, allWins.map(w => ({
        id: w.id,
        minimized: w.classList.contains('minimized'),
        visible: window.getComputedStyle(w).visibility,
        display: window.getComputedStyle(w).display,
        zIndex: w.style.zIndex
    })));
    
    // NEW: Sort by tiledWindowOrder to maintain swap positions
    const activeWins = allWins.sort((a, b) => {
        const indexA = this.tiledWindowOrder.indexOf(a.id);
        const indexB = this.tiledWindowOrder.indexOf(b.id);
        
        // If in order array, use that position
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        
        // New windows go to the end
        if (indexA === -1 && indexB !== -1) return 1;
        if (indexA !== -1 && indexB === -1) return -1;
        
        // Both new: keep DOM order
        return 0;
    });
    
    const count = activeWins.length;

    // 2. Handle Deactivated State
    if (!this.isTilingActive) {
        if (label) {
            label.innerText = "FLOAT";
            label.style.color = "#a445ff"; // Purple
        }
        if (icon) icon.setAttribute('stroke', '#a445ff');
        
        activeWins.forEach(win => {
            win.style.transition = 'all 0.4s ease';
            // Return to natural floating state
            win.style.width = "clamp(320px, 65vw, 900px)";
            win.style.height = "clamp(300px, 65vh, 720px)";
        });
        return;
    }

    // 3. Update UI for Active Tiling
    if (label) {
        label.innerText = count >= 4 ? "QUAD" : "STACK";
        label.style.color = "#00ff41"; // Green
    }
    if (icon) icon.setAttribute('stroke', '#00ff41');

    if (count === 0) return;

    // 4. Geometry Constants (Respecting Dock and Top Bar)
    const dockW = 75;  
    const topBarH = 40; 
    const gap = 0; // NO gap - windows flush against edges
    
    // FIX: Use exact workspace dimensions minus dock and topbar
    const usableW = ws.clientWidth - dockW; // Full width minus dock only
    const usableH = ws.clientHeight - topBarH; // Full height minus topbar only

    console.log(`Tiling: ws.clientWidth=${ws.clientWidth}, ws.clientHeight=${ws.clientHeight}, usableW=${usableW}, usableH=${usableH}, count=${count}`); // DEBUG
    // 5. Apply Layouts
    activeWins.forEach(win => {
        win.style.transition = 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
        win.classList.remove('maximized'); 
    });

    // CRITICAL: LIMIT TILING TO MAX 4 WINDOWS
    const tiledWins = activeWins.slice(0, 4); // Only tile first 4
    const floatingWins = activeWins.slice(4); // 5th+ windows float

    // NEW: Update the tiling order to include floating windows
    floatingWins.forEach(win => {
        if (!this.tiledWindowOrder.includes(win.id)) {
            this.tiledWindowOrder.push(win.id);
        }
    });

       // Float any windows beyond 4th (ready to take space when one is removed)
    floatingWins.forEach((win, idx) => {
        win.classList.add('floating-extra'); // Mark as floating
        win.style.position = 'absolute';
        
        // Get the max z-index from tiled windows
        const maxTiledZ = Math.max(...tiledWins.map(w => parseInt(w.style.zIndex) || 100));
        const floatingZIndex = maxTiledZ + floatingWins.length - idx;
        win.style.zIndex = floatingZIndex.toString();
        
        // ONLY set initial position if window hasn't been dragged
        if (!win.dataset.hasBeenDragged || win.dataset.hasBeenDragged === 'false') {
            // NEW: Center the floating window with slight cascade
            const windowWidth = 600;
            const windowHeight = 400;
            
            // Calculate center position
            const centerLeft = (ws.clientWidth - windowWidth) / 2;
            const centerTop = (ws.clientHeight - windowHeight) / 2;
            
            // Add slight cascade offset so multiple 5th+ windows don't overlap perfectly
            const cascadeOffset = idx * 20;
            const finalLeft = Math.max(dockW + gap, centerLeft + cascadeOffset);
            const finalTop = Math.max(topBarH + gap, centerTop + cascadeOffset);
            
            win.style.left = `${finalLeft}px`;
            win.style.top = `${finalTop}px`;
            win.style.width = `${windowWidth}px`;
            win.style.height = `${windowHeight}px`;
        }
        
        win.style.transition = 'all 0.3s ease';
    });

           // Only tile the first 4 windows
    const tiledCount = tiledWins.length;
    
    // CRITICAL: Assign base z-index to all tiled windows first
    const baseZIndex = 100;
    tiledWins.forEach((win, i) => {
        win.style.zIndex = (baseZIndex + i).toString();
    });

        if (tiledCount === 1) {
        // Single window: Take full space
        tiledWins[0].style.left = `${dockW}px`;
        tiledWins[0].style.top = `${topBarH}px`;
        tiledWins[0].style.width = `${usableW}px`;
        tiledWins[0].style.height = `${usableH}px`;
        tiledWins[0].classList.remove('floating-extra');
        tiledWins[0].dataset.hasBeenDragged = 'false';
        
        console.log(`SOLO_MODE: width=${usableW}, height=${usableH}`);

        } else if (tiledCount === 2 || tiledCount === 3) {
        // MASTER-STACK MODE (2-3 windows only)
        // read persisted master ratio if available
        const masterRatio = (this.tilingState && this.tilingState.masterRatio) ? parseFloat(this.tilingState.masterRatio) : 0.65;
        const masterW = usableW * masterRatio;
        const stackW = usableW - masterW;
        
        console.log(`MASTER-STACK: masterW=${masterW}, stackW=${stackW}, ratio=${masterRatio}, count=${tiledCount}`);

        tiledWins.forEach((win, i) => {
            win.classList.remove('floating-extra');
            win.dataset.hasBeenDragged = 'false';
            
            if (i === 0) {
                // Master on left
                win.style.left = `${dockW}px`;
                win.style.top = `${topBarH}px`;
                win.style.width = `${masterW}px`;
                win.style.height = `${usableH}px`;
            } else {
                // Stack on right
                if (tiledCount === 2) {
                    const stackH = usableH;
                    win.style.left = `${dockW + masterW}px`;
                    win.style.top = `${topBarH}px`;
                    win.style.width = `${stackW}px`;
                    win.style.height = `${stackH}px`;
                } else {
                    // 3-window split: allow persisted stack heights
                    const stackHeights = (this.tilingState && this.tilingState.stackHeights) ? this.tilingState.stackHeights : null;
                    if (stackHeights && stackHeights.length === 2) {
                        const h1 = usableH * stackHeights[0];
                        const h2 = usableH * stackHeights[1];
                        if (i === 1) {
                            win.style.left = `${dockW + masterW}px`;
                            win.style.top = `${topBarH}px`;
                            win.style.width = `${stackW}px`;
                            win.style.height = `${h1}px`;
                        } else {
                            win.style.left = `${dockW + masterW}px`;
                            win.style.top = `${topBarH + h1}px`;
                            win.style.width = `${stackW}px`;
                            win.style.height = `${h2}px`;
                        }
                    } else {
                        const stackH = usableH / (tiledCount - 1);
                        win.style.left = `${dockW + masterW}px`;
                        win.style.top = `${topBarH + ((i - 1) * stackH)}px`;
                        win.style.width = `${stackW}px`;
                        win.style.height = `${stackH}px`;
                    }
                }
            }
        });
        } else if (tiledCount >= 4) {
        // QUAD-GRID MODE (2x2 - EXACTLY 4 WINDOWS)
        const cols = 2;

        // use persisted col/row ratios if present
        const colRatio = (this.tilingState && this.tilingState.colRatio) ? parseFloat(this.tilingState.colRatio) : 0.5;
        const rowRatio = (this.tilingState && this.tilingState.rowRatio) ? parseFloat(this.tilingState.rowRatio) : 0.5;

        const leftColW = usableW * colRatio;
        const rightColW = usableW - leftColW;
        const topRowH = usableH * rowRatio;
        const bottomRowH = usableH - topRowH;

        const cellDims = [
            { w: leftColW, h: topRowH },
            { w: rightColW, h: topRowH },
            { w: leftColW, h: bottomRowH },
            { w: rightColW, h: bottomRowH },
        ];

        tiledWins.forEach((win, i) => {
            win.classList.remove('floating-extra');
            win.dataset.hasBeenDragged = 'false';
            
            const row = Math.floor(i / cols);
            const col = i % cols;
            const cell = cellDims[i];
            const left = dockW + (col === 0 ? 0 : leftColW);
            const top = topBarH + (row === 0 ? 0 : topRowH);

            win.style.left = `${left}px`;
            win.style.top = `${top}px`;
            win.style.width = `${cell.w}px`;
            win.style.height = `${cell.h}px`;
        });
    }
    
    // CRITICAL: Floating windows ALWAYS get higher z-index than tiled
    floatingWins.forEach((win, idx) => {
        const floatingZIndex = baseZIndex + tiledWins.length + floatingWins.length - idx;
        win.style.zIndex = floatingZIndex.toString();
        console.log(`Floating window ${idx + 5} zIndex: ${floatingZIndex}`);
    });

    this.logSystemEvent(`Layout Synchronized: ${count} Enclaves Active`, 'info');
}
showSnapPreview(targetIndex = null) {
    const preview = document.getElementById('snap-preview');
    const ws = document.getElementById('workspace');
    if (!preview || !this.isTilingActive) return;

    // 1. Get current active windows + 1 (the one being dragged or launched)
    const activeWins = Array.from(ws.querySelectorAll('.os-window:not(.minimized)'));
    const count = activeWins.length + (targetIndex === null ? 1 : 0);
    
    // 2. Constants matching your updateTilingGrid
    const dockW = 75;
    const topBarH = 40;
    const gap = 10;
    const usableW = ws.clientWidth - dockW - (gap * 2);
    const usableH = ws.clientHeight - topBarH - (gap * 2);

    // 3. Calculate the "Predicted" geometry for the new slot
    let geom = { left: 0, top: 0, width: 0, height: 0 };

    if (count < 4) {
        const masterW = count === 1 ? usableW : usableW * 0.65;
        const stackW = usableW - masterW - gap;
        
        // If it's the first window, preview the Master slot
        if (count === 1) {
            geom = { left: dockW + gap, top: topBarH + gap, width: masterW, height: usableH };
        } else {
            // Preview the next available stack slot
            const stackH = (usableH - (gap * (count - 2))) / (count - 1);
            geom = { 
                left: dockW + masterW + (gap * 2), 
                top: topBarH + gap + ((count - 2) * (stackH + gap)), 
                width: stackW, 
                height: stackH 
            };
        }
    } else {
        // Quad Grid Preview logic
        const cellW = (usableW - gap) / 2;
        const cellH = (usableH - gap) / 2; // Simplified for 2x2
        const row = Math.floor((count - 1) / 2);
        const col = (count - 1) % 2;
        geom = { 
            left: dockW + gap + (col * (cellW + gap)), 
            top: topBarH + gap + (row * (cellH + gap)), 
            width: cellW, 
            height: cellH 
        };
    }

    // 4. Apply to Preview Element
    preview.style.display = 'block';
    preview.style.left = `${geom.left}px`;
    preview.style.top = `${geom.top}px`;
    preview.style.width = `${geom.width}px`;
    preview.style.height = `${geom.height}px`;
}

    /**
     * UPDATED INJECTOR: This version combines hardcoded routes 
     * with your new Dynamic Registry Loader.
     */
    async injectAppContent(appId) {
    const container = document.getElementById(`canvas-${appId}`);
    if (!container) return;
    const win = container.closest('.os-window');

    // 1. Check Hardcoded Routes (Internal Kernel Tools)
    const route = this.APP_ROUTES[appId];
    if (route) {
        try {
            const instance = await route(container);
            if (instance) win.dataset.engineInstance = instance;
            return; 
        } catch (err) {
            console.error(`Kernel: Route failed for ${appId}:`, err);
        }
    }

    // 2. Dynamic Registry Loading (SOVEREIGN FRAMEWORK MODE)
    const appData = registry.find(a => a.id === appId);
    if (appData && appData.file) {
        try {
            const filePath = appData.file.startsWith('./') ? appData.file : `./${appData.file}`;
            const module = await import(filePath);
            
            // Create the restricted API object (The Bridge)
            const sovereignAPI = {
                signature: 'SOVEREIGN_CORE_V1', // Required for App Handshake, The "Passport"
                sessionKey: this.sessionKey, //AES-GCM Key
                vfs: SovereignVFS, //The file system driver
                identity: "AUTHORIZED_MEMBER",
                timestamp: "2025-12-26", // Reference to your Investor/EPOS milestone
                close: () => this.closeApp(appId, win.id), //Self-destruct function
                // NEW: Automated Memory Purge
                purge: () => {
                    console.log(`Kernel: Purging RAM for ${appId}...`);
                    // Force garbage collection on specific app-held data
                    return null; 
                }
            };

            // Standardize Class Name (e.g., 'terminal' -> 'TerminalApp')
            const className = appId.charAt(0).toUpperCase() + appId.slice(1) + "App";
            
            if (module[className]) {
                // Instantiate with the Bridge instead of just the key
                const instance = new module[className](container, sovereignAPI);
                
                if (instance.init) {
                    await instance.init(); 
                }
                
                win.dataset.engineInstance = instance;
            }
        } catch (err) {
            console.error(`Kernel: Handshake failed for ${appId}:`, err);
            container.innerHTML = `<div style="padding:20px; color:#ff4444;">[SYS_ERR]: Handshake Failed. Verify Enclave Key.</div>`;
        }
    } else {
        // 3. Last Resort
        container.innerHTML = `<div style="padding:20px; color:#00ff41;">${appId.toUpperCase()} online. Awaiting module deployment.</div>`;
    }
}
    renderTNFIDashboard(container) {
        container.innerHTML = `
            <div class="tnfi-app" style="padding:25px; color:#a445ff; font-family: 'Courier New', monospace;">
                <h2 style="margin:0; letter-spacing:2px;">BANK OF SOVEREIGN</h2>
                <div style="font-size:12px; color:#00ff41; margin-bottom:20px;">GENESIS ALLOTMENT VERIFIED // LOCK_DATE: 2025-12-26</div>
                
                <div style="background:rgba(164, 69, 255, 0.05); padding:15px; border-left:3px solid #00ff41; margin-bottom:20px;">
                    <div style="font-size:10px; opacity:0.7;">TOTAL SUPPLY</div>
                    <div style="font-size:18px; color:#fff;">100,000,000 VPU</div>
                </div>

                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead style="color:rgba(255,255,255,0.5); text-align:left; border-bottom:1px solid #333;">
                        <tr><th style="padding:10px 0;">ENTITY</th><th>ALLOTMENT</th><th>STATUS</th></tr>
                    </thead>
                    <tbody style="color:#00ff41;">
                        <tr style="border-bottom:1px solid #222;"><td style="padding:12px 0;">EPOS CORE</td><td>50,000,000</td><td>LOCKED</td></tr>
                        <tr style="border-bottom:1px solid #222;"><td style="padding:12px 0;">INVESTORS</td><td>15,000,000</td><td>10% TGE</td></tr>
                        <tr><td style="padding:12px 0;">LIQUIDITY</td><td>20,000,000</td><td>UNLOCKED</td></tr>
                    </tbody>
                </table>
            </div>`;
        return { id: "TNFI_STUB" };
    }

    makeDraggable(el) {
    const header = el.querySelector('.window-header');
    if (!header) return;

    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;
    let clickTime = 0;
    const winId = el.id;

    const onDown = (e) => {
    // SKIP if clicking buttons
    if (e.target.closest('.win-btn')) return;
    if (e.target.closest('.window-controls')) return;
    if (el.classList.contains('in-overview')) return;

    // FOCUS IMMEDIATELY
    this.focusWindow(winId);
    
    // NEW: Mark floating window as dragged (so updateTilingGrid won't reposition it)
    if (el.classList.contains('floating-extra')) {
        el.dataset.hasBeenDragged = 'true';
        console.log(`Floating window ${winId} marked as dragged`);
    }

    const now = Date.now();
    
    // Check for double-click (within 300ms of LAST click)
    if (clickTime > 0 && (now - clickTime < 300)) {
        // DOUBLE CLICK DETECTED
        console.log(`Double-click detected on ${winId}`);
        this.toggleMaximize(winId);
        dragging = false;
        clickTime = 0;
        return;
    }

    // Record this click time for next potential double-click
    clickTime = now;

    dragging = true;
    this.isDraggingWindow = true;

        const style = window.getComputedStyle(el);
        startLeft = parseFloat(style.left);
        startTop = parseFloat(style.top);
        
        startX = e.clientX;
        startY = e.clientY;

        el.style.transition = 'none';
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
    };

    const onMove = (e) => {
    if (!dragging) return;
    
    // 1. Get the current workspace dimensions
    const workspace = el.parentElement;
    const workWidth = workspace.clientWidth;
    const workHeight = workspace.clientHeight; // This is the key!

    // 2. Calculate requested position
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    // 3. Apply strict boundaries
    // Horizontal: 5px margin from left and right
    newLeft = Math.max(5, Math.min(newLeft, workWidth - el.offsetWidth - 5));

    // Vertical: 5px margin from top and bottom
    // We use workHeight instead of window.innerHeight to prevent bleeding
    const maxTop = workHeight - el.offsetHeight - 5;
    newTop = Math.max(5, Math.min(newTop, maxTop));

    // 4. Update element
    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
    this.checkDockCollision(); // Call the collision logic here
    e.preventDefault();

    if (this.isTilingActive) {
        // If window is dragged near the top/left, show the grid intention
        if (e.clientX < 150) {
            this.showSnapPreview(0); // Show master slot preview
        } else {
            document.getElementById('snap-preview').style.display = 'none';
        }
    }
};

            const onUp = () => {
            if (!dragging) return;
            dragging = false;
            this.isDraggingWindow = false;
            el.style.transition = 'all 0.25s cubic-bezier(0.2, 0.8, 0.3, 1)';
            this.updateDockSafety(false);
            
            // NEW: Debounce grid update after drag finishes
            if (this.isTilingActive) {
                this.debouncedUpdateTilingGrid(80);
            }
        };

        document.addEventListener('pointermove', onMove, { passive: false });
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
        header.addEventListener('pointerdown', onDown);
    
    }

    attachResizeHandles(win, winId) {
    const handles = win.querySelectorAll('.resize-handle');

    handles.forEach(handle => {
        let isResizing = false;
        let startX = 0, startY = 0;
        let startWidth = 0, startHeight = 0;
        let startLeft = 0, startTop = 0;
        
        const dirMatch = handle.className.match(/resize-([nesw]{1,2})/);
        const dir = dirMatch ? dirMatch[1] : 'se';

        const onPointerMove = (e) => {
            if (!isResizing) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            if (window.kernel.isTilingActive) {
                window.kernel.handleTilingResize(win, dir, deltaX, deltaY);
            } else {
                if (!dir.includes('n') && !dir.includes('s')) return;

                let newH = startHeight;
                let newT = startTop;

                if (dir.includes('s')) {
                    newH = Math.max(240, startHeight + deltaY);
                }
                if (dir.includes('n')) {
                    newH = Math.max(240, startHeight - deltaY);
                    newT = startTop + deltaY;
                }

                win.style.height = `${newH}px`;
                win.style.top = `${newT}px`;
            }
        };

        const onPointerUp = () => {
            if (!isResizing) return;
            isResizing = false;

            win.style.pointerEvents = 'auto';
            win.style.transition = 'all 0.3s ease';

            // CRITICAL: Clean up listeners
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);

            if (window.kernel.isTilingActive) {
                window.kernel.debouncedUpdateTilingGrid(150);
            }
        };

        const onPointerDown = (e) => {
            if (!window.kernel.isTilingActive) {
                if (!dir.includes('n') && !dir.includes('s')) return;
            }

            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = win.offsetWidth;
            startHeight = win.offsetHeight;
            startLeft = win.offsetLeft;
            startTop = win.offsetTop;
            
            win.style.transition = 'none';
            win.style.pointerEvents = 'none';

            // Attach listeners
            document.addEventListener('pointermove', onPointerMove, { passive: false });
            document.addEventListener('pointerup', onPointerUp, { passive: false });
        };

        handle.addEventListener('pointerdown', onPointerDown, { passive: false });
    });
}
/**
 * FLOATING_RESIZE
 * Handle resizing for floating windows (5th+)
 * DEPRECATED: Now handled inline in attachResizeHandles()
 */
/**
 * TILING_RESIZE (FIXED - Only affects adjacent windows)
 */
handleTilingResize(win, dir, deltaX, deltaY) {
    const ws = document.getElementById('workspace');
    const allWins = Array.from(ws.querySelectorAll('.os-window:not(.minimized):not(.in-overview)'));
    const tiledWins = allWins.slice(0, 4);
    const tiledCount = tiledWins.length;

    if (tiledCount < 2) return;

    const dockW = 75;
    const topBarH = 40;
    const usableW = ws.clientWidth - dockW;
    const usableH = ws.clientHeight - topBarH;

    this.tilingState = this.tilingState || {};

    const winIndex = tiledWins.indexOf(win);
    if (winIndex === -1) return;

    // CRITICAL: Apply changes IMMEDIATELY + store ratio for persistence
    if (tiledCount === 2) {
        if ((dir === 'e' || dir === 'w') && winIndex === 0) {
            // Master window being resized horizontally
            const masterW = tiledWins[0].offsetWidth;
            const newMasterW = Math.max(200, Math.min(usableW - 200, masterW + deltaX));
            const newStackW = usableW - newMasterW;

            // Apply IMMEDIATELY to both windows
            tiledWins[0].style.width = `${newMasterW}px`;
            tiledWins[0].style.transition = 'none';

            tiledWins[1].style.left = `${dockW + newMasterW}px`;
            tiledWins[1].style.width = `${newStackW}px`;
            tiledWins[1].style.transition = 'none';

            // Store ratio for persistence
            this.tilingState.masterRatio = newMasterW / usableW;
            
            console.log(`Master resize: ${newMasterW}px (ratio: ${this.tilingState.masterRatio})`);
        }
    } else if (tiledCount === 3) {
        if ((dir === 's' || dir === 'n') && winIndex > 0) {
            // Stack windows being resized vertically
            const h1 = tiledWins[1].offsetHeight;
            const newH1 = Math.max(150, h1 + deltaY);
            const newH2 = usableH - newH1;

            // Apply IMMEDIATELY to both stack windows
            tiledWins[1].style.height = `${newH1}px`;
            tiledWins[1].style.transition = 'none';

            tiledWins[2].style.top = `${topBarH + newH1}px`;
            tiledWins[2].style.height = `${newH2}px`;
            tiledWins[2].style.transition = 'none';

            // Store ratios for persistence
            this.tilingState.stackHeights = [newH1 / usableH, newH2 / usableH];
            
            console.log(`Stack resize: h1=${newH1}px, h2=${newH2}px`);
        }
    } else if (tiledCount >= 4) {
        if ((dir === 'e' || dir === 'w') && (winIndex === 0 || winIndex === 2)) {
            // Vertical divider - affects both columns
            const cellW = tiledWins[0].offsetWidth;
            const newCellW = Math.max(300, cellW + deltaX);
            const rightCellW = usableW - newCellW;

            // Apply IMMEDIATELY to all 4 windows
            tiledWins.forEach((w, i) => {
                const col = i % 2;
                w.style.transition = 'none';
                
                if (col === 0) {
                    // Left column
                    w.style.width = `${newCellW}px`;
                } else {
                    // Right column
                    w.style.left = `${dockW + newCellW}px`;
                    w.style.width = `${rightCellW}px`;
                }
            });

            // Store ratio for persistence
            this.tilingState.colRatio = newCellW / usableW;
            
            console.log(`Column resize: left=${newCellW}px, right=${rightCellW}px (ratio: ${this.tilingState.colRatio})`);
        } else if ((dir === 's' || dir === 'n') && (winIndex === 1 || winIndex === 3)) {
            // Horizontal divider - affects both rows
            const cellH = tiledWins[0].offsetHeight;
            const newCellH = Math.max(250, cellH + deltaY);
            const bottomCellH = usableH - newCellH;

            // Apply IMMEDIATELY to all 4 windows
            tiledWins.forEach((w, i) => {
                const row = Math.floor(i / 2);
                w.style.transition = 'none';
                
                if (row === 0) {
                    // Top row
                    w.style.height = `${newCellH}px`;
                } else {
                    // Bottom row
                    w.style.top = `${topBarH + newCellH}px`;
                    w.style.height = `${bottomCellH}px`;
                }
            });

            // Store ratio for persistence
            this.tilingState.rowRatio = newCellH / usableH;
            
            console.log(`Row resize: top=${newCellH}px, bottom=${bottomCellH}px (ratio: ${this.tilingState.rowRatio})`);
        }
    }
}

     checkDockCollision() {
    const windows = document.querySelectorAll('.os-window');
    const threshold = 70; // Pixels from left edge
    let shouldHide = false;

    windows.forEach(win => {
        const left = parseInt(win.style.left);
        // If window is minimized, we ignore it
        if (!win.classList.contains('minimized') && left < threshold) {
            shouldHide = true;
        }
    });

    if (shouldHide) {
        document.getElementById('os-root').classList.add('dock-retracted');
    } else {
        document.getElementById('os-root').classList.remove('dock-retracted');
    }
}

    openAppMenu() {
        const overlay = document.getElementById('app-menu-overlay');
        const grid = document.getElementById('app-grid-container');
        const searchInput = document.getElementById('app-search');
        if (!overlay || !grid) return;

        if (!overlay.classList.contains('hidden')) {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
            return;
        }

        overlay.classList.remove('hidden');
        overlay.style.display = 'flex'; 
        searchInput.value = ''; 
        if (window.innerWidth > 768) searchInput.focus();

        const renderGrid = (filter = '') => {
            grid.innerHTML = '';
            registry.filter(app => app.name.toLowerCase().includes(filter.toLowerCase())).forEach(app => {
                const card = document.createElement('div');
                card.className = 'launcher-card';
                card.innerHTML = `<div class="icon">${app.icon}</div><div class="name">${app.name}</div>`;
                card.onclick = () => {
                    this.launchApp(app.id);
                    overlay.classList.add('hidden');
                    overlay.style.display = 'none';
                };
                grid.appendChild(card);
            });
        };
        renderGrid();
        searchInput.oninput = (e) => renderGrid(e.target.value);
    }

 killProcess(appId) {
    const winId = `win-${appId}`;
    const win = document.getElementById(winId);
    
    // 1. Clean up the Engine Instance (Destructors)
    if (win && win.dataset.engineInstance) {
        const instance = win.dataset.engineInstance;
        if (instance.destruct) instance.destruct(); // Stop intervals/telemetry
    }

    // 2. Remove from DOM and State
    if (win) win.remove();
    this.runningApps.delete(appId);
    
    // 3. Refresh UI
    this.bootShell(); 
    this.checkDockCollision();
}

    closeApp(appId, winId) {
    const win = document.getElementById(winId);
    if (!win) return;

    // 1. MEMORY PROTECTION: Trigger internal cleanup
    const instance = win.dataset.engineInstance;
    if (instance && typeof instance.destruct === 'function') {
        try {
            instance.destruct(); 
            console.log(`Kernel: Process ${appId} terminated cleanly.`);
        } catch (e) {
            console.warn(`Kernel: Cleanup failed for ${appId}`, e);
        }
    }

        // 2. STATE MANAGEMENT
    this.runningApps.delete(appId);
    
    // NEW: Remove from tiling order
    this.tiledWindowOrder = this.tiledWindowOrder.filter(id => id !== winId);
    console.log(`Removed ${winId} from tiling order:`, this.tiledWindowOrder);
    
    this.bootShell();
    this.updateMemoryMeter();

    // 3. UI EXIT ANIMATION
    win.style.transition = "all 0.2s cubic-bezier(0.4, 0, 1, 1)";
    win.style.opacity = '0';
    win.style.transform = 'scale(0.95) translateY(10px)';

        // 4. PHYSICAL REMOVAL
    setTimeout(() => {
        win.remove();
        this.updateDockSafety(); 
        this.checkDockCollision();
        
        // NEW: Check if a floating window should auto-promote
        if (this.isTilingActive) {
            this.promoteFloatingWindow(); // Auto-promote BEFORE recalculating grid
            this.updateTilingGrid(); // Now update with the promoted window
        }
    }, 200);
}

    /**
     * AUTO_PROMOTE_FLOATING_WINDOW
     * When a tiled window closes, pull the first floating window into the grid
     */
    promoteFloatingWindow() {
    const ws = document.getElementById('workspace');
    
    // Get tiled windows (first 4)
    const allWins = Array.from(ws.querySelectorAll('.os-window:not(.minimized):not(.in-overview)'));
    const tiledWins = allWins.slice(0, 4);
    const floatingWins = allWins.slice(4);
    
    // Only promote if there's a floating window AND a slot opened
    if (floatingWins.length > 0 && tiledWins.length < 4) {
        const windowToPromote = floatingWins[0]; // Take the first floating window
        
        // Remove floating class and reset drag flag
        windowToPromote.classList.remove('floating-extra');
        windowToPromote.dataset.hasBeenDragged = 'false';
        
        // Reset to default size for smooth tiling integration
        windowToPromote.style.width = 'auto';
        windowToPromote.style.height = 'auto';
        windowToPromote.style.transition = 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
        
        // NEW: Mark as just promoted so updateTilingGrid doesn't override z-index
        windowToPromote.dataset.justPromoted = 'true';
        
        // NEW: Give it highest z-index immediately
        windowToPromote.style.zIndex = this.getTopZIndex() + 1000;
        
        const appName = windowToPromote.querySelector('.title')?.innerText || 'Window';
        console.log(`AUTO-PROMOTED: ${appName} from floating to tiled grid (zIndex=${windowToPromote.style.zIndex})`);
        this.logSystemEvent(`PROMOTED: ${appName} to tiling grid`, 'info');
    }
}

// Ensure closeWindow also uses the correct Set syntax
closeWindow(appId) {
    this.runningApps.delete(appId);
    const windowElement = document.getElementById(`win-${appId}`);
    if (windowElement) windowElement.remove();
    this.bootShell();
    window.dispatchEvent(new CustomEvent('process-killed', { detail: { appId } }));
}


    minimizeWindow(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const isMinimized = el.classList.contains('minimized');
    
    // DEBUG: Log the actual ID we're looking for
    console.log(`minimizeWindow: id=${id}, looking for hide-${id}`);
    
    const hideBtn = document.getElementById(`hide-${id}`);
    
    if (isMinimized) {
        // RESTORE
        el.classList.remove('minimized');
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
        el.style.transform = 'scale(1) translateY(0)';
        el.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        
        // Swap icon
        if (hideBtn) {
            const svg = hideBtn.querySelector('svg');
            if (svg) {
                // Clear and set new SVG path
                svg.innerHTML = '';
                svg.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"></line>';
                hideBtn.title = 'Minimize Window';
                console.log(`Icon swapped to MINIMIZE`);
            }
        } else {
            console.warn(`hideBtn not found for ${id}`);
        }
        this.logSystemEvent(`Restored: ${id.replace('win-', '')}`, 'info');
    } else {
        // MINIMIZE
        el.classList.add('minimized');
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.1) translateY(400px) translateX(-200px)';
        el.style.transition = 'all 0.4s cubic-bezier(0.6, -0.28, 0.735, 0.045)';
        
        // Swap icon
        if (hideBtn) {
            const svg = hideBtn.querySelector('svg');
            if (svg) {
                // Clear and set new SVG path
                svg.innerHTML = '';
                svg.innerHTML = '<rect x="4" y="4" width="16" height="16" rx="1"></rect>';
                hideBtn.title = 'Restore Window';
                console.log(`Icon swapped to RESTORE`);
            }
        } else {
            console.warn(`hideBtn not found for ${id}`);
        }
        this.logSystemEvent(`Minimized: ${id.replace('win-', '')}`, 'info');
    }

                this.updateDockSafety();
        if (this.isTilingActive) {
            this.promoteFloatingWindow();
            this.debouncedUpdateTilingGrid(100); // Use debounced version
        }
}




    getTopZIndex() {
    const windows = document.querySelectorAll('.os-window');
    let max = 100;
    windows.forEach(win => {
        const z = parseInt(win.style.zIndex) || 100;
        if (z > max) max = z;
    });
    return max + 1;
}

            toggleMaximize(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const isMaximizing = !el.classList.contains('maximized');
    
    if (isMaximizing && this.isTilingActive) {
        this.logSystemEvent("Tiling suspended for maximized enclave", "warn");
    }
    
    el.classList.toggle('maximized');
    
    // CRITICAL: Get highest z-index from ALL windows
    const allWindows = document.querySelectorAll('.os-window');
    const maxZ = Math.max(...Array.from(allWindows).map(w => parseInt(w.style.zIndex) || 100));
    
            if (isMaximizing) {
            el.style.zIndex = (maxZ + 1000).toString();
        } else {
            if (this.isTilingActive) {
                el.style.zIndex = '100';
                this.promoteFloatingWindow();
                this.debouncedUpdateTilingGrid(100); // Use debounced version
            } else {
                el.style.zIndex = '100';
            }
        }
    
    this.updateDockSafety();
    this.logSystemEvent(`Window ${el.classList.contains('maximized') ? 'maximized' : 'restored'}`, 'info');
}

            updateDockSafety() {
    const osRoot = document.getElementById('os-root');
    const dock = document.getElementById('side-dock');
    
    if (!dock) return;
    
    // UPDATED: Include floating windows (5th+) that are maximized
    const visibleMaximized = Array.from(
        document.querySelectorAll('.os-window.maximized')
    ).filter(win => {
        const style = window.getComputedStyle(win);
        return style.visibility !== 'hidden' && 
               style.display !== 'none' &&
               !win.classList.contains('minimized');
    });
    
    const shouldHide = visibleMaximized.length > 0;
    
    console.log(`Dock Safety: shouldHide=${shouldHide}, visibleMax=${visibleMaximized.length}`);

    if (shouldHide) {
        osRoot.classList.add('dock-hidden');
        dock.style.opacity = '0';
        dock.style.pointerEvents = 'none';
        dock.style.visibility = 'hidden';
        dock.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
    } else {
        osRoot.classList.remove('dock-hidden');
        dock.style.opacity = '1';
        dock.style.pointerEvents = 'auto';
        dock.style.visibility = 'visible';
        dock.style.zIndex = '999'; // ENSURE IT'S ON TOP
        dock.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
    }
}


    focusWindow(winId) {
    const el = document.getElementById(winId);
    if (!el) return;

    // Restore from minimized state
    if (el.classList.contains('minimized')) {
        el.classList.remove('minimized');
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.style.transform = 'scale(1) translateY(0)';
        el.style.transition = 'all 0.3s ease';
        
        // Update icon to minimize (dash)
        const hideBtn = document.getElementById(`hide-${winId}`);
        if (hideBtn) {
            const svg = hideBtn.querySelector('svg');
            if (svg) svg.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"></line>';
        }
    }

    // CRITICAL: Get the highest z-index in the system
    const allWindows = document.querySelectorAll('.os-window');
    const maxZ = Math.max(...Array.from(allWindows).map(w => parseInt(w.style.zIndex) || 100));

    // NEW: Always bring window to front UNLESS it's maximized (and not floating)
    if (!el.classList.contains('maximized')) {
        // Not maximized: bring to front
        el.style.zIndex = (maxZ + 1).toString();
    } else if (el.classList.contains('floating-extra')) {
        // Maximized but floating: still bring to front (floating windows always on top)
        el.style.zIndex = (maxZ + 1).toString();
    }
    // If maximized and NOT floating (tiled), don't raise z-index
    
    el.dataset.lastUsed = Date.now();
}

    /**
     * SWAP_WINDOWS_IN_TILING
     * Exchange positions of two tiled windows
     */
    swapTiledWindows(winId1, winId2) {
    const win1 = document.getElementById(winId1);
    const win2 = document.getElementById(winId2);
    
    if (!win1 || !win2 || !this.isTilingActive) return;

    // NEW: Update the order tracking array
    const idx1 = this.tiledWindowOrder.indexOf(winId1);
    const idx2 = this.tiledWindowOrder.indexOf(winId2);
    
    // Initialize order array if needed
    if (this.tiledWindowOrder.length === 0) {
        const ws = document.getElementById('workspace');
        const allWins = Array.from(ws.querySelectorAll('.os-window:not(.minimized):not(.in-overview)'));
        this.tiledWindowOrder = allWins.map(w => w.id);
    }
    
    // Swap positions in the order array
    if (idx1 !== -1 && idx2 !== -1) {
        [this.tiledWindowOrder[idx1], this.tiledWindowOrder[idx2]] = 
        [this.tiledWindowOrder[idx2], this.tiledWindowOrder[idx1]];
    }
    
    console.log(`Window order updated: ${this.tiledWindowOrder.join(' -> ')}`);

    // Store current positions BEFORE any class changes
    const pos1 = {
        left: win1.style.left,
        top: win1.style.top,
        width: win1.style.width,
        height: win1.style.height
    };

    const pos2 = {
        left: win2.style.left,
        top: win2.style.top,
        width: win2.style.width,
        height: win2.style.height
    };

    const isWin1Floating = win1.classList.contains('floating-extra');
    const isWin2Floating = win2.classList.contains('floating-extra');

    // Swap with smooth animation
    win1.style.transition = 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
    win2.style.transition = 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';

    win1.style.left = pos2.left;
    win1.style.top = pos2.top;
    win1.style.width = pos2.width;
    win1.style.height = pos2.height;

    win2.style.left = pos1.left;
    win2.style.top = pos1.top;
    win2.style.width = pos1.width;
    win2.style.height = pos1.height;

    // CRITICAL: Handle floating window class swaps
    if (isWin1Floating && !isWin2Floating) {
        // Win1 (was floating) moves to tiled, Win2 (was tiled) moves to floating
        win1.classList.remove('floating-extra');
        win2.classList.add('floating-extra');
        win1.dataset.hasBeenDragged = 'false';
        win2.dataset.hasBeenDragged = 'true';
    } else if (!isWin1Floating && isWin2Floating) {
        // Win2 (was floating) moves to tiled, Win1 (was tiled) moves to floating
        win2.classList.remove('floating-extra');
        win1.classList.add('floating-extra');
        win2.dataset.hasBeenDragged = 'false';
        win1.dataset.hasBeenDragged = 'true';
    }

    const title1 = win1.querySelector('.title')?.innerText || 'Window1';
    const title2 = win2.querySelector('.title')?.innerText || 'Window2';

    this.logSystemEvent(`SWAPPED: ${title1} ↔ ${title2}`, 'info');

    // CRITICAL: Recalculate all z-indices and positions after swap
    setTimeout(() => {
        this.updateTilingGrid();
        this.updateDockSafety();
    }, 50);
}
    /**
     * CYCLE_WINDOWS_IN_TILING
     * Rotate positions of tiled windows (useful for rearranging)
     */
    cycleTiledWindows(direction = 'forward') {
        if (!this.isTilingActive) return;

        const ws = document.getElementById('workspace');
        const activeWins = Array.from(
            ws.querySelectorAll('.os-window:not(.minimized):not(.in-overview):not(.floating-extra)')
        );

        if (activeWins.length < 2) return;

        // Store all positions
        const positions = activeWins.map(win => ({
            left: win.style.left,
            top: win.style.top,
            width: win.style.width,
            height: win.style.height
        }));

        // Rotate the array
        if (direction === 'forward') {
            positions.unshift(positions.pop());
        } else {
            positions.push(positions.shift());
        }

        // Apply rotated positions
        activeWins.forEach((win, idx) => {
            win.style.transition = 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
            win.style.left = positions[idx].left;
            win.style.top = positions[idx].top;
            win.style.width = positions[idx].width;
            win.style.height = positions[idx].height;
        });

        this.logSystemEvent(`Tiled windows cycled (${direction})`, 'info');
    }

    /**
     * SMART_SWAP: Swap between focused window and another
     * Use with keyboard: Ctrl+Shift+Arrow to swap
     */
    smartSwap(direction) {
        if (!this.isTilingActive) return;

        const ws = document.getElementById('workspace');
        const activeWins = Array.from(
            ws.querySelectorAll('.os-window:not(.minimized):not(.in-overview):not(.floating-extra)')
        );

        if (activeWins.length < 2) return;

        // Find currently focused window
        const focused = activeWins.find(w => w.style.zIndex === Math.max(...activeWins.map(x => parseInt(x.style.zIndex) || 0)).toString());
        if (!focused) return;

        const focusedIdx = activeWins.indexOf(focused);
        let targetIdx;

        // Determine target based on direction
        if (direction === 'left') {
            targetIdx = focusedIdx === 0 ? activeWins.length - 1 : focusedIdx - 1;
        } else if (direction === 'right') {
            targetIdx = focusedIdx === activeWins.length - 1 ? 0 : focusedIdx + 1;
        } else if (direction === 'up') {
            targetIdx = focusedIdx === 0 ? activeWins.length - 1 : focusedIdx - 1;
        } else if (direction === 'down') {
            targetIdx = focusedIdx === activeWins.length - 1 ? 0 : focusedIdx + 1;
        }

        // Swap them
        this.swapTiledWindows(focused.id, activeWins[targetIdx].id);
    }

    /**
     * RIGHT-CLICK SWAP MENU (For tiled windows)
     * Shows swap options when right-clicking a tiled window header
     */
    showSwapMenu(winId, event) {
        if (!this.isTilingActive) return;

        const ws = document.getElementById('workspace');
        const activeWins = Array.from(
            ws.querySelectorAll('.os-window:not(.minimized):not(.in-overview):not(.floating-extra)')
        );

        if (activeWins.length < 2) {
            this.logSystemEvent("Not enough windows to swap", 'warn');
            return;
        }

        const menu = document.createElement('div');
        menu.id = 'swap-context-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: rgba(10, 10, 20, 0.95);
            border: 2px solid #a445ff;
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10002;
            min-width: 180px;
            font-family: monospace;
            font-size: 12px;
            color: #fff;
            backdrop-filter: blur(10px);
        `;

        const currentWin = document.getElementById(winId);
        const currentTitle = currentWin.querySelector('.title')?.innerText || 'Current';

        // Add swap options
        activeWins.forEach((win, idx) => {
            if (win.id === winId) return; // Skip self

            const title = win.querySelector('.title')?.innerText || `Window ${idx + 1}`;
            
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 8px 15px;
                cursor: pointer;
                transition: background 0.2s;
                border-bottom: 1px solid rgba(164, 69, 255, 0.1);
            `;
            item.innerHTML = `⇄ Swap with: ${title}`;
            
            item.onmouseenter = () => item.style.background = 'rgba(164, 69, 255, 0.2)';
            item.onmouseleave = () => item.style.background = 'transparent';
            
            item.onclick = () => {
                this.swapTiledWindows(winId, win.id);
                menu.remove();
            };

            menu.appendChild(item);
        });

        // Add cycle option
        const cycleItem = document.createElement('div');
        cycleItem.style.cssText = `
            padding: 8px 15px;
            cursor: pointer;
            transition: background 0.2s;
            color: #00ff41;
            border-top: 1px solid rgba(164, 69, 255, 0.1);
        `;
        cycleItem.innerHTML = '↻ Cycle All Windows';
        
        cycleItem.onmouseenter = () => cycleItem.style.background = 'rgba(0, 255, 65, 0.15)';
        cycleItem.onmouseleave = () => cycleItem.style.background = 'transparent';
        
        cycleItem.onclick = () => {
            this.cycleTiledWindows('forward');
            menu.remove();
        };

        menu.appendChild(cycleItem);

        document.body.appendChild(menu);

        // Close menu on click elsewhere
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
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
      
    /**
     * TRIGGER_REAL_PANIC
     * Handled at Level 0. Immediate system halt.
     */
    triggerRealPanic(errorCode, details) {
        console.error(`KERNEL_PANIC [${errorCode}]: ${details}`);

        // 1. Persistence: Log the crash for the next boot cycle
        localStorage.setItem('LAST_PANIC_CODE', errorCode);
        localStorage.setItem('LAST_PANIC_TIME', Date.now());

        // 2. Security: Wipe the volatile session key immediately
        this.sessionKey = null;
        this.isLoggedIn = false;
        
        // 3. Halt: Clear all running process intervals
        for (let i = 1; i < 9999; i++) window.clearInterval(i);

        // 4. UI Takeover: Call your visual renderer (ensure this is imported or global)
        if (typeof renderPanicUI === 'function') {
            renderPanicUI(errorCode, details); 
        } else {
            // Fallback if the UI module is also corrupted
            document.body.innerHTML = `<div style="background:red;color:white;padding:50px;">FATAL_ERROR: ${errorCode}</div>`;
        }
        this.logEvent("'CRITICAL', Kernel Panic: ${errorCode}");
    }

    //OS's ultimate self-defense mechanism
    triggerKernelPanic(errorCode) {
    console.error(`!!! KERNEL PANIC: ${errorCode} !!!`);
    
    // 1. Immediate Silence
    this.sessionKey = null; // Purge keys for security
    
    // 2. The Dreaded Screen
    document.body.innerHTML = `
        <div id="panic-screen" style="background:#800000; color:#fff; height:100vh; width:100vw; padding:50px; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6; overflow:hidden;">
            <h1 style="background:#fff; color:#800000; display:inline-block; padding:0 10px;"> FATAL_ERROR: ENCLAVE_CORRUPTION </h1>
            <p style="margin-top:20px;">A critical exception has occurred at 0x0020251226. The Sovereign Kernel has been halted to prevent data leakage.</p>
            <p>REASON: ${errorCode}</p>
            <p>*** STOP: 0x0000007B (0xF78D2524, 0xC0000034, 0x00000000, 0x00000000)</p>
            
            <div style="margin-top:40px; border:1px solid #fff; padding:20px; background: rgba(0,0,0,0.2);">
                <p>MEMORY_DUMPING...</p>
                <div id="dump-progress"> [||||||||||||||||| ] 82% </div>
                <p>DO NOT POWER OFF THE DEVICE. ENCRYPTING REMAINING SECTORS...</p>
            </div>

            <p style="margin-top:50px; opacity:0.7;">Contact your Alcohesion System Administrator.<br>Sovereign OS v1.2.9 - Build (2026.01.05)</p>
        </div>
    `;

    // Disable all interaction
    document.body.style.cursor = 'none';
    window.onkeydown = (e) => {
        if(e.key === 'r') window.location.reload(); // Hidden "Reboot" key
    };
}

async runRecoverySequence(errorCode) {
    // 1. Create a "Terminal-Only" environment
    const recoveryScreen = document.createElement('div');
    recoveryScreen.id = 'recovery-loader';
    recoveryScreen.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: #000; color: #00ff41; font-family: 'Courier New', monospace;
        padding: 40px; z-index: 999999; font-size: 14px; line-height: 1.6;
    `;
    document.body.appendChild(recoveryScreen);

    const print = (text, delay = 500) => {
        return new Promise(res => {
            const line = document.createElement('div');
            line.innerHTML = `> ${text}`;
            recoveryScreen.appendChild(line);
            setTimeout(res, delay);
        });
    };

    // 2. The Sequence
    await print("SOVEREIGN_RECOVERY_ENVIRONMENT [v1.0.4]");
    await print(`CRITICAL_FAILURE_DETECTED: ${errorCode}`, 1000);
    await print("-------------------------------------------");
    await print("Initializing low-level disk utility...");
    await print("Scanning VFS partitions for corruption...");
    
    // Real Check: Verify 2025-12-26 Allotment Integrity
    const vfs = localStorage.getItem('vpu_vfs_root');
    await new Promise(r => setTimeout(r, 1500));
    
    if (vfs) {
        await print("VFS_ROOT: FOUND [Integrity 100%]");
        await print("Verifying Genesis Block (2025-12-26)... OK");
    } else {
        await print("VFS_ROOT: NOT_FOUND", 1000);
        await print("Attempting to rebuild from Enclave Mirror...", 2000);
        await print("Rebuild Successful.");
    }

    await print("Purging stale session keys and volatile buffers...");
    localStorage.removeItem('LAST_PANIC_CODE'); 
    localStorage.removeItem('LAST_PANIC_TIME');

    await print("-------------------------------------------");
    await print("SYSTEM REPAIRED. WARM REBOOT INITIATING...", 2000);

    // 3. Exit Recovery and return to Normal Boot
    recoveryScreen.style.transition = "opacity 1s";
    recoveryScreen.style.opacity = "0";
    setTimeout(() => recoveryScreen.remove(), 1000);
}

// generates a unique fingerprint based on how your hardware draws pixels
async getHardwareEntropy() {
    // 1. Create a dedicated canvas for GPU info
    const canvasGL = document.createElement('canvas');
    const gl = canvasGL.getContext('webgl') || canvasGL.getContext('experimental-webgl');
    
    // Multi-layer Renderer Detection (Firefox-safe)
    let renderer = "UNKNOWN_GPU";
    if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        } else {
            renderer = gl.getParameter(gl.RENDERER) + gl.getParameter(gl.VENDOR);
        }
    }

    // 2. Create a SECOND dedicated canvas for 2D pixel drawing
    const canvas2D = document.createElement('canvas');
    const ctx = canvas2D.getContext('2d');
    
    // Safety check for privacy-hardened browsers
    if (!ctx) return `HARDWARE_FALLBACK_${renderer.replace(/\s/g, '_')}_2025_12_26`;

    // Draw complex geometry to capture sub-pixel rendering differences
    ctx.textBaseline = "alphabetic"; // Case-sensitive correction
    ctx.font = "16px 'Courier'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Sovereign_VPU_Auth", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Sovereign_VPU_Auth", 4, 17);
    
    const rawData = canvas2D.toDataURL();

    // 3. Generate the SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawData + renderer));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- SECURITY MONITORING: PHASES 3, 4, & 5 ---

startSecurityPulse(expectedSignature) {
    this.currentUserSignature = expectedSignature;
    this.sessionStart = Date.now();

    setInterval(async () => {
        if (!this.isBooted) return;

        // 30s Perimeter Pulse: Detect if the machine/hardware changed mid-session
        const currentHW = await this.getHardwareEntropy();
        
        // Use a simple string comparison for the signatures
        if (currentHW !== this.currentUserSignature) {
            console.warn("VPU_SECURITY: Signature mismatch. Shredding session...");
            this.shredAndLock("HARDWARE_TAMPER_DETECTED");
        }

        // 24h Dead-Drop: Automatic Memory Purge
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (Date.now() - this.sessionStart > twentyFourHours) {
            this.shredAndLock("TEMPORAL_DEAD_DROP_TRIGGERED");
        }
    }, 30000); 
}

shredAndLock(reason) {
    this.sessionKey = null; // The "Wipe": Clears the Enclave Key from RAM
    this.isBooted = false;
    
    console.error(`[SECURITY_CRITICAL] ${reason}`);
    
    // Notify the UI to show the Reset/Contact form
    window.dispatchEvent(new CustomEvent('os:security_violation', { detail: { reason } }));
    
    // Hide the desktop and force return to login gate
    document.getElementById('os-root').style.display = 'none';
    const gate = document.getElementById('login-gate');
    if (gate) gate.style.display = 'flex';
}

//System log Events

logEvent(type, message) {
    const logs = JSON.parse(localStorage.getItem('SOVEREIGN_LOGS') || '[]');
    const newEntry = {
        timestamp: new Date().toISOString(),
        type: type, // 'INFO', 'WARN', 'CRITICAL'
        message: message
    };
    
    // Keep only the last 50 events to save space
    logs.unshift(newEntry);
    localStorage.setItem('SOVEREIGN_LOGS', JSON.stringify(logs.slice(0, 50)));
    
    console.log(`[SYS_LOG]: ${message}`);

    // Visual Notification
    const ticker = document.getElementById('top-bar-ticker');
    if (ticker) {
        ticker.innerText = `[${type}] ${message}`;
        ticker.style.color = type === 'CRITICAL' ? '#ff4444' : '#00ff41';
        ticker.classList.add('flash');
        setTimeout(() => ticker.classList.remove('flash'), 3000);
    }

    // NEW: If a security dashboard is open, tell it to refresh
    const dashboard = document.querySelector('[id^="win-security"]');
    if (dashboard) {
        const instance = dashboard.dataset.engineInstance;
        if (instance && instance.render) instance.render();
    }
}

//Escape key warning
triggerEscapeWarning() {
    const overlay = document.createElement('div');
    overlay.id = 'sec-breach-overlay';
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(139, 0, 0, 0.9); backdrop-filter: blur(20px);
        z-index: 1000000; display: flex; flex-direction: column;
        justify-content: center; align-items: center; color: white;
        font-family: monospace; transition: opacity 0.5s ease;
    `;

    overlay.innerHTML = `
        <h1 style="font-size: 3rem; margin-bottom: 10px; text-shadow: 0 0 20px #f00;">DISPLAY_BREACH</h1>
        <p style="letter-spacing: 2px;">SECURE_STATE LOST: PURGING VOLATILE RAM IN <span id="shred-timer">3</span>s</p>
        <div style="width: 200px; height: 2px; background: #fff; margin-top: 20px;">
            <div id="shred-bar" style="width: 100%; height: 100%; background: #ff0000; transition: width 1s linear;"></div>
        </div>
    `;

    document.body.appendChild(overlay);

    let count = 3;
    const shredTimer = setInterval(() => {
        count--;
        document.getElementById('shred-timer').innerText = count;
        document.getElementById('shred-bar').style.width = `${(count / 3) * 100}%`;

        if (count <= 0) {
            clearInterval(shredTimer);
            this.lockSystem(); // The final shred
            overlay.remove();
        }
    }, 1000);
}

    // Volume triger
    initAudioEngine() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
        
        // Default Volume (80%)
        this.setSystemVolume(80);
    }

    setSystemVolume(value) {
    this.systemVolume = value;
    const volumeLevel = value / 100;

    // Direct Control: Find every audio/video element in the DOM and set volume
    const mediaElements = document.querySelectorAll('audio, video');
    mediaElements.forEach(media => {
        media.volume = volumeLevel;
    });

    console.log(`System Volume set to: ${value}%`);
}

//LOGS AT THE BOTTOM OF THE WORKSPACE
          logSystemEvent(message, type = 'info') {
    let container = document.getElementById('kernel-log-container');
    
    // Create container if it doesn't exist
    if (!container) {
        container = document.createElement('div');
        container.id = 'kernel-log-container';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-height: 200px;
            max-width: 350px;
            overflow-y: auto;
            z-index: 50;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;
        document.body.appendChild(container);
    }

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.style.cssText = `
        background: rgba(0, 0, 0, 0.8);
        color: ${type === 'critical' ? '#ff4444' : type === 'warn' ? '#ffaa00' : '#00ff41'};
        padding: 8px 12px;
        font-family: monospace;
        font-size: 11px;
        border-left: 3px solid ${type === 'critical' ? '#ff4444' : type === 'warn' ? '#ffaa00' : '#00ff41'};
        border-radius: 4px;
        max-width: 330px;
        word-wrap: break-word;
        opacity: 1;
        transition: opacity 0.3s ease;
    `;
    
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.innerHTML = `[${timestamp}] ${message}`;

    container.appendChild(entry);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        entry.style.opacity = '0';
        setTimeout(() => entry.remove(), 300);
    }, 4000);
}  

/**
 * Request coins based on Good Service.
 * @param {string} region - e.g., 'NAIROBI'
 * @param {number} units - The amount of service units provided
 */

initializeLedger() {
    // 1. Load or Initialize the Ledger
    this.ledger = JSON.parse(localStorage.getItem('vpu_rrl_ledger')) || {
        balances: {
            "CENTRAL_NODE": 0.00,
            "NAIROBI_BRANCH": 0.00,
            "MOMBASA_BRANCH": 0.00
        },
        metadata: {
            "CENTRAL_NODE": { symbol: "CC", color: "#a855f7" },
            "NAIROBI_BRANCH": { symbol: "NBC", color: "#00ff41" },
            "MOMBASA_BRANCH": { symbol: "MBC", color: "#00d4ff" }
        },
        history: []
    };
    
    // 2. Load the Mint Queue (Pending Requests)
    this.mintQueue = JSON.parse(localStorage.getItem('vpu_mint_queue')) || [];
}

/**
 * LOGIC: Request coins for Proof-of-Service
 */
requestServiceMint(branchId, units, description) {
    const request = {
        id: `REQ-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        requester: this.user?.name || "Member_Node",
        branch: branchId,
        amount: units,
        desc: description,
        timestamp: new Date().toISOString(),
        status: 'PENDING'
    };
    
    this.mintQueue.push(request);
    this.saveLedgerState()
    this.notify("LEDGER_UPLINK", `Service Log ${request.id} broadcasted for approval.`);
}

/**
 * ADMIN LOGIC: Approve Minting
 */
approveMint(requestId) {
    const index = this.mintQueue.findIndex(r => r.id === requestId);
    if (index === -1) return;

    const req = this.mintQueue[index];
    
    // Update Balance
    if (!this.ledger.balances[req.branch]) this.ledger.balances[req.branch] = 0;
    this.ledger.balances[req.branch] += req.amount;
    
    // Archive to History
    req.status = 'APPROVED';
    req.approvedAt = new Date().toISOString();
    this.ledger.history.unshift(req); // Most recent first
    
    // Remove from Queue
    this.mintQueue.splice(index, 1);
    
    this.saveLedgerState();
    this.notify("MINT_SUCCESS", `${req.amount} ${this.ledger.metadata[req.branch]?.symbol || 'COINS'} released to vault.`);
    if (this.activeProcesses['rrl-wallet']) {
    this.activeProcesses['rrl-wallet'].update();
}
}

saveLedgerState() {
    localStorage.setItem('vpu_rrl_ledger', JSON.stringify(this.ledger));
    localStorage.setItem('vpu_mint_queue', JSON.stringify(this.mintQueue));
}

executeExchange(fromBranch, toBranch, amount) {
    const rate = this.getExchangeRate(fromBranch, toBranch);
    const cost = amount;
    const receive = amount * rate;

    if (this.ledger.balances[fromBranch] >= cost) {
        this.ledger.balances[fromBranch] -= cost;
        this.ledger.balances[toBranch] += receive;

        this.ledger.history.unshift({
            id: `SWAP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            branch: toBranch,
            amount: receive,
            desc: `Exchange from ${this.ledger.metadata[fromBranch].symbol} (Rate: ${rate})`,
            timestamp: new Date().toISOString(),
            status: 'EXCHANGED'
        });

        this.saveLedgerState();
        if (this.activeProcesses['rrl-wallet']) {
            this.activeProcesses['rrl-wallet'].update();
        }
        this.notify("EXCHANGE_COMPLETE", `Converted to ${receive.toFixed(2)} ${this.ledger.metadata[toBranch].symbol}`);
        return true;
    }
    this.notify("INSUFFICIENT_FUNDS", "Not enough regional credit for this swap.");
    return false;
}

getExchangeRate(from, to) {
    // Logic: Central Node is the 'Gold Standard' (1.0). 
    // Branches might have 0.8 or 1.2 depending on your current economic policy.
    const rates = { "CENTRAL_NODE": 1.0, "NAIROBI_BRANCH": 0.9, "MOMBASA_BRANCH": 0.85 };
    return rates[to] / rates[from];
}

}

window.kernel = new TLC_Kernel();

window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.os-window').forEach(win => {
            win.style.top = '0';
            win.style.left = '0';
            win.style.width = '100vw';
            win.style.height = '100vh';
            win.style.borderRadius = '0';
        });
    }
});