# 跑道底部平面功能

本文档介绍跑道底部平面的实现，该平面作为跑道的基础层，使用与塑胶跑道相同的材质。

## 功能概述

跑道底部平面是一个位于跑道下方的矩形平面，具有以下特点：

- **尺寸**：覆盖跑道的最大宽度和高度范围
- **位置**：位于跑道下方一层（Y = -0.01）
- **材质**：使用与塑胶跑道相同的材质和纹理
- **用途**：作为跑道的视觉基础，提供更好的整体效果

## 尺寸计算

### 最大宽度计算
```typescript
const extensionLength = this.curveRadius * 2; // 延伸长度
const extendedStraightLength = this.straightLength + extensionLength;
const maxWidth = extendedStraightLength + (this.curveRadius * 2);
```

- **直道长度**：84.39m + 延伸长度（50m）= 134.39m
- **弯道直径**：25m × 2 = 50m
- **总宽度**：134.39m + 50m = 184.39m

### 最大高度计算
```typescript
const trackOuterRadius = this.curveRadius + this.numberOfLanes * this.laneWidth;
const maxHeight = trackOuterRadius * 2;
```

- **外圈半径**：25m + (8 × 1.22m) = 34.76m
- **跑道高度**：34.76m × 2 = 69.52m

### 底部平面尺寸计算（长边+20%，短边不变）
```typescript
const maxWidth = trackWidth * 1.2; // 长边增加20%
const maxHeight = trackHeight;      // 短边保持不变
```

- **底部平面宽度**：184.39m × 1.2 = 221.27m（长边+20%）
- **底部平面高度**：69.52m（短边保持原尺寸）

## 技术实现

### 1. 几何体创建
```typescript
const baseGeometry = new THREE.PlaneGeometry(maxWidth, maxHeight, 50, 50);
```
- 使用PlaneGeometry创建矩形平面
- 分段数设置为50×50，提供足够的细节用于位移贴图

### 2. 材质配置
```typescript
const baseMaterial = trackMaterial.clone();

// 设置纹理重复
const repeatX = maxWidth / 10; // 每10米重复一次
const repeatY = maxHeight / 10;

// 应用到所有纹理
if (baseMaterial.map) baseMaterial.map.repeat.set(repeatX, repeatY);
if (baseMaterial.normalMap) baseMaterial.normalMap.repeat.set(repeatX, repeatY);
if (baseMaterial.roughnessMap) baseMaterial.roughnessMap.repeat.set(repeatX, repeatY);
if (baseMaterial.aoMap) baseMaterial.aoMap.repeat.set(repeatX, repeatY);
if (baseMaterial.displacementMap) {
  baseMaterial.displacementMap.repeat.set(repeatX, repeatY);
  baseMaterial.displacementScale = 0.01; // 减小位移效果
}
```

### 3. 位置设置
```typescript
basePlane.rotation.x = -Math.PI / 2; // 水平放置
basePlane.position.set(0, -0.01, 0); // 稍微低于跑道表面
basePlane.name = 'TrackBase';
```

## 材质特性

底部平面使用与跑道相同的材质，包括：

- **颜色贴图**：提供基础颜色
- **法线贴图**：增加表面细节
- **粗糙度贴图**：控制表面反射
- **环境遮蔽贴图**：增强阴影效果
- **位移贴图**：创建表面凹凸（强度降低）

### 位移贴图调整
```typescript
baseMaterial.displacementScale = 0.01; // 原跑道为0.02
```
底部平面的位移效果减半，避免过于凹凸不平。

## 纹理重复策略

### 重复计算
- **X轴重复**：maxWidth / 10 ≈ 22.1次（221.27m / 10）
- **Y轴重复**：maxHeight / 10 ≈ 6.95次（69.52m / 10）

### 重复原理
每10米重复一次纹理，确保：
1. 纹理不会过度拉伸
2. 保持与跑道纹理的一致性
3. 提供足够的视觉细节

## 性能考虑

### 几何体优化
- 使用50×50分段，平衡细节和性能
- 单一平面，避免复杂几何体

### 材质优化
- 克隆现有材质，避免重复加载纹理
- 共享纹理资源，节省内存

### 渲染优化
- 位于跑道下方，通常不会被频繁看到
- 使用相同的材质系统，便于批处理

## 使用场景

### 1. 视觉完整性
- 为跑道提供视觉基础
- 避免跑道悬浮在空中的感觉

### 2. 材质一致性
- 与跑道使用相同材质
- 保持整体视觉风格统一

### 3. 扩展性
- 可以作为其他地面元素的基础
- 便于添加更多地面装饰

## 调试信息

创建时会输出调试信息：
```
跑道基础尺寸: 宽度=184.39m, 高度=69.52m
底部平面尺寸: 宽度=221.27m (长边+20%), 高度=69.52m (短边不变)
跑道底部平面创建完成
```

## 自定义选项

可以通过修改以下参数来调整底部平面：

### 位置调整
```typescript
basePlane.position.set(0, -0.05, 0); // 更低的位置
```

### 纹理重复调整
```typescript
const repeatX = maxWidth / 5; // 更密集的重复
const repeatY = maxHeight / 5;
```

### 位移强度调整
```typescript
baseMaterial.displacementScale = 0.005; // 更平滑的表面
```

## 注意事项

1. **Y轴位置**：设置为-0.01，确保在跑道下方但不会太远
2. **纹理重复**：与跑道保持一致的重复模式
3. **性能影响**：大平面可能影响渲染性能，特别是在移动设备上
4. **材质共享**：使用clone()方法避免影响原始跑道材质

## 扩展功能

可以根据需要添加：

- 不同的底部材质选项
- 动态调整底部平面大小
- 添加底部平面的物理体
- 支持多层底部结构
