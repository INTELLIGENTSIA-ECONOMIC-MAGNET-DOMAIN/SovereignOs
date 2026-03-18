/**
 * security/auth.js
 * EXTRACTED FROM os.js (v1.2.8)
 * Logic: Handshake Verification & Security Denial handling
 */
import { events } from '../core/eventBus.js';

export class AuthManager {
    constructor(kernel) {
        this.kernel = kernel;
        this.lastAuthError = null;
        this.isAuthenticated = false;
        
        this.init();
    }

    init() {
        // Listen for login attempts from the UI
        events.on('AUTH_LOGIN_ATTEMPT', (credentials) => {
        console.log("HANDSHAKE_RECEIVED", credentials);
        this.handleLogin(credentials);
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
        
        this.sessionKey = await SovereignVFS.deriveKey(password, secureSalt);
        
        if (!this.sessionKey) throw new Error("Binding Conflict Detected");

        // c. PROVISION ALLOTMENTS (2025-12-26)
        await this.provisionInitialFiles();

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
            this.sessionKey = await SovereignVFS.deriveKey(password, memberId);
            
            if (!this.sessionKey) throw new Error("Key Derivation Failed");

            // 3. ENCLAVE PROVISIONING
            // Critical: Ensure Investor Allotment (2025-12-26) is written to IndexedDB
            await this.provisionInitialFiles();
            
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
            const { TimeApp } = await import('../apps/time.js');
            const bootClock = new TimeApp();
            if (bootClock.app && bootClock.app.startClock) {
                bootClock.app.startClock(); 
            }
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

    // --- EXTRACTED: Login Handshake Logic (Lines 1140-1175 approx) ---
    async handleLogin({ username, password }) {
        console.log(`[SECURITY]: Initiating handshake for ${username}...`);
        
        try {
            // This mimics the logic in your os.js login button listener
            // In a real scenario, this calls your vpu-bridge.js /vpu-auth.js
            const success = await this.verifyIdentity(username, password);

            if (success) {
                this.isAuthenticated = true;
                events.emit('AUTH_SUCCESS', { user: username });
            } else {
                this.handleAuthFailure();
            }
        } catch (err) {
            this.lastAuthError = "UPLINK_CRASH";
            this.handleAuthFailure();
        }
    }

    // --- EXTRACTED: Error Mapping logic (Lines 1150-1165 of os.js) ---
    handleAuthFailure() {
        let errorMsg = "HANDSHAKE_FAILED: INVALID_CREDENTIALS";

        if (this.lastAuthError === "HARDWARE_ID_REJECTED") {
            errorMsg = "SECURITY_DENIAL: UNAUTHORIZED_HARDWARE";
        } else if (this.lastAuthError === "NETWORK_UPLINK_REJECTED") {
            errorMsg = "SECURITY_DENIAL: UNAUTHORIZED_NETWORK";
        }

        events.emit('AUTH_FAIL', { message: errorMsg });
    }

    async verifyIdentity(u, p) {
        // Placeholder for the fetch call in your current auth bridge
        return u === "admin" && p === "admin"; // Replace with real bridge call
    }
}