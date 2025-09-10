import { BVHPhysics } from '../physics/BVHPhysics';

// 定义全局状态接口
// 只保留真正全局的状态，模型特定的状态已移动到各自的模型类中
export interface GlobalState {
  // BVH物理系统相关（真正全局的状态）
  bvhPhysics?: BVHPhysics;
}
