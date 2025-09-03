# 跑道GUI同步功能

本文档介绍跑道变换控制GUI如何与ObjectManager中设置的初始值保持同步。

## 功能概述

跑道变换控制GUI现在能够：

1. **自动同步初始值**：在跑道创建完成后，GUI会自动从跑道对象中读取当前的位置、旋转和缩放值
2. **手动同步**：提供"同步GUI值"按钮，用户可以随时将跑道的当前状态同步到GUI
3. **智能重置**：重置功能会将跑道恢复到ObjectManager中设置的初始值

## 工作原理

### 1. 初始值同步

当ObjectManager创建跑道时：

```typescript
// ObjectManager.ts 中的跑道创建
this.createOvalTrack('main-track', {
  position: { x: 0, y: 0, z: 100 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: 8 // 这个值会自动同步到GUI
});
```

GUI会在跑道创建完成后自动读取这些值：

```typescript
// ThreeModel.vue 中的自动同步
setTimeout(() => {
  trackTransformControl.syncFromTrack();
  trackFolder.controllers.forEach(controller => {
    controller.updateDisplay();
  });
}, 1000);
```

### 2. 同步方法

`syncFromTrack()` 方法负责从跑道对象读取当前值并更新GUI：

```typescript
syncFromTrack: () => {
  const mainTrack = objectManager?.getMainTrack();
  if (mainTrack) {
    const position = mainTrack.getPosition();
    const rotation = mainTrack.getRotationDegrees();
    const scale = mainTrack.getScale();
    
    trackTransformControl.positionX = position.x;
    trackTransformControl.positionZ = position.z;
    trackTransformControl.rotationY = rotation.y;
    trackTransformControl.scale = scale.x; // 统一缩放
    
    // 更新GUI显示
    trackFolder.controllers.forEach(controller => {
      controller.updateDisplay();
    });
  }
}
```

## GUI控制按钮

### 基础变换控制
- **X轴位置**：控制跑道在X轴上的位置
- **Z轴位置**：控制跑道在Z轴上的位置  
- **Y轴旋转(度)**：控制跑道绕Y轴的旋转角度
- **整体缩放**：控制跑道的整体缩放比例

### 功能按钮
- **手动更新变换**：手动触发变换更新（通常不需要，因为控制会自动更新）
- **同步GUI值**：从跑道对象同步当前值到GUI控制器
- **重置跑道**：将跑道重置到ObjectManager中设置的初始状态

## 使用场景

### 1. 修改ObjectManager中的初始值

当你在ObjectManager中修改跑道的初始参数时：

```typescript
// 修改 ObjectManager.ts
this.createOvalTrack('main-track', {
  position: { x: 50, y: 0, z: -200 },
  rotation: { x: 0, y: 45, z: 0 },
  scale: 5
});
```

GUI会自动显示这些新的初始值，无需手动调整。

### 2. 程序化修改跑道后同步GUI

如果通过代码修改了跑道的变换：

```typescript
const mainTrack = objectManager.getMainTrack();
mainTrack.setPosition(100, 0, 200);
mainTrack.setRotationDegrees(0, 90, 0);
mainTrack.setUniformScale(3);

// 同步到GUI
trackTransformControl.syncFromTrack();
```

### 3. 重置到初始状态

点击"重置跑道"按钮会：
1. 读取跑道当前的变换值（这些值反映了ObjectManager中的初始设置）
2. 将这些值应用到GUI控制器
3. 更新GUI显示

## 技术实现细节

### 异步同步

由于跑道创建是异步的，GUI同步使用了延时机制：

```typescript
setTimeout(() => {
  trackTransformControl.syncFromTrack();
  trackFolder.controllers.forEach(controller => {
    controller.updateDisplay();
  });
}, 1000); // 给跑道创建1秒时间
```

### GUI更新

同步后需要调用 `controller.updateDisplay()` 来更新GUI显示：

```typescript
trackFolder.controllers.forEach(controller => {
  controller.updateDisplay();
});
```

## 注意事项

1. **统一缩放假设**：当前实现假设跑道使用统一缩放（scale.x = scale.y = scale.z）
2. **Y轴位置固定**：跑道的Y轴位置始终保持为0
3. **异步延时**：使用1秒延时等待跑道创建，在某些情况下可能需要调整
4. **手动同步**：如果自动同步失败，可以使用"同步GUI值"按钮手动同步

## 扩展功能

可以根据需要添加：

- 实时监听跑道变换变化
- 支持非统一缩放的GUI显示
- 保存和加载GUI配置
- 批量同步多个对象的GUI值
