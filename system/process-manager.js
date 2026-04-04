/**
 * system/process-manager.js
 * EXTRACTED FROM os.js (v1.2.8)
 * Logic: App Registry, Memory Tracking, and Process Lifecycle
 */
import { events } from '../core/eventBus.js';
import { registry } from '../config/manifest.js'; // Assuming you move registry-v2.js content here

export class ProcessManager {
    constructor() {
        // --- EXTRACTED: State Initialization (Lines 24-40 of os.js) ---
        this.runningApps = new Set(); 
        this.registry = [...registry, ...JSON.parse(localStorage.getItem('vpu_local_registry') || '[]')];
        this.maxMemory = 100; 
        this.currentMemory = 0;
        
        this.init();
    }

    init() {
        events.on('PROCESS_START_REQUEST', (appId) => this.openApp(appId));
        events.on('PROCESS_STOP_REQUEST', (appId) => this.closeApp(appId));
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

    openApp(appId) {
        const appData = this.registry.find(a => a.id === appId);
        if (!appData) {
            console.error(`[PROCESS]: App ${appId} not found in registry.`);
            return;
        }

        // Memory Check
        const appMem = appData.memoryUsage || 10;
        if (this.currentMemory + appMem > this.maxMemory) {
            events.emit('SYSTEM_LOG', { msg: "MEMORY_CRITICAL: Allocation Denied", type: "error" });
            return;
        }

        if (!this.runningApps.has(appId)) {
            this.runningApps.add(appId);
            this.currentMemory += appMem;
            
            // Notify Kernel/WindowManager to handle the UI part
            events.emit('WINDOW_OPEN_REQUEST', { appId, ...appData });
            events.emit('PROCESS_STARTED', { appId, currentMemory: this.currentMemory });
        }
    }

    // --- EXTRACTED: closeApp logic ---
    closeApp(appId) {
        if (this.runningApps.has(appId)) {
            const appData = this.registry.find(a => a.id === appId);
            const appMem = appData ? (appData.memoryUsage || 10) : 10;
            
            this.runningApps.delete(appId);
            this.currentMemory -= appMem;
            
            events.emit('PROCESS_STOPPED', { appId, currentMemory: this.currentMemory });
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
                if (instance.init) await instance.init();
                else instance.render();
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

    // It creates a central logging pipe for all the "Sovereign" apps.
    broadcastToKernel(source, message, type = 'info') {
        console.log(`[${source.toUpperCase()}] [${type.toUpperCase()}]: ${message}`);
        
        // If you have a logEvent system, pipe it there too:
        if (typeof this.logEvent === 'function') {
            this.logEvent(type.toUpperCase(), `${source}: ${message}`);
        }
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
}