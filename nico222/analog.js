/**
 * @file analog.js
 */

(function(_global) {

/**
 * アナログパッド取り扱い
 */
class Analog {
    constructor() {

    }

    initialize() {
        window.addEventListener('gamepadconnected', ev => {
            console.log('', ev.type, ev.gamepad);
        });
        window.addEventListener('gamepaddisconnected', ev => {
            console.log('', ev.type, ev.gamepad);
        });
    }

/**
 * 
 */
    updateStatus() {
        {
            const gamepads = navigator.getGamepads();
            const num = gamepads.length;
            //console.log('gamepads', num);
            for (const v of gamepads) {
                if (!v) {
                    continue;
                }
//                const { id } = v;
/*
                v.axes: 10個 
                -0.113725, -0.137254, 0.0274510 tx ty tz 
                0 0 0.588235 rx ry rz
                0 0 0
                3.2857141495750977

                v.buttons: 12個 pressed: false, touched: false, value: 0
                  true, true, 1 など
                v.connected: true
                v.hapticActuators, pose, hand: 無い
                v.id, " (Vendor: f766 Product: 0016)"
                v.displayId 無い
                v.index: 0
                v.mapping: ""
                v.timestamp, 同一のことがある 26969.06 など
                v.vibrationActuator: null,
*/
                console.log('gamepad', v);
            }
        }
    }

}

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = Analog;
    }
    exports.Analog = Analog;
} else {
    _global.Analog = Analog;
}

})( (this || 0).self || (typeof self !== 'undefined' ? self : global ));



