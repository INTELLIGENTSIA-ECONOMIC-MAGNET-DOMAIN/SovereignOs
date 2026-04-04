import { registry } from '../../core/registry-v2.js';

export class AppCenterModel {
    constructor() {
        this.currentCategory = 'All';
        this.searchQuery = '';
        // Merge hardcoded registry with locally created apps
        const localApps = JSON.parse(localStorage.getItem('vpu_local_registry') || '[]');
        this.registry = [...registry, ...localApps];
    }

    saveSystemState(appId, newSize) {
        const state = JSON.parse(sessionStorage.getItem('vpu_hive_state') || '{}');
        state[appId] = newSize;
        sessionStorage.setItem('vpu_hive_state', JSON.stringify(state));
    }

    loadSystemState() {
        return JSON.parse(sessionStorage.getItem('vpu_hive_state') || '{}');
    }

    getCategoryColor(cat) {
        const colors = { System: '#a445ff', Finance: '#00ff41', Social: '#00ccff', Infrastructure: '#ff3366' };
        return colors[cat] || '#ffffff';
    }
}
