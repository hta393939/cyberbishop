/**
 * @file index.js
 */

import { UIClass } from "./ui.js";

class IPhysicsCollisionEvent {
  constructor() {
    this.collidedAgainst;
    this.collider;
    this.distance = 0;
    this.impulse = 0;
    this.normal;
    this.point;
    /**
     * @type {PhysicsEventType}
     * COLLISION_* or TRIGGER_*
     */
    this.type;
  }
}

class MeshColli {
  constructor() {
    this.meshes = [];
    this.meshes2 = [];
  }

  init(scene) {
    // 
    // 
    // 
  }

  check() {
    for (const m of this.meshes) {
      for (const m2 of this.meshes2) {
        /**
         * @type {boolean}
         */
        const result = m.intersectsMesh(m2);
      }
    }
  }

}

class PhyColli {
  constructor() {

  }

  init(scene) {
    for (let i = 0; i < 100; ++i) {
      const box = BABYLON.MeshBuilder.CreateBox(
        `box${i}`,
        {
          width: 1,
          height: 1,
          depth: 2,
        },
        scene,
      );
      box.position = new BABYLON.Vector3(i, 6, 0);
      const pa = new BABYLON.PhysicsAggregate(
        box,
        BABYLON.PhysicsShapeType.BOX,
        {
          mass: 2,
          friction: 0,
          collisionMargin: 0.05,
        },
        scene,
      );
      pa.body.setGravityFactor(0);
    }
  }

  /**
   * 床相当にのみ処理関数を追加する
   * @param {BABYLON.PhysicsAggregate} pa 
   */
  setToFloor(pa) {
    pa.body.getCollisionObservable().add((colliev) => {
      //console.log('colli ob', colliev);
    });

    pa.body.getCollisionEndedObservable().add((colliev) => {
      //console.log('colli end ob', colliev);
    });

    pa.body.setCollisionCallbackEnabled(true);
    pa.body.setCollisionEndedCallbackEnabled(true);
  }

}


class Misc {
  static STORAGE_SLOW = 'slow';
  static STORAGE_FAST = 'fast';

  constructor() {
    this.baby = null;

    this.joys = [null, null];
    this.isTop = true;

    /**
     * 3rd カメラ計算を実行するかしないか
     */
    this.isThirdCamera = false;
    //this.isThirdCamera = true;

    this.tireDeg = 0;

    this.my = {
      mesh: null,
      pa: null,
    };

    this.ts = [];
  }

  async init() {
    this.loadSetting();
    this.saveSetting();

    const param = {
      width: 960, // 論理ピクセル幅
      height: 540,
      //height: 720,
    };
    param.canvas = document.getElementById('maincanvas');
    await this.firstInit(param);

    await new Promise((resolve, reject) => {
      effekseer.initRuntime('./effekseer.wasm', () => {
        resolve();
      });
    });
    {
      const context = effekseer.createContext();
      this.initEffek(context);
    }

    const _onResize = () => {
      return;
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

    { // 物理衝突検討
      const colli = new PhyColli();
      this.phycolli = colli;
      //colli.init(this.scene);
    }

    await this.secondInit(this.scene);

    {
      this.phycolli.init(this.scene);
    }
  }

  saveSetting() {
    try {
      const obj = {};
      localStorage.setItem(Misc.STORAGE_SLOW, JSON.stringify(obj));
    } catch (e) {

    }
  }

  loadSetting() {
    try {
      const text = localStorage.getItem(Misc.STORAGE_SLOW);
      const obj = JSON.parse(text);
    } catch (e) {

    }
  }

  initEffek(context) {
    console.log('initEffek', context);
  }

/**
 * canvas を描画する必要最低限
 * @param {*} param 
 */
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
    this.camera = camera;
    camera.fov = Math.PI * 60 / 180;
    camera.setPosition(new BABYLON.Vector3(2, 5, 20));
    camera.wheelDeltaPrecentage = 0.01;
    if (!this.isThirdCamera) {
      camera.attachControl();
    }

    if (false) {
      const light = new BABYLON.PointLight('light1',
        new BABYLON.Vector3(1, 5, 4),
        scene);
    }
    if (false) {
      const light = new BABYLON.DirectionalLight('light2',
        new BABYLON.Vector3(-1, -1, -1),
        scene);
    }
    {
      const light = new BABYLON.HemisphericLight('light3',
        new BABYLON.Vector3(1, 5, 4),
        //new BABYLON.Vector3(1, 1, 1),
        scene);
    }

    {
      const ui = new UIClass();
      this.ui = ui;
      ui.addEventListener(UIClass.EVENT_CLICK, ev => {
        console.log('ev', ev.detail.v2winfo);
      });
      ui.addEventListener(UIClass.EVENT_ACTION, ev => {
        console.log('action fire', ev);
      });
      ui.init(scene);
    }

    engine.runRenderLoop(() => {
      this.update();
      scene.render();
    });
  }

  /**
   * 高頻度に更新する
   */
  update() {
    const delta = this.scene.getEngine().getDeltaTime();

    {
      const now = Date.now();
      this.ts.push(now);
      this.ts = this.ts.filter(ts => {
        return (now - ts < 3000);
      });
      const num = this.ts.length;
      let fps = num / 3;
      {
        const tb = this.ui?.tbFPS;
        if (tb) {
          tb.text = `${fps.toFixed(1)} [fps]`;
        }
      }
    }

    if (this.padManager) {
      for (const pad of this.padManager.gamepads) {
        if (!pad || !pad.isConnected) {
          continue;
        }
        this.updateByPad(pad);
      }
    }

    this.applyCarForce();

    if (this.isThirdCamera) {
      this.updateThirdCamera();
    }

    if (!this.joys[1]) {
      return;
    }

    {
      const ljx = this.joys[0].deltaPosition.x;
      const rjx = this.joys[1].deltaPosition.y;
      let x = ljx * 10;
      let y = rjx * 10;
      let z = 20;
      this.camera.setPosition(new BABYLON.Vector3(x, y, z));
    }
  }

  async secondInit(scene) {
    console.log('secondInit');
    const havokInstance = await HavokPhysics({
      locationFile: () => './HavokPhysics.wasm'
    });
    const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
    scene.enablePhysics(new BABYLON.Vector3(0, -9.8 / 60, 0),
      havokPlugin);

    this.makeCar(scene);
    //this.makeMap(scene);
    this.makeAreas(scene);
    //this.makeWall(scene);

    this.readyInput(scene);
  }

  /**
   * 車1つ作る
   * @param {*} scene 
   */
  makeCar(scene) {
    const obj = { width: 1.7, height: 1.5, depth: 4.7 };
    console.log('makeCar', obj);

    { // body
      const bodyMesh = BABYLON.MeshBuilder.CreateBox('my',
        obj,
        scene);
      console.log('bodyMesh', bodyMesh.name, bodyMesh);
      bodyMesh.position.y = obj.height / 2;

      const param = {
        mass: 1,
        friction: 1,
        restitution: 0,
      };
      const pa = new BABYLON.PhysicsAggregate(bodyMesh,
        BABYLON.PhysicsShapeType.CONVEX_HULL,
        param);
      this.pa = pa;

      pa.body.startAsleep = true;

      this.my = {
        mesh: bodyMesh,
        pa,
      };
    }

    return;

    const tireTickHalf = 0.1;
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
      const width = tireTickHalf * 2;
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
      const pa = new BABYLON.PhysicsAggregate(
        m,
        BABYLON.PhysicsShapeType.CONVEX_HULL,
        {mass: 2, friction: 1,},
        scene);

      const xAxis = new BABYLON.Vector3(1, 0, 0);
      const hinge = new BABYLON.HingeConstraint(
        BABYLON.Vector3.Zero(), m.position,
        xAxis, xAxis,
        scene,
      );
      console.log('m', m, 'pa', pa, 'hinge', hinge);
      pa.body.addConstraint(this.pa.body, hinge);
    }

  }

/*
  makeMap(scene) {
    console.log('makeMap');

    { // 地面用テクスチャを生成する
      const tex = new BABYLON.Texture('./ground1.png', scene);
      this.groundtex = tex;
    }

    {
      const ground = BABYLON.MeshBuilder.CreateGround('ground1',
        { width: 100, height: 100 },
        scene);
      ground.setAbsolutePosition(new BABYLON.Vector3(0, -5, 0));
      const pa = new BABYLON.PhysicsAggregate(ground,
        BABYLON.PhysicsShapeType.BOX,
        { mass: 0, friction: 1, restitution: 0 },
        scene);
    }
  }*/

  /**
   * 
   * @param {BABYLON.Scene} scene 
   * @param {bolean} cross 
   */
  makeOneArea(param, scene, cross) {
    const vd = BABYLON.CreateBoxVertexData({
      width: 2, height: 2, depth: 2,
    });

    const dirs = [
      [-1, 1, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1]
    ];
    const numVertex = vd.positions.length / 3;
    for (let i = 0; i < numVertex; ++i) {
      const ft3 = i * 3;
      const p = vd.positions.slice(ft3, ft3 + 3);
      const index = dirs.findIndex(v => {
        return (v[0] === p[0] && v[1] === p[1] && v[2] === p[2]);
      });
      for (let j = 0; j < 3; ++j) {
        p[j] = p[j] * param.scale[j] + param.center[j];
      }
      if (index >= 0) {
        p[1] += param.adds[index];
      }

      vd.positions.splice(ft3, 3, ...p);
    }

    { // 上面 ＼
      const index = 4;
      if (cross && false || true) {
        const ft6 = index * 6;
        const ft4 = index * 4;
        const indices = [
          ft4, ft4 + 1, ft4 + 3,
          ft4 + 1, ft4 + 2, ft4 + 3,
        ];
        vd.indices.splice(ft6, 6, ...indices);
      }
    }

    //console.log('numVertex', numVertex, vd.positions.length, vd.positions);

    const m = new BABYLON.Mesh(`a${Math.random()}`,
      scene);
    vd.applyToMesh(m, false);

    {
      const mtl = new BABYLON.StandardMaterial();
      mtl.diffuseTexture = this.groundtex;
      m.material = mtl;
    }

    const pa = new BABYLON.PhysicsAggregate(
      m,
      BABYLON.PhysicsShapeType.CONVEX_HULL,
      { mass: 0, restitution: 0 },
    );

    { // TODO: 物理
      this.phycolli?.setToFloor(pa);
    }
  }

  makeAreas(scene) {
    const cross = [
      true, true, true, true,
      true, true, true, true,
      true, true, true, true,
      true, true, true, true,
    ];
    const half = 20;
    const wnum = 4;
    const hnum = 4;
    for (let i = 0; i < wnum * hnum; ++i) {
      const param = {
        //adds: [0.4, 0.1, 0.2, 0.3],
        adds: [0, 0, 0, 0],
        center: [
          ((i & 3) * 2 - wnum + 1) * half,
          -5,
          (Math.floor(i / 4) * 2 - hnum + 1) * half,
        ],
        scale: [
          half,
          1,
          half,
        ],
      };
      this.makeOneArea(param,
        scene, cross[i]);
    }
  }

  /**
   * 衝突確認のための壁を生成する
   * @param {BABYLON.Scene} scene 
   */
  makeWall(scene) {
    for (let i = 0; i < 4; ++i) {
      let x = [0, 100, 0, -100][i];
      let y = 50;
      let z = [-100, 0, 20, 0][i];
      let w = [100, 1, 100, 1][i];
      let d = [1, 100, 1, 100][i];
      const box = BABYLON.MeshBuilder.CreateBox(
        `wall${Date.now()}`,
        {
          width: w, height: 100, depth: d,
        },
        scene,
      );
      box.metadata = {
        keywords: ['wall'],
        side: `${x}_${z}`,
      };
      box.position = new BABYLON.Vector3(x, y, z);
      const pa = new BABYLON.PhysicsAggregate(
        box,
        BABYLON.PhysicsShapeType.BOX,
        {
          mass: 0, // 動かない．mass 0 が観察して発火する
          restitution: 1, // 当たると少し反発
        },
        scene,
      );
      pa.body.setGravityFactor(0);

      {
        pa.body.getCollisionObservable().add(colliev => {
          console.log('wall colli event fire!', colliev);
        });
        pa.body.setCollisionCallbackEnabled(true);
      }
    }
  }

  /**
   * 力加えて移動
   * @param {*} param 
   * @returns 
   */
  applyCarForce(param) {
    const m = this.my?.mesh;
    if (!m) {
      return;
    }
    const body = this.my?.pa?.body;
    if (!body) {
      return;
    }

    if (!param) {
      //return;
    }

    /** タイヤの間隔の半分 */
    const bodyLenHalf = 1;
    /** 車体に対するタイヤの角度。0度は正面 */
    const tireAng = this.tireDeg * Math.PI / 180;
    /** 進行方向(グローバル) */
    const gvDir = new BABYLON.Vector3(0, 0, 1).normalize();

    // 姿勢を得る
    const q = m.absoluteRotationQuaternion;
    const center = m.absolutePosition.clone();

    const fs = [];
    {
      // トラクション タイヤの向き??
      const traScale = 2;
      const tra = {
        offset: new BABYLON.Vector3(0, 0, 0),
        power: new BABYLON.Vector3(
          0,
          0,
          1,
        ).scale(traScale),
        relative: true,
      };
      fs.push(tra);
      // ブレーキ ??
      const brake = {
        offset: new BABYLON.Vector3(0, 0, 0),
        power: new BABYLON.Vector3(
          0,
          0,
          0,
        ),
        relative: true,
      };
      fs.push(brake);
      // 空気抵抗 進行方向では??
      const aero = {
        offset: new BABYLON.Vector3(0, 0, 0),
        power: new BABYLON.Vector3(
          0,
          0,
          -1,
        ),
        relative: true,
      };
      fs.push(aero);
      // 転がり摩擦 ↓
      
      // 遠心力
      const centriScale = bodyLenHalf * 2 * Math.sin(tireAng);
      const centri = {
        offset: new BABYLON.Vector3(0, 0, 0),
        power: new BABYLON.Vector3(
          1,
          0,
          0,
        ).scale(centriScale),
        relative: true,
      };
      fs.push(centri);
      // コーナリングフォース
      const cornerScale = 1;
      const corner = {
        offset: new BABYLON.Vector3(0, 0, 0),
        power: new BABYLON.Vector3(
          -1,
          0,
          0,
        ).scale(cornerScale),
        relative: true,
      };
      fs.push(corner);
    }

    for (const f of fs) { // 入力を姿勢で変換する
      const force = f.relative ?
        f.power.applyRotationQuaternion(q)
        : f.power.clone();
      const pos = center.add(f.offset.applyRotationQuaternion(q));
      body.applyForce(force, pos);
    }
  }

  /**
   * スピード制限する
   * @param {*} body 
   */
  limitSpeed(body) {
    // velo を得る
    const linear = body.getLinearVelocity();
    const ang = body.getAngularVelocity();
    // 制限する
    const len = Math.min(2, linear.length());
    linear.normalize().scale(len);

    // 回転の制限はどうしよう
    // クォータニオンに変換してから制限か??
    let angLimit = Math.PI * 2;
    ang.x = Misc.limitAbs(ang.x, angLimit);
    ang.y = Misc.limitAbs(ang.y, angLimit);
    ang.z = Misc.limitAbs(ang.z, angLimit);

    // 制限する
    body.setLinearVelocity(linear);
    body.setAngularVelocity(ang);
  }

  /**
   * TPSカメラとしてlookAtと位置を更新する
   * @returns 
   */
  updateThirdCamera() {
    const camera = this.camera;
    const m = this.my.mesh;
    const q = m?.absoluteRotationQuaternion?.clone();
    const center = m?.absolutePosition?.clone();
    if (!q) {
      return;
    }

    const up = new BABYLON.Vector3(0, 1, 0).applyRotationQuaternion(q);
    const fw = new BABYLON.Vector3(0, 0, 1).applyRotationQuaternion(q);

    const height = 10;
    const back = 30 - 4;

    const target = center.add(up.scale(height));
    const pos = target.add(fw.scale(-back));

    camera.target = target;
    camera.setPosition(pos);
  }

  /**
   * アナログスティックでハンドリングを決定する
   * @see https://doc.babylonjs.com/typedoc/classes/BABYLON.GenericPad#leftStick
   * @param {BABYLON.GenericPad} pad 
   */
  updateByPad(pad) {
    const left = pad.leftStick;
    const right = pad.rightStick;
    /** デッドゾーン */
    const dead = 0.2;
    const over = 0.8;
    let aly = Math.abs(left.y);
    let ary = Math.abs(right.y);
    aly = (aly < dead) ? 0 : aly;
    ary = (ary < dead) ? 0 : ary;
    // 内に回した分を追加する
    if (aly > over) {
      aly += Math.max(0, left.x);
    }
    if (ary > over) {
      ary += Math.max(0, -right.x);
    }

    const tireDeg = (aly * Math.sign(left.y) - ary * Math.sign(right.y)) * 10;
    this.tireDeg = tireDeg;

    document.body.dataset['tireDeg'] = tireDeg.toFixed(1);
  }

  readyPadInput(pad) {
    // 変更できる
    pad._rightStickAxisX = 5;
    pad._rightStickAxisY = 2;

    pad.onButtonDownObservable.add((index) => {
      console.log('down observe', index,
        new Date().toLocaleTimeString()); // 連打どうなるの?
      const LEFTUPPER = 4;
      const RIGHTUPPER = 5;
      const LEFTLOWER = 6;
      const RIGHTLOWER = 7;
      switch(index) {
      case LEFTUPPER:
        break;
      case RIGHTUPPER:
        break;
      }
    });
  }

  /**
   * 入力の反映
   */
  readyInput(scene) {

    scene.onPointerMove = () => {
      //console.log('onPointerMove', scene.pointerX, scene.pointerY);
      const ray = scene.createPickingRay(
        scene.pointerX,
        scene.pointerY,
        BABYLON.Matrix.Identity(),
        this.camera);
      const hit = scene.pickWithRay(ray);
      const m = hit.pickedMesh;
      if (m) {
        //if (this.isfirst) {
          //console.log(m.name, m);
        //}
      }
    };
    
    scene.onKeyboardObservable.add(kbInfo => {
      console.log('scene keyboard', kbInfo);
      switch(kbInfo.type) {
      case BABYLON.KeyboardEventTypes.KEYDOWN:
        break;

      case BABYLON.KeyboardEventTypes.KEYUP:
        switch(kbInfo.event.key.toLowerCase()) {
          case 'z':
            break;
          case 'x':
            break;
          case 'c':
            break;
          case 'v':
            this.isThirdCamera = !this.isThirdCamera;
            break;
        }
        break;
      }

    });

    { // パッド観察
      const padManager = new BABYLON.GamepadManager(scene);
      this.padManager = padManager;
      padManager.onGamepadConnectedObservable.add((pad) => {
        console.log('connected', pad);

        this.readyPadInput(pad);
      });
      padManager.onGamepadDisconnectedObservable.add((pad) => {
        console.log('disconnected', pad);
      });
    }

  }

  /**
   * 絶対値を制限する
   * @param {number} v 
   * @param {number} limit 
   * @returns 
   */
  static limitAbs(v, limit) {
    return Math.sign(v) * Math.min(Math.abs(v), limit);
  }

}

const misc = new Misc();
misc.init();

