export class QuotaManager {

    constructor(limit) {

        this.limit = limit;
        this.used = 0;

    }

    update(size) {

        this.used += size;

        if (this.used > this.limit) {

            throw new Error("DISK_QUOTA_EXCEEDED");

        }

    }

}
