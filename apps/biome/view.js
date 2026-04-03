/**
 * view.js - UI Rendering & Display Logic
 * FIXED_SEARCH_LOGIC // ALLOTMENT_PRIORITY_SYNC
 */

import { BiomeModel } from './model.js';

export class BiomeView {
    constructor(container, model) {
        this.container = container;
        this.model = model;
        this.map = null;
        this.tlcLayer = L.layerGroup();
        this.flowLayer = L.layerGroup();
    }

    render() {
        if (this.model.viewMode === 'MAP') {
            this.renderMapView();
        } else if (this.model.viewMode === 'NOMINAL_ROLL') {
            this.renderNominalRoll();
        }
    }

    renderMapView() {
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
                    <button id="toggle-heat" class="map-toggle-btn">HEAT: ${this.model.showHeatmap ? 'ON' : 'OFF'}</button>
                </div>
            </div>
        `;
        this.initMap();
        this.initSearchLogic();
    }

    initMap() {
        if (this.map) this.map.remove();
        this.map = L.map('biome-map', { zoomControl: false, attributionControl: false }).setView([-1.28, 36.81], 7);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(this.map);
        
        this.tlcLayer.addTo(this.map);
        this.flowLayer.addTo(this.map);

        this.model.acPoints.forEach(ac => {
            const acNatives = this.model.getACNatives(ac.id);
            const icon = L.divIcon({ className: 'ac-marker-icon', html: `<div class="marker-node"></div>` });
            
            L.marker([ac.lat, ac.lng], { icon }).addTo(this.map).bindPopup(`
                <div class="sovereign-popup">
                    <div class="popup-header">${ac.name}</div>
                    <div class="popup-stat"><span class="stat-key">TLC_NODES:</span> <span class="stat-val">${ac.tlcCapacity}</span></div>
                    <div class="popup-stat"><span class="stat-key">NATIVES_TOTAL:</span> <span class="stat-val">${acNatives.length}</span></div>
                    <div class="action-grid">
                        <button onclick="window.biomeInstance.drillAction('${ac.id}')" class="tactical-btn">[ SCAN_LOCAL ]</button>
                        <button onclick="window.biomeInstance.broadcastSignal('AC', '${ac.id}')" class="broadcast-btn">[ BROADCAST ]</button>
                    </div>
                    <button onclick="window.biomeInstance.showNominalRoll('AC', '${ac.id}')" class="os-btn-secondary" style="width:100%; margin-top:8px; font-size:9px;">[ NOMINAL_ROLL ]</button>
                </div>
            `);
        });
        setTimeout(() => this.map.invalidateSize(), 100);
    }

    renderMapMarkers() {
        this.model.acPoints.forEach(ac => {
            const acNatives = this.model.getACNatives(ac.id);
            const icon = L.divIcon({ className: 'ac-marker-icon', html: `<div class="marker-node"></div>` });
            
            L.marker([ac.lat, ac.lng], { icon }).addTo(this.map).bindPopup(`
                <div class="sovereign-popup">
                    <div class="popup-header">${ac.name}</div>
                    <div class="popup-stat"><span class="stat-key">NATIVES_TOTAL:</span> <span class="stat-val">${acNatives.length}</span></div>
                </div>
            `);
        });
    }

    async showTLCNodes(acId) {
        const ac = this.model.getActionCenter(acId);
        if (!ac) return;

        this.tlcLayer.clearLayers();
        this.flowLayer.clearLayers();
        this.map.flyTo([ac.lat, ac.lng], 14, { duration: 1.5 });

        // Fetch TLC nodes from database
        const nodes = await this.model.getTLCNodes(acId);
        nodes.forEach(node => {
            const tlcNatives = this.model.getTLCNatives(node.id || node.name);

            L.marker([node.lat, node.lng], { 
                icon: L.divIcon({ className: 'tlc-node-icon', html: `<div class="tlc-dot"></div>` }) 
            }).addTo(this.tlcLayer).bindPopup(`
                <div class="sovereign-popup">
                    <div class="popup-header" style="font-size:10px;">${node.name || node.id}</div>
                    <div class="popup-stat"><span class="stat-key">NATIVE_COUNT:</span> <span class="stat-val">${tlcNatives.length}</span></div>
                    <button onclick="window.biomeInstance.broadcastSignal('TLC', '${node.id || node.name}')" class="broadcast-btn" style="width:100%;">[ BROADCAST ]</button>
                    <button onclick="window.biomeInstance.showNominalRoll('TLC', '${node.id || node.name}')" class="os-btn-secondary" style="width:100%; margin-top:5px; font-size:9px;">[ NOMINAL_ROLL ]</button>
                </div>
            `);
        });
    }

    renderNominalRoll() {
        this.container.innerHTML = `
            <div class="roster-container">
                <header class="roster-header">
                    <div class="roster-title">[ NOMINAL_ROLL // ${this.model.currentRoster.length} ACTIVE_PERSONNEL ]</div>
                    <button onclick="window.biomeInstance.exitRoster()" class="os-btn-primary">BACK_TO_MAP</button>
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
                            ${this.model.currentRoster.map(m => `
                                <tr class="status-${(m.remarks || 'Duty').toLowerCase()}">
                                    <td>
                                        <button onclick="window.biomeInstance.openMemberInRegistry('${m.security.uid}')" 
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
                this.model.api.notify(`SIGNAL_TRANSMITTED_TO_${id}`, "success");
                modal.remove();
            }
        };
    }

    initSearchLogic() {
        const input = document.getElementById('map-search');
        const results = document.getElementById('search-results');
        if (!input || !results) return;

        input.addEventListener('input', (e) => {
            const val = e.target.value;
            
            if (val.length < 1) {
                results.style.display = 'none';
                return;
            }

            // --- THE TRIPLE-PASS SCAN ---
            let acMatches = this.model.searchActionCenters(val);
            let memberMatches = this.model.searchMembers(val);
            const allResults = [...acMatches, ...memberMatches].slice(0, 8);

            if (allResults.length > 0) {
                results.style.display = 'block';
                results.innerHTML = allResults.map(res => `
                    <div class="suggestion-item" onclick="window.biomeInstance.handleSelection('${res.type}', '${res.id}')">
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

    handleSelection(type, id) {
        const results = document.getElementById('search-results');
        const input = document.getElementById('map-search');
        if (results) results.style.display = 'none';
        if (input) input.value = "";

        const target = this.model.getActionCenter(id);
        if (target) {
            this.map.flyTo([target.lat, target.lng], 13, { duration: 1.5 });
            this.model.api.notify(`TARGET_LOCKED: ${target.name} (${type})`, "success");
        }
    }
}
