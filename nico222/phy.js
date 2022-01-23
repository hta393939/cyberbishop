/**
 * @file phy.js
 */

(function(global_) {

'use strict';

const pad = (v, n = 2) => {
    return String(v).padStart(n, '0');
};

const f_ = () => {
    const ss = new Error().stack.split('\n');
    return ss[2+1].trim();
};

let log = (...args) => {
    console.log(`%cDraw`, `color:#ff8000;`, f_(), ...args);
};
//log = () => {};

const tstr = () => {
    return new Date().toLocaleTimeString();
};

/**
 * 定数
 * @default 4
 */
const DISABLE_DEACTIVATION = 4;

/**
 * ammo v3 を返す
 * @param {number} x 
 * @param {number} y 
 * @param {number} z 
 * @returns {Ammo.btVector3}
 */
const bt3 = (x, y, z) => {
    return new Ammo.btVector3(x, y, z);
};
/**
 * q ammo
 * @param {number} x 
 * @param {number} y 
 * @param {number} z 
 * @param {number} w 
 * @returns {Ammo.btQuaternion}
 */
const btq = (x, y, z, w) => {
    return new Ammo.btQuaternion(x, y, z, w);
};

/**
 * vector3 ammo -> three
 * @param {Ammo.btVector3} a 
 * @returns {THREE.Vector3}
 */
const bt2p = (a) => {
    return new THREE.Vector3(a.x(), a.y(), a.z());
};
/**
 * quaternion ammo -> three
 * @param {Ammo.btQuaternion} a 
 * @returns {THREE.Quaternion}
 */
const bt2q = (a) => {
    return new THREE.Quaternion(a.x(), a.y(), a.z(), a.w());
};


/**
 * 車一つ
 */
class Car {
/**
 * コンストラクタ
 */
    constructor() {
        this.name = this.constructor.name;

        this.syncList = [];
/**
 * @type {THREE.Mesh}
 */
        this.chassisMesh = null;
        this.tempTrans = new Ammo.btTransform();

/**
 * シャーシの幅
 * @default 1.8
 */
        this.chassisWidth = 1.8;
/**
 * Y
 * @default 0.6
 */
        this.chassisHeight = 0.6;
        this.chassisLength = 4;
/**
 * シャーシの奥行長さ
 * @default 4
 */
        this.chassisDepth = 4;
        this.massVehicle = 800;

/**
 * 後輪軸Z
 * @default -1
 */
        this.wheelAxisPositionBack = -1;
/**
 * 後輪半径
 * @default 0.4
 */
        this.wheelRadiusBack = 0.4;
/**
 * 後輪幅
 * @default 0.3
 */
        this.wheelWidthBack = 0.3;
        this.wheelHalfTrackBack = 1;
/**
 * 後輪軸高さY
 * @default 0.3
 */
        this.wheelAxisHeightBack = 0.3;
/**
 * 前輪Z軸
 * @default 1.7
 */
        this.wheelAxisFrontPosition = 1.7;
        this.wheelHalfTrackFront = 1;
        this.wheelAxisHeightFront = 0.3;
/**
 * 前輪半径
 * @default 0.35
 */
        this.wheelRadiusFront = 0.35;
/**
 * 前輪幅
 * @default 0.2
 */
        this.wheelWidthFront = 0.2;

        this.friction = 1000;
        this.suspensionStiffness = 20.0;
        this.suspensionDamping = 2.3;
        this.suspensionCompression = 4.4;
        this.suspensionRestLength = 0.6;
        this.rollInfluence = 0.2;

        this.steeringIncrement = 0.04;
        this.steeringClamp = 0.5;
        this.maxEngineForce = 2000;
        this.maxBreakingForce = 100;
    }

/**
 * Car インスタンスを初期化する
 * @param {Ammo.btDynamicPhysicsWorld}
 */
    init(inworld) {
        console.log(this.name, 'init called');

        this.world = inworld;

// 
        const pos = new THREE.Vector3(0, 4, -20 + 10);

        this.geometry = new Ammo.btBoxShape();
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(bt3(pos.x, pos.y, pos.z));
        transform.setRotation(btq(0, 0, 0, 1));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const localInertia = bt3(0, 0, 0);
        this.geometry.calculateLocalInertia(this.massVehicle, localInertia);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(
            this.massVehicle, motionState, this.geometry, localInertia);
/**
 * シャーシーのボディ
 */
        const body = new Ammo.btRigidBody(rbInfo);
        body.setActivationState(DISABLE_DEACTIVATION);
        this.world.addRigidBody(body);
        const chassisMesh = this.createChassisMesh(
            this.chassisWidth,
            this.chassisHeight,
            this.chassisDepth,
        );
        this.chassisMesh = chassisMesh;

// レイキャストビークル
        let engineForce = 0;
        let vehicleSteering = 0;
        let breakingForce = 0;
        const tuning = new Ammo.btVehicleTuning();
        const rayCaster = new Ammo.btDefaultVehicleRaycaster(this.world);
        const vehicle = new Ammo.btRaycastVehicle(
            tuning, body, rayCaster);
        this.vehicle = vehicle;
        vehicle.setCoordinateSystem(0, 1, 2);
        this.world.addAction(vehicle);

        this.FRONT_LEFT = 0;
        this.FRONT_RIGHT = 1;
        this.BACK_LEFT = 2;
        this.BACK_RIGHT = 3;
/**
 * @type {THREE.Mesh[]}
 */
        this.wheelMeshes = [null, null, null, null];

        this.wheelDirectionCS0 = bt3(0, -1, 0);
        this.wheelAxleCS = bt3(-1, 0, 0);

        this.addWheel(true,
            bt3(this.wheelHalfTrackFront,
                this.wheelAxisHeightFront,
                this.wheelAxisFrontPosition),
            this.wheelRadiusFront,
            this.wheelWidthFront,
            this.FRONT_LEFT);
        this.addWheel(true,
            bt3(-this.wheelHalfTrackFront,
                this.wheelAxisHeightFront,
                this.wheelAxisFrontPosition),
            this.wheelRadiusFront,
            this.wheelWidthFront,
            this.FRONT_RIGHT);

        this.addWheel(false,
            bt3(this.wheelHalfTrackBack,
                this.wheelAxisHeightBack,
                this.wheelAxisPositionBack),
            this.wheelRadiusBack,
            this.wheelWidthBack,
            this.BACK_LEFT);
        this.addWheel(false,
            bt3(-this.wheelHalfTrackBack,
                this.wheelAxisHeightBack,
                this.wheelAxisPositionBack),
            this.wheelRadiusBack,
            this.wheelWidthBack,
            this.BACK_RIGHT);


/**
 * 車の物理演算の結果をメッシュに反映する
 * @param {number} dt 
 */
        function sync(dt) {
            const speed = vehicle.getCurrentSpeedKmHour();

            breakingForce = 0;
            engineForce = 10;

            if (false) {

            }
            if (false) {

            }

            vehicle.applyEngineForce(engineForce, this.BACK_LEFT);
            vehicle.applyEngineForce(engineForce, this.BACK_RIGHT);

            vehicle.setBrake(breakingForce / 2, this.FRONT_LEFT);
            vehicle.setBrake(breakingForce / 2, this.FRONT_RIGHT);
            vehicle.setBrake(breakingForce, this.BACK_LEFT);
            vehicle.setBrake(breakingForce, this.BACK_RIGHT);

            vehicle.setSteeringValue(vehicleSteering, this.FRONT_LEFT);
            vehicle.setSteeringValue(vehicleSteering, this.FRONT_RIGHT);
            
            const n = vehicle.getNumWheels();
            window.idwheelnumview.textContent = `${n} ${tstr()}`;

            for (let i = 0; i < n; ++i) {
                vehicle.updateWheelTransform(i, true);
                const tm = vehicle.getWheelTransformWS(i);
                const p = tm.getOrigin();
                const q = tm.getRotation();
                this.wheelMeshes[i].position.copy(bt2p(p));
                this.wheelMeshes[i].quaternion.copy(bt2q(q));
            }

            const tm = vehicle.getChassisWorldTransform();
            const p = tm.getOrigin();
            const q = tm.getRotation();
            this.chassisMesh.position.copy(bt2p(p));
            this.chassisMesh.quaternion.copy(bt2q(q));
        }


        this.syncList.push(sync.bind(this));
    }

    createChassisMesh(w, l, h) {
        const geo = new THREE.BoxBufferGeometry(w, l, h, 1, 1, 1);
        const mtl = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            wireframe: true,
        });
        const m = new THREE.Mesh(geo, mtl);
        m.name = `c${pad(0, 5)}`;
        return m;
    }

/**
 * 物理とメッシュでホイールを追加する
 * @param {boolean} isFront 前輪かどうか
 * @param {Ammo.btVector3} pos 
 * @param {*} radius 半径
 * @param {number} width 幅
 * @param {number} index 0からのインデックス
 */
    addWheel(isFront, pos, radius, width, index) {
        console.log(this.name, 'addWheel called', index);

        const directionCS0 = this.wheelDirectionCS0;
        const axleCS = this.wheelAxleCS;
        const suslength = this.suspensionRestLength;
        const tuning = this.tuning;

        const susstill = this.suspensionStiffness;
        const susdamp = this.suspensionDamping;
        const suscomp = this.suspensionCompression;
        const fric = this.friction;
        const roll = this.rollInfluence;

        const wheelInfo = this.vehicle.addWheel(
            pos,
            directionCS0,
            axleCS,
            suslength,
            radius,
            tuning,
            isFront,
        );
        wheelInfo.set_m_suspensionStiffness(susstill);
        wheelInfo.set_m_wheelsDampingRelaxation(susdamp);
        wheelInfo.set_m_wheelsDampingCompression(suscomp);
        wheelInfo.set_m_frictionSlip(fric);
        wheelInfo.set_m_rollInfluence(roll);

        this.wheelMeshes[index] = this.createWheelMesh(radius, width, index);
    }

/**
 * 車の物理演算の結果をメッシュに反映する
 * @param {number} dt 
 */
    sync(dt) {
        const vehicle = this.vehicle;
        if (!vehicle) {
            //return;
        }

        const speed = vehicle.getCurrentSpeedKmHour();

        this.breakingForce = 0;
        this.engineForce = 10;

        if (false) {

        }
        if (false) {

        }

        vehicle.applyEngineForce(this.engineForce, this.BACK_LEFT);
        vehicle.applyEngineForce(this.engineForce, this.BACK_RIGHT);

        vehicle.setBrake(this.breakingForce / 2, this.FRONT_LEFT);
        vehicle.setBrake(this.breakingForce / 2, this.FRONT_RIGHT);
        vehicle.setBrake(this.breakingForce, this.BACK_LEFT);
        vehicle.setBrake(this.breakingForce, this.BACK_RIGHT);

        vehicle.setSteeringValue(this.vehicleSteering, this.FRONT_LEFT);
        vehicle.setSteeringValue(this.vehicleSteering, this.FRONT_RIGHT);
        
        const n = vehicle.getNumWheels();
        window.idwheelnumview.textContent = `${n} ${tstr()}`;

        for (let i = 0; i < n; ++i) {
            vehicle.updateWheelTransform(i, true);
            const tm = vehicle.getWheelTransformWS(i);
            const p = tm.getOrigin();
            const q = tm.getRotation();
            this.wheelMeshes[i].position.copy(bt2p(p));
            this.wheelMeshes[i].quaternion.copy(bt2q(q));
        }

        const tm = vehicle.getChassisWorldTransform();
        const p = tm.getOrigin();
        const q = tm.getRotation();
        this.chassisMesh.position.copy(bt2p(p));
        this.chassisMesh.quaternion.copy(bt2q(q));
    }

/**
 * メッシュを作成する
 * @param {number} radius 半径
 * @param {number} width 幅
 * @param {number} index インデックス
 * @returns {THREE.Mesh}
 */
    createWheelMesh(radius, width, index) {
        console.log(this.name, 'createWheelMesh called');

        const geo = new THREE.CylinderBufferGeometry(
            radius, radius, width, 24, 1);
        geo.rotateZ(Math.PI / 2);
        const mtl = new THREE.MeshStandardMaterial({
            color: 0x006600,
        });
        const m = new THREE.Mesh(geo, mtl);
        m.name = `w${pad(index, 5)}`;

        {
            const mtl2 = new THREE.MeshStandardMaterial({
                color: 0x00ff00,
            });
            const m2 = new THREE.Mesh(new THREE.BoxBufferGeometry(
                width * 1.5, radius * 0.25, 1, 1, 1), mtl2);
            m2.name = `a${pad(index, 5)}`;

            m.add(m2);
        }

        console.log(this.name, 'createWheelMesh leaves');
        return m;
    }

}


/**
 * loader.load() は data: arrayBuffer みたい
 */
class Phy extends EventTarget {
    constructor() {
        super();

        this.name = 'Phy';

        this.inver = `0.1.0`;

        this.STATUS_TITLE = 'title';
        this.STATUS_GAME = 'game';
        this.STATUS_GAMEOVER = 'gameover';
        this.STATUS_LOADING = 'loading';
        this.status = '' + this.STATUS_TITLE;

        this.tempTrans = new Ammo.btTransform();

        /**
         * ロード途中でキャンセル押すとこれを立てる
         */
        this.cancelloading = false;

        this.loading = {
            loaded: 0,
            total: 0
        };

        /**
         * 存在したらモデルがある
         */
        this.vrm = null;
/**
 * 複数使用
 */
        this.vrms = {
        };
        /**
         * particle1, mob1
         */
        this.stock = {
        };

/**
 * デフォルトモデル使用中
 */
        this.defaultmodel = false;

        this.PAD_KEYDOWN = 'keydown';

        /**
         * スコア
         */
        this.score = 0;
        /**
         * シーン
         * *@type {THREE.Scene}
         */
        this.mainscene = null;
/**
 * エフェクトで更新される値
 * @type {Array<THREE.Mesh>}
 */
        this.effects = [];

        /**
         * 論理幅 16:9
         */
        this.logicw = 768;
/**
 * 論理高さ
 * @default 432
 */
        this.logich = 432;

        /**
         * ブラウザでのピクセル認識幅
         */
        this.curw = + this.logicw;
        this.curh = + this.logich;
/**
 * 選択インデックス
 */
        this.selectIndex = 2;

        /**
         * 累積用
         */
        this.prets = 0;
        /**
         * ゲームの開始タイムスタンプ
         */
        this.startts = 0;
        /**
         * まばたき周期
         */
        this.blinkmsec = 1000 * 6;

        /**
         * 1セクションのミリ秒数
         */
        this.sectionmsec = 1000 * 5;
        /**
         * 1ゲームの構成セクション数
         */
        this.gamesection = 12;
        /**
         * ゲームの中身時間
         */
        this.gamemsec = this.sectionmsec * this.gamesection;
        this.overmsec = this.gamemsec + 1000 * 10;

/**
 * セクション
 */
        this.presection = -1;
/**
 * 最大値
 */
        this.maxpts = 3000;
/**
 * 最小値
 */
        this.minpts = 2000;

/**
 * deltaTime の総和
 */
        this.time = 0;

        this.ts = [];
        this.windowmsec = 3000;
        this.targetfps = 60;

        this.terrainWidth = 128;
/**
 * 奥行方向の数
 * @default 128
 */
        this.terrainDepth = 128;
/**
 * @default 100
 */
        this.terrainWidthExtents = 100;
/**
 * @default 100
 */
        this.terrainDepthExtents = 100;
        this.terrainHalfWidth = this.terrainWidth / 2;
        this.terrainHalfDepth = this.terrainDepth / 2;
/**
 * 高さの最大
 */
        this.terrainMaxHeight = 8 * 0 + 1;
/**
 * 高さの最小
 */
        this.terrainMinHeight = -2;

/**
 * 'face', 'same'
 */
        this.facemode = 'face';

/**
 * 両方の手の状態
 * down, up, downup(下から上へ), updown
 */
        this.hand = {
            left: 'down',
            right: 'down'
        };
/**
 * 微動作
 */
        this.littlez = 0.0;
/**
 * 微動作
 */
        this.mz = 0;

/**
 * 正解の状態
 */
        this.target = {
            left: 'down',
            right: 'down'
        };
/**
 * 事前生成
 */
        this.directionQueue = [];

/**
 * 現在の指示
 * @type {{shows: Array<string>}}
 */
        this.direction = {
            shows: []
        };

/**
 * 入力も正解失敗も無し
 */
        this.DIREC_NONE = 'none';
/**
 * モーション入力できる
 */
        this.DIREC_READY = 'ready';


/**
 * 'none': 無表示 'ready': 表示して待ち 'success', 'failure'
 */
        this.current = this.DIREC_NONE;

        this.sps = [];

/**
 * directional light 0.0-1.0
 * @default 1.0
 */
        this.difflevel = 1.0;
/**
 * ambient light 0.0-1.0
 */
        this.amblevel = 1.0;

/**
 * makeSprite のあたり
 */
        this.ORDER_SPRITE = 950000;

/**
 * かなり後の方
 */
        this.ORDER_OVERSCREEN = 980000;
/**
 * もっとも最後
 */
        this.ORDER_TOUCH = 990000;

/**
 * このクラスからのイベント
 */
        this.EV_DRAW = 'draw';

        this.basicPose = {
            head: { e: [0,0, -5] },
            leftUpperLeg: { e: [ 0, 0, -5 ] },
            rightUpperLeg: { e: [ 0, 0, 5 ] },
            leftUpperArm: { e: [ 0, 0, 70 ] },
            rightUpperArm: { e: [ 0, 0, -70 ] },
        };

/**
 * モーション終了時用ポーズ
 */
        this.stillPose = {
            'left_down': { leftUpperArm: { e: [0,0,70] } },
            'left_up': { leftUpperArm: { e: [0,-60,-70] } },
            'right_down': { rightUpperArm: { e: [0,0,-70] } },
            'right_up': { rightUpperArm: { e: [0,60,70] } }
        };
    }

/**
 * 物理演算の共通初期化
 */
    initPhysics() {
        console.log(this.name, 'initPhysics');
        {
            const config = new Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new Ammo.btCollisionDispatcher(config);
            const broadphase = new Ammo.btDbvtBroadphase();
            const solver = new Ammo.btSequentialImpulseConstraintSolver();

            const world = new Ammo.btDiscreteDynamicsWorld(
                dispatcher, broadphase, solver, config
            );
            this.world = world;
            world.setGravity(bt3(0, -9.82, 0));
        }
        console.log(this.name, 'initPhysics leaves');
    }

/**
 * 初回に1回だけ
 * @param {HTMLCanavsElement} canvas 
 */
    initGL(canvas) {
        console.log(this.name, 'initGL called');

        let w = this.logicw;
        let h = this.logich;

        const opt = {
            preserveDrawingBuffer: true,
            canvas,
            antialias: true,
            alpha: true
        };
        const renderer = new THREE.WebGLRenderer(opt);
        this.renderer = renderer;

        renderer.setSize(w, h, false);
        const hour = new Date().getHours();
        const night = (hour >= 23 || hour < 5);
        //const night = true;
        //renderer.setClearColor(night ? 0xffee00 : 0xeeffff, 1.0);
        renderer.setClearColor(0x333366, 1.0);

        renderer.shadowMap.enabled = true;

        const mainscene = new THREE.Scene();
        this.mainscene = mainscene;
        {
            //const axes = new THREE.AxesHelper(100);
            //mainscene.add(axes);
        }

        const maincamera = new THREE.PerspectiveCamera(45,
            w / h, 0.02, 100);
        this.maincamera = maincamera;
        let z = 2.7 * 10;
        maincamera.position.set(0, 1.0, z);
        maincamera.lookAt(new THREE.Vector3(0, 1.0, 0));

        {
            const axes = new THREE.AxesHelper(10);
            mainscene.add(axes);
        }

        { // 顔暗くなる
            let lv = Math.floor(this.amblevel * 255);
            const light = new THREE.AmbientLight((lv << 16) | (lv << 8) | lv);
            mainscene.add(light);
        }
        {
            let lv = Math.floor(this.difflevel * 255);
            const light = new THREE.DirectionalLight(0x010101 * lv);
            light.castShadow = true;
            //light.shadow.mapSize.width = 2048;
            //light.shadow.mapSize.height = 2048;
            //light.shadow.camera.near = 1;
            //light.shadow.camera.far = 100;
            //light.shadow.camera.light = -100;
            //light.shadow.camera.right = 100;
            //light.shadow.camera.top = -100;
            //light.shadow.camera.bottom = 100;
            //mainscene.add(light.target);

            light.position.set(-10, 10, 10);
            mainscene.add(light);

            const helper = new THREE.DirectionalLightHelper(light);
            //mainscene.add(helper);

            const lighthelper = new THREE.CameraHelper(light.shadow.camera);
            //mainscene.add(lighthelper);
        }

        {
            const clock = new THREE.Clock();
            this.clock = clock;
        }

        this.makeSprite();

        console.log(this.name, 'initGL leaves');
    }

/**
 * 高さ配列を生成する
 * @param {number} width 幅数
 * @param {number} depth 奥行数
 * @param {number} minHeight 高さの最小値
 * @param {number} maxHeight 高さの最大値
 * @returns {Float32Array}
 */
    generateHeight(width, depth, minHeight, maxHeight) {
        console.log(this.name, 'generateHeight');
        const data = new Float32Array(width * depth);
        const hRange = maxHeight - minHeight;
        const w2 = width / 2;
        const d2 = depth / 2;
        const phaseMult = 12;
        let p = 0;
        for (let j = 0; j < depth; ++j) {
            for (let i = 0; i < width; ++i) {
                let radius = Math.sqrt(((i - w2) / w2) ** 2 + ((j - d2) / d2) ** 2);
                let height = minHeight + (Math.sin(radius * phaseMult) + 1) * 0.5 * hRange;
                data[p] = height;
                p ++;
            }
        }
        console.log('generateHeight leaves', width, depth, data.length);
        return data;
    }

/**
 * 
 * @returns {THREE.Mesh}
 */
    makeHeightGround() {
        console.log(this.name, 'makeHeightGround called');

        // 高さ配列を作る
        const geo = new THREE.PlaneBufferGeometry(
            100, 100,
            this.terrainWidth - 1, this.terrainDepth - 1
        );
        geo.rotateX(-Math.PI * 0.5);
        const vertices = geo.attributes.position.array;

        const heightData = this.generateHeight(
            this.terrainWidth, this.terrainDepth,
            this.terrainMinHeight, this.terrainMaxHeight);
        let i = 0;
        let j = 0;

// 元コードは個数間違ってるよね
//        const l = vertices.length;
        const l = heightData.length;

        for (let i = 0; i < l; ++i) {
            vertices[j + 1] = heightData[i]; // Y
//            i ++;
            j += 3;
        }
        geo.computeVertexNormals();

        const mtl = new THREE.MeshStandardMaterial({
            color: 0x666600
        });

        const m = new THREE.Mesh(geo, mtl);
        m.name = 't';
        m.userData.heightdata = heightData;

        console.log(this.name, 'makeHeightGround leaves');
        return m;
    }

/**
 * テラインシェイプを作成する
 * @param {Float32Array} heightdata 
 * @returns {} テラインシェイプ
 */
    createTerrainShape(heightdata) {
        console.log(this.name, 'createTerrainShape called', heightdata.length);
        const scale = 1;
        const upAxis = 1; // Y
        const hdt = 'PHY_FLOAT';
        const flipQuadEdges = false;
        this.ammoHeightData = Ammo._malloc(4 * this.terrainWidth * this.terrainDepth);

        let p = 0;
        let p2 = 0;
        for (let j = 0; j < this.terrainDepth; ++j) {
            for (let i = 0; i < this.terrainWidth; ++i) {
                Ammo.HEAP32[this.ammoHeightData + p2 >> 2] = heightdata[p];

                p ++;
                p2 += 4;
            }
        }

        const heightShape = new Ammo.btHeightfieldTerrainShape(
            this.terrainWidth,
            this.terrainDepth,
            this.ammoHeightData,
            scale,
            this.terrainMinHeight,
            this.terrainMaxHeight,
            upAxis,
            hdt,
            flipQuadEdges,
        );
        const scaleX = this.terrainWidthExtents / (this.terrainWidth - 1);
        const scaleZ = this.terrainDepthExtents / (this.terrainDepth - 1);
        heightShape.setLocalScaling(bt3(scaleX, 1, scaleZ));
        heightShape.setMargin(0.05);

        console.log(this.name, 'createTerrainShape leaves');
        return heightShape;
    }

/**
 * API. 
 * @param {HTMLElement} dom 
 */
    makeControl(dom) {
        const control = new THREE.TrackballControls(this.maincamera, dom);
        this.control = control;
    }

    ready() {
        this.makeGround();
        for (let i = 0; i < 10; ++i) {
            const m = this.makeBox(
                [0.5, 0.5, 0.5],
                [(i - 5) * 0.25, 5 + i, 0],
                2);
            m.castShadow = true;
            this.mainscene.add(m);
        }

        //return;
        {
            const m = this.makeHeightGround();
            this.mainscene.add(m);

            const groundShape = this.createTerrainShape(m.userData.heightdata);
            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(
                bt3(0, (this.terrainMaxHeight + this.terrainMinHeight) * 0.5, 0)
            );
            const mass = 0;
            const localInertia = bt3(0, 0, 0);
            const motionState = new Ammo.btDefaultMotionState(transform);
            const rbInfo = new Ammo.btRigidBodyConstructionInfo(
                mass, motionState, groundShape, localInertia
            );
            const body = new Ammo.btRigidBody(rbInfo);
            this.world.addRigidBody(body);
        }
    }

/**
 * スクリーンショットの画像URLを解決する
 */
    async getSS() {
        /**
         * @type {HTMLCanvasElement}
         */
        const cv = document.getElementById('idmain');
        if (!cv) {
            throw new Error(`存在しません`);
        }
        //log(`getSS making...`);
        const s = cv.toDataURL('image/png');
        log(`getSS`, s.length);
        return s;
    }

/**
 * API. この関数では自走しない
 */
    update() {

        const nowts = Date.now();
        this.ts = this.ts.filter(v => {
            return (nowts - v) < this.windowmsec;
        });
        let fps = 0;
        let ok = false;
        const num = this.ts.length;
        if (num === 0) {
            ok = true;
        } else {
            let diff = nowts - this.ts[num - 1];

            fps = 1000 * num / this.windowmsec;
            if (fps <= this.targetfps) {
                ok = true;
            }

            if (diff > 1000 / (this.targetfps / 2)) {
                ok = true; // 遅すぎたら常に採用
            }
            if (diff < 1000 / (this.targetfps * 2)) {
                ok = false; // 早すぎたら常に非採用
            }
        }
        ok = true;
        if (ok) {
            this.ts.push(nowts);

            window.idfpsview.textContent = `${fps.toFixed(1)} [fps]`;
        }


        const dt = this.clock.getDelta();

        if (this.control) {
            this.control.update();
        }

        this.mainscene.traverse(obj => {
            const syncfunc = obj?.userData?.syncfunc;
            if (!syncfunc) {
                return;
            }
            syncfunc(dt);
        });

        if (this.car) {
            this.car.sync(dt);
        }

// 物理演算のワールドを更新する
        this.world.stepSimulation(dt, 10);

        this.time += dt;
        {
            const el = window.idtimeview;
            el.textContent = `${this.time.toFixed(1)}`;
        }

        this.draw();

//        this.status.update();
    }

    /**
     * 向きを変える
     * @param {string} inface 
     */
    turnFace(inface) {
        log(`turnFace`);
        let ey = 0;
        if (inface === 'face') {
            ey = Math.PI * 175 / 180;
        }
        this.facemode = inface;
        const vrm = this.vrm;
        if (!vrm) {
            return;
        }
        {
            const name = THREE.VRMSchema.HumanoidBoneName.Hips;
            const bone = vrm.humanoid.getBoneNode(name);
            bone.rotation.y = ey;

            bone.position.x = -1;
        }
    }

    /**
     * 入力発生時の処理
     * @param {string} intop 
     * @param {string} inright 
     * @param {string} inok 
     * @param {string} incancel 
     */
    input(intop, inright, inbottom, inleft,
            inok, incancel) {

        if (this.status === this.STATUS_TITLE) { // タイトル
            // 上下
            let mini = this.vrm ? 0 : 1;
            let maxi = (this.vrm && this.defaultmodel) ? 1 : 2;

            let my = 0;
            if (intop === this.PAD_KEYDOWN) {
                my -= 1;
            }
            if (inbottom === this.PAD_KEYDOWN) {
                my += 1;
            }

            this.selectIndex += my;
            this.selectIndex = Math.max(mini, Math.min(maxi, this.selectIndex));

            if (inok === this.PAD_KEYDOWN) { // OK
                if (this.selectIndex === 2) {
                    //let url = `./res/mobko1.vrm`;
                    let url = `./res/mobshiro2.vrm`;
                    this.loadVRM(url, true, true);
                }

                if (this.selectIndex === 1) {
                    const cev = new CustomEvent(this.EV_DRAW, {
                        detail: {
                            type: 'display'
                        }
                    });
                    this.dispatchEvent(cev);
                }

                if (this.selectIndex === 0) { // ゲーム開始
                    this.status = this.STATUS_GAME;

                    this.startts = Date.now();
                    this.score = (this.facemode === 'same') ? 1 : 0;

                    this.flagMotion(false,
                        null, null, this.PAD_KEYDOWN, null,
                        null);

                    this.clearDirection();

                    this.directionQueue = this.decideDirection();
                }
            }

            
            if (inleft === this.PAD_KEYDOWN) {
                this.turnFace('face');
            } else if (inright === this.PAD_KEYDOWN) {
                this.turnFace('same');
            }

        } else if (this.status === this.STATUS_GAME) {
            if (incancel === this.PAD_KEYDOWN) { // ゲームの中断
                this.status = this.STATUS_TITLE;

                this.clearDirection();
                this.score = 0;
            }

            if (this.current === this.DIREC_READY) {
                this.flagMotion(true,
                    intop, inright, inbottom, inleft,
                    inok);
            }
            /*
            // 動く(本家)
            if (intop === this.PAD_KEYDOWN) {
                next = hand.u;
            }
            if (inright === this.PAD_KEYDOWN) {
                next = hand.r;
            }
            if (inbottom === this.PAD_KEYDOWN) {
                next = hand.d;
            }
            if (inleft === this.PAD_KEYDOWN) {
                next = hand.l;
            }
            if (inok === this.PAD_KEYDOWN) {
                next = Object.assign({}, this.hand);
            }
            if (next) {
                const mot = this.decideMotion(pre, next);
                for (const k in mot) {
                    log(``, k, mot[k]);
                    this.mca[`${k}_up_down`].action.enabled = false;
                    this.mca[`${k}_down_up`].action.enabled = false;
                    this.mca[mot[k]].action.reset().play();
                }
                if (Object.keys(mot).length === 0) {
                    this.mca[`left_syaki`].action.reset().play();
                    this.mca[`right_syaki`].action.reset().play();
                }
                this.hand = next;

                this.checkMotion();
            } */

        } else if (this.status === this.STATUS_GAMEOVER) {

// 好きに動けるようにするか...
            this.flagMotion(false,
                intop, inright, inbottom, inleft,
                inok);

            if (incancel === this.PAD_KEYDOWN) {
                this.status = this.STATUS_TITLE;
            }
        } else if (this.status === this.STATUS_LOADING) {
            if (incancel === this.PAD_KEYDOWN) {
                this.status = this.STATUS_TITLE;
                this.cancelloading = true;
            }
        }

    }

    /**
     * 入力で手を変化させるモーション
     * this.hand を参照する 
     * @param {boolean} ischeck チェックも実施するかどうか
     * @param {string} intop 
     * @param {string} inright 
     * @param {string} inbottom 
     * @param {string} inleft 
     * @param {string} inok 
     */
    flagMotion(ischeck, intop, inright, inbottom, inleft, inok) {
        const hand = {
            u: { left: 'up', right: 'up' },
            r: { left: 'down', right: 'up' },
            d: { left: 'down', right: 'down' },
            l: { left: 'up', right: 'down' }
        };
        let pre = Object.assign({}, this.hand);
        let next = null;
        // 動く(本家)
        if (intop === this.PAD_KEYDOWN) {
            next = hand.u;
        }
        if (inright === this.PAD_KEYDOWN) {
            next = hand.r;
        }
        if (inbottom === this.PAD_KEYDOWN) {
            next = hand.d;
        }
        if (inleft === this.PAD_KEYDOWN) {
            next = hand.l;
        }
        if (inok === this.PAD_KEYDOWN) {
            next = Object.assign({}, this.hand);
        }
        if (next) {
            const mot = this.decideMotion(pre, next);
            for (const k in mot) {
                this.mca[`${k}_up_down`].action.enabled = false;
                this.mca[`${k}_down_up`].action.enabled = false;
                this.mca[mot[k]].action.reset().play();
            }
            if (Object.keys(mot).length === 0) {
                this.mca[`left_syaki`].action.reset().play();
                this.mca[`right_syaki`].action.reset().play();
            }
            this.hand = next;

            if (ischeck) {
                this.checkMotion();
            }
        }
    }

    /**
     * 手の状態からモーションを決める
     * @param {{left: string, right: string}} pre 
     * @param {*} next 
     */
    decideMotion(pre, next) {
        const ret = {};
        if (pre.left !== next.left) {
            ret.left = `left_${pre.left}_${next.left}`;
        }
        if (pre.right !== next.right) {
            ret.right = `right_${pre.right}_${next.right}`;
        }
        return ret;       
    }

    /**
     * モーションと指示から正解不正解を判定する
     */
    checkMotion() {
        log(`checkMotion called`, this.hand, this.target);
        const rate = this.facemode === 'face' ? 10 : 6;
        if (this.hand.left === this.target.left
            && this.hand.right === this.target.right) {
            this.current = 'success';

            this.score += this.curpts * rate;
        } else {
            this.current = 'failure';

            this.score += 1 * rate;
        }
    }

    /**
     * ゲームの最初に決定する分
     * act なら 'change', 'stay'
     * dest なら 'up', 'down'
     */
    decideDirection() {
        const ds = [];
        ds.push({ // 左上げて 右上げて
            type: 'dest', num: 1,
            left: 'up', right: 'up'
        });
        ds.push({ // 左下げて 右下げて
            type: 'dest', num: 1,
            left: 'down', right: 'down'
        });
        ds.push({ // 左上げて
            type: 'dest', num: 1,
            left: 'up', right: 'down'
        });
        ds.push({ // 左下げない
            type: 'dest', num: 1,
            left: 'up', right: 'down'
        });

        for (let i = 0; i < 4; ++i) {
            const obj = {
                type: 'random1',
                left: (Math.random() < 0.5) ? 'down' : 'up',
                right: (Math.random() < 0.5) ? 'down' : 'up'
            };
            ds.push(obj);
        }

        for (let i = 0; i < 4; ++i) {
            const obj = {
                type: 'random2', num: 2,
                left: (Math.random() < 0.5) ? 'down' : 'up',
                right: (Math.random() < 0.5) ? 'down' : 'up'
            };
            ds.push(obj);
        }

        log(`decideDirection leave`, ds);
        return ds;
    }

    /**
     * 指示を決定する
     */
    nextDirection() {
        const obj = this.directionQueue[this.presection];
        const hand = Object.assign({}, this.hand);

        this.direction = {
            shows: []
        };
        const lrs = { left: `左`, right: `右` };

        if (obj.type === 'dest') { // dest
            {
                let s = '';
                if (hand.left === obj.left) {
                    s = (hand.left === 'down') ? '上げない' : '下げない';
                } else {
                    s = (obj.left === 'down') ? '下げて' : '上げて';
                }
                this.direction.shows.push(`${lrs.left}${s}`);
            }
            {
                let flag = false;
                let s = null;
                if (hand.right === obj.right) {
                    s = (hand.right === 'down') ? '上げない' : '下げない';
                } else {
                    s = (obj.right === 'down') ? '下げる' : '上げる';
                    flag = true; // 指示必須
                }
                if (obj.num >= 2 || flag) {
                    this.direction.shows.push(`${lrs.right}${s}`);
                }
            }
        } else if (obj.type === 'random1') {
            //let ors = (Math.random() < 0.5) ? ['left', 'right'] : ['right', 'left'];
            let ors = ['left', 'right'];
            let flag = false;
            { // 上げ下げ指示は1つまで
                const lr = ors[0];
                let s = '';
                if (hand[lr] === obj[lr]) {
                    s = (hand[lr] === 'down') ? `上げない` : '下げない';
                } else {
                    s = (obj[lr] === 'down') ? `下げて` : '上げて';
                    flag = true;
                }
                this.direction.shows.push(`${lrs[lr]}${s}`);
            }
            {
                const lr = ors[1];
                let s = '';
                if (hand[lr] !== obj[lr]) {
                    if (flag === true) {
                        obj[lr] = '' + hand[lr];
                        // 次の節は true
                    } else {
                        s = (obj[lr] === 'down') ? `下げる` : '上げる';
                    }
                }
                if (hand[lr] === obj[lr]) {
                    s = (hand[lr] === 'down') ? `上げない` : '下げない';
                }
                this.direction.shows.push(`${lrs[lr]}${s}`);
            }
        } else if (obj.type === 'random2') {
            let ors = (Math.random() < 0.5) ? ['left', 'right'] : ['right', 'left'];
            let flag = false;
            {
                let s = '';
                const lr = ors[0];
                if (hand[lr] === obj[lr]) {
                    s = (hand[lr] === 'down') ? '上げない' : '下げない';
                } else {
                    s = (obj[lr] === 'down') ? '下げて' : '上げて';
                    flag = true;
                }
                this.direction.shows.push(`${lrs[lr]}${s}`);
            }
            { // 常に2つで かつ ないx2 は無し
                let s = '';
                const lr = ors[1];
                if (hand[lr] === obj[lr]) {
                    if (flag === false) {
                        obj[lr] = (obj[lr] === 'down') ? 'up' : 'down';
                        // 反転するので次の節は true
                    } else {
                        s = (hand[lr] === 'down') ? '上げない' : '下げない';
                    }
                }
                if (hand[lr] !== obj[lr]) {
                    s = (obj[lr] === 'down') ? '下げる' : '上げる';
                }
                this.direction.shows.push(`${lrs[lr]}${s}`);
            }
        }

        {
            const shows = this.direction.shows;
            if (shows.length >= 2) {
                const re = /ない$/;
                const m = re.exec(shows[0]);
                if (m) {
                    shows[0] += 'で';
                }
            }
        }

        this.target = obj;
        this.current = this.DIREC_READY;
        log(`nextDirection leave`, this.direction);
    }

    /**
     * タイトルメニューの表示
     * @param {boolean} visible 
     */
    drawCenter(visible) {
        if (this.sps.length < 2) {
            return;
        }
        const cv = this.sps[1].cv;
        const sp = this.sps[1].sp;
        sp.visible = visible;
        if (visible === false) {
            return;
        }

        sp.material.map.needsUpdate = true;
        const w = cv.width;
        const h = cv.height;
        const c = cv.getContext('2d');
        if (c == null) {
            return;
        }

        const step = w * 1.5 / 8;

        const ts = [
            { n: 'normal', c: `rgba(0, 0, 0, 1)`, y: step, t: `スタート` },
            { n: 'normal', c: `rgba(0, 0, 0, 1)`, y: step * 2, t: `ランキング表示` },
            { n: 'normal', c: `rgba(0, 0, 0, 1)`, y: step * 3, t: `デフォキャラを` },
            { n: 'normal', c: `rgba(0, 0, 0, 1)`, y: step * 3.8, t: `　　ロードする` },
        ];
        const now = Date.now();
        const cursorcol = ((now % 1800) >= 400) ? `rgba(255, 0, 0, 1)` : `rgba(0, 0, 0, 1)`;
        if (!this.vrm) {
            ts[0].t = '';
        }
        if (this.vrm && this.defaultmodel) {
            ts[2].t = '';
            ts[3].t = '';
        }

        ts[this.selectIndex].c = cursorcol;
        ts[this.selectIndex].n = 'bold';
        if (this.selectIndex === 2) {
            ts[3].c = cursorcol;
            ts[3].n = 'bold';
        }

        c.clearRect(0, 0, w, h);

        {
            let e = w / 256;
            let corner = w / 16;
            c.lineWidth = w / 128;

            //let marginy = h / 8;
            let marginy = h / 10;

            c.lineJoin = 'round';

            c.beginPath();
            c.moveTo(w - e, e + marginy);
            c.lineTo(e, e + marginy);
            c.lineTo(e, h - marginy - e);
            c.lineTo(w - e - corner, h - marginy - e);
            c.lineTo(w - e, h - marginy - e - corner);
            c.closePath();

            c.fillStyle = `rgba(255, 255, 255, 0.7)`;
            c.fill();
            c.strokeStyle = `rgba(0, 0, 0, 1)`;
            c.stroke();
        }

        c.textAlign = 'center';

        for (let i = 0; i < ts.length; ++i) {
            let s = ts[i].t;
            c.font = `${ts[i].n} ${w / 8}px 'monospace'`;
            c.fillStyle = ts[i].c;
            c.fillText(s, w / 2, ts[i].y);
        }
    }

    /**
     * 指示を表示する
     * @param {*} visible 
     */
    drawDirection(visible) {
        if (this.sps.length < 1) {
            return;
        }

        const cv = this.sps[0].cv;
        const sp = this.sps[0].sp;
        sp.visible = visible;
        if (visible === false) {
            return;
        }

        sp.material.map.needsUpdate = true;
        const w = cv.width;
        const h = cv.height;
        const c = cv.getContext('2d');
        if (c == null) {
            return;
        }

        c.clearRect(0, 0, w, h);
        if (this.current === this.DIREC_NONE) {
            //return;
        }

        c.textAlign = 'center';

        let step = w * 1.5 / 8;

        let y = step;
        let s = `${this.convertFull('' + (this.presection + 1)).padStart('　', 2)}／${this.convertFull('' + this.gamesection)}`;
        {
            c.font = `bold ${w / 8}px 'monospace'`;
            c.fillStyle = `rgba(51, 51, 255, 1)`;
            c.fillText(s, w / 2, y);
            y += step;
        }

        c.font = `bold ${w / 8}px 'monospace'`;
        c.fillStyle = `rgba(0, 0, 0, 1)`;
        for (let i = 0; i < 2; ++i) {
            if (i < this.direction.shows.length) {
                s = this.direction.shows[i];
                c.fillText(s, w / 2, y);
            }
            y += step;
        }

        s = '';
        if (this.current === 'success') {
            c.fillStyle = 'rgba(255, 0, 0, 1)';
            s = '〇';
        } else if (this.current === 'failure') {
            c.fillStyle = 'rgba(0,0,0, 1)';
            s = '×';
        }
        c.fillText(s, w / 2, y);

    }

    /**
     * 
     * @param {string} ins 数字だけの文字列
     */
    convertFull(ins) {
        //log(`conver`, ins);
        let ret = ``;
        const cs = `０１２３４５６７８９`;
        for (const v of Array.from(ins)) {
            const k = parseInt(v);
            if (!isNaN(k)) {
                ret += cs.substring(k, k + 1);
            } else {
                ret += '' + v;
            }
        }
        return ret;
    }

    /**
     * 右のスコア
     * @param {boolean} visible 
     */
    drawScore(visible) {
        if (this.sps.length < 3) {
            return;
        }
        const cv = this.sps[2].cv;
        const sp = this.sps[2].sp;
        sp.visible = visible;
        if (visible === false) {
            return;
        }

        const w = cv.width;
        const h = cv.height;
        sp.material.map.needsUpdate = true;
        const c = cv.getContext('2d');
        if (c == null) {
            return;
        }

        const nowts = Date.now();

        c.clearRect(0, 0, w, h);

        c.textAlign = 'right';
        c.font = `bold ${w / 8}px 'monospace'`;
        c.fillStyle = `rgba(51, 51, 255, 1)`;

        let step = w * 1.5 / 8;
        let y = step;
        let s = `ＳＣＯＲＥ`;
        //c.font = ``;
        c.fillText(s, w, y);
        y += step;

        if (this.status === this.STATUS_GAMEOVER && (nowts % 1000) < 500) {
            c.font = `bold ${w / 8}px 'monospace'`;
            c.fillStyle = `rgba(255, 0, 0, 1)`;
        } else {
            c.font = `bold ${w / 8}px 'monospace'`;
            c.fillStyle = `rgba(0, 0, 0, 1)`;    
        }
        s = this.convertFull('' + this.score);
        c.fillText(s, w, y);
        y += step;

        if (this.status === this.STATUS_GAMEOVER) {
            s = `ＧＡＭＥＯＶＥＲ`;
            c.fillStyle = `rgba(0,0,0, 1)`;
            c.fillText(s, w, y);
            y += step;      
        }

        if (this.status === this.STATUS_LOADING) {
            s = `ＬＯＡＤＩＮＧ…`;
            c.fillText(s, w, y);
            y += step;

            const loaded = this.loading.loaded;
            let per = Math.max(1, Math.min(98, Math.floor(loaded * 100 / this.loading.total)));
            if (loaded === this.loading.total) {
                per = 99;
            }
            if (loaded === 0) {
                per = 0;
            }

            s = this.convertFull('' + per) + `％`;
            //log(s);
            c.fillText(s, w, y);
            y += step;
        }
    }

    /**
     * ゲーム時間経過
     */
    timeout() {


        const cev = new CustomEvent(this.EV_DRAW, {
            detail: {
                type: 'score',
                score: this.score
            }
        });
        this.dispatchEvent(cev);
    }

    /**
     * 時間経過でゲーム進行状況を変更する
     * @param {number} nowts
     */
    checkRunning(nowts) {
        let diff = nowts - this.startts;
        let section = Math.floor(diff / this.sectionmsec);
        let past = diff % this.sectionmsec;
        if (section > this.presection) {
            this.clearDirection();

            this.presection = section; // 上書き
        } else {
            if (past >= 2000) {
                if (this.current === this.DIREC_NONE) {
                    this.nextDirection();
                    this.pastbasets = past;
                }
                if (this.current === this.DIREC_READY) {
                    let pts = this.maxpts - Math.floor((past - this.pastbasets) / 2 / 20) * 20;
                    this.curpts = Math.max(this.minpts, Math.min(this.maxpts, pts));
                } else {
                    this.curpts = 0;
                }
            }
        }
        return past;
    }

    /**
     * 
     */
    clearDirection() {
        this.current = this.DIREC_NONE;
        this.direction.shows = [];
        this.presection = -1;
        this.curpts = 0;
    }

    /**
     * 高頻度描画
     */
    draw() {

        const nowts = Date.now();
        let diff = 0;
        if (this.prets) {
            diff = nowts - this.prets;
        }
        this.prets = nowts;

        const deltaTime = this.clock.getDelta();

        this.little();

        this.blink(deltaTime);
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }

        { // ゲーム時間経過
            diff = nowts - this.startts;
            if (this.status === this.STATUS_GAME) {
                if (diff >= this.gamemsec) {
                    this.status = this.STATUS_GAMEOVER;

                    this.clearDirection();

                    this.timeout();
                } else { // ゲーム中のみ
                    let past = this.checkRunning(nowts);
                }
            } else if (this.status === this.STATUS_GAMEOVER && diff >= this.overmsec) {
                this.status = this.STATUS_TITLE;

                this.clearDirection();
            }
        }

        {
            let visible = false;
            if (this.status === this.STATUS_GAME) {
                visible = true;
            }
            this.drawDirection(visible);
        }
        {
            let visible = false;
            if (this.status === this.STATUS_TITLE) {
                visible = true;
            }
            this.drawCenter(visible);
        }
        { // 常に true
            let visible = true;
            if (this.status === this.STATUS_GAME) {
                visible = true;
            }
            this.drawScore(visible);
        }

        this.updateEffect();

        if (this.renderer) {
            this.renderer.render(this.mainscene, this.maincamera);
        }
    }

    updateEffect() {
        const d = new Date();
        let num = this.effects.length;
        for (let i = num - 1; i >= 0; --i) {
            const v = this.effects[i];
            //v.material.uniforms.uMsec.value = Date.now() % (1000 * 60 * 60 * 24);
            const diff = d.getTime() - v.userData.basets;
            if (diff < 2000) {
                v.material.uniforms.uMsec.value = diff;
            } else {
                this.mainscene.remove(v);
                this.effects.splice(i, 1);
            }

            //v.material.uniforms.uReso.value.set(this.curw, this.curh, 100);
        }
    }

/**
 * API. 初期化する
 * @param {{}} inopt 
 */
    async initialize(inopt) {
        console.log(this.name, 'initialize called');

        this.checkSize();

        this.initGL(inopt.canvas);
        this.initPhysics();

        {
            const car = new Car();
            this.car = car;
            car.init(this.world);

            this.mainscene.add(car.chassisMesh);
            for (const v of car.wheelMeshes) {
                this.mainscene.add(v);
            }
        }

        console.log(this.name, 'initialize leaves');
    }

    checkSize() {
        const rc = document.body.getClientRects();
        log(`checkSize leave rc`, rc, window);
    }

/**
 * API. 論理幅高さではないサイズをセットする
 * @param {{curw: number, curh: number}} inopt 
 */
    setWH(inopt) {
        this.curw = inopt.curw;
        this.curh = inopt.curh;
        //this.dpr = inopt.devicePixelRatio;
    }

    /**
     * スプライト3枚
     */
    makeSprite() {
        log(`makeSprite called`);
        const sps = [
            { p: [-1.2, 1.4, 0] },
            { p: [   0, 0.7, 0] },
            { p: [ 1.2, 1.4, 0] }
        ];
        this.sps = [];
        for (let i = 0; i < 3; ++i) {
            const v = sps[i];
            const cv = document.createElement('canvas');
            cv.width = 512;
            cv.height = 512;
            {
                const c = cv.getContext('2d');
                c.font = `normal ${cv.width / 8}px 'monospace'`;
                c.textBaseline = `hanging`;
                c.strokeStyle = `rgba(0, 0, 0, 1)`;
                c.fillStyle = `rgba(255, 128, 0, 1)`;
                c.fillRect(0, 0, cv.width, cv.height);

                //c.fillStyle = `rgba(0, 0, 0, 1)`;
                //c.fillText(`${i}`, cv.width / 2, cv.height / 2);
            }
            const tex = new THREE.CanvasTexture(cv);
            const mtl = new THREE.SpriteMaterial({
                transparent: true,
                map: tex,
                depthTest: false
            });
            const sp = new THREE.Sprite(mtl);
            sp.renderOrder = this.ORDER_SPRITE;
            sp.position.set(v.p[0], v.p[1], v.p[2]);

            this.sps.push({ cv: cv, sp: sp });

            this.mainscene.add(sp);
        }

        this.makeOS();
    }

    /**
     * オーバースクリーンを作成する
     */
    makeOS() {
        log(`makeOS`);
        const cv = document.createElement('canvas');
        //const cv = new OffscreenCanvas(1024, 1024);
        this.overscreencv = cv;
        {
            //cv.width = this.logicw;
            //cv.height = this.logich;
            cv.width = 1024;
            cv.height = 1024;
            const c = cv.getContext('2d');
            c.font = `normal 32px 'monospace'`;

            //c.fillStyle = `rgba(0, 255, 0, 0.5)`;
            //c.fillRect(0, 0, 1024, 1024);

            //c.fillStyle = `rgba(255, 0, 0, 0.2)`;
            //c.fillRect(0, 0, this.logicw, this.logich);

            c.fillStyle = `rgba(0, 0, 0, 1)`;
            c.fillText(`000123456789ABCDEF`, 768 / 2, 216);
        }
        const vs = [
'varying vec2 vUv;',
'void main() {',
'vUv = uv;',
'gl_Position = vec4(position.x, position.y, position.z, 1.0);',
'}'
                        ];
                        const fs = [
'uniform sampler2D uTex;',
'uniform vec2 rate;',
'uniform vec2 offset;',        
'varying vec2 vUv;',
'void main() {',
'vec2 tx = vec2(vUv.x * rate.x, 1.0 - (1.0 - vUv.y) * rate.y + offset.y);',
'vec4 col = texture2D(uTex, tx);',
'gl_FragColor = col;',
'}'
                        ];
        {
            const geo = new THREE.PlaneBufferGeometry(2, 2);
            const tex = new THREE.CanvasTexture(cv);

            const mtl = new THREE.ShaderMaterial({
            //const mtl = new THREE.MeshBasicMaterial({
                vertexShader: vs.join('\n'),
                fragmentShader: fs.join('\n'),
                uniforms: {
                    uTex: new THREE.Uniform(tex),
                    offset: new THREE.Uniform(new THREE.Vector2(0, 0)),
                    rate: new THREE.Uniform(new THREE.Vector2(this.logicw / 1024,
                        this.logich / 1024))
                },
                //map: tex,
                side: THREE.DoubleSide,
                transparent: true,
                depthTest: false
            });
            const m = new THREE.Mesh(geo, mtl);
            m.renderOrder = this.ORDER_OVERSCREEN;

            this.overscreen = m;

            this.mainscene.add(m);
        }

        {
            const geo = new THREE.PlaneBufferGeometry(2, 2);
            const tex = new THREE.CanvasTexture(cv);

            const mtl = new THREE.ShaderMaterial({
                vertexShader: vs.join('\n'),
                fragmentShader: fs.join('\n'),
                uniforms: {
                    uTex: new THREE.Uniform(tex),
                    offset: new THREE.Uniform(new THREE.Vector2(0, -0.5)),
                    rate: new THREE.Uniform(new THREE.Vector2(this.logicw / 1024,
                        this.logich / 1024))
                },
                //map: tex,
                side: THREE.DoubleSide,
                transparent: true,
                depthTest: false
            });
            const m = new THREE.Mesh(geo, mtl);
            m.renderOrder = this.ORDER_SPRITE;

            this.overscreen2 = m;

            this.mainscene.add(m);
        }
    }

    /**
     * ファイルオブジェクトを指定する．ドラッグアンドドロップ時
     * @param {File} f 
     */
    async loadFile(f) {
        console.log(this.name, 'loadFile called');
        let ab = null;
        if (f.name in this.stock) {
            ab = this.stock[f.name];
        } else {
            ab = await f.arrayBuffer();
            this.stock[f.name] = ab;
        }
        // TODO: 
        //this.loadVRM(ab, true, false);
    }

    /**
     * 
     * @file {string} url 
     */
    async loadFileByURL(url) {
        let ab = null;
        if (url in this.stock) {
            ab = this.stock[url];
        } else {
            const res = await fetch(url);
            ab = await res.arrayBuffer();
            this.stock[url] = ab;
        }
        this.loadVRM(ab, true, true);
    }

    /**
     * .vrm ファイルを読み込む
     * @param {string} url 
     * @param {boolean} isstatus ステータス変更も実施する場合
     * @param {boolean} isdefault デフォルトモデル
     */
    async loadVRM(url, isstatus, isdefault) {
        if (isstatus) {
            this.status = this.STATUS_LOADING;
            this.cancelloading = false;
            this.vrm = null;
            {
                const obj = this.mainscene.getObjectByName('avator');
                if (obj) {
                    this.mainscene.remove(obj);
                }
            }

            this.loading.loaded = 0;
            this.loading.total = 0;

            this.defaultmodel = false;
        }

        const onload = async (gltf) => {
            //try {
                //THREE.VRMUtils.removeUnnecessaryJoints( gltf.scene );
                log(`gltf`, gltf);

                const vrm = await THREE.VRM.from(gltf);
                this.vrm = vrm;
                vrm.scene.name = 'avator';

                if (isdefault) {
                    this.stock.mob = vrm;
                    this.stock[url] = gltf;
                }

                this.mainscene.add(vrm.scene);
                {
                    const vrm2 = await THREE.VRM.from(gltf);
                    //const vrm2s = vrm.scene.clone();
                    this.mainscene.add(vrm2.scene);
                    //vrm2.position.set(-1, 0, 0);
                }

                this.initAvator();
                this.makeMotion();

                this.status = this.STATUS_TITLE;
                this.selectIndex = 0;
                this.defaultmodel = isdefault;

                log(vrm);
            //} catch(ec) {
            //    console.warn(ec.message);
            //}
        };
        const onprogress = (arg) => {
            if (this.cancelloading) {
                // 打ち切りたいがどうするのだろうか??
                this.cancelloading = false;
                return false;
            }
            this.loading.loaded = arg.loaded;
            this.loading.total = arg.total;
        };
        const onerror = (err) => {
            console.log(`.vrm ファイルのロードに失敗しました`, err);

            this.status = this.STATUS_TITLE;
            this.selectIndex = 1;
        };

        const loader = new THREE.GLTFLoader();
        let ab = null;
        if (typeof url === 'string') { // 通常のパス
            if (!(url in this.stock)) {
                loader.load(url, onload, onprogress, onerror);
                return;
            }
            ab = this.stock[url];
        } else { // 実は arraybuffer
            ab = url;
        }
        this.loading.loaded = ab.byteLength;
        this.loading.total = ab.byteLength;
        loader.loadArrayBuffer(ab, onload, onprogress, onerror);
    }

    initAvator() {
        const vrm = this.vrm;
        if (!vrm) {
            return;
        }
        this.applyIm(this.basicPose);
        this.turnFace(this.facemode);

        this.changeHair();
        {
            const name = THREE.VRMSchema.BlendShapePresetName.Fun;
            // blink とかぶる
            //const name = THREE.VRMSchema.BlendShapePresetName.Joy;
            vrm.blendShapeProxy.setValue(name, 0.5);
        }
        log(`initAvator leave`);
    }

    changeHair() {
        log(`changeHair`);
        const vrm = this.vrm;
        if (!vrm) {
            return;
        }
        const re = /Hair/;
        for (const v of vrm.materials) {
            const m = re.exec(v.name);
            if (m == null) {
                continue;
            }

            v.color.set(0,1,0, 1);
            v.emissionColor.set(0,0.5,0, 1);
            v.rimColor.set(1, 0, 0, 1);
            v.shadeColor.set(1, 0, 0, 1);
            v.needsUpdate = true; // 5 -> 6
            log('material change', v.version, v);
        }
    }

    /**
     * まばたき
     * @param {number} deltaTime 
     */
    blink(deltaTime) {
        const vrm = this.vrm;
        if (!vrm) {
            return;
        }

        {
            let rate = 0;
            const nowts = Date.now() % this.blinkmsec;
            if (nowts < 50) {
                rate = nowts / 50;
            } else {
                rate = 1 - (nowts - 200) / 150;
            }
            if (rate < 0) {
                rate = 0;
            }

            const name = THREE.VRMSchema.BlendShapePresetName.Blink;
            vrm.blendShapeProxy.setValue(name, rate);

            vrm.update(deltaTime);
        }
    }

    /**
     * 今は使用していない
     */
    motion() {
        if (!this.vrm) {
            return;
        }
        if (true) {
            /* 左手が正面
            const leftUp = {
                leftUpperArm: { e: [ Math.PI * 0.5, 0, Math.PI * 70 / 180 ] }
            }; */

            //const leftUp = { // 手のひら前で挙手
            //    leftUpperArm: { e: [ 0, -90, -70 ] }
            //};

            const leftUp = { // 手のひら前で挙手 改
                leftUpperArm: { e: [ 0, -60, -70 ] }
            };

            this.applyIm(leftUp);
        }
        if (true) {
            /*
            const rightUp = {
                rightUpperArm: { e: [- Math.PI * 0.5, Math.PI * 180 / 180, Math.PI * 70 / 180 ] }
            }; */

            //const rightUp = { // 手のひら前で挙手
            //    rightUpperArm: { e: [- Math.PI * 0, Math.PI * 90 / 180, Math.PI * 70 / 180 ] }
            //};

            const rightUp = { // 手のひら前で挙手 改
                rightUpperArm: { e: [0, 60, 70 ] }
            };

            this.applyIm(rightUp);
        }
    }

    /**
     * わずかに動く動作
     */
    little() {
        const vrm = this.vrm;
        if (!vrm) {
            return;
        }

        const range = 0.05;
        const sp = 0.0005;
        if (Math.random() < 0.01) {
            if (Math.abs(this.littlez) === range) {
                this.mz = (this.littlez < 0) ? sp : -sp;
            } else {
                if (this.mz === 0.0) {
                    this.mz = Math.random() < 0.5 ? -sp : sp;
                } else {
                    this.mz = 0;
                }
            }
        }


        let littlez = + this.littlez;
        littlez += this.mz;

        littlez = Math.max(-range, Math.min(range, littlez));
        this.littlez = littlez;

        const name = THREE.VRMSchema.HumanoidBoneName.Spine;
        const bone = vrm.humanoid.getBoneNode(name);
        bone.rotation.z = + this.littlez;
    }

    /**
     * mixer と clip と action で
     * action は最終的な再生制御など。
     */
    makeMotion() {
        const vrm = this.vrm;
        if (!vrm) {
            return;
        }

        const ms = [
            { n: 'left_up_down', be: [0,-60,-70], me: [0,-40,0], ee: [0,0,70], b: 'leftUpperArm' },
            { n: 'left_down_up', be: [0,0,70], me: [0,-70,0], ee: [0,-60,-70], b: 'leftUpperArm' },
            { n: 'right_up_down', be: [0,60,70], me: [0,40,0], ee: [0,0,-70], b: 'rightUpperArm' },
            { n: 'right_down_up', be: [0,0,-70], me: [0,0,0], ee: [0,60,70], b: 'rightUpperArm' },
            { n: 'left_syaki', be: [0,0,0], me: [0,-20,0], ee: [0,0,0], b: 'leftLowerArm' },
            { n: 'right_syaki', be: [0,0,0], me: [0,20,0], ee: [0,0,0], b: 'rightLowerArm' }
        ];
        this.mca = {};

        let currentMixer = new THREE.AnimationMixer(vrm.scene);
        currentMixer.addEventListener('finished', ev => {
            //log(`finished fire`, ev);
            //ev.action.enabled = false; // ?

            const clip = ev.action.getClip();
            const ss = clip.name.split('_');
            //log(ss);
            if (ss.length >= 3) {
                this.applyIm(this.stillPose[`${ss[0]}_${ss[2]}`]);
            }
        });
        currentMixer.addEventListener('loop', ev => {
            log(`loop fire`, ev);
        });
        this.mixer = currentMixer;

        for (let i = 0; i < ms.length; i ++) { // animation
            const v = ms[i];
            v.bee = new THREE.Euler().fromArray(v.be.map(v2 => {
                return v2 * Math.PI / 180;
            }));
            v.mee = new THREE.Euler().fromArray(v.me.map(v2 => {
                return v2 * Math.PI / 180;
            }));
            v.eee = new THREE.Euler().fromArray(v.ee.map(v2 => {
                return v2 * Math.PI / 180;
            }));

//            const bonename = THREE.VRMSchema.HumanoidBoneName.LeftUpperArm;
            const bonename = v.b;
            const track = new THREE.QuaternionKeyframeTrack(
                vrm.humanoid.getBoneNode(bonename).name + '.quaternion', // name
                [ 0.0, 0.12, (i <= 4) ? 0.24 : 0.18 ], // times
                [ ...new THREE.Quaternion().setFromEuler(v.bee).toArray(),
                    ...new THREE.Quaternion().setFromEuler(v.mee).toArray(),
                    ...new THREE.Quaternion().setFromEuler(v.eee).toArray() ] // values
            );

            const clip = new THREE.AnimationClip(v.n, -1, [ track ] );
            const action = currentMixer.clipAction( clip );
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;

            const obj = {
                clip: clip,
                action: action
            };

            this.mca[v.n] = obj;
        }

    }

    /**
     * ポーズを直接指定する
     * @param {Object<string, {}>} pose 
     */
    applyIm(pose) {
        const vrm = this.vrm;
        if (!vrm) {
            return;
        }
        for (const k in pose) {
            const v = pose[k];
            try {
                const bone = vrm.humanoid.getBoneNode(k);
                bone.rotation.x = v.e[0] * Math.PI / 180;
                bone.rotation.y = v.e[1] * Math.PI / 180;
                bone.rotation.z = v.e[2] * Math.PI / 180;
            } catch(ec) {
                log(k, ec.message);
            }
        }
    }

/*

			// gltf and vrm
			let currentVrm = undefined;
			let currentMixer = undefined;

			// animation
			function prepareAnimation( vrm ) {

				currentMixer = new THREE.AnimationMixer( vrm.scene );

				const quatA = new THREE.Quaternion( 0.0, 0.0, 0.0, 1.0 );
				const quatB = new THREE.Quaternion( 0.0, 0.0, 0.0, 1.0 );
				quatB.setFromEuler( new THREE.Euler( 0.0, 0.0, 0.25 * Math.PI ) );

				const armTrack = new THREE.QuaternionKeyframeTrack(
					vrm.humanoid.getBoneNode( THREE.VRMSchema.HumanoidBoneName.LeftUpperArm ).name + '.quaternion', // name
					[ 0.0, 0.5, 1.0 ], // times
					[ ...quatA.toArray(), ...quatB.toArray(), ...quatA.toArray() ] // values
				);

				const blinkTrack = new THREE.NumberKeyframeTrack(
					vrm.blendShapeProxy.getBlendShapeTrackName( THREE.VRMSchema.BlendShapePresetName.Blink ), // name
					[ 0.0, 0.5, 1.0 ], // times
					[ 0.0, 1.0, 0.0 ] // values
				);

				const clip = new THREE.AnimationClip( 'blink', 1.0, [ armTrack, blinkTrack ] );
				const action = currentMixer.clipAction( clip );
				action.play();

			}

*/

    addTouchEffect(ev) {
        const m = this.makeTouchEffect({
            w: this.curw,
            h: this.curh,
            x: ev.offsetX,
            y: ev.offsetY
        });
        m.userData.basets = Date.now();
        this.effects.push(m);

        this.mainscene.add(m);
    }

/**
 * タッチした位置に表示したい
 * @param {{ w: number, h: number, x: number, y: number }} inopt 
 */
    makeTouchEffect(inopt) {
        const vs = [
'uniform vec3 uReso;',
'uniform vec3 uPos;',
'uniform float uMsec;',
'varying vec2 vUv;',
'varying float vMsec;',
'void main() {',
'float M_PI = 3.1415926535;',
'float id = - position.z;',
'float idrate1 = id / uPos.z + uMsec / 2000.0;',
'vec2 rot1 = vec2(cos(idrate1 * M_PI * 2.0), sin(idrate1 * M_PI * 2.0));',
'vec2 rot2 = vec2(cos(idrate1 * M_PI * 2.0), sin(idrate1 * M_PI * 2.0));',
'vUv = uv;',
'vMsec = uMsec;',
'float r1 = uReso.z * min(1.0, uMsec / 500.0);',
//'float r2 = uReso.z * min(1.0, uMsec / 20000.0);',
'float r2 = 4.0;',
'float x = (uPos.x + rot1.x * r1 + rot2.x * position.x * r2 - rot2.y * position.y * r2) / (uReso.x * 0.5) - 1.0;',
'float y = 1.0 - (uPos.y + rot1.y * r1 + rot2.y * position.x * r2 + rot2.x * position.y * r2) / (uReso.y * 0.5);',
//'gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
'gl_Position = vec4(x, y, -1.0, 1.0);',
'}'
        ];
        const fs = [
'varying vec2 vUv;',
'varying float vMsec;',
'void main() {',
'gl_FragColor = vec4(0.9, vMsec / 6000.0, 0.01, 1.0);',
'}'
        ];
        const geo = new THREE.BufferGeometry();
        const num = 20;
        const ps = new Float32Array(3 * 4 * num);
        const ns = new Float32Array(3 * 4 * num);
        const uvs = new Float32Array(2 * 4 * num);
        const fis = new Uint32Array(3 * 2 * num);
        const vts = [
            { px: -1, py:  1, pz: 0, u: 0, v: 1 },
            { px:  1, py:  1, pz: 0, u: 1, v: 1 },
            { px: -1, py: -1, pz: 0, u: 0, v: 0 },
            { px:  1, py: -1, pz: 0, u: 1, v: 0 }
        ];
        for (let i = 0; i < num; ++i) {
            //for (const v of vts) {
            for (let j = 0; j < vts.length; ++j) {
                const v = vts[j];
                ps[i*12+j*3] = v.px;
                ps[i*12+j*3+1] = v.py;
                ps[i*12+j*3+2] = -i;
                ns[i*12+j*3] = 0;
                ns[i*12+j*3+1] = 0;
                ns[i*12+j*3+2] = 1;
                uvs[i*8+j*2] = vts.u;
                uvs[i*8+j*2+1] = vts.v;
            }
            let v0 = i * 4;
            let v1 = v0 + 1;
            let v2 = v1 + 1;
            let v3 = v2 + 1;
            fis[i*6] = v0;
            fis[i*6+1] = v2;
            fis[i*6+2] = v1;
            fis[i*6+3] = v1;
            fis[i*6+4] = v2;
            fis[i*6+5] = v3;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(ps, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(ns, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex(new THREE.BufferAttribute(fis, 1));

        const dpr = window.devicePixelRatio;
        const mtl = new THREE.ShaderMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide,
            vertexShader: vs.join('\n'),
            fragmentShader: fs.join('\n'),
            uniforms: {
                uReso: new THREE.Uniform(new THREE.Vector3(this.logicw, this.logich, 20)),
                uPos: new THREE.Uniform(new THREE.Vector3(
                    inopt.x * this.logicw / inopt.w,
                    inopt.y * this.logich / inopt.h,
                    num)),
                uMsec: new THREE.Uniform(0)
            }
        });
        const m = new THREE.Mesh(geo, mtl);
        m.renderOrder = this.ORDER_TOUCH;
        m.userData = {};
        return m;
    }

/**
 * 床を作る
 */
    makeGround() {
        {
            const m = this.makeBox([20, 1, 20],
                [0, -2, 0], 0,
                { color: 0x333333 });
            m.receiveShadow = true;
            this.mainscene.add(m);
        }
    }

/**
 * 物理とメッシュの箱を作る
 * @param {number[]} sides 3要素で辺の長さ
 * @param {number[]} pos 3要素
 * @param {number} mass 質量
 */
    makeBox(sides, pos, mass, inopt = {}) {
        {
            const geo = new THREE.BoxBufferGeometry(
                ...sides);
            const mtl = new THREE.MeshStandardMaterial({
                color: inopt.color ?? 0xffcccc,
            });
            const m = new THREE.Mesh(geo, mtl);

            const box = new Ammo.btBoxShape(bt3(
                sides[0] * 0.5,
                sides[1] * 0.5,
                sides[2] * 0.5));
            const transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(bt3(...pos));
            //transform.setRotation(btq(0.1, 0, 0, 0.9));
            const motionState = new Ammo.btDefaultMotionState(transform);
            const localInertia = bt3(0, 0, 0);
            box.calculateLocalInertia(localInertia);
            const body = new Ammo.btRigidBody(
                new Ammo.btRigidBodyConstructionInfo(
                    mass, motionState, box, localInertia)
            );
            body.setFriction(0);
            body.setDamping(0, 0);
// ワールドに追加
            this.world.addRigidBody(body);

            m.userData.rigidbody = body;

            if (mass > 0) {
            //{
                body.setActivationState(DISABLE_DEACTIVATION);

                m.userData.syncfunc = () => {
                    const ms = body.getMotionState();
                    if (ms) {
                        ms.getWorldTransform(this.tempTrans);
                        const p = this.tempTrans.getOrigin();
                        const q = this.tempTrans.getRotation();
                        m.position.set(p.x(), p.y(), p.z());
                        m.quaternion.set(q.x(), q.y(), q.z(), q.w());
                    }
                };
            }

            return m;
        }
    }



}


if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = Phy;
    }
    exports.Phy = Phy;
} else {
    global_.Phy = Phy;
}

})( (this || 0).self || typeof self !== 'undefined' ? self : global );


