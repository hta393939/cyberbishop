
/**
 * 
 */
declare interface Param {
  /** 摩擦 */
  fwDynamicFriction?: number;
  /** 摩擦 */
  fwStaticFriction?: number;

  bwStaticFriction?: number;
  bwDynamicFriction?: number;

  /** 重量 */
  mass?: number;

  fwTireMass?: number;
  bwTireMass?: number;

  /**
   * 最大速度 150
   * モーター回しに使う 
   */
  maxSpeed?: number;
  /** 1フレームでスピードを増やす値。デフォルト8 */
  accelPer?: number;

  cameraAcceleration?: number;
  maxCameraSpeed?: number;
}



