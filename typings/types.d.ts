
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
  /** 4WD */
  useRearMotor: boolean;

  /**
   * 最大速度 150
   * モーター回しに使う 
   */
  maxSpeed?: number;
  /** 1フレームでスピードを増やす値。デフォルト8 */
  accelPer?: number;

  /** デフォルト 1/500 */
  timeStep?: number;
  /** デフォルト 4.5 */
  subTimeStep?: number;

  cameraAcceleration?: number;
  maxCameraSpeed?: number;
}

declare interface InputOption {
  /** 左後輪 */
  motorWheelRearL?: unknown;
  /** 右後輪 */
  motorWheelRearR?: unknown;
}


