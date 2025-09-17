import { BaseModel } from '@/models/architecture/BaseModel';
import { Tree } from '@/models/architecture/Tree';
import * as THREE from 'three';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';
import { doors as doorNames } from '@/models/architecture/doors';
import { doorGroups } from '@/models/architecture/doors';

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
    gravity: -60,
    physicsSteps: 5,
    displayCollider: false,
    displayBVH: false,
    visualizeDepth: 10
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
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
      // 特殊处理：如果是tree-group，为所有树创建简单盒模型碰撞体
      if (objectId === 'tree-group') {
        console.log('🌳 开始为树组创建碰撞体...');
        const treeGroup = object as Tree;
        const trees = treeGroup.getModelGroup().children;

        this.createTreeColliders(trees);
        return; // 跳过常规处理
      } else if (objectId === 'school-building') {
        console.log('🏫 开始为学校建筑创建碰撞体...');
        const schoolBuilding = object as any; // SchoolBuilding类型
        const modelGroup = schoolBuilding.getModelGroup();

        if (!modelGroup) {
          console.warn('⚠️ 学校建筑没有模型组');
          return;
        }

        this.createSchoolBuildingColliders(schoolBuilding, modelGroup);
        return; // 跳过常规处理
      }
      // 常规处理：遍历模型组
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
   * 为学校建筑创建碰撞体（非门合并，门单独处理）
   */
  private createSchoolBuildingColliders(_schoolBuilding: any, modelGroup: THREE.Group): void {
    console.log('🏫 开始为学校建筑创建分离碰撞体...');

    // 使用导入的门名称列表

    // 分离门和非门对象
    const nonDoorMeshes: Array<THREE.Mesh | THREE.Group> = [];
    const doorMeshes: Array<THREE.Mesh | THREE.Group> = [];
    const names = []
    modelGroup.children[0].children.forEach((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry || child instanceof THREE.Group) {
        names.push(child.name)
        
        if (doorNames.includes(child.name)) {
          doorMeshes.push(child);
        } else {
          nonDoorMeshes.push(child);
        }
      }
    });
    console.log(`📊 学校建筑对象统计:`);
    console.log(`   非门网格: ${nonDoorMeshes.length} 个`);
    console.log(`   门网格: ${doorMeshes.length} 个`);

    // 2. 为每个门创建单独的碰撞体
    this.createIndividualDoorColliders(doorMeshes);

    this.createUnifiedNonDoorCollider(nonDoorMeshes);

    console.log('✅ 学校建筑碰撞体创建完成');
  }

  /**
   * 创建非门对象的统一碰撞体
   */
  private createUnifiedNonDoorCollider(nonDoorObjects: Array<THREE.Mesh | THREE.Group> = []): void {
    console.log('🏗️ 创建非门对象统一碰撞体...');

    // 创建临时组来收集非门网格
    const nonDoorGroup = new THREE.Group();

    // 深度遍历非门对象，收集所有网格
    nonDoorObjects.forEach(obj => {
      obj.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          // 克隆网格并应用世界变换
          const clonedMesh = child.clone();
          clonedMesh.geometry = child.geometry.clone();

          // 应用世界变换矩阵
          child.updateMatrixWorld(true);
          clonedMesh.applyMatrix4(child.matrixWorld);

          nonDoorGroup.add(clonedMesh);
        }
      });
    });

    // 使用StaticGeometryGenerator合并几何体
    const staticGenerator = new StaticGeometryGenerator(nonDoorGroup);
    staticGenerator.attributes = ['position'];

    const mergedGeometry = staticGenerator.generate();
    mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

    // 创建统一碰撞体
    const unifiedCollider = new THREE.Mesh(mergedGeometry);
    unifiedCollider.name = 'SchoolBuilding_NonDoors';

    // 创建绿色材质
    const nonDoorMaterial = new THREE.MeshBasicMaterial({
      wireframe: true,
      opacity: 0.5,
      transparent: true,
      color: 0x00ff00, // 绿色表示非门区域
      side: THREE.DoubleSide
    });
    unifiedCollider.material = nonDoorMaterial;
    unifiedCollider.visible = this.params.displayCollider;

    // 创建BVH可视化器
    const visualizer = new MeshBVHHelper(unifiedCollider, this.params.visualizeDepth);
    visualizer.visible = this.params.displayBVH;
    visualizer.name = 'SchoolBuilding_NonDoors_Visualizer';

    // 存储到映射中
    this.colliders.set('school-building-nondoors', unifiedCollider);
    this.visualizers.set('school-building-nondoors', visualizer);

    // 添加到场景
    this.scene.add(unifiedCollider);
    this.scene.add(visualizer);

    console.log(`✅ 非门统一碰撞体创建完成，合并了 ${nonDoorGroup.children.length} 个网格`);
  }

  /**
   * 为每个门创建单独的碰撞体
   */
  private createIndividualDoorColliders(doorObjects: Array<THREE.Mesh | THREE.Group>): void {
    console.log('🚪 为门创建单独碰撞体...');

    let doorCount = 0;

    doorObjects.forEach((doorObj) => {
      console.log(`🚪 处理门对象: ${doorObj.name}`);

      const doorId = `school-door-${doorObj.name}`;

      // 检查是否已经存在，避免重复创建
      if (this.colliders.has(doorId)) {
        console.log(`⚠️ 门碰撞体已存在，跳过: ${doorObj.name}`);
        return;
      }

      // 创建临时组来收集门的所有网格
      const doorGroup = new THREE.Group();
      let meshCount = 0;

      // 深度遍历门对象，收集所有网格
      doorObj.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          // 克隆网格并应用世界变换
          const clonedMesh = child.clone();
          clonedMesh.geometry = child.geometry.clone();

          // 应用世界变换矩阵
          child.updateMatrixWorld(true);
          clonedMesh.applyMatrix4(child.matrixWorld);

          doorGroup.add(clonedMesh);
          meshCount++;
        }
      });

      if (doorGroup.children.length === 0) {
        console.warn(`⚠️ 门对象没有找到网格: ${doorObj.name}`);
        return;
      }

      // 使用StaticGeometryGenerator合并门的几何体
      const staticGenerator = new StaticGeometryGenerator(doorGroup);
      staticGenerator.attributes = ['position'];

      const mergedGeometry = staticGenerator.generate();
      mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);

      // 创建门碰撞体
      const doorCollider = new THREE.Mesh(mergedGeometry);
      doorCollider.name = `DoorCollider_${doorObj.name}`;

      // 创建红色材质
      const doorMaterial = new THREE.MeshBasicMaterial({
        wireframe: true,
        opacity: 0.5,
        transparent: true,
        color: 0xff0000, // 红色表示门
        side: THREE.DoubleSide
      });
      doorCollider.material = doorMaterial;
      doorCollider.visible = this.params.displayCollider;

      // 创建BVH可视化器
      const visualizer = new MeshBVHHelper(doorCollider, this.params.visualizeDepth);
      visualizer.visible = this.params.displayBVH;
      visualizer.name = `DoorVisualizer_${doorObj.name}`;
      // 设置门的userData
      const doorData = doorGroups.get(doorObj.name);
      const isOpen = doorData?.[1] || false;

      doorCollider.userData = {
        isOpen: isOpen,
        doorName: doorObj.name,
        doorType: doorData?.[2] || ""
      };

      console.log(`🚪 设置门userData: ${doorObj.name}`, {
        doorData: doorData,
        isOpen: isOpen,
        userData: doorCollider.userData
      });
      // 存储到映射中
      this.colliders.set(doorId, doorCollider);
      this.visualizers.set(doorId, visualizer);

      // 添加到场景
      this.scene.add(doorCollider);
      this.scene.add(visualizer);

      console.log(`✅ 门碰撞体创建完成: ${doorObj.name} (合并了 ${meshCount} 个网格)`);
      doorCount++;
    });

    console.log(`🚪 所有门碰撞体创建完成，共处理 ${doorCount} 个门对象`);
  }

  /**
   * 为所有树创建简单盒模型碰撞体
   */
  private createTreeColliders(trees: THREE.Object3D[]): void {
    console.log(`🌳 开始为 ${trees.length} 棵树创建盒模型碰撞体...`);

    trees.forEach((tree, index) => {
      if (!tree || !tree.position) return;

      const treeId = `tree-${index + 1}`;

      // 创建简单的盒模型几何体 (宽8, 高12, 深8)
      const boxGeometry = new THREE.BoxGeometry(30, 500, 30);

      // 创建BVH
      boxGeometry.boundsTree = new MeshBVH(boxGeometry);

      // 创建碰撞体材质
      const colliderMaterial = new THREE.MeshBasicMaterial({
        wireframe: true,
        opacity: 0.3,
        transparent: true,
        visible: this.params.displayCollider,
        color: this.getRandomColor()
      });

      // 创建碰撞体网格
      const treeCollider = new THREE.Mesh(boxGeometry, colliderMaterial);
      treeCollider.name = `TreeCollider_${treeId}`;

      // 设置碰撞体位置（与树的位置对应，调整高度到中心）
      treeCollider.position.copy(tree.position);
      treeCollider.position.y += 6; // 调整到盒子中心高度

      // 应用树的旋转和缩放
      if (tree.rotation) {
        treeCollider.rotation.copy(tree.rotation);
      }
      if (tree.scale) {
        treeCollider.scale.copy(tree.scale);
      }
      // 创建BVH可视化器
      const visualizer = new MeshBVHHelper(treeCollider, this.params.visualizeDepth);
      visualizer.visible = this.params.displayBVH;
      visualizer.name = `TreeVisualizer_${treeId}`;

      // 存储到映射中
      this.colliders.set(treeId, treeCollider);
      this.visualizers.set(treeId, visualizer);

      // 添加到场景
      this.scene.add(treeCollider);
      this.scene.add(visualizer);

      console.log(`✅ 树 ${treeId} 的盒模型碰撞体创建完成`);
    });

    console.log(`🌲 所有树的碰撞体创建完成，共 ${trees.length} 个`);
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
    this.colliders.forEach((collider) => {
      if (collider.geometry) {
        collider.geometry.dispose();
      }
      if (collider.material instanceof THREE.Material) {
        collider.material.dispose();
      }
      this.scene.remove(collider);
    });

    // 清理可视化器
    this.visualizers.forEach((visualizer) => {
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
