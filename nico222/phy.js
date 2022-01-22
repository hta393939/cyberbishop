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
 * 定数
 * @default 4
 */
const DISABLE_DEACTIVATION = 4;
var TRANSFORM_AUX = new Ammo.btTransform();

var scene;
var camera;
/**
 * three レンダラ
 */
var renderer;
/**
 * コントロール
 */
var controls;
var clock = new THREE.Clock();

/**
 * var の高さデータ
 */
var heightData = null;
/**
 * 物理のメモリ
 */
var ammoHeightData = null;
/**
 * グローバルにしないとメモリが尽きる
 */
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

}


/**
 * loader.load() は data: arrayBuffer みたい
 */
class Phy {
    constructor() {
        this.tempTrans = new Ammo.btTransform();
// TODO: var
        transformAux1 = new Ammo.btTransform();

        this.amblevel = 0.8;
        this.difflevel = 0.6;

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
        this.terrainMaxHeight = 8 * 0 + 1 - 4;
/**
 * 高さの最小
 */
        this.terrainMinHeight = -2 - 4;

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

    ready() {
        return;
        {
            const m = this.makeHeightGround();
            scene.add(m);


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

}


/**
 * 
 * @param {THREE.Vector3} pos 
 * @param {THREE.Quaternion} quat 
 * @param {number} w 
 * @param {number} l 
 * @param {number} h 
 * @param {number} mass 
 * @param {number} friction 
 */
function createBox(pos, quat, w, l, h, mass, friction) {
    var geo = new THREE.BoxBufferGeometry(
        w, l, h, 1, 1, 1);
    const mtl = new THREE.MeshStandardMaterial({
        color: mass > 0 ? 0xffcccc : 0x999999,
    });

    if (!mass) {
        mass = 0;
    }
    if (!friction) {
        friction = 1;
    }

    const m = new THREE.Mesh(geo, mtl);
    m.position.copy(pos);
    m.quaternion.copy(quat);
    scene.add(m);

// TODO: ▽
    var geometry = new Ammo.btBoxShape(bt3(
        w * 0.5,
        l * 0.5,
        h * 0.5));
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(bt3(pos.x, pos.y, pos.z));
    transform.setRotation(btq(quat.x, quat.y, quat.z, quat.w));
    var motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = bt3(0, 0, 0);
// TODO: ここ ココ ☆
    geometry.calculateLocalInertia(mass, localInertia);
    var rbInfo = new Ammo.btRigidBodyConstructionInfo(
            mass, motionState, geometry, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);
    body.setFriction(friction);
    //body.setDamping(0, 0);
    physicsWorld.addRigidBody(body);

    if (mass > 0) {
        body.setActivationState(DISABLE_DEACTIVATION);
        function sync(dt) {
            var ms = body.getMotionState();
            if (ms) {
                ms.getWorldTransform(TRANSFORM_AUX);
                var p = TRANSFORM_AUX.getOrigin();
                var q = TRANSFORM_AUX.getRotation();
                m.position.set(p.x(), p.y(), p.z());
                m.quaternion.set(q.x(), q.y(), q.z(), q.w());
            }
        }
        syncList.push(sync);
    }

}

/**
 * scene に追加
 * @param {number} w 
 * @param {number} l 
 * @param {number} h 
 * @returns 
 */
function createChassisMesh(w, l, h) {
    const geo = new THREE.BoxBufferGeometry(w, l, h, 1, 1, 1);
    const mtl = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        //wireframe: true,
    });
    const m = new THREE.Mesh(geo, mtl);
    m.name = `c${pad(0, 5)}`;
    scene.add(m);
    return m;
}





/**
 * グラフィックスの初期化
 */
function initGraphics() {
    console.log('initGL called');

    let w = 768;
    let h = 432;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60,
        w / h, 0.2, 2000);
    let z = 2.7 * 10;
    camera.position.set(-4.84, 4.39 + 10, z);
    camera.lookAt(new THREE.Vector3(0.33, -0.40, 0.85));

    const canvas = window.idmain;

    const opt = {
        //preserveDrawingBuffer: true,
        canvas,
        antialias: true,
        //alpha: true
    };
    renderer = new THREE.WebGLRenderer(opt);
    renderer.setClearColor(0x333366, 1.0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h, false);

    //renderer.shadowMap.enabled = true;


    {
        //controls = new THREE.OrbitControls(camera, canvas);
        controls = new THREE.TrackballControls(camera, canvas);
    }

    {
        const axes = new THREE.AxesHelper(10);
        scene.add(axes);
    }

    { // 顔暗くなる
        let lv = Math.floor(0.6 * 255);
        var light = new THREE.AmbientLight((lv << 16) | (lv << 8) | lv);
        scene.add(light);
    }
    {
        let lv = 51;
        var light = new THREE.DirectionalLight(0x010101 * lv, 1);
        light.castShadow = true;
        //light.shadow.mapSize.width = 2048;
        //light.shadow.mapSize.height = 2048;
        //light.shadow.camera.near = 1;
        //light.shadow.camera.far = 100;
        //light.shadow.camera.light = -100;
        //light.shadow.camera.right = 100;
        //light.shadow.camera.top = -100;
        //light.shadow.camera.bottom = 100;
        //scene.add(light.target);

        light.position.set(-10, 10, 10);
        scene.add(light);

        const helper = new THREE.DirectionalLightHelper(light);
        //scene.add(helper);

        const lighthelper = new THREE.CameraHelper(light.shadow.camera);
        //scene.add(lighthelper);
    }

    window.container.appendChild(renderer.domElement);

    console.log('initGL leaves');
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



//const phy = new Phy();


function tick() {
    requestAnimationFrame(tick);
    var dt = clock.getDelta();
    for (let i = 0; i < syncList.length; ++i) {
        syncList[i](dt);
    }
    physicsWorld.stepSimulation(dt, 10);
    controls.update(dt);
    renderer.render(scene, camera);
    time += dt;
}

/**
 * メッシュを作成する
 * @param {number} radius 半径
 * @param {number} width 幅
 * @param {number} index インデックス
 * @returns {THREE.Mesh}
 */
 function createWheelMesh(radius, width, index) {
    console.log('createWheelMesh called');

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

    scene.add(m);
    console.log('createWheelMesh leaves');
    return m;
}

function createVehicle(pos, quat) {
    console.log('createVehicle called');

/**
 * シャーシの幅
 * @default 1.8
 */
    var chassisWidth = 1.8;
 /**
  * Y
  * @default 0.6
  */
        var chassisHeight = 0.6;
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
    var suspensionRestLength = 0.6;
         this.rollInfluence = 0.2;
 
         this.steeringIncrement = 0.04;
         this.steeringClamp = 0.5;
         this.maxEngineForce = 2000;
         this.maxBreakingForce = 100;

// TODO: ◇
    var chassisLength = 4;
    var massVehicle = 800;

    // Chassis
    var geometry = new Ammo.btBoxShape(
        new Ammo.btVector3(chassisWidth * 0.5,
            chassisHeight * 0.5,
            chassisLength * 0.5));
    var transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
        new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
    var motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = new Ammo.btVector3(0, 0, 0);
    geometry.calculateLocalInertia(massVehicle, localInertia);
    var rbInfo = new Ammo.btRigidBodyConstructionInfo(
        massVehicle, motionState, geometry, localInertia);
    var body = new Ammo.btRigidBody(rbInfo);
    body.setActivationState(DISABLE_DEACTIVATION);
    physicsWorld.addRigidBody(body);
    var chassisMesh = createChassisMesh(
        chassisWidth,
        chassisHeight,
        chassisLength,
    );

// レイキャストビークル
    var engineForce = 0;
    var vehicleSteering = 0;
    var breakingForce = 0;
    var tuning = new Ammo.btVehicleTuning();
    var rayCaster = new Ammo.btDefaultVehicleRaycaster(physicsWorld);
// TODO: ☆ ここ ココ
    var vehicle = new Ammo.btRaycastVehicle(
        tuning, body, rayCaster);

    vehicle.setCoordinateSystem(0, 1, 2);
    physicsWorld.addAction(vehicle);

    var FRONT_LEFT = 0;
    var FRONT_RIGHT = 1;
    var BACK_LEFT = 2;
    var BACK_RIGHT = 3;
/**
 * 車輪を保持する
 */
    var wheelMeshes = [];

// ▽ この辺;;
    var wheelDirectionCS0 = bt3(0, -1, 0);
// ▽ この辺;;
    var wheelAxleCS = bt3(-1, 0, 0);

/**
* 物理とメッシュでホイールを追加する
* @param {boolean} isFront 前輪かどうか
* @param {Ammo.btVector3} pos 
* @param {*} radius 半径
* @param {number} width 幅
* @param {number} index 0からのインデックス
*/
    function addWheel(isFront, pos, radius, width, index) {
//    const addWheel = (isFront, pos, radius, width, index) => {
        console.log('addWheel called', index);

        var wheelInfo = vehicle.addWheel(
            pos,
            wheelDirectionCS0,
            wheelAxleCS,
            suspensionRestLength,
            radius,
            // ◇
            tuning,
            isFront,
        );
        wheelInfo.set_m_suspensionStiffness(this.suspensionStiffness);
        wheelInfo.set_m_wheelsDampingRelaxation(this.suspensionDamping);
        wheelInfo.set_m_wheelsDampingCompression(this.suspensionCompression);
        wheelInfo.set_m_frictionSlip(this.friction);
        wheelInfo.set_m_rollInfluence(this.rollInfluence);
// TODO: 
        wheelMeshes[index] = createWheelMesh(radius, width, index);
    }

    addWheel(true,
        new Ammo.btVector3(this.wheelHalfTrackFront,
            this.wheelAxisHeightFront,
            this.wheelAxisFrontPosition),
        this.wheelRadiusFront,
        this.wheelWidthFront,
        FRONT_LEFT);
    addWheel(true,
        new Ammo.btVector3(-this.wheelHalfTrackFront,
            this.wheelAxisHeightFront,
            this.wheelAxisFrontPosition),
        this.wheelRadiusFront,
        this.wheelWidthFront,
        FRONT_RIGHT);

    addWheel(false,
        new Ammo.btVector3(this.wheelHalfTrackBack,
            this.wheelAxisHeightBack,
            this.wheelAxisPositionBack),
        this.wheelRadiusBack,
        this.wheelWidthBack,
        BACK_LEFT);
    addWheel(false,
        new Ammo.btVector3(-this.wheelHalfTrackBack,
            this.wheelAxisHeightBack,
            this.wheelAxisPositionBack),
        this.wheelRadiusBack,
        this.wheelWidthBack,
        BACK_RIGHT);

    function sync(dt) {
        //const speed = vehicle.getCurrentSpeedKmHour();

        breakingForce = 0;
        engineForce = 0;

        if (false) {

        }
        if (false) {

        }

        vehicle.applyEngineForce(engineForce, BACK_LEFT);
        vehicle.applyEngineForce(engineForce, BACK_RIGHT);

        vehicle.setBrake(breakingForce / 2, FRONT_LEFT);
        vehicle.setBrake(breakingForce / 2, FRONT_RIGHT);
        vehicle.setBrake(breakingForce, BACK_LEFT);
        vehicle.setBrake(breakingForce, BACK_RIGHT);

        vehicle.setSteeringValue(vehicleSteering, FRONT_LEFT);
        vehicle.setSteeringValue(vehicleSteering, FRONT_RIGHT);

        var tm, p, q, i;
        var n = vehicle.getNumWheels();

        for (i = 0; i < n; ++i) {
            vehicle.updateWheelTransform(i, true);
            tm = vehicle.getWheelTransformWS(i);
            p = tm.getOrigin();
            q = tm.getRotation();
            wheelMeshes[i].position.set(p.x(), p.y(), p.z());
            wheelMeshes[i].quaternion.set(q.x(), q.y(), q.z(), q.w());
        }

        tm = vehicle.getChassisWorldTransform();
        p = tm.getOrigin();
        q = tm.getRotation();
        // TODO: 〇
        chassisMesh.position.set(p.x(), p.y(), p.z());
        chassisMesh.quaternion.set(q.x(), q.y(), q.z(), q.w());

        window.idwheelnumview.textContent = `${p.y()} ${tstr()}`;
    }

    syncList.push(sync);
}

function createObjects() {
    console.log('createObjects called');

    createBox(new THREE.Vector3(0, -0.5, 0),
        new THREE.Quaternion(0, 0, 0, 1),
        75, 1, 75,
        0, 2);

    var quaternion = new THREE.Quaternion(0, 0, 0, 1);
    quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 18);
    createBox(new THREE.Vector3(0, -1.5, 0), quaternion, 8, 4, 10, 0);

    var size = 0.75;
    var nw = 8;
    var nh = 7;
    for (let j = 0; j < nw; ++j) {
        for (let i = 0; i < nh; ++i) {
            createBox(new THREE.Vector3(size * j - (size * (nw - 1)) / 2, size * i, 10),
                new THREE.Quaternion(0, 0, 0, 1),
                size, size, size,
                10);
        }
    }

    createVehicle.call({},
        new THREE.Vector3(0, 4 + 10, -20),
        new THREE.Quaternion(0, 0, 0, 1));
    console.log('createObjects leaves');
}


    initGraphics();
    initPhysics();
    {
        //phy.ready();
    }
    createObjects();
    tick();
    console.log('tick done', 'REVISION', THREE.REVISION);
});



