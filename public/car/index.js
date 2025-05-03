import { UIClass } from "./ui.js";

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

  static BIT_GROUND = 1;
  static BIT_BODY = 2;
  static BIT_TIRE = 4;
  static BIT_WALL = 8;

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

    /*
    await new Promise((resolve, reject) => {
      effekseer.initRuntime('./effekseer.wasm', () => {
        resolve();
      });
    });
    {
      const context = effekseer.createContext();
      this.initEffek(context);
    } */

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
  async firstInit(param) {
    console.log('firstInit', param);
    globalThis.canvas = param.canvas;
    const engine = new BABYLON.Engine(param.canvas);
    const scene = new BABYLON.Scene(engine);
    globalThis.engine = engine;
    globalThis.scene = scene;

    this.scene = scene;
    this.engine = engine;
    //scene.useRightHandedSystem = true;

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
      ui.addEventListener(UIClass.EVENT_CHANGECHECK, ev => {
        console.log('ev.detail', ev.detail);
      });
      ui.init(scene);
    }

    this.update();
  }

  /**
   * 不使用
   * 高頻度に更新する
   */
  update() {
    requestAnimationFrame(() => {
      this.update();
    });

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
          tb.text += `\n${globalThis._speed?.toFixed?.(1)} sp`;
        }
      }
    }

    {
      const tb = this.ui?.tbAngle;
      if (tb) {
        tb.text = `${((globalThis._currentSteeringAngle ?? 0) * 180 / Math.PI).toFixed(1)} deg`;
      }
    }

  }

  /**
   * 物理演算含む第二次初期化
   * 車作成もこちら
   * @param {Babylon.Scene} scene 
   */
  async secondInit(scene) {
    console.log('secondInit');

    const havokInstance = await HavokPhysics({
      locationFile: () => '../third_party/snapshot.7.52.2/havok/HavokPhysics.wasm'
      //locationFile: () => './HavokPhysics.wasm'
    });
    const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
    scene.enablePhysics(new BABYLON.Vector3(0, -240, 0),
      havokPlugin);

    /**
     * @type {Param}
     */
    const carParam = {
      fwFriction: 10 * 1,
      bwFriction: 0.8 * 1 + 1 * 0, // 1だとドリフトしなくね?? // 50 デフォルト
      mass: 1000 * 1, // 1000 デフォルト。4000 は沈みすぎ
      fwTireMass: 100 * 4, // 100 デフォルト 1000 はすぐスピンする
      bwTireMass: 100 * 4, // 100 デフォルト
      useRearMotor: true,
      maxSpeed: 150 * 10, // 150 デフォルト
      accelPer: 8 * 50, // 8 デフォルト
      timeStep: 0.5 / 1000, // 1 / 500 デフォルト
      subTimeStep: 4.5 * 1, // 4.5 デフォルト
    };

    const retscene = await createScene(carParam);

    { // 地面用テクスチャを生成する
      const tex = new BABYLON.Texture('./ground1.png', scene);
      this.groundtex = tex;
    }

    //this.makeMap(scene);
    this.makeAreas(scene);
    //this.makeWall(scene);

    this.makeTower(scene);

    //this.readyInput(scene);
  }

  /** 1枚の地面を作成する */
  makeMap(scene) {
    console.log('makeMap');


    const tex = new BABYLON.DynamicTexture('tex1',
      { width: 1024, height: 1024 }, scene);
    Misc.writeCanvas(tex.getContext());
    tex.update();

    {
      const ground = BABYLON.MeshBuilder.CreateGround('ground1',
        { width: 1000, height: 1000 },
        scene);
      const mtl = new BABYLON.StandardMaterial();
      mtl.diffuseTexture = tex;
      ground.material = mtl;

      ground.setAbsolutePosition(new BABYLON.Vector3(0, -0.2, 0));
      const pa = new BABYLON.PhysicsAggregate(ground,
        BABYLON.PhysicsShapeType.BOX,
        { mass: 0, friction: 1, restitution: 0 },
        scene);
    }
  }

  /**
   * 
   * @param {Object} param
   * @param {[number,number,number]} param.center 中心座標
   * @param {BABYLON.Scene} scene 
   * @param {boolean} cross 
   */
  makeOneArea(param, scene, cross) {
    console.log('makeOneArea', param);
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

    const m = new BABYLON.Mesh(
      `a${Math.random()}`,
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
      { mass: 0, restitution: 0,
        friction: 1,
      },
    );

    { // TODO: 物理
      this.phycolli?.setToFloor(pa);
    }
    console.log('makeOneArea end', m);
  }

  makeAreas(scene) {
    const half = 200 * 5;
    const wnum = 20;
    const hnum = 20;
    for (let i = 0; i < hnum; ++i) {
      for (let j = 0; j < wnum; ++j) {
      const param = {
        adds: [0.4, 0.1, 0.2, 0.3],
        //adds: [0, 0, 0, 0],
        center: [
          (j * 2 - wnum + 1) * half,
          -2,
          (i * 2 - hnum + 1) * half,
        ],
        scale: [
          half,
          1,
          half,
        ],
      };
      this.makeOneArea(
        param,
        scene,
        false,
      );
      }
    }
    console.log('makeAreas');
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
          mass: 0, // 動かない。mass 0 が観察して発火する
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

  makeTower(scene) {
    const radius = 1600;
    for (let i = 0; i < 360; i += 2) {
      const param = {
        diameterTop: 1 * 5,
        diameterBottom: 2 * 5,
        height: 10 * 5,
      };
      const m = BABYLON.MeshBuilder.CreateCylinder(
        `tower${i}`,
        param,
        scene,
      );
      const ang = i * Math.PI / 180;
      const cs = Math.cos(ang);
      const sn = Math.sin(ang);
      m.position = new BABYLON.Vector3(sn * radius, param.height / 2, cs *radius);
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
    const linearLimit = 2;
    linear.y = 0;
    const len = Math.min(linearLimit, linear.length());
    linear.normalize().scale(len);

    // 回転の制限はどうしよう
    // クォータニオンに変換してから制限か??
    ang.x = 0;
    ang.z = 0;
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
/*
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
*/
  /**
   * 入力の反映
   */
  /*
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
  */

  /**
   * 絶対値を制限する
   * @param {number} v 
   * @param {number} limit 
   * @returns 
   */
  static limitAbs(v, limit) {
    return Math.sign(v) * Math.min(Math.abs(v), limit);
  }

  /**
   * テクスチャ用canvasを生成する
   * @returns {OffscreenCanvas}
   */
  static writeCanvas(c) {
    const w = c.canvas.width;
    const h = c.canvas.height;
    /*
    const canvas = new OffscreenCanvas(w, h);
    const c = canvas.getContext('2d');
    */
    const data = c.getImageData(0, 0, w, h);
    for (let i = 0; i < h; ++i) {
      for (let j = 0; j < w; ++j) {
        const offset = (j + i * w) * 4;
        let r = 256 * j / w;
        let g = 128;
        let b = 256 * (h - i) / h;
        let a = 255;
        if ((i + j) % 2 === 0) {
          r = 32;
          g = 255;
          b = 32;
        }
        data.data[offset + 0] = r;
        data.data[offset + 1] = g;
        data.data[offset + 2] = b;
        data.data[offset + 3] = a;
      }
    }
    c.putImageData(data, 0, 0);
    //return canvas;
  }

}

const misc = new Misc();
misc.init();

