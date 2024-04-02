/**
 * @file car.mjs
 */

class Misc {
    constructor() {
        this.baby = null;
    }

    async init() {
        const param = {
            width: 960, // 論理ピクセル幅
            height: 540,
        };
        param.canvas = document.getElementById('maincanvas');
        await this.firstInit(param);

        await new Promise((resolve, reject) => {
            effekseer.initRuntime(`../third_party/effekseer/effekseer.wasm`, () => {
                resolve();
            });
        });
        {
            const context = effekseer.createContext();
            this.initEffek(context);
        }

        const _onResize = () => {
            const el = document.documentElement;
            let w = el.clientWidth;
            let h = el.clientHeight;
            if (h / w >= 9 / 16) {
                h = w * 9 / 16;
            } else {
                w = h * 16 / 9;
            }
            el.style.setProperty('--width', `${w}px`);
            el.style.setProperty('--height', `${h}px`);
        };

        {
            window.addEventListener('resize', () => {
                _onResize();
            });
            _onResize();
        }

        await this.secondInit(this.scene);
    }

    initEffek(context) {
        console.log('initEffek', context);
    }

    firstInit(param) {
        console.log('firstInit', param);

        const engine = new BABYLON.Engine(param.canvas);
        const scene = new BABYLON.Scene(engine);
        this.scene = scene;
        scene.useRightHandedSystem = true;

        const camera = new BABYLON.ArcRotateCamera('camera1',
            0, 0, 2,
            new BABYLON.Vector3(0, 0, 0),
            scene);
        camera.setPosition(new BABYLON.Vector3(2, 5, 20));
        camera.attachControl();

        {
            const light = new BABYLON.PointLight('light1',
                new BABYLON.Vector3(1, 5, 4),
                scene);
        }

        engine.runRenderLoop(() => {
            scene.render();
        });
    }

    async secondInit(scene) {
        console.log('secondInit');
        const havokInstance = await HavokPhysics();
        const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);

        this.makeCar(scene);
        this.makeMap(scene);
    }

    makeCar(scene) {
        console.log('makeCar');
        { // body
            const bodyMesh = BABYLON.MeshBuilder.CreateBox('body',
                {},
                scene);
            const param = {
                mass: 10,
                friction: 1,
            };
            const pa = new BABYLON.PhysicsAggregate('pabody',
                BABYLON.PhysicsShapeType.CONVEX_HULL,
                param);
            this.pa = pa;
        }
        for (let i = 0; i < 4; ++i) { // tire
            const param = {
                x: (i & 1) * 2 - 1,
                y: 0,
                z: Math.floor(i / 2) * 2 - 1,
            };
            const pts = [];
            const div = 16;
            for (let j = 0; j < div; ++j) {
                const ang = j * Math.PI * 2 / div;
                pts.push(new BABYLON.Vector3(Math.cos(ang), Math.sin(ang), 0));
            }
            const width = 0.2;
            const paths = [
                [width / 2, 0, 0],
                [-width / 2, 0, 0],
            ];
            const m = BABYLON.MeshBuilder.ExtrudeShapeCustom(`tire${i}`,
                {
                    shape: pts.map(v => new BABYLON.Vector3(v)),
                    closeShape: true,
                    path: paths.map(v => new BABYLON.Vector3(v)),
                },
                scene);
            m.position = new BABYLON.Vector3(param.x, param.y, param.z);
            const pa = new BABYLON.PhysicsAggregate(`tire${i}`,
                {
                    mass: 2,
                    friction: 1,
                },
                scene);

            const xAxis = new BABYLON.Vector3(1, 0, 0);
            const hinge = new BABYLON.HingeConstraint(
                BABYLON.Vector3.Zero(), m.position,
                xAxis, xAxis,
                scene,
            );
            pa.body.addConstraints(this.pa.body, hinge);
        }

    }

    makeMap(scene) {
        console.log('makeMap');
        {
            const ground = BABYLON.MeshBuilder.CreateGround('ground1',
                { width: 100, height: 100 },
                scene);
            const pa = new BABYLON.PhysicsAggregate('paground1',
                BABYLON.PhysicsShapeType.BOX,
                { mass: 0, friction: 1, restitution: 0 },
                scene);
        }
    }

}

const misc = new Misc();
misc.init();

