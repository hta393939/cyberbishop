/**
 * @file index.js
 */

class Misc {
    constructor() {
        this.x = 1;
    }

    seq() {
        const a = 214013;
        const c = 2531011;
        this.x = (this.x * a + c) & 0xffffffff;
        return (this.x >> 16) & 0x7fff;
    }

    async init() {
        this.makeGroundTex();
    }

    makeGroundTex() {
        const rr = 10;
        const mod = rr * 2 + 1;
        const w = 512;
        const h = 512;
/**
 * @type {HTMLCanvasElement}
 */
        const canvas = document.getElementById('groundtex');
        canvas.width = w;
        canvas.height = h;
        const c = canvas.getContext('2d');
        const data = c.getImageData(0, 0, w, h);
        for (let y = 0; y < h; ++y) {
            for (let x = 0; x < w; ++x) {
                let offset = (x + w * y) * 4;

                let r = 128 + (this.seq() % mod) - rr;
                let g = 128 + (this.seq() % mod) - rr;
                let b = 128 + (this.seq() % mod) - rr;
                let a = 255;
                data.data[offset] = r;
                data.data[offset+1] = g;
                data.data[offset+2] = b;
                data.data[offset+3] = a; 
            }
        }
        c.putImageData(data, 0, 0);
    }

}

const misc = new Misc();
misc.init();

