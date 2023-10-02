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
/**
 * 
 */
        this.effekseerContext = null;

/**
 * ゲーム中の基本カメラ
 */
        this.mainCamera = null;
/**
 * 右上?
 */
        this.radarCamera = null;
/**
 * 右上?
 */
        this.mapCamera = null;
    }

    async init(param) {
        _log('init');

        param.canvas.width = param.width;
        param.canvas.height = param.height;

        const engine = new BABYLON.Engine(param.canvas, true);
        this.engine = engine;

        const scene = new BABYLON.Scene(engine);
        this.scene = scene;

        {
            scene.useRightHandedSystem = true;
        }
        {
            const camera = new BABYLON.ArcRotateCamera(
                'camera1',
                0, 0, 10, new BABYLON.Vector3(0, 1, 0),
                scene,
            );
            this.mainCamera = camera;
            {
                camera.position = new BABYLON.Vector3(2, 2, 10);

                camera.attachControl();
            }
        }
        {
            const axes = new BABYLON.Debug.AxesViewer(scene, 10);
            {
                const mesh = BABYLON.CreateSphere(`blue1`, {
                    diameter: 2,
                }, scene);
                mesh.setAbsolutePosition(new BABYLON.Vector3(0, 0, 12));
                const mtl = new BABYLON.StandardMaterial(`blue1`, scene);
                mtl.emissiveColor = BABYLON.Color3.Blue();
                mesh.material = mtl;
            }
            {
                const mesh = BABYLON.CreateSphere(`red1`, {
                    diameter: 2,
                }, scene);
                mesh.setAbsolutePosition(new BABYLON.Vector3(12, 0, 0));
                const mtl = new BABYLON.StandardMaterial(`red1`, scene);
                mtl.emissiveColor = BABYLON.Color3.Red();
                mesh.material = mtl;
            }
            {
                const mesh = BABYLON.CreateSphere(`red1`, {
                    diameter: 2,
                }, scene);
                mesh.setAbsolutePosition(new BABYLON.Vector3(0, 12, 0));
                const mtl = new BABYLON.StandardMaterial(`green1`, scene);
                mtl.emissiveColor = BABYLON.Color3.Green();
                mesh.material = mtl;
            }
        }

        {
            const camera = new BABYLON.ArcRotateCamera(
                `radarcamera1`,
                0, 0, 10, BABYLON.Vector3.Zero(),
                scene,
            );
            this.radarCamera = camera;
        }
        {
            const camera = new BABYLON.ArcRotateCamera(
                `mapcamera1`,
                0, 0, 10, BABYLON.Vector3.Zero(),
                scene,
            );
            this.mapCamera = camera;
        }


        engine.runRenderLoop(() => {
            scene.render();
        });
    }

    async initPhy(scene) {
        _log('initPhy called');
        let url = '../third_party/.snapshot.6.11.1/havok/HavokPhysics.wasm';
        const instance = await HavokPhysics({ locateFile: () => url });
        const plugin = new BABYLON.HavokPlugin(true, instance);
        this.instance = instance;
        this.plugin = plugin;

        scene.enablePhysics(
            new BABYLON.Vector3(0, -9.8, 0),
            plugin,
        );

        _log('initPhy leaves');
    }

/**
 * https://playground.babylonjs.com/#8W9NWY#2
 * @param {*} context 
 */
    async initEffek(context) {
        const scene = this.scene;
        this.effekseerContext = context;


        const gl = scene.getEngine()._gl;
        context.init(gl);

        const effects = {};
        effects['Laser01'] = context.loadEffect(
            `../third_party/effekseer/Resources/Laser01.efk`,
            1.0,
            () => {
                console.log('done');
            },
            (m, url) => {
                console.log(m + ' ' + url);
            }
        );

        scene.onBeforeRenderObservable.add(() => {
            context.update();
        });
        scene.onAfterRenderObservable.add(() => {
            const camera = this.mainCamera;
            context.setProjectionMatrix(
                camera.getProjectionMatrix()._m,
            );
            context.setCameraMatrix(
                camera.getViewMatrix()._m,
            );
            context.draw();
        });
        setTimeout(() => {
            context.play(effects['Laser01'], 0, 0, 0);
        }, 1000);
    }

    async secondInit() {
        const scene = this.scene;

        await this.initPhy(scene);

        this.makeStage(scene);
    }

/**
 * タイトルとデモ
 * 未実装
 */
    async makeTitle() {

    }

/**
 * 設定画面
 * 未実装
 */
    async makeSetting() {

    }

/**
 * ステージを生成する
 * @param {BABYLON.Scene} scene 
 */
    async makeStage(scene) {
        _log('makeStage');
        {
            const dir = new BABYLON.Vector3(0, 1, 0);
            const light = new BABYLON.HemisphericLight(
                'light1',
                dir,
                scene,
            );
            /*
            const shadowGenerator = new BABYLON.ShadowGenerator(

            );
            */
        }
        this.makeWalls(scene);

        _log('makeStage');
    }

/**
 * ゲームオーバーやスコア
 */
    async makeEnd() {
        
    }

/**
 * 
 * @param {BABYLON.Scene}
 */
    makeWalls(scene) {
        let size1 = 1;
        let fieldRadius = 1000; // 1km
        { // フィールド境界としての一番下
            let groundSize = (fieldRadius + 10) * 2;
            const ground = BABYLON.MeshBuilder.CreateGround(
                'ground1',
                {
                    width: groundSize,
                    height: groundSize,
                },
                scene,
            );
            ground.position = new BABYLON.Vector3(0, -10, 0);

            const pa = new BABYLON.PhysicsAggregate(
                ground,
                BABYLON.PhysicsShapeType.BOX,
                { mass: 0 },
                scene,
            );
        }
        {
            for (let i = 0; i < 4; ++i) {
                let rr = fieldRadius + size1 * 0.5;
                let x = 0;
                let y = size1 * 0.5;
                let z = 0;
                switch(i) {
                case 0:
                    z = -rr;
                    break;
                case 1:
                    x = rr;
                    break;
                case 2:
                    z = rr;
                    break;
                case 3:
                    x = -rr;
                    break;                   
                }

                const mesh = BABYLON.MeshBuilder.CreateBox(
                    `wall${i}`,
                    {
                        width: size1,
                        height: size1,
                        depth: size1,
                    },
                    scene,
                );
                mesh.position = new BABYLON.Vector3(x, y, z);
                const mtl = new BABYLON.StandardMaterial(`wall${i}`, scene);
                mtl.diffuseColor = BABYLON.Color3.Red();
                mesh.material = mtl;
                const pa = new BABYLON.PhysicsAggregate(
                    mesh,
                    BABYLON.PhysicsShapeType.BOX,
                    { mass: 0, restitution: 1, },
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


