/**
 * 户外健身器材模块导出
 * 统一导出所有健身器材类
 */

export { OnePullUpBar } from './OnePullUpBar';
export { OutdoorGym } from './OutdoorGym';

// 类型定义
export type GymEquipmentType = 'pullup' | 'gym';

export interface GymEquipmentConfig {
  type: GymEquipmentType;
  position?: THREE.Vector3;
}

// 便利函数
import * as THREE from 'three';
import { OnePullUpBar } from './OnePullUpBar';
import { OutdoorGym } from './OutdoorGym';

/**
 * 创建健身器材的工厂函数
 */
export async function createGymEquipment(
  type: GymEquipmentType,
  scene: THREE.Scene,
  initialTransform?: {
    position?: { x: number; y: number; z: number } | THREE.Vector3;
    rotation?: { x: number; y: number; z: number } | THREE.Vector3;
    scale?: { x: number; y: number; z: number } | number | THREE.Vector3;
  }
): Promise<OnePullUpBar | OutdoorGym> {
  let equipment: OnePullUpBar | OutdoorGym;

  if (type === 'pullup') {
    equipment = new OnePullUpBar(scene, initialTransform);
  } else {
    equipment = new OutdoorGym(scene, initialTransform);
  }

  await equipment.create();
  return equipment;
}

/**
 * 获取健身器材的默认配置
 */
export function getDefaultGymConfigs(): GymEquipmentConfig[] {
  return [
    { type: 'pullup' },
    { type: 'gym' },
    { type: 'pullup' },
    { type: 'gym' }
  ];
}

/**
 * 生成随机的健身器材配置
 */
export function generateRandomGymConfigs(count: number): GymEquipmentConfig[] {
  const configs: GymEquipmentConfig[] = [];
  const types: GymEquipmentType[] = ['pullup', 'gym'];

  for (let i = 0; i < count; i++) {
    const randomType = types[Math.floor(Math.random() * types.length)];
    configs.push({ type: randomType });
  }

  return configs;
}
