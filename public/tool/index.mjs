class Tool {
    constructor() {

    }
    init() {
        this.draw(window.canvas);
    }

/**
 * 
 * @param {HTMLCanvasElement} canvas 
 */
    draw(canvas) {
        const w = 256;
        const h = 256;
        canvas.width = w;
        canvas.height = h;
        const c = canvas.getContext('2d');
        c.font = `normal 200px メイリオ`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        let text = '\u{1f6a7}';
        c.fillText(text, w / 2, h / 2);
    }
}

const tool = new Tool();
tool.init();
