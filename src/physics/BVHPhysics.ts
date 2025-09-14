import { BaseModel } from '@/models/architecture/BaseModel';
import * as THREE from 'three';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';

/**
 * BVH物理系统 - 完全基于three-mesh-bvh实现
 * 替代CANNON物理引擎
 */
export class BVHPhysics {
  private scene: THREE.Scene;
  private collider?: THREE.Mesh;
  private visualizer?: MeshBVHHelper;
  
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
   * 更新可视化设置
   */
  updateVisualization(): void {
    if (this.collider) {
      this.collider.visible = this.params.displayCollider;
    }

    if (this.visualizer) {
      this.visualizer.visible = this.params.displayBVH;
      this.visualizer.depth = this.params.visualizeDepth;
      this.visualizer.update();
    }
  }
  /**
   * 清理资源
   */
  dispose(): void {
    if(this.collider){
      this.collider!.geometry.dispose();
      this.scene.remove(this.collider!);
    }
    if(this.visualizer){
      this.scene.remove(this.visualizer);
    }
  }

  public getCollider(){
    return this.collider;
  }
}
