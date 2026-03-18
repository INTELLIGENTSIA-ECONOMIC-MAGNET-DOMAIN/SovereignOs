/**
 * mount-manager.js
 * Maps filesystem paths to drivers
 */

export class MountManager {

    constructor() {
        this.mounts = {};
    }

    mount(path, driver) {
        this.mounts[path] = driver;
    }

    unmount(path) {
        delete this.mounts[path];
    }

    resolve(path) {
        // Ensure path has a trailing slash for comparison if it's not the root
        const lookupPath = path === '/' ? '/' : path + '/';

        const mountPoints = Object.keys(this.mounts)
            .sort((a, b) => b.length - a.length);

        for (let mount of mountPoints) {
            // Ensure mount point is treated as a directory boundary
            const mountCheck = mount === '/' ? '/' : mount + '/';

            if (lookupPath.startsWith(mountCheck) || path === mount) {
                return {
                    driver: this.mounts[mount],
                    mount
                };
            }
        }

        throw new Error(`VFS_MOUNT_NOT_FOUND: ${path}`);
    }
}
