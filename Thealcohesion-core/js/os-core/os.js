/**
 * VPU KERNEL - SOVEREIGN OS (v1.2.8)
 * Core: TLC_Kernel
 * Logic: Window Management & Advanced App Routing
 */
import { SovereignAuth } from './auth.js';
import { SystemTray } from '../../../core/tray.js';
import { NeuralWallpaper } from '../../../ui/wallpaper.js';
import { registry } from '../../../core/registry-v2.js';
import { SovereignVFS } from '../apps/vfs.js'; // Ensure VFS is imported for secure file handling
import { startBootSequence } from '../../../core/boot.js'; // Refined boot sequence
class TLC_Kernel {
    constructor() {
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

}

window.kernel = new TLC_Kernel();


