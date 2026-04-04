export class TimeModel {
    constructor() {
        this.currentViewDate = new Date();
        this.timer = null;
        this.transitionAlerted = false;

        this.cycles = [
            { name: "1st Cycle", start: "21/11", end: "18/12" },
            { name: "2nd Cycle", start: "19/12", end: "15/01" },
            { name: "3rd Cycle", start: "16/01", end: "12/02" },
            { name: "4th Cycle", start: "13/02", end: "12/03" },
            { name: "5th Cycle", start: "13/03", end: "09/04" },
            { name: "6th Cycle", start: "10/04", end: "07/05" },
            { name: "7th Cycle", start: "08/05", end: "04/06" },
            { name: "8th Cycle", start: "05/06", end: "02/07" },
            { name: "9th Cycle", start: "03/07", end: "30/07" },
            { name: "10th Cycle", start: "31/07", end: "27/08" },
            { name: "11th Cycle", start: "28/08", end: "24/09" },
            { name: "12th Cycle", start: "25/09", end: "22/10" },
            { name: "13th Cycle", start: "23/10", end: "19/11" }
        ];

        // reminders storage
        this.userReminders = JSON.parse(localStorage.getItem('vpu_reminders')) || [];
        this.systemReminders = [
            { name: "Genesis Allotment", date: "26/12", type: "system-gold" },
            { name: "Special Day", date: "29/2", type: "system-blue" },
            { name: "End Year Holiday", date: "20/11", type: "system-blue" }
        ];
    }

    // reminder management
    addReminder() {
        const name = prompt("Enter Reminder Name:");
        if (!name) return;
        const date = prompt("Enter Date (DD/MM):", "03/01");
        if (!date) return;

        this.userReminders.push({ name, date, type: 'user' });
        this.saveReminders();
    }

    deleteReminder(index) {
        this.userReminders.splice(index, 1);
        this.saveReminders();
    }

    saveReminders() {
        localStorage.setItem('vpu_reminders', JSON.stringify(this.userReminders));
    }

    getReminderColor(type) {
        const colors = {
            'system-gold': '#ffd700',
            'system-info': '#a445ff',
            'system-blue': '#00d4ff',
            'user': '#555'
        };
        return colors[type] || '#444';
    }

    getThealDate(date) {
        const d = date.getDate();
        const m = date.getMonth() + 1;
        const year = date.getFullYear();
        const isLeap = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));

        if (d === 20 && m === 11) return { label: "HOLIDAY: END YEAR", type: "holiday", color: "#e95420" };
        if (d === 29 && m === 2) return { label: "HOLIDAY: SPECIAL DAY", type: "holiday", color: "#d586ff" };
        let milestone = (d === 26 && m === 12) ? " ★ Genesis Allotment" : "";

        for (let i = 0; i < this.cycles.length; i++) {
            const cycle = this.cycles[i];
            const [sD, sM] = cycle.start.split('/').map(Number);
            const [eD, eM] = cycle.end.split('/').map(Number);
            let startDate = new Date(year, sM - 1, sD);
            let endDate = new Date(year, eM - 1, eD);
            if (sM >= 11 && m < 11) startDate.setFullYear(year - 1);
            if (eM >= 11 && m < 11) endDate.setFullYear(year - 1);

            if (endDate < startDate) endDate.setFullYear(endDate.getFullYear() + 1);

            if (date >= startDate && date <= endDate) {
                let diff = Math.floor((date - startDate) / 86400000) + 1;
                if (isLeap && date > new Date(year, 1, 29) && startDate <= new Date(year, 1, 29)) diff--;
                return {
                    label: `${cycle.name}, Day ${diff}${milestone}`,
                    type: milestone ? "milestone" : "cycle",
                    color: milestone ? "#FFD700" : null
                };
            }
        }
        return { label: "Transition", type: "other" };
    }

    convertToThealHour(hour) {
        const mapping = { 7:1, 8:2, 9:3, 10:4, 11:5, 12:6, 13:7, 14:8, 15:9, 16:10, 17:11, 18:12, 19:1, 20:2, 21:3, 22:4, 23:5, 0:6, 1:7, 2:8, 3:9, 4:10, 5:11, 6:12 };
        return mapping[hour] || hour;
    }

    checkCycleTransition(thealDateLabel) {
        // Only trigger if we are on the final day
        if (thealDateLabel.includes("Day 28") && !this.transitionAlerted) {
            this.triggerSystemNotification("CYCLE TRANSITION IMMINENT", "Current cycle concludes at 12:00. Prepare for Phase Allotment.");
            this.transitionAlerted = true; // Prevent spamming
        }
        // Reset flag when we move to Day 1
        if (thealDateLabel.includes("Day 1")) {
            this.transitionAlerted = false;
        }
    }

    triggerSystemNotification(title, msg) {
        const notify = document.createElement('div');
        notify.className = 'system-notification';
        notify.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; width: 300px;
            background: rgba(164, 69, 255, 0.15); border: 1px solid #a445ff;
            backdrop-filter: blur(10px); color: white; padding: 15px;
            border-radius: 8px; z-index: 99999; animation: notifySlide 0.5s ease-out;
        `;
        notify.innerHTML = `
            <strong style="color:#a445ff; display:block; font-size:12px;">${title}</strong>
            <p style="font-size:11px; margin:5px 0 0; color:#ccc;">${msg}</p>
        `;
        document.body.appendChild(notify);
        setTimeout(() => notify.remove(), 8000);
    }

    // Temporal Metrics
    getTemporalMetrics(now) {
        const theal = this.getThealDate(now);
        const dayNum = parseInt(theal.label.match(/Day (\d+)/)?.[1] || 1);

        // 1. % to next circle (28-day logic)
        const nextCirclePercent = Math.round(((28 - dayNum) / 28) * 100);

        // 2. Days to complete year circles
        // The 13th cycle ends on Nov 19th.
        const yearEnd = new Date(now.getFullYear(), 10, 19); // Nov 19
        if (now > yearEnd) yearEnd.setFullYear(yearEnd.getFullYear() + 1);
        const daysToYearEnd = Math.ceil((yearEnd - now) / 86400000);

        // 3. Days to next holiday
        // Checking Nov 20 (End Year) and Dec 26 (Genesis)
        const holidays = [
            { name: "End Year", date: new Date(now.getFullYear(), 10, 20) },
            { name: "Genesis Allotment", date: new Date(now.getFullYear(), 11, 26) }
        ];

        let nextHoliday = holidays[0];
        let minDiff = Infinity;

        holidays.forEach(h => {
            if (now > h.date) h.date.setFullYear(h.date.getFullYear() + 1);
            const diff = Math.ceil((h.date - now) / 86400000);
            if (diff < minDiff) {
                minDiff = diff;
                nextHoliday = h;
            }
        });

        return {
            nextCirclePercent,
            daysToYearEnd,
            holidayName: nextHoliday.name,
            daysToHoliday: minDiff
        };
    }
}