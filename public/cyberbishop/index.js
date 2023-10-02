/**
 * @file index.js
 */

class Misc {
    constructor() {
        this.baby = null;
    }

    async init() {
        const baby = new Baby();
        this.baby = baby;
        const param = {
            width: 960, // 論理ピクセル幅
            height: 540,
        };
        param.canvas = document.getElementById('maincanvas');
        await baby.init(param);

        await new Promise((resolve, reject) => {
            effekseer.initRuntime(`../third_party/effekseer/effekseer.wasm`, () => {
                resolve();
            });
        });
        {
            const context = effekseer.createContext();
            baby.initEffek(context);
        }

        {
            const el = document.getElementById('loading');
            el.remove();
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

        await baby.secondInit();
    }
}

const misc = new Misc();
misc.init();



