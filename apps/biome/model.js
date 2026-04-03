/**
 * model.js - Data & Business Logic
 * IDENTITY_LINKED_GEOGRAPHY // REGISTER_SYNC_ACTIVE
 */

export class BiomeModel {
    constructor(apiBridge) {
        this.api = apiBridge;
        this.viewMode = 'MAP';
        this.showHeatmap = true;
        this.currentRoster = [];
        this.acPoints = [];
        this.members = [];
        this.isLoading = false;
        this.apiBaseUrl = 'http://localhost:3000/api/vpu';
    }

    // Fetch all action centers from database
    async fetchActionCenters() {
        try {
            this.isLoading = true;
            const response = await fetch(`${this.apiBaseUrl}/action-centers`);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();
            
            // Normalize action center data from database
            this.acPoints = Array.isArray(data) ? data.map(ac => ({
                id: ac.id || ac.action_center_id,
                name: ac.name || ac.action_center_name,
                lat: parseFloat(ac.latitude || ac.lat || -1.286389),
                lng: parseFloat(ac.longitude || ac.lng || 36.817223),
                tlcCapacity: ac.tlc_capacity || ac.capacity || 100,
                country: ac.country,
                members: parseInt(ac.member_count || 0)
            })) : [];
            
            console.log("BIOME: Action Centers loaded:", this.acPoints);
            this.isLoading = false;
            return this.acPoints;
        } catch (error) {
            console.error("BIOME_FETCH_ERROR:", error);
            this.api?.notify?.(`Database Connection Error: ${error.message}`, "error");
            this.isLoading = false;
            return [];
        }
    }

    // Fetch TLC nodes for a specific action center
    async fetchTLCNodes(acId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/action-centers/${acId}/tlc`);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();
            
            return Array.isArray(data) ? data.map(tlc => ({
                id: tlc.id || tlc.tlc_id,
                name: tlc.name || tlc.tlc_name,
                lat: parseFloat(tlc.latitude || -1.286389),
                lng: parseFloat(tlc.longitude || 36.817223),
                actionCenterId: acId,
                memberCount: parseInt(tlc.member_count || 0)
            })) : [];
        } catch (error) {
            console.error("BIOME_TLC_FETCH_ERROR:", error);
            return [];
        }
    }

    // Fetch members for a specific location (AC or TLC)
    async fetchMembers(filterType = null, filterId = null) {
        try {
            this.isLoading = true;
            let url = `${this.apiBaseUrl}/registry/members`;
            
            if (filterType === 'AC' && filterId) {
                url = `${this.apiBaseUrl}/action-centers/${filterId}/members`;
            } else if (filterType === 'TLC' && filterId) {
                url = `${this.apiBaseUrl}/tlc/${filterId}/members`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();
            
            this.members = Array.isArray(data) ? data : [];
            this.isLoading = false;
            return this.members;
        } catch (error) {
            console.error("BIOME_MEMBERS_FETCH_ERROR:", error);
            this.isLoading = false;
            return [];
        }
    }

    // Pulls live data from the Identity Register state
    getRegisterData() {
        return window.os?.memberList || this.members || [];
    }

    syncRegistryData(newList) {
        console.log("BIOME_SYNC: Receiving updated Sovereign Roster...");
        this.currentRoster = newList;
        this.api?.notify?.("BIOME_MAP: Population data synchronized.", "system");
    }

    getACNatives(acId) {
        return this.members.filter(m => m.action_center === acId || m.action_center_id === acId) || [];
    }

    getTLCNatives(tlcId) {
        return this.members.filter(m => m.tlc === tlcId || m.tlc_id === tlcId) || [];
    }

    getRosterByLevel(level, id) {
        const allMembers = this.members || [];
        return allMembers.filter(m => level === 'AC' 
            ? (m.action_center === id || m.action_center_id === id)
            : (m.tlc === id || m.tlc_id === id)
        );
    }

    getMemberById(uid) {
        const members = this.members || [];
        return members.find(m => m.security?.uid === uid || m.id === uid);
    }

    getMembers() {
        return this.members || [];
    }

    searchMembers(query) {
        const val = query.toUpperCase();
        const members = this.getMembers();
        
        let results = members.filter(m => 
            (m.user_name || '').toUpperCase().includes(val) || 
            (m.official_name || '').toUpperCase().includes(val) || 
            (m.membership_no || '').toUpperCase().includes(val)
        ).map(m => {
            let category = 'MEMBER';
            if (m.is_investor) category = 'INVESTOR';
            if (m.is_epos) category = 'EPOS';
            return { 
                label: m.user_name || m.official_name, 
                subLabel: m.membership_no || m.id,
                type: category, 
                id: m.action_center_id || m.action_center 
            };
        });

        return results;
    }

    searchActionCenters(query) {
        const val = query.toUpperCase();
        return this.acPoints.filter(ac => 
            (ac.name || '').toUpperCase().includes(val) || (ac.id || '').toUpperCase().includes(val)
        ).map(ac => ({ label: ac.name, type: 'ACTION_CENTER', id: ac.id }));
    }

    getActionCenter(acId) {
        return this.acPoints.find(a => a.id === acId);
    }

    async getTLCNodes(acId, count = 5) {
        // Try to fetch from database first
        const nodes = await this.fetchTLCNodes(acId);
        if (nodes.length > 0) {
            return nodes.slice(0, count);
        }
        
        // Fallback to generating mock nodes if API fails
        const ac = this.getActionCenter(acId);
        if (!ac) return [];

        const fallbackNodes = [];
        for (let i = 1; i <= count; i++) {
            const tlcName = `TLC_${acId.split('_')[1]}_NODE_0${i}`;
            const coords = [ac.lat + (Math.random() - 0.5) * 0.015, ac.lng + (Math.random() - 0.5) * 0.015];
            fallbackNodes.push({ id: tlcName, name: tlcName, lat: coords[0], lng: coords[1] });
        }
        return fallbackNodes;
    }
}
