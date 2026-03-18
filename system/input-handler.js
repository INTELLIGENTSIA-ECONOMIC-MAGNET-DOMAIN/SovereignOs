/**
 * system/input-handler.js
 * EXTRACTED FROM os.js (v1.2.8)
 * Logic: Context Menu Hijacking & Idle/Security Timers
 */
import { events } from '../core/eventBus.js';

export class InputHandler {
    constructor() {
        this.idleTimer = null;
        this.init();
    }

    init() {
        this.setupContextMenu();
        this.resetIdleTimer();
        
        // Listen for user activity to reset the timer
        window.onload = () => this.resetIdleTimer();
        document.onmousemove = () => this.resetIdleTimer();
        document.onkeydown = () => this.resetIdleTimer();
    }

    // --- EXTRACTED: setupContextMenu (Lines 11-22 of os.js) ---
    setupContextMenu() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const menu = document.getElementById('custom-context-menu');
            if (menu) {
                menu.style.display = 'block';
                menu.style.left = `${e.pageX}px`;
                menu.style.top = `${e.pageY}px`;
                menu.classList.add('active');
            }
        });

        document.addEventListener('click', () => {
            const menu = document.getElementById('custom-context-menu');
            if (menu) {
                menu.style.display = 'none';
                menu.classList.remove('active');
            }
        });
    }

    // --- EXTRACTED: idleTimer Logic (Lines 62-80 approx of os.js) ---
    resetIdleTimer() {
        clearTimeout(this.idleTimer);
        // Default 5-minute lock (300000ms) as per Sovereign standard
        this.idleTimer = setTimeout(() => {
            console.warn("[SECURITY]: IDLE_TIMEOUT_REACHED");
            events.emit('SECURITY_LOCK_TRIGGERED');
        }, 300000); 
    }
}