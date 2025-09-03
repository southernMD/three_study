# 跑道变换控制功能

本文档介绍如何使用跑道变换控制功能，包括位置、旋转和缩放的GUI控制。

## 功能概述

跑道变换控制功能为椭圆跑道提供了完整的GUI控制界面，允许用户通过图形界面实时调整跑道的：

- **位置控制**：X轴和Z轴位置调整
- **旋转控制**：Y轴旋转（0-360度）
- **缩放控制**：整体缩放（0.1x - 5x）
- **预设位置**：快速应用常用位置配置
- **预设尺寸**：快速切换不同尺寸

## 使用方法

### 1. 基础变换控制

在GUI界面中找到"跑道变换控制"文件夹，展开后可以看到以下控制项：

- **X轴位置**：拖动滑块调整跑道在X轴上的位置（-200 到 200）
- **Z轴位置**：拖动滑块调整跑道在Z轴上的位置（-200 到 200）
- **Y轴旋转(度)**：拖动滑块调整跑道绕Y轴的旋转角度（-180° 到 180°）
- **整体缩放**：拖动滑块调整跑道的整体缩放比例（0.1x 到 5x）

### 2. 预设位置

"预设位置"子文件夹提供了常用的位置配置：

- **中心位置**：将跑道移动到场景中心 (0, 0, 0)
- **北侧位置**：将跑道移动到北侧 (0, 0, -100)
- **南侧位置**：将跑道移动到南侧 (0, 0, 100)
- **东侧位置**：将跑道移动到东侧 (100, 0, 0)
- **西侧位置**：将跑道移动到西侧 (-100, 0, 0)
- **45度旋转**：将跑道旋转45度

### 3. 预设尺寸

"预设尺寸"子文件夹提供了常用的尺寸配置：

- **小尺寸(1x)**：将跑道缩放到1倍大小
- **标准尺寸(2x)**：将跑道缩放到2倍大小（默认）
- **大尺寸(3x)**：将跑道缩放到3倍大小

### 4. 功能按钮

- **手动更新变换**：手动触发变换更新（通常不需要，因为控制会自动更新）
- **重置跑道**：将跑道重置到默认状态（中心位置，无旋转，2倍缩放）
- **显示跑道信息**：在控制台输出当前跑道的详细变换信息

## 代码示例

### 在现有项目中使用

跑道变换控制已经集成到主项目中，在 `ThreeModel.vue` 文件中可以找到相关代码。

### 独立使用示例

```typescript
import { TrackTransformGUIExample } from '../examples/TrackTransformGUIExample';

// 创建场景
const scene = new THREE.Scene();

// 创建跑道变换控制示例
const example = new TrackTransformGUIExample(scene);
await example.initialize();

// GUI会自动显示，用户可以通过界面控制跑道
```

### 自定义控制

```typescript
// 创建自定义跑道变换控制
const trackTransformControl = {
  positionX: 0,
  positionZ: 0,
  rotationY: 0,
  scale: 2,
  
  updateTrackTransform: () => {
    const mainTrack = objectManager?.getMainTrack();
    if (mainTrack) {
      mainTrack.setPosition(trackTransformControl.positionX, 0, trackTransformControl.positionZ);
      mainTrack.setRotationDegrees(0, trackTransformControl.rotationY, 0);
      mainTrack.setUniformScale(trackTransformControl.scale);
    }
  }
};

// 添加到GUI
const gui = new GUI();
const trackFolder = gui.addFolder('跑道控制');
trackFolder.add(trackTransformControl, 'positionX', -200, 200, 1)
  .name('X轴位置')
  .onChange(() => trackTransformControl.updateTrackTransform());
```

## 技术实现

### 核心方法

跑道变换控制基于 `BaseModel` 类提供的变换方法：

- `setPosition(x, y, z)`：设置位置
- `setRotationDegrees(x, y, z)`：设置旋转角度
- `setUniformScale(scale)`：设置统一缩放
- `getPosition()`：获取当前位置
- `getRotationDegrees()`：获取当前旋转角度
- `getScale()`：获取当前缩放

### GUI集成

使用 `lil-gui` 库创建控制界面：

```typescript
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const gui = new GUI();
const folder = gui.addFolder('跑道变换控制');
```

## 注意事项

1. **Y轴位置固定**：跑道的Y轴位置始终保持为0，确保跑道始终在地面上
2. **旋转限制**：目前只支持Y轴旋转，这是最常用的旋转方向
3. **缩放范围**：缩放范围限制在0.1x到5x之间，避免过小或过大的跑道
4. **实时更新**：所有控制都会实时更新跑道的显示，无需手动刷新

## 扩展功能

可以根据需要添加更多功能：

- 支持X轴和Z轴旋转
- 添加更多预设位置
- 支持非统一缩放（X、Y、Z轴独立缩放）
- 添加动画过渡效果
- 保存和加载配置

## 故障排除

如果跑道变换控制不工作，请检查：

1. 确保 `objectManager` 已正确初始化
2. 确保跑道已成功创建（`getMainTrack()` 返回有效对象）
3. 检查控制台是否有错误信息
4. 确保GUI库已正确导入
