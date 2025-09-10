# BVH 碰撞检测系统修复记录

## 问题描述

原始项目中存在以下主要问题：
1. **墙体无碰撞检测**：WallAndDoor 对象没有显示物理线框，人物可以穿墙而过
2. **人物升天问题**：`performSingleColliderDetection` 函数每次计算后人物 y 值翻倍，导致原地升天
3. **架构混乱**：多个独立的 BVH 系统，没有统一管理
4. **人物无法移动**：修复升天问题后，人物完全无法移动

## 修复方案概览

### 1. 统一 BVH 架构重构

**问题**：原来有多个分散的 BVH 系统，每个对象单独创建碰撞体
**解决方案**：创建统一的 BVH 碰撞检测系统

#### 核心改动：
- **BVHPhysics.ts**：从数组改为单一碰撞体
  ```typescript
  // 之前
  private colliders: THREE.Mesh[] = [];
  private visualizers: MeshBVHHelper[] = [];
  
  // 之后  
  private collider?: THREE.Mesh;
  private visualizer?: MeshBVHHelper;
  ```

- **统一场景扫描**：`createSceneCollider()` 方法
  ```typescript
  createSceneCollider(staticObjects?: Map<string, BaseModel>): THREE.Mesh | null {
    staticObjects?.forEach((object) => {
      const modelGroup = object.getModelGroup();
      modelGroup.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          // 收集所有网格到统一碰撞组
          collisionGroup.add(clonedMesh);
        }
      });
    });
    
    // 使用 StaticGeometryGenerator 合并所有几何体
    const staticGenerator = new StaticGeometryGenerator(collisionGroup);
    const mergedGeometry = staticGenerator.generate();
    mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);
  }
  ```

### 2. ObjectManager 统一对象管理

**问题**：对象创建分散，难以统一管理
**解决方案**：通过 ObjectManager 统一创建和管理所有静态对象

#### 核心改动：
- **Ground.ts**：新增地面模型类
- **ObjectManager.ts**：统一管理地面、墙体、建筑物、跑道
  ```typescript
  async create(): Promise<void> {
    // 创建地面
    await this.createGround('main-ground');
    // 创建跑道  
    await this.createOvalTrack('main-track');
    // 创建学校建筑
    await this.createSchoolBuilding('school-building');
    // 创建边界墙体
    await this.createBoundaryWalls();
  }
  ```

### 3. 修复人物升天问题

**问题**：`performSingleColliderDetection` 中双重矩阵变换导致 y 值翻倍

#### 原始错误代码：
```typescript
// 错误：应用了两次变换
tempSegment.start.applyMatrix4(playerMatrix).applyMatrix4(tempMat);
tempSegment.end.applyMatrix4(playerMatrix).applyMatrix4(tempMat);

// 然后又应用一次
newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);
```

#### 修复后代码：
```typescript
// 修复：playerCapsule 已经在世界空间，直接转换到碰撞体局部空间
tempSegment.start.applyMatrix4(tempMat);
tempSegment.end.applyMatrix4(tempMat);

// 正确转换回世界空间
newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);
```

### 4. 修复人物移动问题

**问题**：位置差异计算错误，导致人物无法移动

#### 原始错误代码：
```typescript
// 错误：使用了错误的参考位置
const capsuleBottomOffset = new THREE.Vector3(0, this.capsuleParams.radius, 0);
const expectedPosition = this.mesh.position.clone().add(capsuleBottomOffset);
deltaVector.subVectors(newPosition, expectedPosition);
```

#### 修复后代码：
```typescript
// 修复：使用原始胶囊体位置作为参考
const originalCapsuleStart = this.playerCapsule.start.clone();
deltaVector.subVectors(newPosition, originalCapsuleStart);
```

### 5. GUI 控制系统完善

**问题**：BVHPhysics 的可视化参数无法通过 GUI 控制

#### 解决方案：
```typescript
// 在 physicsVisualizationControl 中添加 BVHPhysics 控制
toggleCollider: () => {
  // 控制 BVHPhysics 系统的碰撞体可视化
  if (globalState.bvhPhysics) {
    globalState.bvhPhysics.params.displayCollider = physicsVisualizationControl.displayCollider;
    globalState.bvhPhysics.updateVisualization();
  }
}
```

### 6. 墙体重新创建机制

**问题**：缩放墙体后旧墙体残留

#### 解决方案：
```typescript
recreateBoundaryWalls(): void {
  // 彻底清除现有墙体（包括几何体和材质）
  const boundaryWalls = this.modelGroup.children.filter(
    child => child.name.includes('BoundaryWall') ||
             child.name.includes('ClippingPlane') ||
             child.name.includes('BoundaryPoint')
  );
  
  // 完全销毁资源
  boundaryWalls.forEach(wall => {
    wall.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) /* dispose materials */;
      }
    });
  });
  
  // 触发重新生成BVH碰撞体
  window.dispatchEvent(new CustomEvent('wallsRecreated'));
}
```

## 关键技术要点

### 1. 坐标系变换理解
- **playerCapsule**：始终在世界坐标系中
- **碰撞检测**：需要转换到碰撞体的局部坐标系
- **结果应用**：需要正确转换回世界坐标系

### 2. StaticGeometryGenerator 使用
- 将多个分散的网格合并为单一几何体
- 提高 BVH 树构建效率
- 减少碰撞检测计算量

### 3. 事件驱动更新
- 墙体重新创建时触发 `wallsRecreated` 事件
- 自动重新生成统一 BVH 碰撞体
- 确保碰撞检测始终与场景同步

## 修复效果

✅ **墙体碰撞检测正常**：人物无法穿墙
✅ **人物移动正常**：不再升天，可以正常行走
✅ **可视化控制完善**：GUI 可以控制所有 BVH 可视化
✅ **性能优化**：统一碰撞体减少计算开销
✅ **架构清晰**：ObjectManager 统一管理所有对象

## 调试技巧

1. **使用 debugger**：在关键函数中添加断点
2. **BVH 可视化**：开启 GUI 中的 "显示BVH辅助线"
3. **胶囊体可视化**：检查人物胶囊体位置是否正确
4. **控制台日志**：观察碰撞检测过程中的位置变化

## 后续优化建议

1. **性能监控**：添加碰撞检测性能统计
2. **更精确的碰撞**：考虑使用更复杂的碰撞形状
3. **物理引擎集成**：考虑集成完整的物理引擎
4. **错误处理**：添加更完善的错误恢复机制
