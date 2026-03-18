/**
 * system/window-manager.js
 * EXTRACTED FROM os.js (v1.2.8)
 */
import { events } from '../core/eventBus.js';

export class WindowManager {
    constructor() {
        this.zIndexCounter = 100;
        this.isTilingActive = false;
        this.isDraggingWindow = false;
        this.tiledWindowOrder = [];
        this.isOverviewActive = false;
        
        this.init();
        
    }

    init() {
        // Handlers for requests from the Kernel
        events.on('WINDOW_OPEN_REQUEST', (data) => this.openApp(data.appId));
        events.on('TILING_TOGGLE', () => this.toggleTiling());
        events.on('OVERVIEW_TOGGLE', () => this.toggleOverview());
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

    focusApp(appId) {
    const win = document.getElementById(`win-${appId}`);
    if (win) {
        // Bring to front
        document.querySelectorAll('.os-window').forEach(w => w.style.zIndex = "100");
        win.style.zIndex = "1000";
        this.logEvent('UI', `Focus shifted to ${appId}`);
    }
}

restoreApp(appId) {
    const win = document.getElementById(`win-${appId}`);
    if (win) {
        win.classList.remove('minimized');
        this.focusApp(appId);
        this.logEvent('UI', `Restored ${appId} to workspace.`);
    }
}



closeAllWindows() {
    const workspace = document.getElementById('workspace');
    workspace.classList.add('pulse-bg');
    setTimeout(() => workspace.classList.remove('pulse-bg'), 400);

    const processes = Object.keys(this.runningApps);
    processes.forEach(appId => this.closeApp(appId, `win-${appId}`));
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

    // --- EXTRACTED: focusWindow logic ---
    focusWindow(elmnt) {
        this.zIndexCounter++;
        elmnt.style.zIndex = this.zIndexCounter;
        elmnt.classList.add('active-window');
        // Remove active class from others
        document.querySelectorAll('.window').forEach(w => {
            if (w !== elmnt) w.classList.remove('active-window');
        });
    }

    // --- EXTRACTED: updateTilingGrid (lines 576-620 of os.js) ---
    updateTilingGrid() {
        if (!this.isTilingActive) return;
        const windows = Array.from(document.querySelectorAll('.window:not(.minimized)'));
        if (windows.length === 0) return;

        const containerWidth = window.innerWidth - 80; 
        const containerHeight = window.innerHeight - 100;
        const cols = Math.ceil(Math.sqrt(windows.length));
        const rows = Math.ceil(windows.length / cols);

        const winWidth = containerWidth / cols;
        const winHeight = containerHeight / rows;

        windows.forEach((win, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            win.style.width = (winWidth - 10) + 'px';
            win.style.height = (winHeight - 10) + 'px';
            win.style.left = (col * winWidth + 70) + 'px';
            win.style.top = (row * winHeight + 60) + 'px';
            win.classList.add('tiled');
        });
    }

    toggleTiling() {
        this.isTilingActive = !this.isTilingActive;
        const windows = document.querySelectorAll('.window');
        if (this.isTilingActive) {
            this.updateTilingGrid();
        } else {
            windows.forEach(win => {
                win.classList.remove('tiled');
                win.style.width = ''; 
                win.style.height = '';
            });
        }
    }

    restoreFloatingState() {
        const allWindows = document.querySelectorAll('.os-window');
        allWindows.forEach((win, idx) => {
            win.style.transition = 'all 0.5s ease';
            win.style.width = "clamp(320px, 65vw, 900px)";
            win.style.height = "clamp(300px, 65vh, 720px)";
            
            const offset = idx * 25;
            win.style.left = `${85 + offset}px`;
            win.style.top = `${40 + offset}px`;
        });
    }
}