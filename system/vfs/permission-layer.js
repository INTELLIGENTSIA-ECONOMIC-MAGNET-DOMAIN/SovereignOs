export class PermissionLayer {
    constructor(kernel) {
        this.kernel = kernel;
    }

    checkRead(path, currentUserId) {
        // 1. Everyone can read System and Temp
        if (path.startsWith("/system") || path.startsWith("/temp")) {
            return true;
        }

        // 2. Cross-User Privacy: Users can only read their own folder
        if (path.startsWith("/users/")) {
            const pathParts = path.split('/'); 
            const targetUser = pathParts[2]; // e.g., "ARCHANTI" from /users/ARCHANTI/...
            
            if (targetUser !== currentUserId && currentUserId !== 'ROOT') {
                throw new Error("VFS_PRIVACY_VIOLATION: Access to external user enclave denied.");
            }
        }

        return true;
    }

    checkWrite(path, currentUserId) {
        // 1. Strict System Protection
        if (path.startsWith("/system")) {
            throw new Error("VFS_SECURITY_FAULT: System partition is read-only.");
        }

        // 2. User Enclave Ownership
        if (path.startsWith("/users/")) {
            const targetUser = path.split('/')[2];
            if (targetUser !== currentUserId && currentUserId !== 'ROOT') {
                throw new Error("VFS_SECURITY_FAULT: Cannot write to external user enclave.");
            }
        }

        return true;
    }
}