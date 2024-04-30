/**
 * @file index.mjs
 */

class Misc {
	constructor() {
		this.baby = null;

		this.joys = [null, null];
		this.isTop = true;

		this.my = {
			mesh: null,
			pa: null,
		};
	}

	async init() {
		const param = {
			width: 960, // 論理ピクセル幅
			height: 540,
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
		this.camera = camera;
		camera.setPosition(new BABYLON.Vector3(2, 5, 20));
		camera.wheelDeltaPrecentage = 0.01;
		camera.attachControl();

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

		engine.runRenderLoop(() => {
			this.update();
			scene.render();
		});
	}

	update() {
		//this.applyForce();

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
		scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0),
			havokPlugin);

		this.makeCar(scene);
		this.makeMap(scene);
		this.makeAreas(scene);
		if (false) {
			const lj = new BABYLON.VirtualJoystick(true,
				{ color: 'white' });
			const rj = new BABYLON.VirtualJoystick(false,
				{ color: 'red' });

			this.joys = [lj, rj];
		}

		this.readyInput(scene);
	}

	makeCar(scene) {
		console.log('makeCar');
		{ // body
			const bodyMesh = BABYLON.MeshBuilder.CreateBox('my',
				{},
				scene);
			console.log('bodyMesh', bodyMesh.name, bodyMesh);
			bodyMesh.position.y = 3;
			const param = {
				mass: 1,
				friction: 1,
				restitution: 0,
			};
			const pa = new BABYLON.PhysicsAggregate(bodyMesh,
				BABYLON.PhysicsShapeType.CONVEX_HULL,
				param);
			this.pa = pa;

			this.my = {
				mesh: bodyMesh,
				pa,
			};
		}
		/*
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
			const pa = new BABYLON.PhysicsAggregate(
				m,
				BABYLON.PhysicsShapeType.CONVEX_HULL,
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
			console.log('m', m, 'pa', pa, 'hinge', hinge);
			pa.body.addConstraint(this.pa.body, hinge);
		}
		*/

	}

	makeMap(scene) {
		console.log('makeMap');

		{
			const tex = new BABYLON.Texture('./res/ground1.png', scene);
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
	}

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

		console.log('numVertex', numVertex, vd.positions.length, vd.positions);

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
			{ mass: 0, restitution: 0 }
		);
	}

	makeAreas(scene) {
		const cross = [
			true, true, true, true,
			true, true, true, true,
			true, true, true, true,
			true, true, true, true,
		];
		const half = 10;
		const wnum = 4;
		const hnum = 4;
		for (let i = 0; i < wnum * hnum; ++i) {
			const param = {
				adds: [0.4, 0.1, 0.2, 0.3],
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

	applyForce(param) {
		const m = this.my?.mesh;
		if (!m) {
			return;
		}
		const body = this.my?.pa?.body;
		if (!body) {
			return;
		}

		// 姿勢を得る
		const q = m.absoluteRotationQuaternion;
		const center = m.absolutePosition.clone();

		const fs = [
			{
				offset: new BABYLON.Vector3(1, 0, 0),
				power: new BABYLON.Vector3(0, 0, 1 + Math.sign(param.dx)),
			},
			{
				offset: new BABYLON.Vector3(-1, 0, 0),
				power: new BABYLON.Vector3(0, 0, + Math.sign(param.dy)),
			},
		];
		for (const f of fs) { // 入力を姿勢で変換する
		// new
			const force = f.power.applyRotationQuaternion(q);
			const pos = center.add(f.offset.applyRotationQuaternion(q));
			body.applyForce(force, pos);
		}
	}

	limitSpeed(body) {
		// velo を得る
		const linear = body.getLinearVelocity();
		const ang = body.getAngularVelocity();
		// 制限する
		const len = Math.min(2, linear.length());
		linear.normalize().scale(len);

		// 回転の制限はどうしよう
		// クォータニオンに変換してから制限か??

		// 制限する
		body.setLinearVelocity(linear);
		body.setAngularVelocity(ang);
	}

	thirdCamera() {
		const camera = this.camera;
		const q = this.my.absoluteRotationQuaternion.clone();
		const center = this.my.absolutePosition.clone();

		const up = new BABYLON.Vector3(0, 1, 0).applyRotationQuaternion(q);
		const fw = new BABYLON.Vector3(0, 0, 1).applyRotationQuaternion(q);

		const height = 2;
		const back = 2;

		const target = center.add(up.scale(height));
		const pos = target.add(fw.scale(-back));

		//camera.target
		// camera.up
		camera.setPosition(pos);
	}

/**
 * 入力の反映
 */
	readyInput(scene) {
		scene.onPointerMove = () => {
			console.log('onPointerMove', scene.pointerX, scene.pointerY);
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
				if (m.name === 'my') {
					this.applyForce();
					console.log('my');
				}
			}

			{
				const dx = scene.pointerX - 300;
				const dy = scene.pointerY - 150;
				this.applyForce({
					dx, dy,
				});
			}
		};

		const am = new BABYLON.ActionManager(scene);
		this.actionManager = am;
		am.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, (evt) => {
			map[evt.sourceEvent.key] = (evt.sourceEvent.type == "keydown"); 
		}));
		
		am.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, (evt) => {		
			map[evt.sourceEvent.key] = (evt.sourceEvent.type == "keydown");
		}));
	}

}

const misc = new Misc();
misc.init();

