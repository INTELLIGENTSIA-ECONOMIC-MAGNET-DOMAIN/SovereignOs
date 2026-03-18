/**
 * apps/tray.js - Sovereign OS System Status & Hardware Control Center
 * Final Production Version: Telemetry + Investor Tracking + Dynamic Battery
 */
export class SystemTray {
    constructor(kernel) {
        this.kernel = kernel;
        this.isOpen = false;
        
        // Full SVG Library (Preserved & Extended)
        this.icons = {
            brightness: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
            volume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>',
            sync: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
            wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
            bluetooth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>',
            battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="13" x2="23" y2="11"></line></svg>',
            lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
            settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
            power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>',
            batteryBody: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="18" height="12" rx="2"></rect><path d="M22 10v4"></path></svg>',
            chargingBolt: '<path d="M11 7l-3 5h4l-1 5 3-5h-4l1-5z" fill="#4ade80" stroke="none"></path>',
            cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="4" y="4" width="16" height="16" rx="2"></rect><path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"></path></svg>',
            shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>'
        };

        this.createBrightnessOverlay();
        this.el = this.createMenu();
        document.body.appendChild(this.el);
        this.setupListeners();
        this.initBattery();
        this.startTelemetry();
    }

    createBrightnessOverlay() {
        if (!document.getElementById('system-brightness-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'system-brightness-overlay';
            overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: black; opacity: 0; pointer-events: none; z-index: 10000;`;
            document.body.appendChild(overlay);
        }
    }

    createMenu() {
        const menu = document.createElement('div');
        menu.id = 'system-tray-menu';
        menu.style.cssText = `
            position: fixed; top: 55px; right: 15px; width: 310px;
            background: transparent; backdrop-filter: blur(30px);
            border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 24px;
            color: white; display: none; flex-direction: column; padding: 22px;
            z-index: 9999; box-shadow: 0 25px 60px rgba(0,0,0,0.9);
            font-family: system-ui, -apple-system, sans-serif;
        `;

        menu.innerHTML = `
            <div class="control-section" style="margin-bottom: 22px;">
                <div class="slider-row">${this.icons.brightness} <input type="range" id="tray-brightness-slider" min="0" max="70" value="0"></div>
                <div class="slider-row" style="margin-top: 20px;">${this.icons.volume} <input type="range" id="tray-volume-slider" min="0" max="100" value="80"></div>
            </div>

            <div class="status-tile">
                <div class="tile-header">
                    <span id="sync-icon-container">${this.icons.sync}</span>
                    <span style="font-size: 12px; font-weight: 700;">BIRTHRIGHT CLAIM</span>
                </div>
                <div id="tray-allotment-status" style="font-size: 11px; opacity: 0.7; margin-top: 4px; padding-left: 28px;">Birthright: Active Tracking</div>
                <div class="allotment-progress-bg">
                    <div id="allotment-fill" style="width: 65%;"></div>
                </div>
            </div>

            <div class="vitals-grid">
                <div class="vital-chip">${this.icons.cpu} <span id="tray-cpu-load">08%</span></div>
                <div class="vital-chip">${this.icons.shield} <span>SECURE</span></div>
            </div>

            <div class="grid-toggles">
                <div class="toggle-box active" id="toggle-wifi">${this.icons.wifi} <span>Network</span></div>
                <div class="toggle-box" id="toggle-bluetooth">${this.icons.bluetooth} <span>Bluetooth</span></div>
            </div>

            <div class="info-line" id="tray-battery-stat">
                ${this.icons.battery} <span>Calculating Power...</span>
            </div>

            <div class="action-footer">
                <div class="mini-btns">
                    <button id="tray-lock" title="Lock OS">${this.icons.lock}</button>
                    <button id="tray-settings" title="Settings">${this.icons.settings}</button>
                </div>
                <button id="tray-power" class="danger-btn">${this.icons.power} <span>Shutdown</span></button>
            </div>

            <style>
                .control-section {background: rgba(80, 26, 111, 0.71); padding: 14px; border-radius: 16px; border: 1px solid rgba(56, 19, 77, 0.08);}
                .slider-row { display: flex; align-items: center; gap: 15px; }
                .slider-row input { flex: 1; accent-color: #269031; cursor: pointer; height: 4px; }
                
                .status-tile { background: rgba(80, 26, 111, 0.8); padding: 14px; border-radius: 16px; border: 1px solid rgba(56, 19, 77, 0.08); margin-bottom: 12px; }
                .tile-header { display: flex; align-items: center; gap: 10px; color: #269031; }
                .allotment-progress-bg { height: 4px; background: rgba(80, 26, 111, 0.8); border-radius: 10px; margin-top: 10px; overflow: hidden; margin-left: 28px; }
                #allotment-fill { height: 100%; background: #269031; transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px #269031; }

                .vitals-grid { display: flex; gap: 10px; margin-bottom: 15px; }
                .vital-chip { flex: 1; background: rgba(86, 12, 112, 0.03); padding: 10px; border-radius: 12px; border: 1px solid rgba(80, 26, 111, 0.8); display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 11px; font-weight: 800; }

                .grid-toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
                .toggle-box { background: rgba(80, 26, 111, 0.8); padding: 15px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.08); transition: 0.2s; font-size: 11px; font-weight: 600; }
                .toggle-box.active { background: #269031; color: black; border-color: #269031; }

                .info-line { display: flex; align-items: center; gap: 10px; font-size: 13px; margin-bottom: 20px; padding-left: 5px; }
                .action-footer { display: flex; justify-content: space-between; border-top: 1px solid rgba(80, 26, 111, 0.8); padding-top: 18px; }
                .mini-btns { display: flex; gap: 10px; }
                .mini-btns button { background: rgba(80, 26, 111, 0.8); border: none; color: white; padding: 10px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
                .danger-btn { background: #542574f2; border: none; color: white; padding: 10px 18px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
                
                .spinning { animation: tray-spin 2s linear infinite; }
                @keyframes tray-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            </style>
        `;
        return menu;
    }

    setupListeners() {
        const bSlider = this.el.querySelector('#tray-brightness-slider');
        bSlider.oninput = (e) => { document.getElementById('system-brightness-overlay').style.opacity = e.target.value / 100; };

        this.el.querySelector('#tray-volume-slider').oninput = (e) => { this.kernel.setSystemVolume(e.target.value); };
        this.el.querySelector('#toggle-wifi').onclick = (e) => e.currentTarget.classList.toggle('active');
        this.el.querySelector('#toggle-bluetooth').onclick = (e) => e.currentTarget.classList.toggle('active');
        this.el.querySelector('#tray-power').onclick = () => this.kernel.shutdownSovereign();
        this.el.querySelector('#tray-lock').onclick = () => this.kernel.suspendSession();
        this.el.querySelector('#tray-settings').onclick = () => this.kernel.launchApp('settings');

        document.getElementById('status-area').onclick = (e) => {
            e.stopPropagation();
            this.isOpen = !this.isOpen;
            this.el.style.display = this.isOpen ? 'flex' : 'none';
        };

        window.onclick = () => { this.isOpen = false; this.el.style.display = 'none'; };
        this.el.onclick = (e) => e.stopPropagation();

        //Vollume trigger
        const vSlider = this.el.querySelector('#tray-volume-slider');
        const volumeIcon = vSlider.previousElementSibling; // Targets the volume SVG
        let isMuted = false;
        let lastVol = 80;

        // Handle Slider Change
        vSlider.oninput = (e) => {
            const val = e.target.value;
            this.kernel.setSystemVolume(val);
            // Update icon opacity based on volume level
            volumeIcon.style.opacity = val == 0 ? '0.3' : '1';
        };

        // Handle Mute Toggle (Clicking the Icon)
        volumeIcon.style.cursor = 'pointer';
        volumeIcon.onclick = () => {
            isMuted = !isMuted;
            if (isMuted) {
                lastVol = vSlider.value;
                vSlider.value = 0;
                this.kernel.setSystemVolume(0);
                volumeIcon.style.color = '#ef4444'; // Red for muted
            } else {
                vSlider.value = lastVol;
                this.kernel.setSystemVolume(lastVol);
                volumeIcon.style.color = 'white';
            }
        };
    }

    startTelemetry() {
        setInterval(() => {
            if (!this.isOpen) return;
            // Mock CPU Load
            const cpu = this.el.querySelector('#tray-cpu-load');
            if (cpu) cpu.innerText = (Math.floor(Math.random() * 12) + 4).toString().padStart(2, '0') + '%';
            
            // Random Allotment Pulse
            if (Math.random() > 0.8) {
                const sync = this.el.querySelector('#sync-icon-container');
                sync.classList.add('spinning');
                setTimeout(() => sync.classList.remove('spinning'), 2000);
            }
        }, 3000);
    }

    async initBattery() {
        if ('getBattery' in navigator) {
            const battery = await navigator.getBattery();
            const update = () => this.updateBatteryUI(battery);
            update();
            battery.onlevelchange = update;
            battery.onchargingchange = update;
        }
    }

    updateBatteryUI(battery) {
        const percent = Math.round(battery.level * 100);
        const isCharging = battery.charging;
        const trayLabel = document.getElementById('tray-battery-stat');
        if (!trayLabel) return;

        let color = isCharging ? '#4ade80' : (percent <= 20 ? '#ef4444' : 'white');
        
        trayLabel.style.color = color;
        trayLabel.innerHTML = `
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${color}" stroke-width="2">
                <rect x="2" y="6" width="18" height="12" rx="2" stroke-opacity="0.3"></rect>
                <path d="M22 10v4" stroke-opacity="0.3"></path>
                <rect x="4" y="8" width="${(percent / 100) * 14}" height="8" fill="${color}" stroke="none"></rect>
                ${isCharging ? this.icons.chargingBolt : ''}
            </svg>
            <div style="display: flex; flex-direction: column; line-height: 1.1; margin-left: 5px;">
                <span style="font-weight: 800; font-size: 13px;">${percent}%</span>
                <span style="font-size: 9px; text-transform: uppercase; opacity: 0.7;">${isCharging ? 'Sovereign Charging' : 'Hardware Cell'}</span>
            </div>
        `;
    }
}