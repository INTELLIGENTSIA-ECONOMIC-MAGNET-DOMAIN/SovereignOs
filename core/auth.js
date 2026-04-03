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

        this.kernel.auth = this;
    }

    /**
     * ROLE 1: SNIFFER INGRESS (Activation)
     * "Awakens" the HTML Login-Gate
     */
    activateSniffer() {
        this.container.style.display = 'flex';
        const btn = document.getElementById('login-btn');
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

    // 3. THE IDENTITY ALIGNMENT (Multi-Vector Fix)
    // Extract all possible valid IDs from the manifest
    const registeredID = (manifest.membership_no || manifest.owner || "").trim().toUpperCase();
    const registeredName = (manifest.official_name || manifest.founder || "ARCHANTI").trim().toUpperCase();
    const inputUsername = (creds.id || "").trim().toUpperCase();

    // Log the vectors so you can see what the Kernel is comparing
    console.log(`» IDENTITY_LOG: Vectors [ID: ${registeredID} | Name: ${registeredName}]`);
    console.log(`» IDENTITY_LOG: Received [${inputUsername}]`);

    // ALLOW access if input matches the ID OR the Name
    const isAuthorized = (inputUsername === registeredID) || (inputUsername === registeredName);

    if (!isAuthorized) {
        // Trigger deadlock only if it matches NEITHER
        this.kernel.deadlock.executeLockdown(`IDENTITY_MISMATCH: [${inputUsername}] is not authorized for this Vault.`);
        return; 
    }
    
    console.log("» IDENTITY_ALIGNED: Proceeding to Cryptographic Handshake...");

    // 3. If Identity matches, proceed to password and hardware validation...

    if (!loginBtn || !status || !box) return;

            // 1. Enter Secure State (Single Impact Shake)
            loginBtn.disabled = true;
            loginBtn.style.opacity = '0.5';
            loginBtn.innerHTML = `<span class="btn-text">UPLINKING TO VPU...</span>`;
            box.classList.add('impact-shake', 'uplink-glow');
            setTimeout(() => box.classList.remove('impact-shake'), 500);

            // 2. Start Database Auth in background immediately
            const authPromise = this.kernel.attemptLogin(creds.id, creds.pass);
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

                this.kernel.vfs.mount(`/users/${creds.id}`, driver);

                if (!driver.isInitialized) {
                    status.innerText = decision.mode === "FULL_ACCESS" 
                        ? "» PROVISIONING_GENESIS_SECTORS (FULL)..." 
                        : "» PROVISIONING_ROAMING_SECTORS (LIMITED)...";
                    
                    const provisioner = new NativeDriver();
                    await provisioner.provisionEnclave(this.kernel.vfs, creds.id);
                    
                    driver.isInitialized = true;
                    await driver.save(); 
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
     * RENDER: Initialize and display the login interface
     * Uses a direct database handshake to prevent race conditions.
     */
    async render() {
        this.activateSniffer();

        // 1. Define the exact coordinates of Michael Audi's Vault
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
            const status = document.getElementById('auth-status');
            if (status) status.innerText = "STANDBY: Awaiting Credentials...";
        }
    }
    
}