/**
 * SOVEREIGN OS - TASK OVERVIEW MODULE
 * Encapsulated Class Architecture
 */
export class TaskOverview {
    constructor(kernel) {
        this.kernel = kernel;
        this.isActive = false;
        this.countdownTimer = null;
    }
toggleTaskOverview(){
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
}