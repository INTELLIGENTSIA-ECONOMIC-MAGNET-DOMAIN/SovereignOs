/**
 * memory-driver.js
 */

export class MemoryDriver {

    constructor() {
        this.fs = {};
    }

    async read(path) {
        return this.fs[path];
    }

    async write(path, data) {
        this.fs[path] = data;
        return true;
    }

    async delete(path) {
        delete this.fs[path];
    }

    async list(path) {

        return Object.keys(this.fs)
            .filter(p => p.startsWith(path));

    }

    exists(path) {
        return this.fs.hasOwnProperty(path);
    }
}
