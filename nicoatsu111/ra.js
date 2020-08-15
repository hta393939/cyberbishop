/**
 * @file rpgatsumaru.js
 */

'use strict';

class RPGAtsumaru {
    constructor() {
        this.setting = {};
        this.status = 'none';

        this.PAD_KEYDOWN = 'keydown';
        this.PAD_KEYUP = 'keyup';

        this.PAD_L = 'left';
        this.PAD_U = 'up';
        this.PAD_R = 'right';
        this.PAD_D = 'down';
        this.PAD_OK = 'ok';
        this.PAD_CANCEL = 'cancel';

        //this.STORAGE = 'system';
    }

    initialize() {
        if (window.RPGAtsumaru == null) {
            console.warn(`not RPGAtsumaru`);
            return;
        }

        this.status = 'running';
        //console.log(`RPGAtsumaru`, window.RPGAtsumaru);
        //console.log(`RPGAtsumaru`, window.RPGAtsumaru.screenshot);
    }

    /**
     * 説明無くない?w
     * @param {Promise<string>} handler 
     */
    setSS(handler) {
        return window.RPGAtsumaru.screenshot.setScreenshotHandler(handler);
    }

    /**
     * 入力取得コールバックAPI
     * @param {(info: {type: string, key: string}) => void} cb 
     */
    subscribe(cb) {
        return window.RPGAtsumaru.controllers.defaultController.subscribe(cb);
    }    

    /**
     * ユーザ
     */
    async getSelfInformation() {
        return window.RPGAtsumaru.user.getSelfInformation();
    }

    async getRecentUsers() {
        return window.RPGAtsumaru.user.getRecentUsers();
    }

    async getUserInformation(userid) {
        return window.RPGAtsumaru.user.getUserInformation(userid);
    }

    async displayScore(boardid) {
        return window.RPGAtsumaru.scoreboards.display(boardid);
    }

    /**
     * スコアボードへスコアを登録する
     * @param {number} boardid 1～10の整数
     * @param {number} score 最大値は 9が16個(桁)いける
     */
    async setRecord(boardid, score) {
        return window.RPGAtsumaru.scoreboards.setRecord(boardid, score);
    }

}
