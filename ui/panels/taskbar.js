/**
 * ui/panels/taskbar.js
 * EXTRACTED FROM os.js (v1.2.8)
 * Logic: Clock Synchronization, Pinned Apps, and System Tray
 */
import { events } from '../../core/eventBus.js';

export class Taskbar {
    constructor() {
        // --- EXTRACTED: Pinned Apps List (Line 43 of os.js) ---
        this.pinnedApps = ['time', 'tnfi', 'terminal', 'files', 'browser', 'messages', 'camera', 'vscode', 'settings'];
        this.init();
    }

    init() {
        this.renderTaskbar();
        this.startClock();
        
        // Listen for system status changes to update tray icons
        events.on('PROCESS_STARTED', () => this.updateActiveIndicators());
        events.on('PROCESS_STOPPED', () => this.updateActiveIndicators());
    }

    // --- EXTRACTED: Clock Logic ---
    startClock() {
        const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const clockEl = document.getElementById('system-clock');
            if (clockEl) clockEl.textContent = timeString;
        };
        
        setInterval(updateClock, 1000);
        updateClock();
    }

    // --- EXTRACTED: Taskbar Rendering Logic ---
    renderTaskbar() {
        const dock = document.getElementById('side-dock-icons');
        if (!dock) return;

        dock.innerHTML = this.pinnedApps.map(appId => `
            <div class="dock-icon" data-app="${appId}" onclick="os.pm.openApp('${appId}')">
                <img src="assets/icons/${appId}.svg" onerror="this.src='assets/icons/default.svg'">
                <span class="tooltip">${appId.toUpperCase()}</span>
                <div class="active-indicator"></div>
            </div>
        `).join('');
    }

    updateActiveIndicators() {
        // Implementation of the "glow" or dot under running apps
        const icons = document.querySelectorAll('.dock-icon');
        icons.forEach(icon => {
            const appId = icon.getAttribute('data-app');
            // Reaches into the process manager state we extracted earlier
            if (window.os.pm.runningApps.has(appId)) {
                icon.classList.add('is-running');
            } else {
                icon.classList.remove('is-running');
            }
        });
    }
}