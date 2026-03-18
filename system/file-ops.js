
export const FileOps = {
    /**
     * SECURE FILE BRIDGE
     * This allows any app to request a decrypted file content
     */
    async openSecureFile(path) {
        // 1. SAFETY CHECK: If no key, don't even try the VFS
        if (!this.sessionKey) {
            console.error("Kernel: Access Denied. No Session Key found.");
            alert("Security Error: System Enclave is locked.");
            return;
        }

        try {
            console.log(`Kernel: Decrypting ${path}...`);
            
            // 2. USE THE IMPORTED VFS:
            // Ensure 'SovereignVFS' is correctly imported at the top of kernel.js
            const content = await SovereignVFS.read(path, this.sessionKey);
            
            if (content) {
                // SUCCESS: Data is now plain text
                alert(`[SECURE_VIEW] - ${path}\n\n${content}`);
            } else {
                console.warn("Kernel: File is empty or does not exist.");
            }
        } catch (e) {
            // This usually triggers if the password/key is wrong
            console.error("Decryption failed. Key mismatch or Corrupted Block.", e);
            alert("VFS Error: Decryption failed. Possible data corruption.");
        }

        console.log(`Kernel: Requesting secure access to ${path}`);
    // Logic to find the 'files' app and tell it to open this specific path
    const event = new CustomEvent('launchApp', { detail: { appId: 'files', filePath: path } });
    window.dispatchEvent(event);
    },

//creates folder
createFolder(kernel) {
    const folderId = `folder-${Date.now()}`;
    const folderName = prompt("Enter Folder Name:", "New_Registry") || "New_Folder";
    this.logEvent('FS', 'Creating new directory...');
    // Add logic to push a new icon to your workspace grid
    
    // 1. Create the Desktop Icon Element
    const icon = document.createElement('div');
    icon.className = 'desktop-icon';
    icon.id = `icon-${folderId}`;
    icon.innerHTML = `
        <span class="icon-glyph">📁</span>
        <span class="icon-label">${folderName}</span>
    `;

    // 2. Add Open Behavior (Double Click)
    icon.ondblclick = () => this.openFolder(folderId, folderName);

    // 3. Append to Workspace
    const workspace = document.getElementById('workspace');
    if (workspace) {
        workspace.appendChild(icon);
        this.logEvent('FS', `Directory created: ${folderName} [${folderId}]`);
    }
},

openFolder(id, name) {
    // Check if window already exists
    if (document.getElementById(`win-${id}`)) return;

    // Use your existing launchApp or window creation logic
    const folderWindow = this.createWindow(id, `Index: /${name}`, `
        <div class="folder-content">
            <p style="color: #00ff4133; font-size: 11px;">[ DIRECTORY_EMPTY ]</p>
            </div>
    `);
}

}
