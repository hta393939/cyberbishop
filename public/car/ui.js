/**
 * @file ui.js
 */

export class UIClass extends EventTarget {
  static EVENT_CLICK = 'click';
  constructor() {
    super();
  }

/**
 * @see https://doc.babylonjs.com/features/featuresDeepDive/gui/gui#textblock
 */
  init() {
    const advancedTexture = new BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');

    if (false) {
      const tb = new BABYLON.GUI.TextBlock('loading1', 'loading...');
      tb.outlineWidth = 10;
      tb.outlineColor = 'white';

      advancedTexture.addControl(tb);
    }

    {
      const button = BABYLON.GUI.Button.CreateSimpleButton('loading1', 'loading...');
      const tb = button.textBlock;
      tb.outlineWidth = 10;
      tb.outlineColor = 'white';

      advancedTexture.addControl(tb);
    }

    {
      const button = BABYLON.GUI.Button.CreateSimpleButton('setting1', 'setting');
      button.left = '-300px';
      button.top = '-200px';
      button.width = 0.2;
      button.height = '40px';
      button.color = 'white';
      button.background = 'green';
      advancedTexture.addControl(button);

      button.onPointerClickObservable.add(v2winfo => {
        const cev = new CustomEvent(UIClass.EVENT_CLICK, {
          detail: {
            v2winfo,
          }
        });
        this.dispatchEvent(cev);
      });
    }
  }
}

