/**
 * @file draw.js
 */

(function(global_) {

'use strict';

const f_ = () => {
    const ss = new Error().stack.split('\n');
    return ss[2+1].trim();
};

let log = (...args) => {
    console.log(`%cDraw`, `color:#ff8000;`, f_(), ...args);
};
//log = () => {};


/**
 * loader.load() は data: arrayBuffer みたい
 */
class Draw extends EventTarget {
    constructor() {
        super();

        this.inver = `0.3.1`;

        this.STATUS_TITLE = 'title';
        this.STATUS_GAME = 'game';
        this.STATUS_GAMEOVER = 'gameover';
        this.STATUS_LOADING = 'loading';
        this.status = '' + this.STATUS_TITLE;

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
 * 今正解すると得られるポイント
 */
        this.curpts = 0;

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
         */
        this.difflevel = 1.0;
        /**
         * ambient light 0.0-1.0
         */
        this.amblevel = 1.0;

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
     * 初回に1回だけ
     * @param {HTMLCanavsElement} cv 
     */
    initGL(cv) {
        let w = this.logicw;
        let h = this.logich;

        const opt = {
            preserveDrawingBuffer: true,
            canvas: cv,
            antialias: true,
            alpha: true
        };
        const renderer = new THREE.WebGLRenderer(opt);
        this.renderer = renderer;

        renderer.setSize(w, h, false);
        const hour = new Date().getHours();
        const night = (hour >= 23 || hour < 5);
        //const night = true;
        renderer.setClearColor(night ? 0xffee00 : 0xeeffff, 1.0);

        const mainscene = new THREE.Scene();
        this.mainscene = mainscene;
        {
            //const axes = new THREE.AxesHelper(100);
            //mainscene.add(axes);
        }

        const maincamera = new THREE.PerspectiveCamera(45,
            w / h, 0.02, 30);
        this.maincamera = maincamera;
        let z = 2.7;
        maincamera.position.set(0, 1.0, z);
        maincamera.lookAt(new THREE.Vector3(0, 1.0, 0));

        { // 顔暗くなる
            let lv = Math.floor(this.amblevel * 255);
            const light = new THREE.AmbientLight((lv << 16) | (lv << 8) | lv);
            mainscene.add(light);
        }
        {
            let lv = Math.floor(this.difflevel * 255);
            const light = new THREE.DirectionalLight(0x010101 * lv);
            light.position.set(-1,1,1).normalize();
            mainscene.add(light);
        }

        {
            const clock = new THREE.Clock();
            this.clock = clock;
        }

        this.makeSprite();

        {
            {
                let url = `./res/mobshiro2.vrm`;
                this.loadVRM(url, true, true);
            }            
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
     * API. 使ってない..
     */
    update() {
        requestAnimationFrame(() => {
            this.update();
        });

        this.draw();
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
        for (const v of this.effects) {
            v.uniforms.uMsec = Date.now() % (1000 * 60 * 60 * 24);
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


    async initialize() {
        this.checkSize();

        this.initGL();
    }

    checkSize() {
        const rc = document.body.getClientRects();
        log(`checkSize leave rc`, rc, window);
    }

    applyCurrent() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const r = window.devicePixelRatio;
        log(`applyCurrent`, r, w, h, w / h);

        this.resize(w, h);
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
            sp.renderOrder = 1000000;
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
            m.renderOrder = 1501000;

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
            m.renderOrder = 1502000;

            this.overscreen2 = m;

            this.mainscene.add(m);
        }
    }

    /**
     * ファイルオブジェクトを指定する．ドラッグアンドドロップ時
     * @param {File} f 
     */
    async loadFile(f) {
        let ab = null;
        if (f.name in this.stock) {
            ab = this.stock[f.name];
        } else {
            ab = await f.arrayBuffer();
            this.stock[f.name] = ab;
        }
        this.loadVRM(ab, true, false);
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

    addTouchEffect() {
        const m = this.makeTouchEffect();
        this.effects.add(m);
    }

/**
 * タッチした位置に表示したい
 */
    makeTouchEffect() {
        const vs = [
'attribute vec3 position;',
'attribute vec2 uv;',
'uniform vec3 uReso;',
'uniform vec3 uPos;',
'uniform float uMsec;',
'uniform mat4 worldViewProjection;',
'varying vec2 vUv;',
'varying float vMsec;',
'void main() {',
'vUv = uv;',
'vMsec = uMsec;',
'gl_Position = worldViewProjection * vec4(position, 1.0);',
'}'
        ];
        const fs = [
'varying vec2 vUv;',
'varying float vMsec;',
'void main() {',
'gl_FragColor = vec4(1.0, vMsec, 0.0, 1.0);',
'}'
        ];
        const geo = new THREE.BufferGeometry();
        const num = 100;
        const ps = new Float32Array(3 * num);
        const ns = new Float32Array(3 * num);
        const uvs = new Float32Array(2 * num);
        const fis = new Uint32Array(3 * 2 * num);
        const vts = [
            { px: -1, py:  1, pz: 0, u: 0, v: 1 },
            { px:  1, py:  1, pz: 0, u: 1, v: 1 },
            { px: -1, py: -1, pz: 0, u: 0, v: 0 },
            { px:  1, py: -1, pz: 0, u: 1, v: 0 }
        ];
        for (let i = 0; i < num; ++i) {
            for (const v of vts) {
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
        geo.addAttribute('position', new THREE.BufferAttribute(ps, 3));
        geo.addAttribute('normal', new THREE.BufferAttribute(ns, 3));
        geo.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setIndex(new THREE.BufferAttribute(fis, 1));

        const mtl = new THREE.ShaderMaterial({
            vertexShader: vs.join('\n'),
            fragmentShader: fs.join('\n'),
            uniforms: {
                uReso: new THREE.Uniform(new THREE.Vector3(1024, 1024, 1)),
                uPos: new THREE.Uniform(new THREE.Vector3(0, 0, 0)),
                uMsec: new THREE.Uniform(0)
            }
        });
        const m = new THREE.Mesh(geo, mtl);
        return m;
    }

}


if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = Draw;
    }
    exports.Draw = Draw;
} else {
    global_.Draw = Draw;
}

})( (this || 0).self || typeof self !== 'undefined' ? self : global );


