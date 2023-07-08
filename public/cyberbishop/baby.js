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

    async init(param) {
        param.canvas.width = param.width;
        param.canvas.height = param.height;

        const engine = new BABYLON.Engine(param.canvas, true);
        this.engine = engine;
        const scene = new BABYLON.Scene(engine);
        this.scene = scene;

        {
            const camera = new BABYLON.ArcRotateCamera(
                'camera1',
                scene,
            );
        }

        engine.runRenderLoop(() => {
            scene.render();
        });
    }

    async initPhy() {
        _log('initPhy called');
        let url = '../third_party/.snapshot.6.11.1/havok/HavokPhysics.wasm';
        const instance = await HavokPlugin(url);
        this.instance = instance;
        _log('initPhy leaves');
    }

/**
 * タイトルとデモ
 */
    async makeTitle() {

    }

/**
 * 設定画面
 */
    async makeSetting() {

    }

    async makeStage() {

    }

/**
 * ゲームオーバーやスコア
 */
    async makeEnd() {
        
    }


}


