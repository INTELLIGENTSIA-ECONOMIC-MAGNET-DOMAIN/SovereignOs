


export function toggleScanlines(kernel) {
    let scanlineOverlay = document.getElementById('vpu-scanlines');
    
    if (!scanlineOverlay) {
        scanlineOverlay = document.createElement('div');
        scanlineOverlay.id = 'vpu-scanlines';
        // Ensure it sits behind UI but above wallpaper
        scanlineOverlay.style.cssText = `
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 1;
            background: linear-gradient(
                rgba(18, 16, 16, 0) 50%, 
                rgba(0, 0, 0, 0.1) 50%
            ), linear-gradient(
                90deg, 
                rgba(255, 0, 0, 0.02), 
                rgba(0, 255, 0, 0.01), 
                rgba(0, 0, 255, 0.02)
            );
            background-size: 100% 4px, 3px 100%;
            opacity: 0.3;
        `;
        document.body.appendChild(scanlineOverlay);
        this.logEvent('UI', 'CRT Scanline Emulation: ENABLED');
    } else {
        scanlineOverlay.remove();
        this.logEvent('UI', 'CRT Scanline Emulation: DISABLED');
    }
}

export function toggleSecurityBlur(kernel) {
    const root = document.getElementById('sovereign-shell');
    const isBlurred = root.style.filter.includes('blur');
    
    if (!isBlurred) {
        root.style.filter = 'blur(10px) grayscale(0.5)';
        root.style.transition = 'filter 0.5s ease';
        this.logEvent('SEC', 'Privacy Cloak: ACTIVE');
    } else {
        root.style.filter = 'none';
        this.logEvent('SEC', 'Privacy Cloak: DEACTIVATED');
    }
}

export function setTheme(kernel, theme) {
    const root = document.documentElement;
    
    if (themeName === 'matrix') {
        root.style.setProperty('--primary-accent', '#00ff41');
        root.style.setProperty('--bg-color', '#000500');
        root.style.setProperty('--window-border', 'rgba(0, 255, 65, 0.3)');
        
        // If you have a Matrix background script, start it here
        this.startMatrixRain(); 
        this.logEvent('SYS', 'Visual Protocol: MATRIX_FX loaded.');
    } else {
        // Reset to Thealcohesion Purple
        root.style.setProperty('--primary-accent', '#a445ff');
        this.logEvent('SYS', 'Visual Protocol: SOVEREIGN_CORE restored.');
    }
}