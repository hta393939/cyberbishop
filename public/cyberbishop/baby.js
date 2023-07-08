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
        engine.useRightHandedSystem = true;
        const scene = new BABYLON.Scene(engine);
        this.scene = scene;

        { // 未実装 Now Loading ...

        }
        {
            let beta = Math.PI * 1 / 4;
            let radius = 10;
            const camera = new BABYLON.ArcRotateCamera(
                'camera1',
                0, beta, radius, new BABYLON.Vector3(0, 1, 0),
                scene,
            );
            {
                camera.attachControl();
            }
        }

        engine.runRenderLoop(() => {
            scene.render();
        });
    }

    async initPhy(scene) {
        _log('initPhy called');
        let url = '../third_party/.snapshot.6.11.1/havok/HavokPhysics.wasm';
        const instance = await HavokPhysics();
        const plugin = new BABYLON.HavokPlugin(true, instance);
        this.instance = instance;
        this.plugin = plugin;

        scene.enablePhysics(
            new BABYLON.Vector3(0, -9.8, 0),
            plugin,
        );

        _log('initPhy leaves');
    }

    async secondInit() {
        const scene = this.scene;

        await this.initPhy(scene);

        this.makeStage(scene);
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

    async makeStage(scene) {
        {
            const dir = new BABYLON.Vector3(0, 1, 0);
            const light = new BABYLON.HemisphericLight(
                'light1',
                dir,
                scene,
            )
        }
        this.makeWalls(scene);
    }

/**
 * ゲームオーバーやスコア
 */
    async makeEnd() {
        
    }

/**
 * 
 */
    makeWalls(scene) {
        let size1 = 1;
        {
            let groundSize = 100;
            const ground = BABYLON.MeshBuilder.CreateGround(
                'ground1',
                {
                    width: groundSize,
                    height: groundSize,
                },
                scene,
            );
            ground.position = new BABYLON.Vector3(0, -10, 0);
        }
        {
            for (let i = 0; i < 4; ++i) {
                const wall = BABYLON.MeshBuilder.CreateBox(
                    `wall${i}`,
                    {
                        width: size1,
                        height: size1,
                        depth: size1,
                    },
                    scene,
                );
            }
        }
    }

    makeBreaks() {

    }

    resetBreaks() {

    }

}


