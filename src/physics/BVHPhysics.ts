import { BaseModel } from '@/models/architecture/BaseModel';
import * as THREE from 'three';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';

/**
 * BVH物理系统 - 完全基于three-mesh-bvh实现
 * 替代CANNON物理引擎
 */
export class BVHPhysics {
  private scene: THREE.Scene;
  private collider?: THREE.Mesh; // 保留原有的统一collider
  private visualizer?: MeshBVHHelper;

  // 新增：分离的碰撞体组和映射关系
  private colliders: Map<string, THREE.Mesh> = new Map();
  private colliderMapping: Map<string, BaseModel> = new Map();
  private visualizers: Map<string, MeshBVHHelper> = new Map();
  
  // 物理参数
  public params = {
    gravity: -30,
    physicsSteps: 5,
    displayCollider: false,
    displayBVH: false,
    visualizeDepth: 10
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * 🔥 核心方法：扫描整个场景，创建统一的BVH碰撞体（排除人物模型）
   * 参考 characterMovement.js 和 physics.js 的实现
   */
  createSceneCollider(staticObjects?: Map<string, BaseModel>): THREE.Mesh | null {
    console.log('🔧 开始创建场景统一碰撞体...');

    // 清理现有碰撞体
    this.dispose();
    // 创建临时组来收集所有需要碰撞的对象
    const collisionGroup = new THREE.Group();
    staticObjects?.forEach((object) => {
      // 遍历对象的模型组，收集所有网格
      const modelGroup = object.getModelGroup();
      if (modelGroup) {
        modelGroup.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            // 克隆网格并应用世界变换
            const clonedMesh = child.clone();
            clonedMesh.geometry = child.geometry.clone();

            // 应用对象的世界变换矩阵
            child.updateMatrixWorld(true);
            clonedMesh.applyMatrix4(child.matrixWorld);

            // 添加到碰撞组
            collisionGroup.add(clonedMesh);
          }
        });
      }
    })
    if (collisionGroup.children.length === 0) {
      console.warn('⚠️ 场景中没有找到可碰撞的网格');
      return null;
    }

    console.log(`🔧 收集到 ${collisionGroup.children.length} 个网格，开始合并...`);

    // 使用 StaticGeometryGenerator 合并所有几何体
    const staticGenerator = new StaticGeometryGenerator(collisionGroup);
    staticGenerator.attributes = ['position'];

    const mergedGeometry = staticGenerator.generate();
    mergedGeometry.boundsTree = new MeshBVH(mergedGeometry,{
      maxDepth: 40,           // 降低最大深度
      maxLeafTris: 10,        // 减少叶子节点三角形数量
      verbose: true           // 查看构建信息
    });

    // 创建统一的碰撞体
    const sceneCollider = new THREE.Mesh(mergedGeometry);
    sceneCollider.name = 'SceneCollider';
    sceneCollider.material = new THREE.MeshBasicMaterial({
      wireframe: true,
      opacity: 0.5,
      transparent: true,
      visible: this.params.displayCollider,
      color: 0x00ff00
    });

    // 创建BVH可视化器
    const visualizer = new MeshBVHHelper(sceneCollider, this.params.visualizeDepth);
    visualizer.visible = this.params.displayBVH;

    this.collider = sceneCollider;
    this.visualizer = visualizer;

    this.scene.add(sceneCollider);
    this.scene.add(visualizer);

    console.log(`✅ 场景统一碰撞体创建成功! 顶点数: ${mergedGeometry.attributes.position.count}`);

    return sceneCollider;
  }

  /**
   * 🔥 新方法：为每个对象创建独立的BVH碰撞体
   * 建立对象与碰撞体的映射关系
   */
  createSeparateColliders(staticObjects?: Map<string, BaseModel>): Map<string, THREE.Mesh> {
    console.log('🔧 开始创建分离的碰撞体组...');

    // 清理现有的分离碰撞体
    this.disposeSeparateColliders();

    if (!staticObjects || staticObjects.size === 0) {
      console.warn('⚠️ 没有静态对象可创建碰撞体');
      return this.colliders;
    }

    staticObjects.forEach((object, objectId) => {
      const modelGroup = object.getModelGroup();
      if (!modelGroup) {
        console.warn(`⚠️ 对象 ${objectId} 没有模型组`);
        return;
      }

      // 为每个对象创建临时组来收集网格
      const objectCollisionGroup = new THREE.Group();
      let meshCount = 0;

      modelGroup.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          // 克隆网格并应用世界变换
          const clonedMesh = child.clone();
          clonedMesh.geometry = child.geometry.clone();

          // 应用对象的世界变换矩阵
          child.updateMatrixWorld(true);
          clonedMesh.applyMatrix4(child.matrixWorld);

          // 添加到对象碰撞组
          objectCollisionGroup.add(clonedMesh);
          meshCount++;
        }
      });

      if (meshCount === 0) {
        console.warn(`⚠️ 对象 ${objectId} 没有可碰撞的网格`);
        return;
      }

      console.log(`🔧 对象 ${objectId} 收集到 ${meshCount} 个网格`);

      // 使用 StaticGeometryGenerator 合并该对象的所有几何体
      const staticGenerator = new StaticGeometryGenerator(objectCollisionGroup);
      staticGenerator.attributes = ['position'];

      const mergedGeometry = staticGenerator.generate();
      mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

      // 创建该对象的碰撞体
      const objectCollider = new THREE.Mesh(mergedGeometry);
      objectCollider.name = `Collider_${objectId}`;
      objectCollider.material = new THREE.MeshBasicMaterial({
        wireframe: true,
        opacity: 0.3,
        transparent: true,
        visible: this.params.displayCollider,
        color: this.getRandomColor() // 为每个碰撞体分配不同颜色
      });

      // 创建BVH可视化器
      const visualizer = new MeshBVHHelper(objectCollider, this.params.visualizeDepth);
      visualizer.visible = this.params.displayBVH;
      visualizer.name = `Visualizer_${objectId}`;

      // 存储到映射中
      this.colliders.set(objectId, objectCollider);
      this.colliderMapping.set(objectId, object);
      this.visualizers.set(objectId, visualizer);

      // 添加到场景
      this.scene.add(objectCollider);
      this.scene.add(visualizer);

      console.log(`✅ 对象 ${objectId} 碰撞体创建成功! 顶点数: ${mergedGeometry.attributes.position.count}`);
    });

    console.log(`✅ 分离碰撞体组创建完成! 总数: ${this.colliders.size}`);
    return this.colliders;
  }

  /**
   * 生成随机颜色用于区分不同的碰撞体
   */
  private getRandomColor(): number {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500, 0x800080];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 清理分离的碰撞体
   */
  private disposeSeparateColliders(): void {
    // 清理碰撞体
    this.colliders.forEach((collider, id) => {
      if (collider.geometry) {
        collider.geometry.dispose();
      }
      if (collider.material instanceof THREE.Material) {
        collider.material.dispose();
      }
      this.scene.remove(collider);
    });

    // 清理可视化器
    this.visualizers.forEach((visualizer, id) => {
      this.scene.remove(visualizer);
    });

    // 清空映射
    this.colliders.clear();
    this.colliderMapping.clear();
    this.visualizers.clear();
  }

  /**
   * 获取所有分离的碰撞体
   */
  public getColliders(): Map<string, THREE.Mesh> {
    return this.colliders;
  }

  /**
   * 获取碰撞体映射关系
   */
  public getColliderMapping(): Map<string, BaseModel> {
    return this.colliderMapping;
  }

  /**
   * 根据ID获取特定的碰撞体
   */
  public getColliderById(id: string): THREE.Mesh | undefined {
    return this.colliders.get(id);
  }

  /**
   * 获取碰撞体数量
   */
  public getColliderCount(): number {
    return this.colliders.size;
  }

  /**
   * 更新可视化设置
   */
  updateVisualization(): void {
    // 更新统一碰撞体可视化
    if (this.collider) {
      this.collider.visible = this.params.displayCollider;
    }

    if (this.visualizer) {
      this.visualizer.visible = this.params.displayBVH;
      this.visualizer.depth = this.params.visualizeDepth;
      this.visualizer.update();
    }

    // 更新分离碰撞体可视化
    this.colliders.forEach((collider) => {
      collider.visible = this.params.displayCollider;
    });

    this.visualizers.forEach((visualizer) => {
      visualizer.visible = this.params.displayBVH;
      visualizer.depth = this.params.visualizeDepth;
      visualizer.update();
    });
  }
  /**
   * 清理资源
   */
  dispose(): void {
    // 清理统一碰撞体
    if(this.collider){
      this.collider!.geometry.dispose();
      this.scene.remove(this.collider!);
    }
    if(this.visualizer){
      this.scene.remove(this.visualizer);
    }

    // 清理分离碰撞体
    this.disposeSeparateColliders();
  }

  public getCollider(){
    return this.collider;
  }
}
