/**
 * auth.js - SOVEREIGN ORCHESTRATOR (v3.0)
 * Role: Conductor / Wiring (No Authority)
 */
import { Sniffer } from './sniffer.ingress.js';
import { GateKeeper } from './gatekeeper.core.js';
import { Deadlock } from './deadlock.enforcer.js';
import { Uplink } from './uplink.session.js';
import { EnclaveCrypto } from './enclave.crypto.js';
import { VoidEnclave } from './void_enclave.js';
import { EncryptedDiskDriver } from "../system/vfs/drivers/encrypted-driver.js";
import { IndexedDBEngine } from "../system/vfs/storage/indexeddb-engine.js";
import { NativeDriver } from "../system/vfs/drivers/native-driver.js";


export class SovereignAuth {
    constructor(container, kernel) {
        this.container = container;
        this.kernel = kernel;

        // 1. Initialize Deadlock
        this.deadlock = new Deadlock(kernel, container);
        this.kernel.deadlock = this.deadlock;
        // 2. THE CRITICAL FIX: Attach it to the kernel immediately
        this.kernel.deadlock = this.deadlock; 

        // 3. Initialize the rest of the stack
        this.void = new VoidEnclave(container);
        this.crypto = new EnclaveCrypto();
        this.gatekeeper = new GateKeeper(kernel, this.deadlock);
        this.kernel.gatekeeper = this.gatekeeper;
        this.sniffer = new Sniffer();
        this.uplink = new Uplink(kernel);

        // 4. uplinking lock to prevent multiple simultaneous attempts
        this.isUplinking = false;

        // 5. Setup the secret ingress click sequence for recovery mode
        this.logoClicks = 0;

        // 6. Attach this auth instance to the kernel for global access (Crucial for VFS permissions)
        this.kernel.auth = this;
    }
    

    /**
     * ROLE 1: SNIFFER INGRESS (Activation)
     * "Awakens" the HTML Login-Gate
     */
    activateSniffer() {
        const btn = document.getElementById('login-btn');
        const statusHeader = document.getElementById('auth-status'); // [ADD THIS]

        // Make the status header clickable to trigger the recovery mode as well
        if (statusHeader) {
        statusHeader.style.cursor = 'pointer';
        statusHeader.onclick = (e) => {
            e.stopPropagation(); // Prevent bubbling
            this.logoClicks++;
            console.log(`» INGRESS_STEP: ${this.logoClicks}/3`);
            if (this.logoClicks >= 3) {
                this.showRecoveryTrigger(); // This will handle showing the trigger inside the box
                this.logoClicks = 0;
            }
        };
    }

    if (!btn) return;

        // Reset the button state on activation
        btn.onclick = async () => {
            // 1. Prime Fullscreen immediately on click (while gesture is fresh)
            try {
                document.documentElement.requestFullscreen().catch(() => {
                    /* Silent fail - we will try again in transitionToShell */
                });
            } catch(e) {}
            // 2. Extract credentials directly from the DOM (This is the "Sniffer Ingress")
            const userField = document.getElementById('username');
            const passField = document.getElementById('pass-input');
            
            const credentials = {
                id: userField.value.toUpperCase(),
                pass: passField.value,
                timestamp: Date.now()
            };
            if(!credentials.id || !credentials.pass) {
                console.warn("» AUTH_ABORTED: Handshake triggered with empty credentials.");
                return;
            }

            // 3. Execute the combined sequence
            await this.handleHandshake(credentials);
        };
    // Ensure the secret ingress is wired if the logo exists
    this.setupSecretIngress();
    }

    //secret ingress trigger for recovery mode
setupSecretIngress() {
    // 1. Identify all valid secret triggers
    const triggers = [
        document.getElementById('vpu-logo'),
        document.getElementById('auth-status')
    ].filter(el => el !== null);

    triggers.forEach(trigger => {
        trigger.style.cursor = 'pointer';
        
        // Remove any old listeners to prevent double-firing
        trigger.onclick = null; 

        trigger.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation(); // CRITICAL: Prevent triggering the login box/sniffer

            this.logoClicks++;
            console.log(`» INGRESS_STEP: ${this.logoClicks}/3`);

            // Visual feedback (optional: subtle flicker)
            trigger.style.opacity = '0.7';
            setTimeout(() => trigger.style.opacity = '1', 100);

            if (this.logoClicks >= 3) {
                console.log("» INGRESS_GRANTED: Materializing Recovery...");
                this.showResetModal();
                this.logoClicks = 0; 
                if(this.clickTimeout) clearTimeout(this.clickTimeout);
            } else {
                // Refresh the timeout: user must click 3 times within 3 seconds
                if(this.clickTimeout) clearTimeout(this.clickTimeout);
                this.clickTimeout = setTimeout(() => {
                    if (this.logoClicks > 0) {
                        console.log("» INGRESS_TIMEOUT: Counter Reset.");
                        this.logoClicks = 0;
                    }
                }, 3000);
            }
        };
    });
}

    /**
     * THE HANDSHAKE FLOW
     * Coordinates the 8-Component Architecture
     */
   async handleHandshake(creds) {
    // 1. EXTRACT DATA SAFELY
    // Priority 1: Use the 'creds' object passed from the event listener
    // Priority 2: Fallback to DOM if 'creds' is missing
    const user = (creds && creds.id) ? creds.id : (document.getElementById('vpu-user-input')?.value || "");
    const pass = (creds && creds.pass) ? creds.pass : (document.getElementById('vpu-pass-input')?.value || "");

    // --- DURESS PROTOCOL (The "False Reset") ---
    const DURESS_USER = "GUEST"; 
    const PANIC_PIN   = "9999";

    if (user.toUpperCase() === DURESS_USER && pass === PANIC_PIN) {
        console.warn("» DURESS_PROTOCOL_ENGAGED: Initiating False Purge.");
        
        // Ensure VoidEnclave is imported or available
        const voidEnclave = new VoidEnclave(this.container, this.kernel);
        voidEnclave.materialize("DURESS_IDENTITY_VIOLATION"); 
        
        sessionStorage.removeItem('vpu_session_token');
        return; 
    }

    // Ensure we have something to work with before proceeding
    if (!user || !pass) {
        console.warn("» AUTH_ABORTED: Handshake triggered with empty credentials.");
        return;
    }
    // Proceed with the normal handshake flow using the 'creds' object for consistency
    if (window.VPU_RECOVERY_MODE) return;
    
    // 1. THE LOCK: Stop the "Ghost" request if one is already running
    if (this.isUplinking) return; 

    // 2. DATA VALIDATION: If creds are empty, don't talk to the server
    if (!creds || !creds.id || !creds.pass) {
        console.warn("» AUTH_ABORTED: Handshake triggered with empty credentials.");
        return;
    }

    this.isUplinking = true; // Set the lock
    const status = document.getElementById('auth-status');
    const loginBtn = document.getElementById('login-btn');
    const box = document.getElementById('login-box') || this.container;

    // 1. DATA EXTRACTION
    let manifestEntry = this.kernel.manifest;
    
    if (!manifestEntry) {
        const DB_NAME = "SOVEREIGN_CORE_DB"; 
        const STORE_NAME = "manifest_store";
        
        manifestEntry = await new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, 2); // Use Version 2
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) return resolve(null);
                const transaction = db.transaction(STORE_NAME, "readonly");
                const store = transaction.objectStore(STORE_NAME);
                const getRequest = store.get("vpu_manifest");
                getRequest.onsuccess = () => resolve(getRequest.result);
                getRequest.onerror = () => resolve(null);
            };
            request.onerror = () => resolve(null);
        });
    }

    if (!manifestEntry) {
        if (status) {
            status.innerText = "» SOVEREIGN_MEDIA_REQUIRED: Insert .bin Drive";
            status.style.color = "#ffbc00";
        }
        this.renderMountButton(); 
        return; 
    }

    // 2. THE SAFE EXTRACTION FIX (Prevents "manifest.data is undefined")
    const manifest = manifestEntry.data ? manifestEntry.data : manifestEntry;

   // --- 3. THE DYNAMIC IDENTITY ALIGNMENT ---
    // 1. Extract Membership Number (EPOS-2025-01226)
    const ownerNumber = (manifest.owner || "").trim().toUpperCase();

    // 2. Extract Username (ARCHAN)
    const inputUsername = (creds.id || "").trim().toUpperCase();

    // 3. THE FIX: Get the JWT Signature from the .crt data or LocalStorage
    // Ensure your .crt loading logic saves the signature to a variable we can access here
    const enclaveRaw = manifest.signature || 
                    creds.enclave_sig || 
                    localStorage.getItem('TLC_ENCLAVE_MASTER_KEY');

    // Log to browser console to verify before sending
    console.log(`» IDENTITY: ${inputUsername} | OWNER: ${ownerNumber}`);
    console.log(`» SIG_LOADED: ${enclaveRaw ? 'YES (Starts with eyJ...)' : 'FAILED - UNDEFINED'}`);

    // 4. UPLINK
    if (!inputUsername || !ownerNumber || !enclaveRaw) {
        console.error("» IDENTITY_VOID: Missing critical vector. Aborting handshake.");
        this.isUplinking = false; // Reset lock
        return;
    }
    const authPromise = this.kernel.attemptLogin(inputUsername, creds.pass, enclaveRaw, ownerNumber);
    
    console.log("» IDENTITY_ALIGNED: Proceeding to Cryptographic Handshake...");

    // 3. If Identity matches, proceed to password and hardware validation...

    if (!loginBtn || !status || !box) return;

            // 1. Enter Secure State (Single Impact Shake)
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.5';
            loginBtn.innerHTML = `<span class="btn-text">UPLINKING TO VPU...</span>`;
            box.classList.add('impact-shake', 'uplink-glow');
            setTimeout(() => box.classList.remove('impact-shake'), 500);

        try {
            // --- INSERT THE SOVEREIGN LOGIN LOGIC HERE ---
            // We do this NOW so the hash is ready for the Lock Screen later
            const encoder = new TextEncoder();
            const data = encoder.encode(creds.pass); // Using the password from the creds object
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const localKey = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Store the HASHED key in Kernel Memory (Never the plain text)
            this.kernel.systemPassword = localKey;
            // ----------------------------------------------
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
                if (step.msg.includes("VFS_PARTITION")) {
                const uptime = await this.kernel.vfs.read("/system/proc/uptime");
                status.innerText = `» MOUNTING_VFS (UPTIME: ${uptime})...`;
            }
            }

            // 4. THE UPDATED VERIFICATION CHECK
            const success = await authPromise;

            if (success) {
                status.innerHTML = `<span style="color: #bcff00;">ACCESS_GRANTED. INITIALIZING_SHELL...</span>`;
                loginBtn.innerHTML = `<span class="btn-text">UPLINK ACCEPTED</span>`;
                box.style.borderColor = '#bcff00';
                try {
                    const machineId = await this.kernel.getMachineId();
                    const response = await fetch('https://your-api.com/v1/uplink/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            auth: localKey, 
                            device: machineId,
                            user: inputUsername 
                        })
                    });

                    if (response.ok) {
                        const session = await response.json();
                        this.kernel.sessionKey = session.token; 
                    } else {
                        throw new Error("UPLINK_REJECTED");
                    }
                } catch (e) {
                    console.warn("Uplink Offline: Operating in Local Enclave mode.");
                    // Fallback: This key will be used by enclaveBridge for VFS access
                    this.kernel.sessionKey = 'LOCAL_VOLATILE_ENCLAVE_' + localKey.substring(0, 8);
                }
                // --- PHASE 1: INGRESS OBSERVATION ---
                const observation = await this.sniffer.observe(creds);

                // --- PHASE 2: TRI-KEY EVALUATION ---
                const ingressData = {
                    identityVerified: true,
                    hwSig: observation.hwSig,
                    location: await this.kernel.getGeolocation() 
                };

                // Defensive check for config
                const config = this.kernel.config || {};
                const authorizedID = config.authorizedMachine || localStorage.getItem('hw_id');
                const actionCenter = config.homeActionCenter || "STANDALONE_MODE";

                const decision = await this.gatekeeper.evaluate(
                    ingressData, 
                    authorizedID, 
                    actionCenter
                );

                // --- PHASE 3: SESSION ESTABLISHMENT ---
                const enclaveKey = await this.crypto.deriveKey(creds.pass, observation.hwSig);
                
                await this.uplink.establish({
                    identity: creds.id,
                    sessionKey: enclaveKey,
                    sig: observation.hwSig
                });

                // ARM KERNEL (Crucial for VFS Bridge)
                this.kernel.sessionKey = enclaveKey; 
                this.kernel.user = { 
                    identity: creds.id, 
                    sessionKey: enclaveKey,
                    sessionMode: decision.mode // "FULL_ACCESS" or "LIMITED_ACCESS"
                };

                
                // --- PHASE 4: VFS MOUNT & PROVISIONING ---
                const engine = new IndexedDBEngine();
                const driver = new EncryptedDiskDriver(engine, creds.id);
                await driver.load();

                // 1. MOUNT FIRST
                this.kernel.vfs.mount(`/users/${creds.id}`, driver);

                // 2. IMPORTANT: Set the active user in the VFS permission layer 
                // so it knows who is allowed to write to /users/ARCHAN
                this.kernel.vfs.setActiveUser(creds.id); 

                if (!driver.isInitialized) {
                    status.innerText = decision.mode === "FULL_ACCESS" 
                        ? "» PROVISIONING_GENESIS_SECTORS (FULL)..." 
                        : "» PROVISIONING_ROAMING_SECTORS (LIMITED)...";
                    
                    // 3. Use the Kernel's VFS instance directly to ensure 
                    // permissions are inherited correctly
                    const provisioner = new NativeDriver();
                    try {
                        await provisioner.provisionEnclave(this.kernel.vfs, creds.id);
                        driver.isInitialized = true;
                        await driver.save(); 
                    } catch (provisionError) {
                        console.error("Provisioning interrupted, retrying with elevation...", provisionError);
                        // Fallback: Attempt to provision directly to the driver if VFS layer blocks it
                        await provisioner.provisionEnclave(driver, creds.id); 
                        driver.isInitialized = true;
                        await driver.save();
                    }
                }

                // --- PHASE 5: MATERIALIZATION ---
                status.innerText = "» MATERIALIZING_ENCLAVE...";
                setTimeout(() => {
                    this.container.style.display = 'none';
                    this.kernel.isBooted = true;
                    this.kernel.init(); 
                }, 1000);

                await this.kernel.transitionToShell();
         
           } else {
                // --- PROGRESSIVE SECURITY ESCALATION ---
                this.isUplinking = false; // Release lock for retry

                // 1. Manage Failure Counter
                let fails = parseInt(localStorage.getItem('vpu_fail_count') || 0);
                fails++;
                localStorage.setItem('vpu_fail_count', fails.toString());

                // 2. Visual Rejection
                box.classList.remove('uplink-glow');
                box.classList.add('impact-shake');
                status.style.color = "#ff4444";
                box.style.borderColor = '#ff4444';
                
                // 3. Logic Check: Trigger Deadlock or show standard error
                if (fails >= 3) {
                    // RESET COUNTER FOR NEXT SESSION AND TRIGGER DEADLOCK
                    localStorage.setItem('vpu_fail_count', "0");
                    status.innerText = "SECURITY_CRITICAL: ENGAGING_DEADLOCK...";
                    
                    setTimeout(() => {
                        this.deadlock.executeLockdown("MAX_ATTEMPTS_EXCEEDED");
                    }, 800);
                    return; // Stop execution here; Deadlock takes over the UI
                }

                // 4. Handle Specific Rejection Messages (for fails < 3)
                if (window.kernel.lastAuthError === "HARDWARE_ID_REJECTED") {
                    status.innerText = `SECURITY_DENIAL: UNAUTHORIZED_HARDWARE (${fails}/3)`;
                } else if (window.kernel.lastAuthError === "NETWORK_UPLINK_REJECTED") {
                    status.innerText = `SECURITY_DENIAL: UNAUTHORIZED_NETWORK (${fails}/3)`;
                } else {
                    status.innerText = `HANDSHAKE_FAILED: INVALID_CREDENTIALS (${fails}/3)`;
                }

                // 5. Reset Button for next attempt
                loginBtn.innerHTML = `<span class="btn-text">INITIATE_HANDSHAKE</span>`;
                loginBtn.disabled = false;
                loginBtn.style.opacity = '1';

                // 6. Return to Standby after 3 seconds
                setTimeout(() => {
                    box.classList.remove('impact-shake');
                    // Check if a recovery trigger was manually popped via secret ingress
                    if (!document.getElementById('recovery-trigger')) {
                        status.innerText = "STANDBY: Awaiting Credentials...";
                        status.style.color = "#00ff41";
                        box.style.borderColor = '#004411';
                    }
                }, 3000);
            }
        } catch (e) {
            this.isUplinking = false;
            status.innerText = "CRITICAL_AUTH_ERROR";
            console.error("ORCHESTRATOR_FAULT:", e);
        }}
    /**
 * INGESTION PROTOCOL: BINARY TO INDEXEDDB
 * Reads a physical .bin file and re-seeds the Sovereign Manifest.
 */
async ingestSovereignDrive(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const buffer = e.target.result;
                const view = new Uint8Array(buffer);
                const decoder = new TextDecoder();
                
                // 1. Extract First 8KB and Last 8KB to find tags in 100MB file
                const head = decoder.decode(view.slice(0, 8192));
                const tail = decoder.decode(view.slice(-8192));
                const combined = head + " [...] " + tail;

                const startTag = "---VPU_MANIFEST_START---";
                const endTag = "---VPU_MANIFEST_END---";
                
                let jsonStr = null;
                const startIndex = combined.indexOf(startTag);
                const endIndex = combined.indexOf(endTag);

                if (startIndex !== -1 && endIndex !== -1) {
                    jsonStr = combined.substring(startIndex + startTag.length, endIndex).trim();
                } else if (file.size < 1048576) { // If it's a small raw JSON file
                    jsonStr = decoder.decode(view);
                }

                if (!jsonStr) throw new Error("INVALID_SOVEREIGN_DRIVE: Tags missing.");
                const manifestData = JSON.parse(jsonStr);

                // 2. THE ALIGNED FIX: Native IndexedDB Injection
                // WARNING: These must match your VFS configuration exactly
                const DB_NAME = "SOVEREIGN_CORE_DB"; 
                const STORE_NAME = "manifest_store";


                // 1. Bump version to 2 to force the onupgradeneeded trigger
                const request = indexedDB.open(DB_NAME, 2); 

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    console.log("VAULT_UPGRADE: Initializing mission-critical sectors...");
                    
                    // This creates the manifest_store if it was missed in a previous run
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: "id" });
                        console.log(`STORE_CREATED: ${STORE_NAME}`);
                    }
                };

                request.onsuccess = (event) => {
                    const db = event.target.result;
                    
                    // Safety check: ensure the store is actually there now
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        console.error(`FATAL: ${STORE_NAME} missing after upgrade.`);
                        reject(new Error("VAULT_STRUCTURE_CORRUPTED"));
                        return;
                    }

                    const transaction = db.transaction(STORE_NAME, "readwrite");
                    const store = transaction.objectStore(STORE_NAME);

                    const entry = {
                        id: "vpu_manifest",
                        data: manifestData
                    };

                    const putRequest = store.put(entry);

                    putRequest.onsuccess = () => {
                        console.log("RE-BIND_SUCCESS: Manifest injected into Vault.");
                        // Force persistent flag for the bootloader
                        localStorage.setItem('vpu_manifest_present', 'true');
                        localStorage.setItem('sov_identity_confirmed', 'true');
                        resolve(manifestData);
                    };

                    putRequest.onerror = () => reject(new Error("VAULT_WRITE_ERROR"));
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: "id" });
                    }
                };

                request.onerror = () => reject(new Error("VAULT_CONNECTION_ERROR"));
            } catch (err) {
                console.error("INGEST_FAULT:", err);
                reject(err);
            }
        };

        reader.readAsArrayBuffer(file);
    });
}

renderMountButton() {
    // 0. SET GLOBAL PAUSE: Immediately stop the Kernel's Deadlock loops
    window.VPU_RECOVERY_MODE = true;
    
    // Clear any existing "breach" flags that might trigger a refresh
    localStorage.removeItem('vpu_deadlock_flag');

    if (document.getElementById('vpu-mount-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'vpu-mount-modal';
    // Add !important to z-index and display to ensure it wins the CSS war
    modal.style = `
        position: fixed !important; inset: 0 !important; 
        background: rgba(0,0,0,0.98) !important; 
        backdrop-filter: blur(20px); display: flex !important; 
        align-items: center; justify-content: center; 
        z-index: 99999999 !important; font-family: monospace;
    `;

    modal.innerHTML = `
        <div id="modal-box" style="
            width: 420px; padding: 50px; background: #050505; 
            border: 1px solid #ffbc00; box-shadow: 0 0 100px rgba(255,188,0,0.2);
            text-align: center; color: #ffbc00; position: relative;">
            
            <div style="font-size: 10px; margin-bottom: 25px; letter-spacing: 2px; opacity: 0.6;">[!] RECOVERY_PROTOCOL_ACTIVATED</div>
            <div style="font-size: 20px; margin-bottom: 15px; font-weight: bold;">BIRTHRIGHT_REQUIRED</div>
            <p style="font-size: 11px; margin-bottom: 35px; line-height: 1.8; color: #888; text-transform: uppercase;">
                Local vault is unprovisioned. To restore identity and bypass the Deadlock, mount your physical 100MB allotment file.
            </p>
            
            <button id="modal-upload-btn" style="
                width: 100%; padding: 18px; background: #ffbc00; 
                border: none; color: #000; cursor: pointer;
                font-family: inherit; font-weight: bold; font-size: 14px;">
                MOUNT_SOVEREIGN_DRIVE
            </button>
            
            <input type="file" id="modal-file-input" style="display: none;" accept=".bin">
            
            <div id="modal-status" style="margin-top: 25px; font-size: 10px; color: #444;">
                WAITING_FOR_PHYSICAL_DRIVE...
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const uploadBtn = document.getElementById('modal-upload-btn');
    const fileInput = document.getElementById('modal-file-input');
    const statusDiv = document.getElementById('modal-status');

    uploadBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadBtn.style.opacity = "0.5";
            uploadBtn.innerText = "SCANNING_SECTORS...";
            statusDiv.innerText = "READING_BINARY_DATA...";
            
            try {
                await this.ingestSovereignDrive(file);
                statusDiv.innerText = "MANIFEST_VALIDATED. SYNCING_VAULT...";
                uploadBtn.style.background = "#00ff41";
                uploadBtn.innerText = "IDENTITY_RESTORED";
                
                // Clear the recovery flag before reloading
                window.VPU_RECOVERY_MODE = false;
                setTimeout(() => location.reload(), 1200);
            } catch (err) {
                statusDiv.innerText = `FAULT: ${err.message}`; // Show specific error
                statusDiv.style.color = "#ff4444";
                uploadBtn.style.background = "#ff4444";
                uploadBtn.innerText = "MOUNT_FAILED";
                setTimeout(() => {
                    uploadBtn.style.background = "#ffbc00";
                    uploadBtn.innerText = "MOUNT_SOVEREIGN_DRIVE";
                }, 2000);
            }
        }
    };
}
    // Proxy for Kernel events to trigger the Red Box (Gatekeeper UI)
    renderGatekeeperUI(reason) {
        this.gatekeeper.renderRedBox(this.container, reason);
    }

    /**
     * SHOW_RECOVERY_TRIGGER: Display the recovery trigger for manual recovery
     */
    showRecoveryTrigger() {
        console.log("» INGRESS_GRANTED: Materializing Recovery...");
        window.VPU_RECOVERY_MODE = true;
        if (document.getElementById('recovery-trigger')) return;
        this.container.style.display = 'flex';
        const trigger = document.createElement('div');
        trigger.id = 'recovery-trigger';
        trigger.style.cssText = `
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #111;
            text-align: center;
            animation: fadeIn 1.5s ease;
        `;
        
        trigger.innerHTML = `
            <span style="color: #222; font-size: 9px; cursor: pointer; letter-spacing: 1px; text-transform: uppercase;"
                  onmouseover="this.style.color='#800080'" 
                  onmouseout="this.style.color='#222'">
                [ SECURE_RECOVERY_INGRESS ]
            </span>
        `;

        trigger.onclick = () => {
            // Launches your recovery target selection (User or Pass)
            this.showResetModal(); 
        };

        const loginBox = document.getElementById('login-box');
        if (loginBox) loginBox.appendChild(trigger);

        // Import the gate renderer if not already available
        import('./recovery-gate.js').then(module => {
            module.renderRecoveryGate(this.kernel);
        }).catch(err => {
            console.error("» MATERIALIZATION_FAULT: Recovery Gate missing", err);
        });
    }
    /**
     * RENDER: Initialize and display the login interface
     * Uses a direct database handshake to prevent race conditions.
     */
    async render() {
        this.activateSniffer();

        // 1. Define the exact coordinates of user's Vault
        const DB_NAME = "SOVEREIGN_CORE_DB"; 
        const STORE_NAME = "manifest_store";

        const checkVault = () => {
            return new Promise((resolve) => {
                const request = indexedDB.open(DB_NAME);
                request.onsuccess = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) return resolve(null);
                    
                    const transaction = db.transaction(STORE_NAME, "readonly");
                    const store = transaction.objectStore(STORE_NAME);
                    const getRequest = store.get("vpu_manifest");
                    
                    getRequest.onsuccess = () => resolve(getRequest.result);
                    getRequest.onerror = () => resolve(null);
                };
                request.onerror = () => resolve(null);
            });
        };

        // 2. Execute the check
        const manifestEntry = await checkVault();

        if (!manifestEntry) {
            console.warn("» SOVEREIGN_CORE: Vault Empty. Triggering Physical Recovery.");
            this.renderMountButton();
        } else {
            console.log("» SOVEREIGN_CORE: Identity Confirmed for", manifestEntry.data.owner);
            
            // Ensure recovery modal is hidden and login is ready
            const modal = document.getElementById('vpu-mount-modal');
            if (modal) modal.remove();
            
            this.container.style.display = 'flex';
            this.setupSecretIngress(); // Initialize the secret ingress
            const status = document.getElementById('auth-status');
            if (status) status.innerText = "STANDBY: Awaiting Credentials...";
        }
    }

/**
 * RECOVERY PROTOCOL: Multi-Channel Uplink + Manifest & Enclave Validation
 * This is triggered from the Deadlock Enforcer when the user exhausts all attempts.
 */

showResetModal() {
    // 1. Prevent Deadlock timer from interfering
    window.VPU_RECOVERY_MODE = true; 
    
    // 2. Check if modal already exists (to support the "Cancel" return loop)
    let modal = document.querySelector('.sovereign-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'sovereign-modal';
        modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.98); display:flex; align-items:center; justify-content:center; z-index:10000000; font-family:monospace;";
        document.body.appendChild(modal);
    }
    
    // 3. Render Selection UI
    modal.innerHTML = `
        <div class="modal-content" style="border:1px solid #300; padding:40px; background:#050000; text-align:center; min-width:320px; box-shadow: 0 0 30px rgba(255,0,0,0.05);">
            <h3 style="color:#ff4444; letter-spacing:3px; font-size:14px; margin-bottom:30px;">[SELECT_RECOVERY_TARGET]</h3>
            
            <button id="reset-user-btn" class="tlc-btn" style="width:100%; margin-bottom:12px; background:transparent; border:1px solid #200; color:#ffbc00; padding:15px; cursor:pointer; font-family:inherit;">RECOVER_USERNAME</button>
            
            <button id="reset-pass-btn" class="tlc-btn" style="width:100%; margin-bottom:25px; background:transparent; border:1px solid #200; color:#ffbc00; padding:15px; cursor:pointer; font-family:inherit;">ROTATE_PASSWORD</button>
            
            <div style="border-top:1px solid #111; padding-top:15px; margin-top:10px;">
                <button id="close-recovery-btn" style="background:transparent; border:none; color:#333; font-size:9px; cursor:pointer; letter-spacing:2px; margin-top:15px;">ABORT_RECOVERY_SESSION</button>
            </div>
        </div>
    `;

    // 4. ATTACH LOGIC
    document.getElementById('reset-user-btn').onclick = () => this.renderResetFields('USERNAME');
    document.getElementById('reset-pass-btn').onclick = () => this.renderResetFields('PASSWORD');
    
    document.getElementById('close-recovery-btn').onclick = () => {
        window.VPU_RECOVERY_MODE = false;
        modal.remove();
    };
}

/**
 * RECOVERY_HANDSHAKE_FORMS (v3.5)
 * Logic: Requires cross-validation of Membership No and Identity for all resets.
 * Includes: Multi-channel Uplink, Binary Manifest Check, and Enclave Key injection.
 */
async renderResetFields(type) {
    const container = document.querySelector('.modal-content');
    
    // 1. GENERATE THE SPECIFIC VECTOR FIELDS
    // Both forms now cross-verify Membership No + Identity
    const fields = type === 'USERNAME' ? `
        <div style="color: #444; font-size: 9px; margin-bottom: 5px;">IDENTITY_VECTORS</div>
        <input type="text" id="membership-no" placeholder="MEMBERSHIP_NO (EPOS-2025-XXXXX)" class="tlc-input">
        <input type="password" id="cur-pass" placeholder="CURRENT_PASSWORD_VERIFICATION" class="tlc-input">
        <input type="text" id="new-user" placeholder="NEW_SOVEREIGN_USERNAME" class="tlc-input">
        <input type="text" id="rep-user" placeholder="REPEAT_NEW_USERNAME" class="tlc-input">
    ` : `
        <div style="color: #444; font-size: 9px; margin-bottom: 5px;">CREDENTIAL_VECTORS</div>
        <input type="text" id="membership-no" placeholder="MEMBERSHIP_NO (EPOS-2025-XXXXX)" class="tlc-input">
        <input type="text" id="cur-user" placeholder="CURRENT_USERNAME_VERIFICATION" class="tlc-input">
        <input type="password" id="new-pass" placeholder="NEW_ENCLAVE_PASSWORD" class="tlc-input">
        <input type="password" id="rep-pass" placeholder="REPEAT_NEW_PASSWORD" class="tlc-input">
    `;

    // 2. RENDER THE CONSOLIDATED RECOVERY UI
    container.innerHTML = `
        <h4 style="color:#ffbc00; letter-spacing: 2px;">RECOVERY_HANDSHAKE [${type}]</h4>
        <div id="reset-status" style="color:#888; font-size:10px; margin-bottom:15px;">AWAITING_UPLINK_AND_FILES...</div>
        
        ${fields}
        
        <div style="color: #444; font-size: 9px; margin: 10px 0 5px;">SECURITY_UPLINK</div>
        <input type="text" id="reset-code" placeholder="ENTER_TELEGRAM_UPLINK_CODE" class="tlc-input">
        
        <div class="upload-section" style="border: 1px solid #111; padding: 10px; margin-top: 10px; background: #020000;">
            <label style="font-size: 9px; color: #555;">MANIFEST_DRIVE (.bin)</label> 
            <input type="file" id="manifest-upload" style="font-size: 10px; color: #333; margin-bottom: 10px;">
            <br>
            <label style="font-size: 9px; color: #555;">ENCLAVE_MASTER (.txt)</label> 
            <input type="file" id="enclave-upload" style="font-size: 10px; color: #333;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
            <button id="finalize-reset-btn" style="background:#ff4444; color:#000; padding:12px; font-weight: bold; border: none; cursor: pointer;">
                AUTHORIZE_REWRITING
            </button>
            <button id="cancel-reset-btn" style="background:transparent; border: 1px solid #333; color:#666; padding:12px; cursor: pointer;">
                CANCEL
            </button>
        </div>
    `;

    // 3. TRIGGER MULTI-CHANNEL SECURITY CODE
    const code = Math.floor(100000 + Math.random() * 900000);
    sessionStorage.setItem('vpu_recovery_code', code.toString());
    
    // Status update for the user
    const status = document.getElementById('reset-status');
    status.innerText = "» SIGNAL_SENT_TO_ADMIN_NODE. AWAITING_CODE...";

    // Send to your Telegram Bot
    try {
        await this.uplink.sendTelegram(`🚨 <b>VPU_RECOVERY_INITIATED</b>\nType: ${type}\nNode: RANGWE_HUB\nCode: <code>${code}</code>`);
    } catch(e) {
        console.warn("Telegram Uplink Failed. Check connectivity.");
    }

    // 4. ATTACH BUTTON LOGIC
    // Cancel button returns to the selection modal
    document.getElementById('cancel-reset-btn').onclick = () => this.showResetModal();

    // Finalize button executes the logic
    document.getElementById('finalize-reset-btn').onclick = () => this.executeFinalReset(type);
}


/**
 * EXECUTE_FINAL_RESET (v3.6)
 * Validates all vectors: Uplink Code, Physical Manifest, Enclave Key, and Identity Cross-Check.
 * This is the critical function that performs the actual recovery after validation.
 */ 
async executeFinalReset(type) {
    const status = document.getElementById('reset-status');
    const inputCode = document.getElementById('reset-code').value;
    const manifestFile = document.getElementById('manifest-upload').files[0];
    const enclaveFile = document.getElementById('enclave-upload').files[0];

    // --- NEW VECTOR EXTRACTION ---
    const inputMembership = document.getElementById('membership-no')?.value.trim().toUpperCase();
    const currentPassCheck = document.getElementById('cur-pass')?.value; // For Username Reset
    const currentUserCheck = document.getElementById('cur-user')?.value.trim().toUpperCase(); // For Password Reset

    // 1. Validate Uplink Code
    const activeCode = sessionStorage.getItem('vpu_recovery_code');
    if (inputCode !== activeCode) {
        status.innerText = "ERROR: INVALID_UPLINK_CODE";
        status.style.color = "#ff4444";
        return;
    }

    // 1.5 Validate Presence of Identity Vectors
    if (!inputMembership || (type === 'USERNAME' && !currentPassCheck) || (type === 'PASSWORD' && !currentUserCheck)) {
        status.innerText = "ERROR: ALL_IDENTITY_VECTORS_REQUIRED";
        status.style.color = "#ff4444";
        return;
    }

    try {
        if (!manifestFile || !enclaveFile) throw new Error("PHYSICAL_MEDIA_MISSING");

        status.innerText = "INITIATING_GLOBAL_HANDSHAKE...";
        status.style.color = "#ffbc00";

        // 2. Extract Enclave Data (The Key)
        const enclaveRaw = await enclaveFile.text();
        const enclaveData = JSON.parse(enclaveRaw);
        const signature = enclaveData.signature;

        // 3. Extract Manifest Data (The Drive)
        const manifestRaw = await manifestFile.text();
        const jsonMatch = manifestRaw.match(/---VPU_MANIFEST_START---([\s\S]*?)---VPU_MANIFEST_END---/);
        const manifestData = JSON.parse(jsonMatch ? jsonMatch[1].trim() : manifestRaw);

        // --- 4. SOVEREIGN CROSS-VALIDATION ---
        // Validate Membership Number against the Manifest Drive
        const manifestOwner = (manifestData.owner || "").trim().toUpperCase();

        // Log to console so you can see exactly what is being compared if it fails
        console.log(`Comparing Input: [${inputMembership}] with Manifest Owner: [${manifestOwner}]`);

        if (inputMembership !== manifestOwner) {
            throw new Error(`MEMBERSHIP_MISMATCH: Input (${inputMembership}) does not match Manifest owner.`);
        }

        // Validate Hardware/Sovereign Binding
        if (enclaveData.hw_binding !== manifestData.hardware_binding) {
            throw new Error("HARDWARE_MISMATCH: Enclave key does not match this Sovereign Drive.");
        }


        // 5. PRE-FLIGHT IDENTITY VERIFICATION (Database Check)
        status.innerText = "VERIFYING_IDENTITY_VECTORS...";
        const verificationPayload = {
            membership_no: inputMembership,
            // If resetting Username, we check the password. If resetting Password, we check the username.
            verify_value: type === 'USERNAME' ? currentPassCheck : currentUserCheck,
            verify_type: type === 'USERNAME' ? 'PASSWORD' : 'USERNAME'
        };

        const verifyResponse = await fetch('http://localhost:3000/api/v1/system/verify-recovery-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            membership_no: inputMembership,
            // The "Value to Verify" (The one the user knows)
            verify_value: type === 'USERNAME' ? currentPassCheck : currentUserCheck,
            // The "Type" we are verifying against
            verify_type: type === 'USERNAME' ? 'PASSWORD' : 'USERNAME',
            // The Physical Key
            enclave_sig: signature,
            // Cross-validation: Only send if we are resetting a PASSWORD 
            // (because we need to know WHICH user's password to reset)
            current_username: type === 'PASSWORD' ? currentUserCheck : null
        })
    });

        if (!verifyResponse.ok) {
            const err = await verifyResponse.json();
            throw new Error(`IDENTITY_VERIFICATION_FAILED: ${err.error || "INVALID_CREDENTIALS"}`);
        }

        // 5.1 Prepare New Payload
        let newValue;
        if (type === 'USERNAME') {
            newValue = document.getElementById('new-user').value.trim().toUpperCase();
            const repValue = document.getElementById('rep-user').value.trim().toUpperCase();
            if (!newValue || newValue !== repValue) throw new Error("USER_MISMATCH");
        } else {
            const rawPass = document.getElementById('new-pass').value;
            const repPass = document.getElementById('rep-pass').value;
            if (!rawPass || rawPass !== repPass) throw new Error("PASS_MISMATCH");
            newValue = btoa(rawPass); 
        }

        // 6. Global Bridge Sync (PostgreSQL)
        status.innerText = "SYNCHRONIZING_CORE_DATABASE...";
        
        const hardwareID = await (async () => {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl');
                const renderer = gl ? gl.getParameter(gl.RENDERER) : "GENERIC_VPU";
                const entropy = [navigator.hardwareConcurrency, renderer, screen.colorDepth, navigator.deviceMemory].join("||");
                const msgBuffer = new TextEncoder().encode(entropy);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) { return "0x_ANONYMOUS_GENESIS_CORE"; }
        })();

        const dbResponse = await fetch('http://localhost:3000/api/v1/system/sync-sovereign-identity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type,
                payload: newValue,
                enclave_sig: signature,
                manifest_owner: manifestData.owner,
                hw_id: hardwareID 
            })
        });

        if (!dbResponse.ok) {
            const err = await dbResponse.json();
            throw new Error(err.error || "REMOTE_REJECTION");
        }

        // 7. Local Persistence (VFS & Storage)
        status.innerText = "COMMITTING_TO_VFS...";
        await this.ingestSovereignDrive(manifestFile);
        
        localStorage.setItem('TLC_ENCLAVE_MASTER_KEY', signature);
        if (type === 'USERNAME') {
            localStorage.setItem('vpu_username', newValue);
        } else {
            localStorage.setItem('vpu_auth_payload', newValue);
        }

        // 8. Clear Deadlock State
        localStorage.setItem('vpu_fail_count', "0");
        localStorage.setItem('vpu_loop_count', "0");
        localStorage.removeItem('vpu_deadlock_flag');
        sessionStorage.removeItem('vpu_recovery_code');
        
        status.innerHTML = "<span style='color: #00ff41;'>SYNC_COMPLETE. REBOOTING KERNEL...</span>";
        
        // Request fullscreen here, BEFORE the timeout, while the click event is still fresh
        try {
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
        } catch (fsErr) {
            console.warn("FULLSCREEN_AUTO_BOOT_SKIPPED:", fsErr.message);
        }

        setTimeout(() => {
            window.VPU_RECOVERY_MODE = false;
            location.replace(window.location.pathname); 
        }, 2500);

    } catch (e) {
        status.innerText = `FAULT: ${e.message.toUpperCase()}`;
        status.style.color = "#ff4444";
        console.error("GLOBAL_RESET_ERROR:", e);
    }
}
    
}