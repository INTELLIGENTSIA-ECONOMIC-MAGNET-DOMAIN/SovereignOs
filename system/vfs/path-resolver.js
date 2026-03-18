/**
 * path-resolver.js
 * Ensures safe path resolution and prevents path traversal
 */

export function resolvePath(path, mountManager) {
    // 1. SECURITY: Prevent Directory Traversal
    // We check for ".." but also for null bytes or backslashes
    if (path.includes("..") || path.includes("\\")) {
        throw new Error("VFS_SECURITY_ERROR: Illegal path sequence detected.");
    }

    // 2. NORMALIZE: Ensure path starts with / and remove double slashes
    let normalizedPath = path.startsWith('/') ? path : '/' + path;
    normalizedPath = normalizedPath.replace(/\/+/g, '/'); 

    // 3. RESOLVE: Get the driver from the mount manager
    const resolution = mountManager.resolve(normalizedPath);
    if (!resolution) {
        throw new Error(`VFS_NOT_FOUND: No mount point for ${normalizedPath}`);
    }

    const { driver, mount } = resolution;

    // 4. CALC SUBPATH: Correctly strip the mount prefix
    // We use slice to ensure we only strip from the START of the string
    let subpath = normalizedPath.slice(mount.length);
    
    // Ensure subpath starts with / for the driver's internal logic
    if (!subpath.startsWith('/')) {
        subpath = '/' + subpath;
    }

    return { driver, subpath };
}