/**
 * @file baby.js
 */

const _log = (...args) => {
    console.log(...args);
};

class Baby {
    constructor() {
        this.engine = null;
        this.scene = null;
    }

    async init() {

        const engine = new BABYLON.Engine();
        this.engine = engine;
        const scene = engine.createScene();
        this.scene = scene;
    }

    async makeTitle() {

    }

    async makeSetting() {

    }

    async makeStage() {

    }

    async makeEnd() {
        
    }


}


