
import { TimeModel } from './model.js';
import { TimeView } from './view.js';

export class TimeApp {
    constructor(container, governance, sessionKey, role) {
        this.container = container;
        this.governance = governance;
        this.sessionKey = sessionKey;
        this.role = role;
        this.kernel = governance.api; // the kernel
        this.model = new TimeModel();
        this.view = new TimeView(container, this.model);
        window.app = this;
    }

    async init() {
        this.container.innerHTML = this.view.render();
        // Start clock first
        this.startClock();
        // Then draw the grid
        this.view.renderGrid(this.model.currentViewDate);
        // Finally, force the reminders to draw
        setTimeout(() => {
            this.view.renderReminders();
        }, 10);
    }

    destruct() {
        if (this.model.timer) clearInterval(this.model.timer);
    }

    startClock() {
        if (this.model.timer) clearInterval(this.model.timer);

        const tick = () => {
            const now = new Date();
            const h = now.getHours();
            const m = now.getMinutes().toString().padStart(2, "0");
            const s = now.getSeconds().toString().padStart(2, "0");

            const thealHourNum = this.model.convertToThealHour(h);
            const timeString = `${thealHourNum.toString().padStart(2, "0")}:${m}:${s}`;
            const normalTime = now.toLocaleTimeString();

            // 1. Get Sovereign Data
            const thealDateObj = this.model.getThealDate(now);
            this.model.checkCycleTransition(thealDateObj.label);

            // 2. Extract Cycle/Day numbers
            const cycleMatch = thealDateObj.label.match(/(\d+)(?:st|nd|rd|th)\sCycle/);
            const cycleNo = cycleMatch ? cycleMatch[1] : "0";
            const dayMatch = thealDateObj.label.match(/Day\s(\d+)/);
            const dayNo = dayMatch ? dayMatch[1] : "0";

            // 3. Update Top Bar (Cycle-Day | Clock)
            const topBarTime = document.getElementById("top-bar-time");
            if (topBarTime) {
                const sovereignShort = thealDateObj.type === "holiday" ? "HOLY" : `${cycleNo}C-${dayNo}D`;

                // Strictly text content, no hover attributes
                topBarTime.textContent = `${sovereignShort} | ${timeString}`;

                // Pulse check for Holidays/Milestones
                if (thealDateObj.type === "holiday" || thealDateObj.type === "milestone") {
                    topBarTime.classList.add("top-bar-holiday-active");
                } else {
                    topBarTime.classList.remove("top-bar-holiday-active");
                }
            }

            // 4. Update HUD & App Window if open
            const timeEl = document.getElementById("vpu-theal-time");
            const hudTime = document.getElementById("hud-theal-time");
            const hudNormalEl = document.getElementById("hud-normal-time");

            if (timeEl) timeEl.textContent = timeString;
            if (hudTime) hudTime.textContent = timeString;
            if (hudNormalEl) hudNormalEl.textContent = normalTime;
        };

        tick();
        this.model.timer = setInterval(tick, 1000);
    }

    goToToday() { this.model.currentViewDate = new Date(); this.view.renderGrid(this.model.currentViewDate); }
    changeMonth(delta) { this.model.currentViewDate.setMonth(this.model.currentViewDate.getMonth() + delta); this.view.renderGrid(this.model.currentViewDate); }
    jumpToDate(val) { if(val) { this.model.currentViewDate = new Date(val); this.view.renderGrid(this.model.currentViewDate); } }

    addReminder() {
        this.model.addReminder();
        this.view.renderReminders();
    }

    renderHUD() {
        this.view.renderHUD();
    }
}

// Global function for Genesis Certificate
window.triggerGenesisCert = function() {
    if (document.getElementById('cert-overlay')) return;
    const serial = `VPU-GEN-${Date.now().toString().slice(-6)}`;

    // 1. ADD THIS: Define the QR Code URL
    const qrData = encodeURIComponent(`https://thealcohesion.vpu/verify?id=${serial}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}&color=ffd700&bgcolor=0a0a12`;

    const overlay = document.createElement('div');
    overlay.id = "cert-overlay";
    overlay.style.cssText = `
        position:fixed; top:0; left:0; width:100vw; height:100vh;
        background:rgba(0,0,0,0.95); backdrop-filter:blur(20px);
        display:flex; justify-content:center; align-items:center;
        z-index:20000; padding: 20px; box-sizing: border-box;
    `;

    overlay.innerHTML = `
        <div id="genesis-cert-body" style="
            width: 100%; max-width: 450px;
            padding: clamp(20px, 5vw, 40px);
            background: #0a0a12; border: 2px solid #803ca5;
            border-radius: 15px; text-align: center; color: white;
            box-shadow: 0 0 50px rgba(128, 60, 165, 0.2);
            box-sizing: border-box; position: relative;
        ">
            <div style="position: absolute; top: 10px; right: 15px; font-size: 8px; color: #ffd700; letter-spacing: 2px;">AUTHENTICATED</div>

            <h1 style="color:#ffd700; font-size: clamp(16px, 4vw, 22px); margin-bottom: 5px; letter-spacing: 2px;">
                ALLOTMENT RECORD
            </h1>
            <p style="font-size: 10px; color:#666; margin-bottom: 20px;">GENESIS PHASE 2025</p>

            <div style="border:1px solid rgba(255,215,0,0.3); padding: 20px; border-radius: 10px; background: rgba(255,215,0,0.02);">
                <p style="font-size: 9px; color: #888; margin-bottom: 10px; letter-spacing: 1px;">BENEFICIARIES</p>
                <h2 style="font-size: clamp(18px, 5vw, 24px); margin: 0; color: #fff;">EPOS & INVESTORS</h2>
                <p style="color:#ffd700; margin-top: 10px; font-size: 14px; font-family: monospace;">DECEMBER 26, 2025</p>
            </div>

            <div style="margin-top: 20px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <img src="${qrUrl}" alt="Verification QR" style="width: 80px; height: 80px; border: 1px solid rgba(255,215,0,0.5); padding: 5px; border-radius: 8px;">
                <p style="font-size: 9px; color: #444; font-family: monospace; margin: 0;">SERIAL: ${serial}</p>
            </div>

            <div style="margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button onclick="window.print()" style="background: #222; color: #fff; border: 1px solid #444; padding: 10px; cursor: pointer; border-radius: 6px; font-size: 11px;">DOWNLOAD PDF</button>
                <button onclick="navigator.share({title: 'Genesis Allotment', text: 'Auth Serial: ${serial}'})" style="background: #222; color: #fff; border: 1px solid #444; padding: 10px; cursor: pointer; border-radius: 6px; font-size: 11px;">SHARE ACCESS</button>
                <button onclick="document.getElementById('cert-overlay').remove()" style="grid-column: span 2; background: #5d139e; color: #fff; border: none; padding: 12px; cursor: pointer; border-radius: 6px; font-weight: bold; margin-top: 5px;">CLOSE</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
};

// --- Sovereign Lifecycle Hooks ---
export function onInit(kernel) {}
export function onSuspend() {}
export function onResume() {}
export function onDestroy() {}
