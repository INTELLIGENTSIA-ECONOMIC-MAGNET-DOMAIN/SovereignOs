/**
 * SOVEREIGN OS - THEME & RESPONSIVE ENGINE
 */
export const ThemeEngine = {
    init(kernel) {
        window.addEventListener('resize', () => this.handleResponsiveLayout(kernel));
        // Run once on init
        this.handleResponsiveLayout(kernel);
    },

    handleResponsiveLayout(kernel) {
        const isMobile = window.innerWidth <= 768;
        kernel.isMobileMode = isMobile;

        if (isMobile) {
            document.querySelectorAll('.os-window').forEach(win => {
                // Force "Sovereign Fullscreen" on mobile terminals
                win.style.top = '0';
                win.style.left = '0';
                win.style.width = '100vw';
                win.style.height = 'calc(100vh - 40px)'; // Account for top-bar
                win.style.borderRadius = '0';
                win.style.zIndex = '1000';
            });
            
            // Add a class to body for CSS-based mobile adjustments
            document.body.classList.add('mobile-mode');
        } else {
            document.body.classList.remove('mobile-mode');
            // If exiting mobile, you might want to trigger a re-tiling
            if (kernel.isTilingActive) kernel.updateTilingGrid();
        }
    }
};