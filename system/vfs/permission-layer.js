export class PermissionLayer {
    constructor(kernel) {
        this.kernel = kernel;
    }

    /**
     * NORMALIZE: Helper to ensure case-insensitive comparison
     */
    _isOwner(path, currentUserId) {
        if (!currentUserId) return false;
        if (currentUserId === 'ROOT') return true;

        const pathParts = path.split('/');
        // parts[0] is empty, parts[1] is 'users', parts[2] is the Username
        const targetUser = pathParts[2] ? pathParts[2].toUpperCase() : null;
        const activeUser = currentUserId.toUpperCase();

        return targetUser === activeUser;
    }

    checkRead(path, currentUserId) {
        // 1. System and Temp are open for reading
        if (path.startsWith("/system") || path.startsWith("/temp")) {
            return true;
        }

        // 2. Cross-User Privacy
        if (path.startsWith("/users/")) {
            if (!this._isOwner(path, currentUserId)) {
                throw new Error("VFS_PRIVACY_VIOLATION: Access to external user enclave denied.");
            }
        }

        return true;
    }

    checkWrite(path, currentUserId) {
    // 1. Allow ROOT to bypass all checks (Essential for Provisioning)
    if (currentUserId === 'ROOT') return true;

    // 2. Strict System Protection
    if (path.startsWith("/system")) {
        throw new Error("VFS_SECURITY_FAULT: System partition is read-only.");
    }

    // 3. User Enclave Ownership
    if (path.startsWith("/users/")) {
        const pathParts = path.split('/');
        const targetUser = pathParts[2] ? pathParts[2].toUpperCase() : null;
        const activeUser = currentUserId ? currentUserId.toUpperCase() : null;

        if (targetUser !== activeUser) {
            throw new Error(`VFS_SECURITY_FAULT: Cannot write to external enclave. (Target: ${targetUser} / Active: ${activeUser})`);
        }
    }

    return true;
}
}