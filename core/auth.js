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

        // Initialize Specialized Modules
        this.void = new VoidEnclave(container);
        this.crypto = new EnclaveCrypto();
        this.deadlock = new Deadlock(kernel, container); // Deadlock needs UI access to "Void" it
        this.gatekeeper = new GateKeeper(kernel, this.deadlock);
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
    const loginBtn = document.getElementById('login-btn');
    const status = document.getElementById('auth-status');
    const box = document.querySelector('.login-box');

    // Ensure the Build Manifest is still physically present
    const folderHandle = await this.kernel.vfs.getEnclaveHandle();
    try {
        await folderHandle.getFileHandle('build_manifest.vpu');
    } catch (e) {
        const status = document.getElementById('auth-status');
        status.innerText = "CRITICAL_FAULT: SYSTEM_MANIFEST_REMOVED";
        status.style.color = "#ff4444";
        this.kernel.deadlock.executeLockdown("Kill-Switch Triggered: Manifest Missing.");
        return;
    }

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

    // Proxy for Kernel events to trigger the Red Box (Gatekeeper UI)
    renderGatekeeperUI(reason) {
        this.gatekeeper.renderRedBox(this.container, reason);
    }

    /**
     * RENDER: Initialize and display the login interface
     */
    render() {
        this.activateSniffer();
    }
    
}