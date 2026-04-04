export class TimeView {
    constructor(container, model) {
        this.container = container;
        this.model = model;
    }

    render() {
        return `
            <div class="calendar-app-window" style="height:100%; display:flex; flex-direction:column; background:#000; overflow-y: auto; overflow-x: hidden;
                --text-main: clamp(14px, 1.1vw, 18px);
                --text-sub: clamp(10px, 0.8vw, 13px);
                --text-title: clamp(22px, 2.2vw, 32px);">
                <div class="calendar-header" style="display:flex; flex-wrap: wrap; justify-content:space-between; align-items:center; padding:10px; background:#1a1a2e; border-bottom:1px solid #444; gap: 10px;">
                    <div class="nav-controls" style="display:flex; gap:8px;">
                        <button class="vpu-btn" onclick="app.changeMonth(-1)">←</button>
                        <button class="vpu-btn" onclick="app.goToToday()" style="font-size: var(--text-sub); min-width:80px;">Today</button>
                        <button class="vpu-btn" onclick="app.changeMonth(1)">→</button>
                    </div>
                    <h2 id="vpu-month-label" style="margin:0; font-size: var(--text-main); color:#fff; flex: 1; text-align: center;">Loading...</h2>
                    <input type="date" id="vpu-date-picker" onchange="app.jumpToDate(this.value)" style="background:#000; color:#fff; border:1px solid #a445ff; font-size: var(--text-sub); padding:8px; border-radius: 4px; flex: 1 0 80%; /* Default to full width for mobile */
                max-width: 100%;">
                </div>

                <div class="calendar-body-container" style="display:flex; flex-wrap: wrap; flex: 1;">

                    <div id="vpu-calendar-grid" style="flex: 1 1 600px; display:grid; grid-template-columns:repeat(7, 1fr); gap:2px; padding:5px; background:#111; min-height: 400px;">
                    </div>

                <div class="calendar-info-sidebar" style="flex: 1 0 280px; background:#0a0a1a; border-left:1px solid #333; padding:25px; display: flex; flex-direction: column; gap: 20px; box-sizing: border-box;">

                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #222; padding-bottom: 15px;">
                    <h4 style="font-size: var(--text-sub); color:#a445ff; letter-spacing:1px; text-transform:uppercase; margin: 0;">
                        Temporal Feed
                    </h4>
                    <button onclick="app.addReminder()"
                        style="background:#a445ff; border:none; color:#000; width:28px; height:28px; border-radius:6px; cursor:pointer; font-weight: bold;">
                        +
                    </button>
                </div>

                <div id="vpu-reminder-list" style="display:flex; flex-direction:column; flex: 1; overflow-y: auto;">
                    </div>

            </div>

                    </div>
                </div>
            </div>
        `;
    }

    // Render the HUD
    renderHUD() {
        if (document.getElementById('temporal-hud')) return;

        const now = new Date();
        const metrics = this.model.getTemporalMetrics(now);
        const theal = this.model.getThealDate(now);

        // Circular Progress Calculation
        const dayNum = parseInt(theal.label.match(/Day (\d+)/)?.[1] || 1);
        const progress = (dayNum / 28) * 100;
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (progress / 100) * circumference;

        const hud = document.createElement('div');
        hud.id = 'temporal-hud';
        // INTEGRATED CLAMP HERE (Width)
        hud.style.cssText = `
            position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
            width: clamp(320px, 30vw, 500px);
            background: rgba(5, 5, 10, 0.98); backdrop-filter: blur(25px);
            border: 1px solid #a445ff; border-radius: 24px; padding: clamp(15px, 2vw, 30px);
            z-index: 10000; color: white; box-shadow: 0 0 40px rgba(164, 69, 255, 0.2);
            display: flex; flex-direction: column; align-items: center;
        `;

        hud.innerHTML = `
            <div style="position: relative; width: 100px; height: 100px; margin-bottom: 15px;">
                <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="4"/>
                    <circle cx="50" cy="50" r="45" fill="transparent" stroke="#a445ff" stroke-width="4"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                        stroke-linecap="round" style="transform: rotate(-90deg); transform-origin: 50% 50%; transition: 1s;"/>
                </svg>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 16px; font-weight: bold;">${Math.round(progress)}%</div>
            </div>

            <div id="hud-theal-time" style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">00:00:00</div>

            <div style="width: 100%; display: grid; grid-template-columns: 1fr; gap: 8px; margin-bottom: 20px; font-family: monospace;">
                <div style="background: rgba(164, 69, 255, 0.1); padding: 8px; border-radius: 8px; border-left: 3px solid #a445ff;">
                    <span style="font-size: 9px; color: #888; display: block;">NEXT CIRCLE TRANSITION</span>
                    <span style="font-size: 12px; color: #fff;">${metrics.nextCirclePercent}% Remaining</span>
                </div>
                <div style="background: rgba(255, 255, 255, 0.03); padding: 8px; border-radius: 8px;">
                    <span style="font-size: 9px; color: #888; display: block;">YEAR COMPLETION</span>
                    <span style="font-size: 12px; color: #fff;">${metrics.daysToYearEnd} Days to Full Cycle</span>
                </div>
                <div style="background: rgba(255, 215, 0, 0.05); padding: 8px; border-radius: 8px; border-left: 3px solid #ffd700;">
                    <span style="font-size: 9px; color: #ffd700; display: block;">UPCOMING HOLIDAY</span>
                    <span style="font-size: 12px; color: #fff;">${metrics.daysToHoliday} Days to ${metrics.holidayName}</span>
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; width: 100%; border-top: 1px solid #222; padding-top: 15px;">
                <div style="text-align: left;">
                    <small style="color: #444; font-size: 8px;">GREGORIAN</small>
                    <div id="hud-normal-time" style="font-size: 12px; color: #666;">${now.toLocaleTimeString()}</div>
                </div>
                <div style="text-align: right;">
                    <small style="color: #444; font-size: 8px;">SOVEREIGN</small>
                    <div style="font-size: 12px; color: #a445ff;">${theal.label.split(',')[0]}</div>
                </div>
            </div>

            <button onclick="this.parentElement.remove()" style="margin-top: 20px; background: none; border: none; color: #333; cursor: pointer; font-size: 10px;">[ CLOSE ]</button>
        `;
        document.body.appendChild(hud);
    }

    renderReminders() {
        const list = document.getElementById('vpu-reminder-list');
        if (!list) return;

        const now = new Date();
        const theal = this.model.getThealDate(now);

        // 1. Calculate Cycle Countdown
        const dayMatch = theal.label.match(/Day (\d+)/);
        const daysLeftInCycle = dayMatch ? (28 - parseInt(dayMatch[1])) : 0;

        const cycleReminder = {
            name: `Next Cycle Transition`,
            date: daysLeftInCycle === 0 ? "TODAY" : `In ${daysLeftInCycle} Days`,
            type: 'system-info',
            category: 'CHRONOS'
        };

        // 2. Safely Combine (Ensuring data exists)
        const sys = (this.model.systemReminders || []).map(r => ({ ...r, category: 'CORE' }));
        const usr = (this.model.userReminders || []).map((r, i) => ({ ...r, category: 'USER', id: i }));

        const allReminders = [cycleReminder, ...sys, ...usr];

        // 3. Render with Visibility Check
        if (allReminders.length === 0) {
            list.innerHTML = `<div style="color:#444; font-size:10px; text-align:center; padding:20px;">No Active Feed</div>`;
            return;
        }

        list.innerHTML = allReminders.map(r => {
            const isGenesis = r.name === "Genesis Allotment";
            let statusColor = "#444";
            let statusLabel = "";
            let countdownText = "";

            // Date Calculation
            if (r.date && r.date.includes('/')) {
                const [d, m] = r.date.split('/').map(Number);
                const eventDate = new Date(now.getFullYear(), m - 1, d);
                if (now > eventDate && now.toDateString() !== eventDate.toDateString()) {
                    eventDate.setFullYear(now.getFullYear() + 1);
                }
                const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

                if (now.toDateString() === eventDate.toDateString()) {
                    statusColor = "#ffd700"; statusLabel = "TODAY"; countdownText = "NOW";
                } else {
                    statusColor = "#00ff88"; statusLabel = "ACTIVE"; countdownText = `In ${diffDays}d`;
                }
            } else {
                statusColor = "#a445ff"; statusLabel = "LIVE"; countdownText = r.date;
            }

            return `
                <div ${isGenesis ? 'onclick="window.triggerGenesisCert()"' : ''}
                     style="background: rgba(255,255,255,0.03); border-left: 3px solid ${this.model.getReminderColor(r.type)};
                     padding: 12px; border-radius: 6px; position: relative; margin-bottom: 8px;
                     ${isGenesis ? 'cursor: pointer; border: 1px solid rgba(255, 215, 0, 0.2);' : ''}">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 8px; color: #666; letter-spacing: 0.5px;">${r.category} • ${r.date}</span>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span style="font-size: 8px; color: #aaa; font-family: monospace;">${countdownText}</span>
                            <span style="font-size: 7px; color: ${statusColor}; font-weight: bold;">● ${statusLabel}</span>
                        </div>
                    </div>

                    <div style="font-size: var(--text-sub); color: #fff; font-weight: 500; display: flex; justify-content: space-between; align-items: center;">
                        ${r.name}
                        ${isGenesis ? '<span style="font-size: 9px; color:#ffd700; font-weight:bold;">YES ↗</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderGrid(date) {
        const grid = document.getElementById("vpu-calendar-grid");
        const label = document.getElementById("vpu-month-label");
        if (!grid || !label) return;

        grid.innerHTML = "";
        label.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Header Days (Sat, Sun, etc.) - Scaling font
        ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].forEach(d => {
            // Apply color to the Friday header specifically
                const color = d === 'Fri' ? '#ff4444' : '#a445ff';
            grid.innerHTML += `
                <div style="font-size: var(--text-sub); color:#a445ff; text-align:center; padding: 10px; font-weight:bold; text-transform: uppercase;">
                    ${d}
                </div>`;
        });

        const first = new Date(date.getFullYear(), date.getMonth(), 1);
        const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const startIndex = (first.getDay() + 1) % 7;

        for (let i = 0; i < startIndex; i++) grid.innerHTML += `<div style="background:transparent;"></div>`;

        for (let day = 1; day <= last.getDate(); day++) {
            const d = new Date(date.getFullYear(), date.getMonth(), day);
            const theal = this.model.getThealDate(d);
            const cell = document.createElement("div");

            // CHECK FOR FRIDAY (Friday is 5 in JS Date, but we check d.getDay())
                const isFriday = d.getDay() === 5;
            // Ensure min-height grows to accommodate larger font
            cell.style.cssText = `
            background: ${isFriday ? 'rgba(255, 68, 68, 0.05)' : '#161625'};
            border: 0.5px solid ${isFriday ? 'rgba(255, 68, 68, 0.3)' : '#222'};
            /* Reduced min-height to allow 6 rows to fit comfortably */
            min-height: clamp(50px, 7vh, 85px);
            padding: 4px 6px;
            color:#fff;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            overflow: hidden;
            box-sizing: border-box;
        `;

            // Highlight Today
            if (d.toDateString() === new Date().toDateString()) {
                cell.style.borderColor = "#a445ff";
                cell.style.background = "rgba(164, 69, 255, 0.1)";
            }

            if (theal.color) cell.style.borderLeft = `4px solid ${theal.color}`;

            // THE FIX: Explicitly applying variables to the internal text
            cell.innerHTML = `
                <div style="font-size: var(--text-main); font-weight: bold; opacity: 1;">
                    ${day}
                </div>
                <div style="font-size: var(--text-sub); line-height: 1.4; color: #aaa; font-family: monospace;">
                    ${theal.label.replace(', Day', '<br>Day')}
                </div>
            `;
            grid.appendChild(cell);
        }
    }

    renderUpcomingEvents() {
        const list = document.getElementById('vpu-event-list');
        const progFill = document.getElementById('vpu-progress-fill');
        const progText = document.getElementById('vpu-progress-percent');
        if (!list) return;

        const events = [{ n: "Genesis Allotment", d: "26/12", action: "window.triggerGenesisCert()" }];
        list.innerHTML = events.map(e => `
            <div style="font-size:10px; margin-bottom:12px; border-left:2px solid #a445ff; padding-left:8px; cursor: pointer;" onclick="${e.action}">
                <b style="color: #d586ff">${e.n} ↗</b><br>
                <span style="color:#888;">${e.d}</span>
            </div>
        `).join('');

        const now = new Date();
        const theal = this.model.getThealDate(now);
        if (theal.label.includes("Day")) {
            const dayNum = parseInt(theal.label.match(/Day (\d+)/)[1]);
            const percent = Math.round((dayNum / 28) * 100);
            if (progFill) progFill.style.width = `${percent}%`;
            if (progText) progText.textContent = `${percent}%`;
        }
    }
}