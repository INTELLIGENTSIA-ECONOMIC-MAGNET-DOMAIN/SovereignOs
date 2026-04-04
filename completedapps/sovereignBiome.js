/**
 * sovereignBiome.js
 * IDENTITY_LINKED_GEOGRAPHY // REGISTER_SYNC_ACTIVE
 * FIXED_SEARCH_LOGIC // ALLOTMENT_PRIORITY_SYNC
 */

export class SovereignBiome {
    constructor(container, apiBridge) {
        this.container = container;
        this.api = apiBridge;
        this.viewMode = 'MAP';
        this.showHeatmap = true;
        this.map = null;
        this.tlcLayer = L.layerGroup(); 
        this.flowLayer = L.layerGroup(); 
        
        this.acPoints = [
            { id: "AC_NAIROBI_01", name: "NAIROBI_CENTRAL", lat: -1.286389, lng: 36.817223, tlcCapacity: 450 },
            { id: "AC_MOMBASA_02", name: "MOMBASA_COASTAL", lat: -4.043477, lng: 39.668206, tlcCapacity: 210 },
            { id: "AC_KISUMU_03", name: "KISUMU_LAKE", lat: -0.091702, lng: 34.767956, tlcCapacity: 180 }
        ];

        this.currentRoster = [];
        
        // Global hooks
        window.openNominalRoll = (level, id) => this.showNominalRoll(level, id);
        window.exitRoster = () => { this.viewMode = 'MAP'; this.render(); };
        window.drillAction = (id) => this.showTLCNodes(id);
        window.broadcastSignal = (level, id) => this.executeBroadcast(level, id);
        window.selectSuggestion = (type, id) => this.handleSelection(type, id);
    }

    // Pulls live data from the Identity Register state
    getRegisterData() {
        return window.os?.memberList || [];
    }

    render() {
        // Consolidated Render Logic
        if (this.viewMode === 'MAP') {
            this.container.style.padding = "0";
            this.container.innerHTML = `
                <div class="biome-grid-container">
                    <div class="map-search-container">
                        <div class="search-input-wrapper">
                            <input type="text" id="map-search" class="map-search-input" placeholder="SCANNING_FOR_SIGNATURES..." autocomplete="off">
                        </div>
                        <div id="search-results" class="search-suggestions"></div>
                    </div>
                    <div id="biome-map"></div>
                    <div class="map-controls">
                        <button id="toggle-heat" class="map-toggle-btn">HEAT: ${this.showHeatmap ? 'ON' : 'OFF'}</button>
                    </div>
                </div>
            `;
            this.initMap();
            this.initSearchLogic();
        } else if (this.viewMode === 'NOMINAL_ROLL') {
            this.container.innerHTML = this.renderNominalRollUI();
        }
    }

    initMap() {
        if (this.map) this.map.remove();
        this.map = L.map('biome-map', { zoomControl: false, attributionControl: false }).setView([-1.28, 36.81], 7);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(this.map);
        
        this.tlcLayer.addTo(this.map);
        this.flowLayer.addTo(this.map);

        this.acPoints.forEach(ac => {
            const acNatives = window.os?.memberList?.filter(m => m.actionCenter === ac.id) || [];
            const icon = L.divIcon({ className: 'ac-marker-icon', html: `<div class="marker-node"></div>` });
            
            L.marker([ac.lat, ac.lng], { icon }).addTo(this.map).bindPopup(`
                <div class="sovereign-popup">
                    <div class="popup-header">${ac.name}</div>
                    <div class="popup-stat"><span class="stat-key">TLC_NODES:</span> <span class="stat-val">${ac.tlcCapacity}</span></div>
                    <div class="popup-stat"><span class="stat-key">NATIVES_TOTAL:</span> <span class="stat-val">${acNatives.length}</span></div>
                    <div class="action-grid">
                        <button onclick="drillAction('${ac.id}')" class="tactical-btn">[ SCAN_LOCAL ]</button>
                        <button onclick="broadcastSignal('AC', '${ac.id}')" class="broadcast-btn">[ BROADCAST ]</button>
                    </div>
                    <button onclick="openNominalRoll('AC', '${ac.id}')" class="os-btn-secondary" style="width:100%; margin-top:8px; font-size:9px;">[ NOMINAL_ROLL ]</button>
                </div>
            `);
        });
        setTimeout(() => this.map.invalidateSize(), 100);
    }

    showTLCNodes(acId) {
        const ac = this.acPoints.find(a => a.id === acId);
        if (!ac) return;

        this.tlcLayer.clearLayers();
        this.flowLayer.clearLayers();
        this.map.flyTo([ac.lat, ac.lng], 14, { duration: 1.5 });

        for (let i = 1; i <= 5; i++) {
            const tlcName = `TLC_${acId.split('_')[1]}_NODE_0${i}`;
            const coords = [ac.lat + (Math.random() - 0.5) * 0.015, ac.lng + (Math.random() - 0.5) * 0.015];
            const tlcNatives = window.os?.memberList?.filter(m => m.tlcId === tlcName) || [];

            L.marker(coords, { 
                icon: L.divIcon({ className: 'tlc-node-icon', html: `<div class="tlc-dot"></div>` }) 
            }).addTo(this.tlcLayer).bindPopup(`
                <div class="sovereign-popup">
                    <div class="popup-header" style="font-size:10px;">${tlcName}</div>
                    <div class="popup-stat"><span class="stat-key">NATIVE_COUNT:</span> <span class="stat-val">${tlcNatives.length}</span></div>
                    <button onclick="broadcastSignal('TLC', '${tlcName}')" class="broadcast-btn" style="width:100%;">[ BROADCAST ]</button>
                    <button onclick="openNominalRoll('TLC', '${tlcName}')" class="os-btn-secondary" style="width:100%; margin-top:5px; font-size:9px;">[ NOMINAL_ROLL ]</button>
                </div>
            `);
        }
    }

    showNominalRoll(level, id) {
        const allMembers = window.os?.memberList || [];
        this.currentRoster = allMembers.filter(m => level === 'AC' ? m.actionCenter === id : m.tlcId === id);
        this.viewMode = 'NOMINAL_ROLL';
        this.render();
    }

    renderNominalRollUI() {
    return `
        <div class="roster-container">
            <header class="roster-header">
                <div class="roster-title">[ NOMINAL_ROLL // ${this.currentRoster.length} ACTIVE_PERSONNEL ]</div>
                <button onclick="exitRoster()" class="os-btn-primary">BACK_TO_MAP</button>
            </header>
            <div class="roster-table-wrapper">
                <table class="roster-table">
                    <thead>
                        <tr>
                            <th>DOSSIER</th>
                            <th>NAME</th><th>RANK</th><th>POSITION</th><th>PHONE</th>
                            <th>SPECIAL_RECOGNITION</th><th>JOINED_OS</th><th>JOINED_AC</th>
                            <th>JOINED_TLC</th><th>RANK_DATE</th><th>REMARKS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.currentRoster.map(m => `
                            <tr class="status-${(m.remarks || 'Duty').toLowerCase()}">
                                <td>
                                    <button onclick="os.activeProcesses['biome'].openMemberInRegistry('${m.security.uid}')" 
                                            style="background:var(--id-gold); color:#000; border:none; padding:4px 8px; font-size:9px; cursor:pointer; font-weight:bold; letter-spacing:1px;">
                                        OPEN_DOSSIER
                                    </button>
                                </td>
                                <td>${m.userName || 'N/A'}</td>
                                <td><span class="rank-tag">${m.rank || 'NATIVE'}</span></td>
                                <td>${m.position || 'MEMBER'}</td>
                                <td>${m.contact?.phone || m.phone || '---'}</td>
                                <td class="recognition-cell">${m.specialRecognition || 'NONE'}</td>
                                <td>${m.joinedThealcohesion || '---'}</td>
                                <td>${m.joinedAC || '---'}</td>
                                <td>${m.joinedTLC || '---'}</td>
                                <td>${m.rankDate || '---'}</td>
                                <td class="status-cell">${m.remarks || 'ON DUTY'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
    executeBroadcast(level, id) {
        const modal = document.createElement('div');
        modal.className = 'os-modal-overlay';
        modal.innerHTML = `
            <div class="os-broadcast-window">
                <div class="os-window-header">[ UPLINK: ${id} ]</div>
                <div class="os-window-body">
                    <textarea id="broadcast-msg" class="os-input-area" placeholder="TYPE_MESSAGE..."></textarea>
                    <div class="os-button-group">
                        <button onclick="this.closest('.os-modal-overlay').remove()" class="os-btn-secondary">ABORT</button>
                        <button id="send-signal" class="os-btn-primary">TRANSMIT</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('send-signal').onclick = () => {
            const msg = document.getElementById('broadcast-msg').value;
            if(msg) {
                this.api.notify(`SIGNAL_TRANSMITTED_TO_${id}`, "success");
                modal.remove();
            }
        };
    }

    initSearchLogic() {
    const input = document.getElementById('map-search');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    input.addEventListener('input', (e) => {
        const val = e.target.value.toUpperCase();
        
        if (val.length < 1) {
            results.style.display = 'none';
            return;
        }

        // --- THE TRIPLE-PASS SCAN ---

        // 1. Scan Action Centers (By ID or Name)
        let acMatches = this.acPoints.filter(ac => 
            ac.name.toUpperCase().includes(val) || ac.id.includes(val)
        ).map(ac => ({ label: ac.name, type: 'ACTION_CENTER', id: ac.id }));

        // 2. Scan Natives & TLC IDs (Pulling from window.os.memberList)
        // Note: We check userName for "Natives" and the .id field for "TLC IDs"
        const members = window.os?.memberList || [
            // Fallback for testing if list is empty
            { userName: "Investor_Alpha", id: "TLC-999", actionCenter: "AC_NAIROBI_01", isInvestor: true },
            { userName: "EPOS_Master", id: "TLC-001", actionCenter: "AC_NAIROBI_01", isEPOS: true }
        ];

        let memberMatches = members.filter(m => 
            m.userName.toUpperCase().includes(val) || // Search by Name
            m.id.toUpperCase().includes(val)          // Search by TLC ID (e.g., "TLC-001")
        ).map(m => {
            // Determine the Sub-Type for the Label
            let category = 'TLC_NATIVE';
            if (m.isInvestor) category = 'INVESTOR';
            if (m.isEPOS) category = 'EPOS';

            return { 
                label: m.userName, 
                subLabel: m.id, // Show the TLC ID as well
                type: category, 
                id: m.actionCenter 
            };
        });

        const allResults = [...acMatches, ...memberMatches].slice(0, 8);

        if (allResults.length > 0) {
            results.style.display = 'block';
            results.innerHTML = allResults.map(res => `
                <div class="suggestion-item" onclick="selectSuggestion('${res.type}', '${res.id}')">
                    <div style="display:flex; flex-direction:column;">
                        <span class="suggestion-label">${res.label}</span>
                        <span style="font-size:8px; color:#444;">${res.subLabel || res.id}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:5px;">
                        ${(res.type === 'INVESTOR' || res.type === 'EPOS') ? `<span class="priority-tag">ALLOTMENT</span>` : ''}
                        <span class="suggestion-type">${res.type}</span>
                    </div>
                </div>
            `).join('');
        } else {
            results.style.display = 'none';
        }
    });
}

//click a member on the Map or in a Nominal Roll and open their Dossier in the Registry.
openMemberInRegistry(uid) {
    // 1. Switch the OS active process to the Registry
    if (window.os && window.os.launchProcess) {
        window.os.launchProcess('registry');
        
        // 2. Tell the Registry to select this specific member
        const registry = window.os.activeProcesses['registry'];
        if (registry) {
            const member = MEMBER_LIST.find(m => m.security.uid === uid);
            if (member) {
                registry.selectedMember = member;
                registry.isEditing = false;
                registry.render();
            }
        }
    }
}

// method to receive these updates and refresh the map markers/nominal rolls without reloading the whole page
syncRegistryData(newList) {
    console.log("BIOME_SYNC: Receiving updated Sovereign Roster...");
    this.currentRoster = newList;

    // If we are currently looking at a TLC list or Nominal Roll, re-render it
    if (this.viewMode === 'CELL_LIST' || this.viewMode === 'NOMINAL_ROLL') {
        this.render(); 
    }

    // Refresh Map markers to reflect updated populations
    if (this.map && this.viewMode === 'MAP') {
        this.renderMarkers(); 
    }
    
    this.api.notify("BIOME_MAP: Population data synchronized.", "system");
}

    handleSelection(type, id) {
        const results = document.getElementById('search-results');
        const input = document.getElementById('map-search');
        if (results) results.style.display = 'none';
        if (input) input.value = "";

        const target = this.acPoints.find(ac => ac.id === id);
        if (target) {
            this.map.flyTo([target.lat, target.lng], 13, { duration: 1.5 });
            this.api.notify(`TARGET_LOCKED: ${target.name} (${type})`, "success");
        }
    }

 

    drillToTLC(acId) {
        this.viewMode = 'CELL_LIST';
        this.selectedAC = acId;
        this.render();
    }

    exitToMap() {
        this.viewMode = 'MAP';
        this.render();
    }

    renderTLCList(acId) {
        const sourceData = window.os?.memberList || [];
        const natives = sourceData.filter(m => m.actionCenter === acId);
        return `
            <div class="biome-grid-container" style="padding:40px; background:#000;">
                <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                    <h1 style="color:var(--id-green); margin:0;">[ ${acId} ]</h1>
                    <button onclick="os.activeProcesses['biome'].exitToMap()" style="background:transparent; border:1px solid #333; color:#666; cursor:pointer; padding:8px 20px;">
                        [ BACK_TO_MAP ]
                    </button>
                </header>
                <div class="tlc-list-container">${natives.length ? natives.map(n => `<div class="tlc-row"><span>${n.userName.toUpperCase()}</span><span>100MB</span></div>`).join('') : 'EMPTY'}</div>
            </div>
        `;
    }
}