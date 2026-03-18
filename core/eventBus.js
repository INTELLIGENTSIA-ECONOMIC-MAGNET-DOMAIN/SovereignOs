/**
 * core/eventBus.js
 * THEALCOHESION_OS // SYSTEM_NERVOUS_SYSTEM
 */
class EventBus {
    constructor() {
        this.events = {};
    }

    // Subscribe to a system event (e.g., 'AUTH_SUCCESS')
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    // Emit a system event (e.g., 'WINDOW_MAXIMIZE')
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    // Clean up listeners if a module is destroyed
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
}

export const events = new EventBus();