/**
 * @file ui.js
 */

export class UIClass {
    constructor() {

    }

    init() {
        const advancedTexture = new BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');

        {
            const button = BABYLON.GUI.Button.CreateSimpleButton('setting1', 'setting');
            button.width = 0.2;
            button.height = '40px';
            button.color = 'white';
            button.background = 'green';
            advancedTexture.addControl(button);
        }
    }
}

