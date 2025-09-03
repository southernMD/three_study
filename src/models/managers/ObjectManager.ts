import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OvalRunningTrack } from '../architecture/OvalRunningTrack';
import { WallAndDoor } from '../architecture/WallAndDoor';
import { BaseModel } from '../architecture/BaseModel';
import { GlobalState } from '../../types/GlobalState';
import { PhysicsManager } from './PhysicsManager';

/**
 * 对象管理器 - 统一管理所有静态模型对象
 */
export class ObjectManager {
  private scene: THREE.Scene;
  private physicsWorld: CANNON.World;
  private globalState: GlobalState;
  private objects: Map<string, BaseModel> = new Map();
  private physicsManager?: PhysicsManager;

  constructor(scene: THREE.Scene, globalState: GlobalState, physicsManager?: PhysicsManager) {
    this.scene = scene;
    this.globalState = globalState;
    this.physicsWorld = globalState.physicsWorld!;
    this.physicsManager = physicsManager;

    this.createOvalTrack('main-track', {
      position: { x: 0, y: 0, z: 100 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 8 // 支持x、z轴独立缩放
    });

    // 直接创建边界墙体
    this.createBoundaryWalls();
  }

  /**
   * 创建边界墙体
   */
  private async createBoundaryWalls(): Promise<void> {
    await this.createWallAndDoor('boundary-walls', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1
    });
    console.log('✅ 边界墙体创建完成');
  }

  /**
   * 重新生成边界墙体
   */
  async regenerateBoundaryWalls(): Promise<void> {
    console.log('🔄 开始重新生成边界墙体...');

    // 强制清除现有的边界墙体
    await this.forceClearBoundaryWalls();

    // 重新创建边界墙体
    await this.createBoundaryWalls();
    console.log('✅ 边界墙体重新生成完成');
  }

  /**
   * 强制清除边界墙体
   */
  private async forceClearBoundaryWalls(): Promise<void> {
    console.log('🗑️ 强制清除边界墙体...');

    // 方法1：通过对象管理器清除
    if (this.objects.has('boundary-walls')) {
      const wallObject = this.objects.get('boundary-walls');
      if (wallObject) {
        wallObject.dispose();
        this.objects.delete('boundary-walls');
        console.log('✅ 通过对象管理器清除完成');
      }
    }

    // 方法2：直接从场景中查找并清除所有边界墙体相关对象
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child.name.includes('BoundaryWall') ||
          child.name.includes('ClippingPlane') ||
          child.name.includes('BoundaryPoint') ||
          child.name.includes('PhysicsWallVisualization')) {
        objectsToRemove.push(child);
      }
    });

    objectsToRemove.forEach(obj => {
      this.scene.remove(obj);
      // 释放资源
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });

    console.log(`🗑️ 从场景中清除了 ${objectsToRemove.length} 个边界墙体相关对象`);
  }

  /**
   * 重新生成地面和边界墙体
   */
  async regenerateGroundAndWalls(): Promise<void> {
    console.log('🔄 开始重新生成地面和边界墙体...');

    // 重新创建物理地面
    if (this.physicsManager) {
      this.physicsManager.recreateGround();
    }

    // 重新生成边界墙体
    await this.regenerateBoundaryWalls();

    console.log('✅ 地面和边界墙体重新生成完成');
  }

  /**
   * 创建椭圆跑道
   */
  async createOvalTrack(
    id: string = 'main-track',
    options: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: number | { x: number; y: number; z: number };
    } = {}
  ): Promise<OvalRunningTrack> {
    console.log(`🏃 创建椭圆跑道: ${id}`);

    // 设置默认参数

    // 创建跑道实例
    const track = new OvalRunningTrack(this.scene, this.physicsWorld, {
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || 2
    });

    // 创建跑道
    await track.create();

    // 存储到对象集合中
    this.objects.set(id, track);

    console.log(`✅ 椭圆跑道创建完成: ${id}`);
    return track;
  }

  /**
   * 创建墙体和门
   */
  async createWallAndDoor(
    id: string,
    options: {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: number;
    } = {}
  ): Promise<WallAndDoor> {
    console.log(`🧱 创建墙体和门: ${id}`);

    // 设置默认参数
    const config = {
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || 1
    };

    // 创建墙体实例
    const wall = new WallAndDoor(this.scene, 14 ,this.physicsWorld, config);

    // 创建墙体
    await wall.create();

    // 存储到对象集合中
    this.objects.set(id, wall);

    console.log(`✅ 墙体和门创建完成: ${id}`);
    return wall;
  }

  /**
   * 获取对象
   */
  getObject<T extends BaseModel>(id: string): T | undefined {
    return this.objects.get(id) as T;
  }

  /**
   * 获取跑道
   */
  getTrack(id: string): OvalRunningTrack | undefined {
    return this.getObject<OvalRunningTrack>(id);
  }

  /**
   * 获取主跑道
   */
  getMainTrack(): OvalRunningTrack | undefined {
    return this.getTrack('main-track');
  }

  /**
   * 获取墙体
   */
  getWall(id: string): WallAndDoor | undefined {
    return this.getObject<WallAndDoor>(id);
  }

  /**
   * 移除对象
   */
  removeObject(id: string): boolean {
    const obj = this.objects.get(id);
    if (obj) {
      obj.dispose();
      this.objects.delete(id);
      console.log(`🗑️ 移除对象: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * 移除跑道（兼容性方法）
   */
  removeTrack(id: string): boolean {
    return this.removeObject(id);
  }

  /**
   * 获取所有对象
   */
  getAllObjects(): Map<string, BaseModel> {
    return this.objects;
  }

  /**
   * 获取所有跑道（兼容性方法）
   */
  getAllTracks(): Map<string, OvalRunningTrack> {
    const tracks = new Map<string, OvalRunningTrack>();
    for (const [id, obj] of this.objects) {
      if (obj instanceof OvalRunningTrack) {
        tracks.set(id, obj);
      }
    }
    return tracks;
  }

  /**
   * 获取所有墙体
   */
  getAllWalls(): Map<string, WallAndDoor> {
    const walls = new Map<string, WallAndDoor>();
    for (const [id, obj] of this.objects) {
      if (obj instanceof WallAndDoor) {
        walls.set(id, obj);
      }
    }
    return walls;
  }

  /**
   * 清理所有对象
   */
  dispose(): void {
    console.log('🧹 清理所有静态对象...');
    for (const [id, obj] of this.objects) {
      obj.dispose();
      console.log(`🗑️ 清理对象: ${id}`);
    }
    this.objects.clear();
  }

  /**
   * 获取对象数量
   */
  getObjectCount(): number {
    return this.objects.size;
  }

  /**
   * 获取跑道数量（兼容性方法）
   */
  getTrackCount(): number {
    return this.getAllTracks().size;
  }

  /**
   * 检查对象是否存在
   */
  hasObject(id: string): boolean {
    return this.objects.has(id);
  }

  /**
   * 检查跑道是否存在（兼容性方法）
   */
  hasTrack(id: string): boolean {
    return this.hasObject(id) && this.objects.get(id) instanceof OvalRunningTrack;
  }

  /**
   * 获取对象类型统计
   */
  getObjectTypeStats(): { [type: string]: number } {
    const stats: { [type: string]: number } = {};
    for (const obj of this.objects.values()) {
      const type = obj.constructor.name;
      stats[type] = (stats[type] || 0) + 1;
    }
    return stats;
  }
}
