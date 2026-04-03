
/**
 * index.js - Biome App Initialization & Lifecycle
 * IDENTITY_LINKED_GEOGRAPHY // REGISTER_SYNC_ACTIVE
 */

import { BiomeModel } from './model.js';
import { BiomeView } from './view.js';

export class Biome {
    constructor(container, apiBridge) {
        this.container = container;
        this.api = apiBridge;
        
        this.model = new BiomeModel(apiBridge);
        this.view = new BiomeView(container, this.model);
        
        // Global reference for event handlers
        window.biomeInstance = this;
        
        // Setup global hooks for nominal roll and actions
        this.setupGlobalHooks();
        
        // Initialize with database data
        this.init();
    }

    async init() {
        try {
            // Fetch action centers and members from database
            await this.model.fetchActionCenters();
            await this.model.fetchMembers();
            this.render();
        } catch (error) {
            console.error("Biome initialization error:", error);
            this.api?.notify?.("Failed to load biome data", "error");
        }
    }

    setupGlobalHooks() {
        window.openNominalRoll = (level, id) => this.showNominalRoll(level, id);
        window.exitRoster = () => this.exitRoster();
        window.drillAction = (id) => this.drillAction(id);
        window.broadcastSignal = (level, id) => this.broadcastSignal(level, id);
        window.selectSuggestion = (type, id) => this.handleSelection(type, id);
    }

    render() {
        this.view.render();
    }

    // --- UI Actions ---
    async showNominalRoll(level, id) {
        // Fetch members for this specific location if not already loaded
        await this.model.fetchMembers(level, id);
        this.model.currentRoster = this.model.getRosterByLevel(level, id);
        this.model.viewMode = 'NOMINAL_ROLL';
        this.render();
    }

    exitRoster() {
        this.model.viewMode = 'MAP';
        this.render();
    }

    drillAction(acId) {
        this.view.showTLCNodes(acId);
    }

    broadcastSignal(level, id) {
        this.view.executeBroadcast(level, id);
    }

    handleSelection(type, id) {
        this.view.handleSelection(type, id);
    }

    openMemberInRegistry(uid) {
        // 1. Switch the OS active process to the Registry
        if (window.os && window.os.launchProcess) {
            window.os.launchProcess('registry');
            
            // 2. Tell the Registry to select this specific member
            const registry = window.os.activeProcesses['registry'];
            if (registry) {
                const member = this.model.getMemberById(uid);
                if (member) {
                    registry.selectedMember = member;
                    registry.isEditing = false;
                    registry.render();
                }
            }
        }
    }

    syncRegistryData(newList) {
        this.model.syncRegistryData(newList);
        
        // If we are currently looking at a TLC list or Nominal Roll, re-render it
        if (this.model.viewMode === 'CELL_LIST' || this.model.viewMode === 'NOMINAL_ROLL') {
            this.render();
        }

        // Refresh Map markers to reflect updated populations
        if (this.view.map && this.model.viewMode === 'MAP') {
            this.view.renderMapMarkers();
        }
    }
}

/* --- Sovereign Lifecycle Hooks --- */
export function onInit(kernel) {
    const container = kernel.getAppContainer?.() || document.body;
    const apiBridge = kernel.apiBridge || kernel.api;
    const biomeApp = new Biome(container, apiBridge);
    biomeApp.render();
    return biomeApp;
}

export function onSuspend() {
    // Save any state if needed
}

export function onResume() {
    // Restore UI or refresh data
}

export function onDestroy() {
    // Cleanup
}
