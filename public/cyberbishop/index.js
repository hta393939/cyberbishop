/**
 * @file index.js
 */

class Misc {
    constructor() {
        this.baby = null;
    }

    async init() {
        const baby = new Baby();
        this.baby = baby;
    }
}

const misc = new Misc();
misc.init();



