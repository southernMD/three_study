import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// 定义全局状态接口
// 只保留真正全局的状态，模型特定的状态已移动到各自的模型类中
export interface GlobalState {
  // 物理世界相关（真正全局的状态）
  physicsWorld?: CANNON.World;
  physicsBodies?: Map<CANNON.Body, THREE.Object3D>;
}
