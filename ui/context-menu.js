
    export function setupContextMenu(kernel)  {
    // 1. Create the Menu Element
    const menu = document.createElement('div');
    menu.id = 'global-context-menu';
    menu.style.cssText = `
        position: fixed; z-index: 10000; background: #1a1a1a00; 
        border: 1px solid #333; border-radius: 8px; width: 230px;
        display: none; padding: 5px 0; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        font-family: 'Inter', sans-serif; font-size: 13px; color: #eee;
    `;
    document.body.appendChild(menu);

    // 2. Listen for Right Click
    window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const menu = document.getElementById('global-context-menu');
    
    // 1. Render content first so the browser knows the height
    this.renderMenuContent(menu, e.target);
    
    menu.style.display = 'block';
    menu.style.visibility = 'hidden'; // Hide momentarily to calculate size

    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const padding = 10; // Safety gap from screen edge

    let x = e.clientX;
    let y = e.clientY;

    // 2. Horizontal Boundary Check
    // If menu + expected submenu width (approx 240px) exceeds width, flip left
    const expectedTotalWidth = menuWidth + 240; 
    if (x + expectedTotalWidth > window.innerWidth) {
        x = x - menuWidth;
        menu.classList.add('reverse-x'); // Add class to flip submenus to the left
    } else {
        menu.classList.remove('reverse-x');
    }

    // 3. Vertical Boundary Check
    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - padding;
    }

    // 4. Top/Left Boundary Check (Prevent negative coordinates)
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.visibility = 'visible';

        // Dynamic Menu Content based on what was clicked
        this.renderMenuContent(menu, e.target);
    });

    // 3. Hide menu on click elsewhere
    window.addEventListener('click', () => {
        menu.style.display = 'none';
    });
}

// RENDER CONTEXT MENU ITEMS
export function renderMenuContent(kernel, menu, target) {
    const isWindow = target.closest('.os-window');
    const isIcon = target.closest('.desktop-icon');
    const isDockIcon = target.closest('.dock-item'); // New Dock Detector

    

    // --- DOCK ICON LOGIC ---
    let dockItems = [];
    if (isDockIcon) {
        const appId = isDockIcon.dataset.app; // Ensure your dock icons have data-app="terminal" etc.
        const appInstance = this.runningApps[appId];

        if (!appInstance) {
            // Case 1: App is not running
            dockItems.push({ label: '▶ Start Process', action: () => this.launchApp(appId) });
        } else {
            const winElement = document.getElementById(`win-${appId}`);
            if (winElement && winElement.classList.contains('minimized')) {
                // Case 2: App is running but minimized
                dockItems.push({ label: '📂 Restore Window', action: () => this.restoreApp(appId) });
            } else {
                // Case 3: App is already active/visible
                dockItems.push({ label: '👁 View Instance', action: () => this.focusApp(appId) });
            }
            dockItems.push({ 
                label: '❌ Terminate', 
                action: () => this.closeApp(appId, `win-${appId}`),
                className: 'danger-action' 
            });
        }
    }
    // 1. DATA STRUCTURE: Subsections & Items
    const menuData = [
        {
            section: "DOCK_OPERATIONS",
            visible: !!isDockIcon, // Only show if we clicked the dock
            items: dockItems
        },
        {
            section: "ACTIVE_CONTEXT",
            visible: isWindow || isIcon,
            items: [
                isWindow ? {
                    label: '🗔 Window Management',
                    children: [
                        { label: '➖ Minimize', action: () => isWindow.classList.add('minimized') },
                        { label: '❌ Close Enclave', action: () => {
                            const appId = isWindow.id.replace('win-', '');
                            this.closeApp(appId, isWindow.id);
                        }}
                    ]
                } : null,
                isIcon ? {
                    label: '🚀 Object Actions',
                    children: [
                        { label: 'Run Process', action: () => isIcon.click() },
                        { label: 'Shred Shortcut', action: () => isIcon.remove() }
                    ]
                } : null
            ].filter(Boolean)
        },
        {
            section: "SYSTEM_TOOLS",
            items: [
                { 
                    label: '🐚 Terminal Shell', 
                    kbd: 'Alt+T',
                    children: [
                        { label: 'New Instance', action: () => this.launchApp('terminal') },
                        { label: 'Root Privileges', action: () => this.launchApp('terminal', {root:true}) }
                    ]
                },
                { label: '📊 Tactical CMD', action: () => this.launchApp('stc') },
            ]
        },

        {
        section: "WORKSPACE_LAYOUT",
        items: [
                        { 
                label: this.isTilingActive ? '🟢 Tiling: ACTIVE' : '⚪ Tiling: FLOATING', 
                kbd: 'Alt+G',
                action: () => {
                    this.isTilingActive = !this.isTilingActive;
                    if (this.isTilingActive) {
                        this.updateTilingGrid();
                    } else {
                        // Reset windows to floating state
                        const allWindows = document.querySelectorAll('.os-window');
                        
                        allWindows.forEach((win, idx) => {
                            win.style.transition = 'all 0.4s ease';
                            win.style.width = "clamp(320px, 65vw, 900px)";
                            win.style.height = "clamp(300px, 65vh, 720px)";
                            
                            // NEW: Reset floating window classes and z-indices
                            win.classList.remove('floating-extra');
                            win.style.zIndex = (100 + idx).toString();
                            win.dataset.hasBeenDragged = 'false';
                            
                            // Reset positions to natural cascade
                            const cascadeOffset = idx * 25;
                            win.style.left = `${85 + cascadeOffset}px`;
                            win.style.top = `${40 + cascadeOffset}px`;
                        });
                        
                        this.logSystemEvent("Layout: Floating Mode Restored", "info");
                    }
                }
            },
            {
                label: '📐 Layout Options',
                visible: this.isTilingActive,
                children: [
                    { label: 'Master-Stack (Default)', action: () => { this.updateTilingGrid(); } },
                    { label: 'Force Refresh Grid', action: () => this.updateTilingGrid() }
                ]
            }
        ]
    },
        {
            section: "VFS_OPERATIONS",
            items: [
                { label: '📁 Create New Folder', action: () => this.createFolder(), kbd: 'N' },
                { label: '🔡 Arrange Genesis Grid', action: () => this.arrangeIcons() }
            ]
        },
        {
            section: "WORKSPACE_CONFIG",
            items: [
                { label: '🖼️ Change Wallpaper', action: () => this.changeBackground() },
                { 
                    label: '⚙️ OS Preferences', 
                    children: [
                        { label: 'Toggle Scanlines', action: () => this.toggleScanlines() },
                        { label: 'Security Blur (Privacy)', action: () => this.toggleSecurityBlur() },
                        { label: 'Matrix FX Theme', action: () => this.setTheme('matrix') },
                        { label: 'Restore Sovereign Core', action: () => this.setTheme('sovereign') }
                    ]
                }
            ]
        },
        {
            section: "SECURITY_PROTOCOL",
            items: [
                { label: '🔒 Lock OS (Standby)', action: () => this.suspendSession(), kbd: 'Ctrl+L' },
                { label: '🧹 Close All Windows', action: () => this.closeAllWindows() }, // NEW ITEM
                { label: '🔄 Reboot Kernel', action: () => location.reload() },
                { 
                    label: '☢️ Shutdown Enclave', 
                    className: 'danger-action',
                    action: () => {
                        if(confirm("TERMINATE SESSION? 2025-12-26 Allotment data will be shredded.")) {
                            this.lockSystem();
                        }
                    }
                }
            ]
        }
    ];

    // 2. RECURSIVE HTML GENERATOR
    const generateHTML = (data) => {
        return data.map(sec => {
            if (sec.visible === false) return '';
            
            let html = `<div class="menu-section-label">${sec.section}</div>`;
            html += sec.items.map(item => {
                const hasChildren = item.children && item.children.length > 0;
                return `
                    <div class="menu-item ${hasChildren ? 'has-submenu' : ''} ${item.className || ''}" data-label="${item.label}">
                        <span class="m-label">${item.label}</span>
                        ${hasChildren ? '<span class="chevron">›</span>' : ''}
                        ${item.kbd ? `<kbd>${item.kbd}</kbd>` : ''}
                        ${hasChildren ? `<div class="vpu-submenu">${generateSubHTML(item.children)}</div>` : ''}
                    </div>`;
            }).join('');
            html += `<div class="menu-divider"></div>`;
            return html;
        }).join('');
    };

    const generateSubHTML = (subItems) => {
        return subItems.map(si => `
            <div class="menu-item" data-label="${si.label}">
                <span class="m-label">${si.label}</span>
            </div>
        `).join('');
    };

    menu.innerHTML = generateHTML(menuData);

    // 3. UNIVERSAL CLICK HANDLER
    // 3. UNIVERSAL CLICK HANDLER
menu.onclick = (e) => {
    const targetItem = e.target.closest('.menu-item');
    // Important: Don't close or fire if it's a parent of a submenu
    if (!targetItem || targetItem.classList.contains('has-submenu')) return;

    const label = targetItem.dataset.label;
    
    // Recursive search to find the action even if it's nested
    const findActionRecursive = (data) => {
        for (let sec of data) {
            // Check top level items
            for (let item of sec.items) {
                if (item.label === label) return item.action;
                // Check children (submenus)
                if (item.children) {
                    for (let child of item.children) {
                        if (child.label === label) return child.action;
                        // Optional: Add one more loop if you have sub-sub menus
                    }
                }
            }
        }
        return null;
    };

    const action = findActionRecursive(menuData);
    if (action) {
        action(); // Run the function
        menu.style.display = 'none'; // Close menu
    }
};
document.addEventListener('click', () => menu.style.display = 'none');
}