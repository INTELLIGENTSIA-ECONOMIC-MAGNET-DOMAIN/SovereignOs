export function bootShell(kernel) {
    const dock = document.getElementById('side-dock');
    if (!dock) return;
    dock.innerHTML = ''; 
    // --- ADDED: TASK VIEW BUTTON (Far Left) ---
    const taskViewBtn = document.createElement('div');
    taskViewBtn.className = 'dock-item task-view-trigger';
    taskViewBtn.title = "View Open Apps";
    taskViewBtn.innerHTML = `<span><svg viewBox="0 0 24 24" width="20" height="20" stroke="#a445ff" fill="none" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></span>`;
    taskViewBtn.onclick = () => this.toggleTaskOverview();
    dock.appendChild(taskViewBtn);
    // --- END ADDITION ---
    this.pinnedApps.forEach((appId) => {
        const app = registry.find(a => a.id === appId);
        if (!app) return;

        const dItem = document.createElement('div');
        const isRunning = this.runningApps.has(appId);
        dItem.className = `dock-item ${isRunning ? 'running' : ''}`;
        dItem.title = app.name;
        dItem.innerHTML = `<span>${app.icon}</span>`;
        
        dItem.onclick = () => {
            // 1. Handle the Menu Overlay (Close it if it's open)
            const overlay = document.getElementById('app-menu-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            }

            // 2. Handle the App Logic
            if (isRunning) {
                // This calls focusWindow which now includes display: block
                this.focusWindow(`win-${appId}`);
            } else {
                this.launchApp(appId);
            }
        };
        
        dock.appendChild(dItem);
    });

    // App Menu Dot Trigger
    const menuBtn = document.createElement('div');
    menuBtn.className = 'dock-bottom-trigger';
    for(let i = 0; i < 9; i++) {
        const dot = document.createElement('div');
        dot.className = 'menu-dot';
        menuBtn.appendChild(dot);
    }
    menuBtn.onclick = () => this.openAppMenu();
    dock.appendChild(menuBtn);
}