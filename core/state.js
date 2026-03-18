/**
 * core/state.js
 * EXTRACTED FROM os.js (v1.2.8)
 * Logic: Global OS State Tracking
 */

export const state = {
    isBooted: false,
    ledgerLocked: true,
    isLocked: false,
    sessionKey: null,
    
    // Resource Tracking
    currentMemory: 0,
    maxMemory: 100,
    
    // UI State
    isTilingActive: false,
    isOverviewActive: false,
    activeUser: null,
    
    // System Metadata
    version: "2.0.0-MODULAR",
    kernelUplink: "STABLE"
};