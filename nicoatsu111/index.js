/**
 * @file index.js
 */

'use strict';

const f_ = () => {
    const ss = new Error().stack.split('\n');
    return ss[2+1].trim();
};

let log = (...args) => {
    console.log(`%cMisc`, `color:#ff8000;`, f_(), ...args);
};
//log = () => {};

class Misc {
    constructor() {
        this.inver = `0.3.1`;

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

        this.drawing = new Draw();
    }

    update() {
        requestAnimationFrame(() => {
            this.update();
        });

        const now = Date.now();
        let diff = 0;
        if (this.prets) {
            diff = now - this.prets;
        }
        this.prets = now;
        this.tscum += diff;

        if (this.drawing) {
            //this.drawing.update();
            this.drawing.draw();
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
        {
            const ra = new RPGAtsumaru();
            this.ra = ra;
            ra.initialize();
        }

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

        this.checkSize();

        this.setListener();

        this.drawing.initGL(window.idmain);

        { // スクリーンショット用の関数を登録する
            this.ra.setSS(this.drawing.getSS.bind(this.drawing));
        }
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
    }

    setListener() {
        {
            this.applyCurrent();
            window.addEventListener('resize', ev => {
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
    }

    /**
     * ファイルオブジェクトを指定する．ドラッグアンドドロップ時
     * @param {File} f 
     */
    async loadFile(f) {
        const ab = await f.arrayBuffer();
        this.stock[f.name] = ab;
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
            this.drawing.input(...types);
        }
    }

    onload() {
        this.initialize();
        this.update();
    }

}

const misc = new Misc();
window.addEventListener('load', () => {
    misc.onload();
});

