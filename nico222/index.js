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

const lg = {
    log: (...args) => {
        console.log(`%cMisc`, `color:#808080;`, f_(), ...args);
    }
};



