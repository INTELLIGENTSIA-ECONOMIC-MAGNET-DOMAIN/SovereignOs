export const SecurityState = {
    failures: parseInt(localStorage.getItem('vpu_fail_count') || 0),
    loops: parseInt(localStorage.getItem('vpu_loop_count') || 0),
    isDeadlocked: false,

    handleFailure(kernel) {
        this.failures++;
        localStorage.setItem('vpu_fail_count', this.failures);

        if (this.failures >= 2) {
            this.enterDeadlock(kernel);
        }
    },

    enterDeadlock(kernel) {
        this.isDeadlocked = true;
        this.loops++;
        localStorage.setItem('vpu_loop_count', this.loops);

        // UI Transition to Deadlock Screen
        renderDeadlockScreen(kernel, 60);
    }
};