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

    const mainStyle = advancedTexture.createStyle();
    mainStyle.fontSize = 32;
    mainStyle.fontWeight = 'bold';
    mainStyle.fontFamily = 'Consolas';

    if (false) {
      const tb = new BABYLON.GUI.TextBlock('loading1', 'loading...');
      tb.outlineWidth = 10;
      tb.outlineColor = 'white';

      advancedTexture.addControl(tb);
    }

    {
      const button = BABYLON.GUI.Button.CreateSimpleButton('loading1', 'loading...');
      //button.top = '-200px';
      const tb = button.textBlock;
      tb.top = '-160px';
      tb.outlineWidth = 10;
      tb.outlineColor = 'white';
      tb.style = mainStyle;

      advancedTexture.addControl(button);
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
      const tb = button.textBlock;
      tb.style = mainStyle;
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

    {
      const panel = new BABYLON.GUI.StackPanel();
      panel.left = '-200px';
      panel.width = '256px';
      panel.isVertical = false;
      advancedTexture.addControl(panel);

      {
        const cb = new BABYLON.GUI.Checkbox();
        cb.width = '32px';
        cb.height = '32px';
        cb.isChecked = true;
        cb.color = 'green';
        cb.onIsCheckedChangedObservable.add((value) => {
          console.log('checkbox', value);
        });
        panel.addControl(cb);
      }
      {
        const tb = new BABYLON.GUI.TextBlock();
        tb.text = 'corge';
        tb.width = '160px';
        tb.color = 'white';
        tb.outlineWidth = 8;
        tb.outlineColor = 'black';
        tb.style = mainStyle;
        panel.addControl(tb);
      }
    }

  }
}

