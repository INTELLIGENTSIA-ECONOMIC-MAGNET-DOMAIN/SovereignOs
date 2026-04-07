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
        this.setupSecretIngress = () => {
    // Check for both the logo OR the auth-status header
        const trigger = document.getElementById('vpu-logo') || document.getElementById('auth-status');
        if (trigger) {
            trigger.onclick = () => {
                this.logoClicks++;
                if (this.logoClicks >= 3) {
                    console.log("» SECRET_INGRESS: Manual Recovery Triggered.");
                    this.showRecoveryTrigger();
                    this.logoClicks = 0; 
                }
                setTimeout(() => this.logoClicks = 0, 5000);
            };
        }
    };

        this.kernel.auth = this;
    }
    

    /**
     * ROLE 1: SNIFFER INGRESS (Activation)
     * "Awakens" the HTML Login-Gate
     */
    activateSniffer() {
        this.container.style.display = 'flex';
        const btn = document.getElementById('login-btn');
        const statusHeader = document.getElementById('auth-status'); // [ADD THIS]

        // Make the status header clickable to trigger the recovery mode as well
        if (statusHeader) {
            statusHeader.style.cursor = 'pointer'; // Visual hint it's clickable
            statusHeader.onclick = () => {
                console.log("» HEADER_INGRESS: Manual Override Triggered.");
                this.showRecoveryTrigger(); // Reveals the hidden button
            };
        }
        if (!btn) return;

        // Reset the button state on activation
        btn.onclick = async () => {
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

            // Execute the combined sequence
            await this.handleHandshake(credentials);
        };
    }

    /**
     * THE HANDSHAKE FLOW
     * Coordinates the 8-Component Architecture
     */
   async handleHandshake(creds) {
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
                // FAILURE HANDLING: Reset the lock to allow retry
                this.isUplinking = false; // Allow another attempt
                this.showRecoveryTrigger();// Show the recovery trigger in case of failure
                status.innerText = "HANDSHAKE_FAILED: INVALID_CREDENTIALS";
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
    }catch (e) {
            status.innerText = "CRITICAL_AUTH_ERROR";
            console.error("ORCHESTRATOR_FAULT:", e);
        }
    }

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
        if (document.getElementById('recovery-trigger')) return;

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
    // Prevent Deadlock timer from interfering
    window.VPU_RECOVERY_MODE = true; 
    
    const modal = document.createElement('div');
    modal.className = 'sovereign-modal';
    modal.style = "position:fixed; inset:0; background:rgba(0,0,0,0.95); display:flex; align-items:center; justify-content:center; z-index:10000000;";
    
    modal.innerHTML = `
        <div class="modal-content" style="border:1px solid #ff4444; padding:40px; background:#000; text-align:center;">
            <h3 style="color:#ff4444;">SELECT_RECOVERY_TARGET</h3>
            <button id="reset-user-btn" class="tlc-btn">RESET_USERNAME</button>
            <button id="reset-pass-btn" class="tlc-btn">RESET_PASSWORD</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('reset-user-btn').onclick = () => this.renderResetFields('USERNAME');
    document.getElementById('reset-pass-btn').onclick = () => this.renderResetFields('PASSWORD');
}

async renderResetFields(type) {
    const container = document.querySelector('.modal-content');
    const fields = type === 'USERNAME' ? `
        <input type="text" id="new-user" placeholder="NEW_USERNAME" class="tlc-input">
        <input type="text" id="rep-user" placeholder="REPEAT_USERNAME" class="tlc-input">
    ` : `
        <input type="text" id="cur-user" placeholder="CURRENT_USERNAME" class="tlc-input">
        <input type="password" id="new-pass" placeholder="NEW_PASSWORD" class="tlc-input">
        <input type="password" id="rep-pass" placeholder="REPEAT_PASSWORD" class="tlc-input">
    `;

    container.innerHTML = `
        <h4 style="color:#ffbc00;">RECOVERY_HANDSHAKE [${type}]</h4>
        <div id="reset-status" style="color:#888; font-size:10px; margin-bottom:10px;">AWAITING_UPLINK_AND_FILES...</div>
        ${fields}
        <input type="text" id="reset-code" placeholder="ENTER_UPLINK_CODE" class="tlc-input">
        <div class="upload-section">
            <label>MANIFEST (.bin)</label> <input type="file" id="manifest-upload">
            <br><label>ENCLAVE KEY (.txt)</label> <input type="file" id="enclave-upload">
        </div>
        <button id="finalize-reset-btn" style="margin-top:20px; background:#ff4444; color:#000; padding:10px; width:100%;">AUTHORIZE_REWRITING</button>
    `;

    // 1. Send Multi-Channel Code
    const code = Math.floor(100000 + Math.random() * 900000);
    sessionStorage.setItem('vpu_recovery_code', code.toString());
    await this.uplink.sendTelegram(`🚨 RECOVERY_CODE: <code>${code}</code>`);
    
    // 2. Attach final execution
    document.getElementById('finalize-reset-btn').onclick = () => this.executeFinalReset(type);
}


async executeFinalReset(type) {
    const status = document.getElementById('reset-status');
    const inputCode = document.getElementById('reset-code').value;
    const manifestFile = document.getElementById('manifest-upload').files[0];
    const enclaveFile = document.getElementById('enclave-upload').files[0];

    // 1. Validate Uplink Code
    const activeCode = sessionStorage.getItem('vpu_recovery_code');
    if (inputCode !== activeCode) {
        status.innerText = "ERROR: INVALID_UPLINK_CODE";
        status.style.color = "#ff4444";
        return;
    }

    try {
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

        // 4. Hardware/Sovereign Binding Check
        if (enclaveData.hw_binding !== manifestData.hardware_binding) {
            throw new Error("HARDWARE_MISMATCH: Enclave key does not match this Sovereign Drive.");
        }

        // 5. Prepare Payload
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
        
        // Use window reference to ensure it finds the function from loading.js
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