/**
 * SOVEREIGN OS - TOP BAR SERVICE
 * Manages system tray hardware icons and telemetry.
 */
export const TopBar = {
setupTopBarInteractions(kernel) {
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
                const { TimeApp } = await import('../apps/time.js');
                new TimeApp().app.renderHUD(); 
            };
        }
        
    },

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
    },

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
} 