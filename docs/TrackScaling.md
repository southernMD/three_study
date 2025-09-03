# 跑道缩放功能

本文档介绍如何在OvalRunningTrack实例化时传入x、z轴缩放参数来设置跑道的初始大小。

## 功能概述

OvalRunningTrack现在支持在实例化时通过InitialTransform参数设置x、z轴的独立缩放，这允许创建不同形状和尺寸的跑道：

- **X轴缩放**：影响跑道的直道长度
- **Z轴缩放**：影响跑道的弯道半径和跑道宽度
- **Y轴缩放**：影响跑道的整体高度（通常保持为1或与其他轴相同）

## 基础用法

### 1. 统一缩放

```typescript
// 创建2倍大小的标准跑道
const track = new OvalRunningTrack(scene, {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: 2 // 统一缩放到2倍
});
await track.create();
```

### 2. 独立轴缩放

```typescript
// 创建宽跑道（Z轴放大）
const wideTrack = new OvalRunningTrack(scene, {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 2, y: 2, z: 3 } // X轴2倍，Z轴3倍
});
await wideTrack.create();

// 创建长跑道（X轴放大）
const longTrack = new OvalRunningTrack(scene, {
  position: { x: 300, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 3, y: 2, z: 2 } // X轴3倍，Z轴2倍
});
await longTrack.create();
```

## 预设跑道类型

### 标准跑道
```typescript
const standardTrack = new OvalRunningTrack(scene, {
  scale: { x: 2, y: 2, z: 2 }
});
```
- 直道长度：168.78m (84.39 × 2)
- 弯道半径：50m (25 × 2)
- 跑道宽度：2.44m (1.22 × 2)

### 宽跑道
```typescript
const wideTrack = new OvalRunningTrack(scene, {
  scale: { x: 2, y: 2, z: 3 }
});
```
- 直道长度：168.78m (84.39 × 2)
- 弯道半径：75m (25 × 3)
- 跑道宽度：3.66m (1.22 × 3)

### 长跑道
```typescript
const longTrack = new OvalRunningTrack(scene, {
  scale: { x: 3, y: 2, z: 2 }
});
```
- 直道长度：253.17m (84.39 × 3)
- 弯道半径：50m (25 × 2)
- 跑道宽度：2.44m (1.22 × 2)

### 小跑道
```typescript
const smallTrack = new OvalRunningTrack(scene, {
  scale: { x: 1, y: 1, z: 1 }
});
```
- 直道长度：84.39m (原始尺寸)
- 弯道半径：25m (原始尺寸)
- 跑道宽度：1.22m (原始尺寸)

### 椭圆跑道
```typescript
const ellipticalTrack = new OvalRunningTrack(scene, {
  scale: { x: 1.5, y: 2, z: 2.5 }
});
```
- 直道长度：126.59m (84.39 × 1.5)
- 弯道半径：62.5m (25 × 2.5)
- 跑道宽度：3.05m (1.22 × 2.5)

## 在ObjectManager中使用

ObjectManager的createOvalTrack方法也支持独立轴缩放：

```typescript
// 创建宽跑道
await objectManager.createOvalTrack('wide-track', {
  position: { x: 100, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 2, y: 2, z: 3 }
});

// 创建长跑道
await objectManager.createOvalTrack('long-track', {
  position: { x: -100, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 3, y: 2, z: 2 }
});
```

## 实现原理

### 尺寸计算

跑道的实际尺寸通过以下公式计算：

```typescript
// X轴缩放影响直道长度
this.straightLength = this.baseStraightLength * scaleX;

// Z轴缩放影响弯道半径和跑道宽度
this.curveRadius = this.baseCurveRadius * scaleZ;
this.laneWidth = this.baseLaneWidth * scaleZ;
```

### 基础尺寸参数

```typescript
private baseStraightLength = 84.39; // 基础直道长度（米）
private baseCurveRadius = 25; // 基础弯道半径（米）
private baseLaneWidth = 1.22; // 基础跑道宽度（米）
```

## 使用示例

### 创建多种尺寸的跑道

```typescript
import { TrackScalingExample } from '../examples/TrackScalingExample';

const scene = new THREE.Scene();
const example = new TrackScalingExample(scene);

// 创建不同缩放的跑道
await example.createScaledTracks();

// 显示跑道信息
example.showTracksInfo();
```

### 使用预设创建跑道

```typescript
// 创建预设尺寸的跑道
const wideTrack = TrackScalingExample.createPresetTrack(
  scene, 
  'wide', 
  { x: 100, y: 0, z: 0 }
);
await wideTrack.create();
```

## 注意事项

1. **Y轴缩放**：通常建议保持Y轴缩放与其他轴相同，避免跑道变形
2. **物理体**：缩放会影响物理体的尺寸，确保物理世界中的碰撞检测正确
3. **纹理重复**：缩放会自动调整纹理重复，保持视觉效果的一致性
4. **性能考虑**：大尺寸跑道会增加渲染负担，建议根据需要选择合适的缩放比例

## 扩展功能

可以根据需要添加更多功能：

- 动态调整跑道尺寸
- 保存和加载跑道配置
- 创建更多预设跑道类型
- 支持非对称缩放（左右弯道不同尺寸）
