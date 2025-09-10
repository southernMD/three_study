/**
 * 物理世界相关的全局常量
 */
export const PHYSICS_CONSTANTS = {
  // 地面尺寸
  GROUND_SIZE_X: 1100,  // 地面X轴半尺寸 (实际尺寸 = 500 * 2 = 1000)
  GROUND_SIZE_Z: 1100,  // 地面Z轴半尺寸 (实际尺寸 = 500 * 2 = 1000)
  GROUND_SIZE_Y: 1.5,    // 地面Y轴半尺寸 (厚度)
  
  // 墙体相关
  WALL_HEIGHT: 20,     // 边界墙高度
  
  // 重力
  GRAVITY: -9.82,
  
  // 材质属性
  DEFAULT_FRICTION: 0.4,
  DEFAULT_RESTITUTION: 0.3,
  
  // 地面材质
  GROUND_FRICTION: 0.8,
  GROUND_RESTITUTION: 0.1
} as const;

/**
 * 获取地面的实际尺寸 (完整尺寸，不是半尺寸)
 */
export const getGroundFullSize = () => ({
  x: PHYSICS_CONSTANTS.GROUND_SIZE_X * 2,
  z: PHYSICS_CONSTANTS.GROUND_SIZE_Z * 2,
  y: PHYSICS_CONSTANTS.GROUND_SIZE_Y * 2
});
