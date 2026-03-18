/**
 * Thealcohesion Sovereign UI Controller
 * Managing the VPU Shell and User Experience
 */
const vpuUI = {
    dockPosition: 'left',

    init() {
        this.setupClock();
        this.setupContextMenu();
        this.renderDock();
        this.renderDesktopIcons(); // New addition
        console.log("Sovereign UI Initialized: Calm and Dignified.");
    },
    // 1. Ubuntu-aligned Top Bar Clock [cite: 151-152]
    setupClock() {
    setInterval(() => {
        const now = new Date();
        const clockEl = document.querySelector('.top-bar .clock');
        if (clockEl && typeof thealTimeApp !== 'undefined') {
            const h = now.getHours();
            const m = now.getMinutes().toString().padStart(2, '0');
            const thealH = thealTimeApp.convertToThealHour(h);
            clockEl.textContent = `Cycle Time: ${thealH}:${m}`;
        }
    }, 1000);
    },

    // 2. Custom Context Menu (Right-Click) logic
    setupContextMenu() {
        const menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.className = 'menu-container';
        menu.innerHTML = `
            <div class="menu-item" onclick="vpuUI.createFolder()">New Folder</div>
            <hr>
            <div class="menu-item" onclick="vpuUI.toggleDock()">Move Dock to Bottom/Left</div>
            <div class="menu-item">Display Settings</div>
        `;
        document.body.appendChild(menu);

        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            menu.style.display = 'block';
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;
        });

        document.addEventListener('click', () => menu.style.display = 'none');
    },

    // 3. Role-Based App Dock [cite: 156]
    renderDock() {
        const dock = document.getElementById('side-dock');
        const role = kernel.member ? kernel.member.role : 'GUEST';
        
        // Only show apps authorized for the member's specific role [cite: 156]
        const apps = this.getAuthorizedApps(role);
        
        dock.innerHTML = apps.map(app => `
            <div class="dock-icon" onclick="vpuUI.launchApp('${app.id}')" title="${app.name}">
                <div class="app-dot"></div>
                <img src="icons/${app.icon}.png" alt="${app.name}">
            </div>
        `).join('');
    },

    // 4. Windowed Internal Apps

    launchApp(appId) {
        const workspace = document.getElementById('workspace');
        const window = document.createElement('div');
        window.className = 'app-window';
        
        // Initial positioning so they don't all stack perfectly
        const offset = document.querySelectorAll('.app-window').length * 20;
        window.style.top = (100 + offset) + "px";
        window.style.left = (150 + offset) + "px";
        window.style.zIndex = ++this.zIndexCounter;

        let content = '';
        if (appId === 'governance') content = governanceApp.render();
        else if (appId === 'audit') content = auditApp.render();
        else if (appId === 'mediation') content = mediationApp.render();
        else if (appId === 'resource-pool') content = resourcePoolApp.render();
        else if (appId === 'values-council') content = valuesCouncilApp.render();
        else if (appId === 'time-manager') content = thealTimeApp.render();
        else if (appId === 'marketplace') {
        // Renders the App Center View
        const apps = vpuRegistry.getAppsForMember(kernel.member.role);
        content = `
            <div class="marketplace-grid">
                <h3>App Center (Registry)</h3>
                ${apps.map(a => `<div class="app-card">${a.name} <button onclick="vpuRegistry.activateModule('${a.id}')">Activate</button></div>`).join('')}
            </div>
        `; }
        window.innerHTML = `
            <div class="window-header">
                <span>Thealcohesion: ${appId.toUpperCase()}</span>
                <div class="window-controls">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
            </div>
            <div class="window-content">${content}</div>
        `;

        workspace.appendChild(window);
        
        // ACTIVATE DRAGGING
        this.makeDraggable(window);
    },
    // Helper to create a new folder on the workspace
    toggleDock() {
        const dock = document.getElementById('side-dock');
        const workspace = document.getElementById('workspace');
        if (this.dockPosition === 'left') {
            dock.style.width = '100%';
            dock.style.height = '60px';
            dock.style.bottom = '0';
            dock.style.left = '0';
            dock.style.top = 'auto';
            dock.style.flexDirection = 'row';
            workspace.style.marginLeft = '0';
            this.dockPosition = 'bottom';
        } else {
            dock.style.width = '60px';
            dock.style.height = 'calc(100% - 30px)';
            dock.style.top = '30px';
            dock.style.flexDirection = 'column';
            workspace.style.marginLeft = '60px';
            this.dockPosition = 'left';
        }
    },
    // Helper to get apps based on role
    getAuthorizedApps(role) {
    const registry = [
        { id: 'governance', name: 'Governance', icon: 'governance', roles: ['MEMBER', 'STEWARD', 'ADMIN'] },
        { id: 'storage', name: 'My Storage', icon: 'storage', roles: ['MEMBER', 'STEWARD', 'ADMIN'] }
    ];
    return registry.filter(app => app.roles.includes(role));
    },

    // 5. Emergency Lockdown Screen
    renderLockdownScreen() {
    const shield = document.createElement('div');
    shield.id = 'sovereign-shield';
    shield.innerHTML = `
        <div class="lockdown-message">
            <h1>SYSTEM LOCKED</h1>
            <p>Thealcohesion Core has entered Emergency Protocol.</p>
            <p>Contact the Values Council or a System Steward for details.</p>
            <div class="shield-icon">🛡️</div>
        </div>
    `;
    document.body.appendChild(shield);
    },

    // 6. Refresh App Content
    refreshApp(appId) {
    // Finds the open window for this app and re-renders the content
    const windows = document.querySelectorAll('.app-window');
    windows.forEach(win => {
        if (win.innerHTML.includes(`Thealcohesion: ${appId.toUpperCase()}`)) {
            const contentArea = win.querySelector('.window-content');
            if (appId === 'mediation') contentArea.innerHTML = mediationApp.render();
            if (appId === 'resource-pool') contentArea.innerHTML = resourcePoolApp.render();
            if (appId === 'values-council') contentArea.innerHTML = valuesCouncilApp.render();
            // Add other apps here as needed
        }
    });
    },

    // 7. Desktop Icons (Static for MVP)
    renderDesktopIcons() {
        const workspace = document.getElementById('workspace');
        // Clear workspace but keep existing windows
        const existingIcons = workspace.querySelectorAll('.desktop-icon');
        existingIcons.forEach(icon => icon.remove());

        const defaultIcons = [
            { id: 'storage', name: 'My Files', icon: 'folder' },
            { id: 'governance', name: 'Mandates', icon: 'scroll' },
            { id: 'resource-pool', name: 'Treasury', icon: 'bank' },
            { id: 'time-manager', name: 'Temporal Engine', icon: 'calendar' }
        ];

        defaultIcons.forEach(data => {
            const icon = document.createElement('div');
            icon.className = 'desktop-icon';
            icon.innerHTML = `
                <div class="icon-visual">${this.getIconSVG(data.icon)}</div>
                <span class="icon-label">${data.name}</span>
            `;
            icon.onclick = () => this.launchApp(data.id);
            workspace.appendChild(icon);
        });
    },

    getIconSVG(type) {
        // Simple placeholder SVGs for a clean Ubuntu look
        const icons = {
            folder: `<svg viewBox="0 0 24 24" width="48" height="48" fill="#e95420"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`,
            scroll: `<svg viewBox="0 0 24 24" width="48" height="48" fill="#e95420"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
            bank: `<svg viewBox="0 0 24 24" width="48" height="48" fill="#e95420"><path d="M11.5 1L2 6v2h19V6L11.5 1zM2 22h19v-3H2v3zm18.5-13H17v8h3.5V9zM15 9h-2.5v8H15V9zm-4 0H8.5v8H11V9zM7 9H3.5v8H7V9z"/></svg>`,
            calendar: `<svg viewBox="0 0 24 24" width="48" height="48" fill="#e95420"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>`
        };
        return icons[type] || '';
    },

    // 8. Draggable Windows

    activeWindow: null,
    zIndexCounter: 100,

    makeDraggable(windowElement) {
        const header = windowElement.querySelector('.window-header');
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        header.onmousedown = (e) => {
            // Bring to front on click
            this.zIndexCounter++;
            windowElement.style.zIndex = this.zIndexCounter;
            
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        };

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            windowElement.style.top = (windowElement.offsetTop - pos2) + "px";
            windowElement.style.left = (windowElement.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }
};