/**
 * @file phy.js
 */

Ammo().then(function(Ammo) {


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


//var DISABLE_DEACTIVATION = 4;


var clock = new THREE.Clock();

/**
 * var の高さデータ
 */
var heightData = null;
/**
 * 物理のメモリ
 */
var ammoHeightData = null;

var transformAux1 = null;

/**
 * 物理コンフィグ
 */
var config;
var dispatcher;
var broadphase;
var solver;

/**
 * ワールド
 */
var physicsWorld;

/**
 * 同期関数リスト
 */
var syncList = [];
var time = 0;


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
/**
 * ビークルの重量
 * @default 800
 */
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
 * 〇 これを使う．Car インスタンスを初期化する
 * @param {Ammo.btDynamicPhysicsWorld}
 */
    init() {
        console.log(this.name, 'init called');
// 
        const pos = new THREE.Vector3(0, 4, -20 + 10);

        // Chassis
        this.geometry = new Ammo.btBoxShape(
            bt3(this.chassisWidth * 0.5,
                this.chassisHeight * 0.5,
                this.chassisDepth * 0.5));
        const transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(bt3(pos.x, pos.y, pos.z));
        //transform.setRotation(btq(0, 0, 0, 1));
        const motionState = new Ammo.btDefaultMotionState(transform);
        const localInertia = bt3(0, 0, 0);
        this.geometry.calculateLocalInertia(this.massVehicle, localInertia);
        const rbInfo = new Ammo.btRigidBodyConstructionInfo(
            this.massVehicle, motionState, this.geometry, localInertia);
        const body = new Ammo.btRigidBody(rbInfo);
        body.setActivationState(DISABLE_DEACTIVATION);
        physicsWorld.addRigidBody(body);
        const chassisMesh = this.createChassisMesh(
            this.chassisWidth,
            this.chassisHeight,
            this.chassisDepth,
        );
        this.chassisMesh = chassisMesh;

// レイキャストビークル
        this.engineForce = 0;
        this.vehicleSteering = 0;
        this.breakingForce = 0;
        this.tuning = new Ammo.btVehicleTuning();
        this.rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
        var vehicle = new Ammo.btRaycastVehicle(
            this.tuning, this.body, this.rayCaster);

        vehicle.setCoordinateSystem(0, 1, 2);
        physicsWorld.addAction(vehicle);

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

/**
 * 物理とメッシュでホイールを追加する
 * @param {boolean} isFront 前輪かどうか
 * @param {Ammo.btVector3} pos 
 * @param {*} radius 半径
 * @param {number} width 幅
 * @param {number} index 0からのインデックス
 */
//        function addWheel(isFront, pos, radius, width, index) {
        const addWheel = (isFront, pos, radius, width, index) => {
            console.log(this.name, 'addWheel called', index);

            const wheelInfo = vehicle.addWheel(
                pos,
                this.wheelDirectionCS0,
                this.wheelAxleCS,
                this.suspensionRestLength,
                radius,
                this.tuning,
                isFront,
            );
            wheelInfo.set_m_suspensionStiffness(this.suspensionStiffness);
            wheelInfo.set_m_wheelsDampingRelaxation(this.suspensionDamping);
            wheelInfo.set_m_wheelsDampingCompression(this.suspensionCompression);
            wheelInfo.set_m_frictionSlip(this.friction);
            wheelInfo.set_m_rollInfluence(this.rollInfluence);

            this.wheelMeshes[index] = this.createWheelMesh(radius, width, index);
        }

        addWheel(true,
            bt3(this.wheelHalfTrackFront,
                this.wheelAxisHeightFront,
                this.wheelAxisFrontPosition),
            this.wheelRadiusFront,
            this.wheelWidthFront,
            this.FRONT_LEFT);
        addWheel(true,
            bt3(-this.wheelHalfTrackFront,
                this.wheelAxisHeightFront,
                this.wheelAxisFrontPosition),
            this.wheelRadiusFront,
            this.wheelWidthFront,
            this.FRONT_RIGHT);

        addWheel(false,
            bt3(this.wheelHalfTrackBack,
                this.wheelAxisHeightBack,
                this.wheelAxisPositionBack),
            this.wheelRadiusBack,
            this.wheelWidthBack,
            this.BACK_LEFT);
        addWheel(false,
            bt3(-this.wheelHalfTrackBack,
                this.wheelAxisHeightBack,
                this.wheelAxisPositionBack),
            this.wheelRadiusBack,
            this.wheelWidthBack,
            this.BACK_RIGHT);

        function sync(dt) {
            const speed = vehicle.getCurrentSpeedKmHour();
    
            this.breakingForce = 0;
            this.engineForce = 0;
    
            if (false) {
    
            }
            if (false) {
    
            }
    /*
            vehicle.applyEngineForce(this.engineForce, this.BACK_LEFT);
            vehicle.applyEngineForce(this.engineForce, this.BACK_RIGHT);
    
            vehicle.setBrake(this.breakingForce / 2, this.FRONT_LEFT);
            vehicle.setBrake(this.breakingForce / 2, this.FRONT_RIGHT);
            vehicle.setBrake(this.breakingForce, this.BACK_LEFT);
            vehicle.setBrake(this.breakingForce, this.BACK_RIGHT);
    
            vehicle.setSteeringValue(this.vehicleSteering, this.FRONT_LEFT);
            vehicle.setSteeringValue(this.vehicleSteering, this.FRONT_RIGHT);
    */      
            const n = vehicle.getNumWheels();
            window.idwheelnumview.textContent = `${n} ${tstr()}`;
    
    // TODO: var
            var tm, p, q;
            for (let i = 0; i < n; ++i) {
                vehicle.updateWheelTransform(i, true);
                tm = vehicle.getWheelTransformWS(i);
                p = tm.getOrigin();
                q = tm.getRotation();
                // TODO: 〇
//                this.wheelMeshes[i].position.set(p.x(), p.y(), p.z());
//                this.wheelMeshes[i].quaternion.copy(bt2q(q));
            }
    
            tm = vehicle.getChassisWorldTransform();
            p = tm.getOrigin();
            q = tm.getRotation();
            // TODO: 〇
            //this.chassisMesh.position.set(p.x(), p.y(), p.z());
            //this.chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
        }

        syncList.push(sync);
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

        const wheelInfo = this.vehicle.addWheel(
            pos,
            this.wheelDirectionCS0,
            this.wheelAxleCS,
            this.suspensionRestLength,
            radius,
            this.tuning,
            isFront,
        );
        wheelInfo.set_m_suspensionStiffness(this.suspensionStiffness);
        wheelInfo.set_m_wheelsDampingRelaxation(this.suspensionDamping);
        wheelInfo.set_m_wheelsDampingCompression(this.suspensionCompression);
        wheelInfo.set_m_frictionSlip(this.friction);
        wheelInfo.set_m_rollInfluence(this.rollInfluence);

        this.wheelMeshes[index] = this.createWheelMesh(radius, width, index);
    }

/**
 * 物理演算の結果をメッシュに反映する
 * @param {number} dt 
 */
    sync(dt) {
        const vehicle = this.vehicle;
        if (!vehicle) {
            //return;
        }

        const speed = vehicle.getCurrentSpeedKmHour();

        this.breakingForce = 0;
        this.engineForce = 0;

        if (false) {

        }
        if (false) {

        }
/*
        vehicle.applyEngineForce(this.engineForce, this.BACK_LEFT);
        vehicle.applyEngineForce(this.engineForce, this.BACK_RIGHT);

        vehicle.setBrake(this.breakingForce / 2, this.FRONT_LEFT);
        vehicle.setBrake(this.breakingForce / 2, this.FRONT_RIGHT);
        vehicle.setBrake(this.breakingForce, this.BACK_LEFT);
        vehicle.setBrake(this.breakingForce, this.BACK_RIGHT);

        vehicle.setSteeringValue(this.vehicleSteering, this.FRONT_LEFT);
        vehicle.setSteeringValue(this.vehicleSteering, this.FRONT_RIGHT);
*/      
        const n = vehicle.getNumWheels();
        window.idwheelnumview.textContent = `${n} ${tstr()}`;

// TODO: var
        var tm, p, q;
        for (let i = 0; i < n; ++i) {
            vehicle.updateWheelTransform(i, true);
            tm = vehicle.getWheelTransformWS(i);
            p = tm.getOrigin();
            q = tm.getRotation();
            this.wheelMeshes[i].position.set(p.x(), p.y(), p.z());
            this.wheelMeshes[i].quaternion.copy(bt2q(q));
        }

        tm = vehicle.getChassisWorldTransform();
        p = tm.getOrigin();
        q = tm.getRotation();
        this.chassisMesh.position.set(p.x(), p.y(), p.z());
        this.chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());
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
// TODO: var
        transformAux1 = new Ammo.btTransform();

        /**
         * ロード途中でキャンセル押すとこれを立てる
         */
        this.cancelloading = false;

        this.loading = {
            loaded: 0,
            total: 0
        };

        this.amblevel = 0.8;
        this.difflevel = 0.8;

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

// TODO: var
        heightData = this.generateHeight(
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
// TODO: var
        ammoHeightData = Ammo._malloc(4 * this.terrainWidth * this.terrainDepth);

        let p = 0;
        let p2 = 0;
        for (let j = 0; j < this.terrainDepth; ++j) {
            for (let i = 0; i < this.terrainWidth; ++i) {
// TODO: var
                Ammo.HEAP32[ammoHeightData + p2 >> 2] = heightData[p];

                p ++;
                p2 += 4;
            }
        }

        const heightShape = new Ammo.btHeightfieldTerrainShape(
            this.terrainWidth,
            this.terrainDepth,
// TODO: var
            ammoHeightData,
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
            physicsWorld.addRigidBody(body);
        }
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

        {
            const el = window.idtimeview;
            el.textContent = `${this.time.toFixed(1)}`;
        }

        this.draw();

//        this.status.update();
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

        const deltaTime = clock.getDelta();

        if (this.renderer) {
            this.renderer.render(this.mainscene, this.maincamera);
        }
    }



/**
 * API. 初期化する
 * @param {{}} inopt 
 */
    async initialize(inopt) {
        console.log(this.name, 'initialize called');

        this.initGL(inopt.canvas);

        {
            const car = new Car();
            this.car = car;
            car.init(physicsWorld);

            this.mainscene.add(car.chassisMesh);
            for (const v of car.wheelMeshes) {
                this.mainscene.add(v);
            }
        }

        console.log(this.name, 'initialize leaves');
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
            physicsWorld.addRigidBody(body);

            m.userData.rigidbody = body;

            if (mass > 0) {
            //{
                body.setActivationState(DISABLE_DEACTIVATION);

                m.userData.syncfunc = () => {
                    const ms = body.getMotionState();
                    if (ms) {
                        // TODO: var
                        ms.getWorldTransform(transformAux1);
                        const p = transformAux1.getOrigin();
                        const q = transformAux1.getRotation();
                        m.position.set(p.x(), p.y(), p.z());
                        m.quaternion.set(q.x(), q.y(), q.z(), q.w());
                    }
                };
            }

            return m;
        }
    }



}



class Misc {
    constructor() {
        this.inver = `0.3.3`;

        /**
         * code はボタンでわかる(KeyA)。key は a や A
         */
        this.CODE_A = 'KeyA';
        this.CODE_W = 'KeyW';
        this.CODE_D = 'KeyD';
        this.CODE_S = 'KeyS';
        this.CODE_Z = 'KeyZ';
        // ok扱いにするか..
        this.CODE_X = 'KeyX';
        // キャンセル扱いにするか..
        this.CODE_C = 'KeyC';

        /**
         * Chrome Win10 では code も key もこれ
         */
        this.CODE_UP = 'ArrowUp';
        this.CODE_RIGHT = 'ArrowRight';
        this.CODE_DOWN = 'ArrowDown';
        this.CODE_LEFT = 'ArrowLeft';

        /**
         * atsumaru インスタンス
         */
        this.ra = null;
/**
 * アナログパッド
 */
        this.analog = null;

        this.stock = {};

/**
 * 論理幅 16:9
 */
        this.logicw = 768;
        this.logich = 432;

        /**
         * ブラウザでのピクセル認識幅
         */
        this.curw = + this.logicw;
        this.curh = + this.logich;

        /**
         * 累積用の前ts
         */
        this.prets = 0;
        /**
         * ゲーム累積カウンター
         */
        this.tscum = 0;
        /**
         * スコアボードは 1
         */
        this.boardid = 1;
        /**
         * ボード表示中かどうか
         */
        this.isboard = false;

        //this.drawing = new Draw();
    }

/**
 * 高頻度に更新する
 */
    update() {
        requestAnimationFrame(() => {
            this.update();
        });

        const nowts = Date.now();
        let diff = 0;
        if (this.prets) {
            diff = nowts - this.prets;
        }
        this.prets = nowts;
        this.tscum += diff;

        if (this.analog) {
            this.analog.updateStatus();
        }

        //if (this.drawing) {
            //this.drawing.update();
            //this.drawing.draw();
        //}

        if (this.phy) {
            this.phy.update();
        }
    }

    /**
     * 816x624(RPGツクールMVデフォルト設定)、 624x816、"768x432"
     * @param {number} inw 
     * @param {number} inh 
     */
    resize(inw, inh) {
        this.curw = inw;
        this.curh = inh;
    }

/**
 * 初期化する
 */
    async initialize() {
        {
            const ra = new RPGAtsumaru();
            this.ra = ra;
            ra.initialize();
        }
        {
            const analog = new Analog();
            this.analog = analog;
            analog.initialize();
        }

        if (this.drawing) {
        this.drawing.addEventListener(this.drawing.EV_DRAW, async ev => {
            const type = ev.detail.type;
            if (type === 'display') {
                this.isboard = true;
                try {
                    await this.ra.displayScore(this.boardid);
                } catch(ec) {
                    log(`display catch`, ec.message);
                }
                console.log(`display succ 閉じられてresolveする`);
                this.isboard = false;
            }
            if (type === 'score') {
                this.ra.setRecord(this.boardid, ev.detail.score);
            }
        });
        }

        this.checkSize();

        this.setListener();

        if (this.drawing) {
            this.drawing.initGL(window.idmain);

// スクリーンショット用の関数を登録する
            this.ra.setSS(this.drawing.getSS.bind(this.drawing));
        }

        {
            const phy = new Phy();
            this.phy = phy;
            phy.initialize({
                canvas: window.idcanvas,
            });
            phy.makeControl(window.idcanvas);

            phy.ready();
        }

        this.update();
    }

    checkSize() {
        const rc = document.body.getClientRects();
        console.log(`checkSize leave rc`, rc, window);
    }

    applyCurrent() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const r = window.devicePixelRatio;
        console.log(`applyCurrent`, r, w, h, w / h);

        this.resize(w, h);

        if (!this.drawing) {
            return;
        }
        this.drawing.setWH({
            curw: w,
            curh: h,
            devicePixelRatio: r
        });
    }

    setListener() {
        {
            this.applyCurrent();
            window.addEventListener('resize', () => {
                this.applyCurrent();
            });
        }

        {
            /**
             * @type {HTMLCanvasElement}
             */
            //const el = window.idmain;
            const el = window;
            el.addEventListener('keydown', ev => {
                //log(this.isboard, `keydown`, ev);
                if (this.isboard) {
                    return;
                }

                const ks = [
                    { code: this.CODE_W, key: this.ra.PAD_U },
                    { code: this.CODE_D, key: this.ra.PAD_R },
                    { code: this.CODE_S, key: this.ra.PAD_D },
                    { code: this.CODE_A, key: this.ra.PAD_L },
                    //{ code: this.CODE_UP, key: this.ra.PAD_U },
                    //{ code: this.CODE_RIGHT, key: this.ra.PAD_R },
                    //{ code: this.CODE_DOWN, key: this.ra.PAD_D },
                    //{ code: this.CODE_LEFT, key: this.ra.PAD_L },
                    // Xキーでランキングが閉じる気がする...
                    { code: this.CODE_Z, key: this.ra.PAD_OK },
                    { code: this.CODE_C, key: this.ra.PAD_CANCEL }
                ];
                const found = ks.find(v => {
                    return v.code === ev.code;
                });
                if (found) {
                    this.pad({ type: this.ra.PAD_KEYDOWN, key: found.key })
                }
            });
        }

        {
            /**
             * @type {HTMLCanvasElement}
             */
            const cv = window.idmain;
            if (cv) {
                cv.addEventListener('pointerdown', ev => {
                    log(`pointerdown`, ev);

                    if (!this.drawing) {
                        return;
                    }
                    this.drawing.addTouchEffect(ev);
                });
                cv.addEventListener('pointermove', ev => {

                });
                cv.addEventListener('pointerup', ev => {
                    log('pointerup', ev);
                });
            }
        }

        {
            const sub = this.ra.subscribe((info) => {
                this.pad(info);
            });
            log(sub);
        }

        {
            const el = document.getElementById('idmain');
            el.addEventListener('dragover', ev => {
                ev.preventDefault();
                ev.stopPropagation();
                ev.dataTransfer.dropEffect = 'copy';
            });
            el.addEventListener('drop', ev => {
                ev.preventDefault();
                ev.stopPropagation();

                let flag = false;
                const re = /(?<ext>\..*)$/;
                const m = re.exec(ev.dataTransfer.files[0].name);
                if (m) {
                    if (m.groups.ext.toLowerCase() === '.vrm') {
                        flag = true;
                    }
                }
                ev.dataTransfer.dropEffect = flag ? 'copy' : 'none';
                if (flag) {
                    this.loadFile(ev.dataTransfer.files[0]);
                }
            });
        }

        {
            const el = window.idlogging;
            if (el) {
                el.addEventListener('click', () => {
                    console.log('logging', this.phy.mainscene.children);
                });
            }
        }
    }

    /**
     * ファイルオブジェクトを指定する．ドラッグアンドドロップ時
     * @param {File} f 
     */
    async loadFile(f) {
        const ab = await f.arrayBuffer();
        this.stock[f.name] = ab;

        if (!this.drawing) {
            return;
        }
        this.drawing.loadVRM(ab, true, false);
    }

    pad(info) {
        //log(info);
        if (this.isboard) {
            return;
        }

        const ks = [this.ra.PAD_U, this.ra.PAD_R, this.ra.PAD_D, this.ra.PAD_L,
            this.ra.PAD_OK, this.ra.PAD_CANCEL];
        const types = [null, null, null, null, null, null];

        const index = ks.findIndex(k => {
            return info.key === k;
        });
        if (index >= 0) {
            types[index] = info.type;

            if (!this.drawing) {
                return;
            }
            this.drawing.input(...types);
        }
    }

}


/**
 * 物理演算の共通初期化
 */
function initPhysics() {
    console.log('initPhysics called');
    {
        config = new Ammo.btDefaultCollisionConfiguration();
        dispatcher = new Ammo.btCollisionDispatcher(config);
        broadphase = new Ammo.btDbvtBroadphase();
        solver = new Ammo.btSequentialImpulseConstraintSolver();

        physicsWorld = new Ammo.btDiscreteDynamicsWorld(
            dispatcher, broadphase, solver, config
        );
        physicsWorld.setGravity(bt3(0, -9.82, 0));
    }
    console.log('initPhysics leaves');
}


function createObjects() {

}

const misc = new Misc();


function tick() {
    requestAnimationFrame(tick);
    var dt = clock.getDelta();
    for (let i = 0; i < syncList.length; ++i) {
        syncList[i](dt);
    }
    physicsWorld.stepSimulation(dt, 10);
    if (misc?.phy?.control) {
        misc.phy.control.update();
    }
    time += dt;
}





    initPhysics();
    misc.initialize();
    createObjects();
    tick();
});



