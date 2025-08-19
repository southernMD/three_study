<script setup lang="ts">

import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GridHelper } from 'three/src/helpers/GridHelper.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
// 导入管理器类
import { MMDModelManager } from '../models/managers/MMDModelManager';
import { TestBoxManager } from '../models/managers/TestBoxManager';
import { SceneManager } from '../models/managers/SceneManager';
import { PhysicsManager } from '../models/managers/PhysicsManager';
import { ObjectManager } from '../models/managers/ObjectManager';
import { PHYSICS_CONSTANTS, getGroundFullSize } from '../constants/PhysicsConstants';
import { GlobalState } from '../types/GlobalState';
// 导入cannon-es物理引擎
import * as CANNON from 'cannon-es';

let scene: THREE.Scene
const dom = ref()
let width = innerWidth
let height = innerHeight
let camera: THREE.PerspectiveCamera
let lookCamera: THREE.PerspectiveCamera
let isCameraRender = true
let hadRenderCamera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let cameraControls: OrbitControls
const gui = new GUI()

// 管理器实例
let mmdModelManager: MMDModelManager
let testBoxManager: TestBoxManager
let sceneManager: SceneManager
let physicsManager: PhysicsManager
let objectManager: ObjectManager

// 全局状态对象
let globalState: GlobalState

const guiFn = {
  changeCamera: () => {
    if (isCameraRender) {
      hadRenderCamera = lookCamera
      isCameraRender = false
    } else {
      hadRenderCamera = camera
      isCameraRender = true
    }
  },
  reSetReimu: () => {
    // 使用MMDModelManager重置位置
    mmdModelManager.resetPosition();
  },
  toggleHelpers: () => {
    // 使用MMDModelManager切换辅助线
    mmdModelManager.toggleHelpers();
  },
  // 演示强制走路动画
  forceWalk: () => {
    mmdModelManager.forceWalk();
  },
  // 演示强制站立动画
  forceStand: () => {
    mmdModelManager.forceStand();
  },
  // 演示在当前位置创建一个碰撞箱
  createBoxHere: () => {
    mmdModelManager.createBoxHere((color, position) => {
      testBoxManager.createBox(color, position);
    });
  },
  // 创建一组掉落的盒子
  createFallingBoxesNow: () => {
    testBoxManager.createFallingBoxes();
  },
  // 显示物理世界信息
  showPhysicsInfo: () => {
    if (physicsManager) {
      physicsManager.showPhysicsInfo();
    }
  },
  // 显示跑道信息
  showTrackInfo: () => {
    const mainTrack = objectManager?.getMainTrack();
    if (mainTrack) {
      console.log('跑道信息:', mainTrack.getTrackInfo());
    }
  },
  // 重置跑道位置
  resetTrackPosition: () => {
    const mainTrack = objectManager?.getMainTrack();
    if (mainTrack) {
      mainTrack.setPosition(0, 0, 0);
    }
  },
  // 显示所有对象信息
  showAllObjects: () => {
    console.log('所有静态对象:', objectManager?.getAllObjects());
    console.log('对象类型统计:', objectManager?.getObjectTypeStats());
    console.log('对象总数:', objectManager?.getObjectCount());
  },
  // 显示物理常量信息
  showPhysicsConstants: () => {
    console.log('🔧 物理世界常量:');
    console.log('   📏 地面半尺寸:', `X=${PHYSICS_CONSTANTS.GROUND_SIZE_X}, Z=${PHYSICS_CONSTANTS.GROUND_SIZE_Z}, Y=${PHYSICS_CONSTANTS.GROUND_SIZE_Y}`);
    console.log('   📐 地面完整尺寸:', getGroundFullSize());
    console.log('   🌍 重力:', PHYSICS_CONSTANTS.GRAVITY);
    console.log('   🤝 地面摩擦力:', PHYSICS_CONSTANTS.GROUND_FRICTION);
    console.log('   ⚡ 地面弹性:', PHYSICS_CONSTANTS.GROUND_RESTITUTION);
  },


}

// 地面尺寸控制对象
const groundSizeControl = {
  sizeX: PHYSICS_CONSTANTS.GROUND_SIZE_X,
  sizeZ: PHYSICS_CONSTANTS.GROUND_SIZE_Z,
  updateGroundSize: () => {
    // 更新物理常量
    (PHYSICS_CONSTANTS as any).GROUND_SIZE_X = groundSizeControl.sizeX;
    (PHYSICS_CONSTANTS as any).GROUND_SIZE_Z = groundSizeControl.sizeZ;

    // 重新生成地面和边界墙体
    if (objectManager) {
      objectManager.regenerateGroundAndWalls().then(() => {
        // 重新生成后恢复墙体缩放
        const wall = objectManager.getWall('boundary-walls');
        if (wall) {
          wall.wallScale = wallScaleControl.scale;
          wall.recreateBoundaryWalls();
          console.log(`✅ 地面更新完成，墙体缩放恢复: ${wallScaleControl.scale}`);
        }
      });
      console.log(`🔄 地面尺寸更新: X=${groundSizeControl.sizeX}, Z=${groundSizeControl.sizeZ}`);
    }
  }
}

// 墙体缩放控制对象
const wallScaleControl = {
  scale: 5, // 默认缩放值
  updateWallScale: () => {
    console.log('🔧 尝试更新墙体缩放...');
    const wall = objectManager?.getWall('boundary-walls');
    console.log('🔍 获取到的墙体对象:', wall);
    if (wall) {
      wall.wallScale = wallScaleControl.scale;
      wall.recreateBoundaryWalls();
      console.log(`✅ 墙体缩放已更新为: ${wallScaleControl.scale}`);
    } else {
      console.log('❌ 边界墙体不存在，可能已被清除');
      // 尝试重新生成墙体
      if (objectManager) {
        objectManager.regenerateBoundaryWalls().then(() => {
          const newWall = objectManager.getWall('boundary-walls');
          if (newWall) {
            newWall.wallScale = wallScaleControl.scale;
            newWall.recreateBoundaryWalls();
            console.log(`✅ 重新生成后墙体缩放已更新为: ${wallScaleControl.scale}`);
          }
        });
      }
    }
  }
}

// 物理体可视化控制对象
const physicsVisualizationControl = {
  showPhysicsWalls: true,
  togglePhysicsVisualization: () => {
    // 查找所有物理墙体可视化对象
    const physicsVisualizations: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.name.includes('PhysicsWallVisualization')) {
        physicsVisualizations.push(child);
        console.log(`🔍 找到物理体可视化: ${child.name}, 位置(${child.position.x.toFixed(1)}, ${child.position.y.toFixed(1)}, ${child.position.z.toFixed(1)}), 可见性: ${child.visible}`);
      }
    });

    // 切换可见性
    physicsVisualizations.forEach(obj => {
      obj.visible = physicsVisualizationControl.showPhysicsWalls;
    });

    console.log(`🔍 物理墙体可视化: ${physicsVisualizationControl.showPhysicsWalls ? '显示' : '隐藏'} (${physicsVisualizations.length}个对象)`);
  }
}

gui.add(guiFn, 'changeCamera').name('改变相机')
gui.add(guiFn, 'reSetReimu').name('回到原点')
gui.add(guiFn, 'toggleHelpers').name('显示/隐藏人物辅助线')
gui.add(guiFn, 'forceWalk').name('播放走路动画')
gui.add(guiFn, 'forceStand').name('播放站立动画')
gui.add(guiFn, 'createBoxHere').name('在当前位置创建箱子')
gui.add(guiFn, 'createFallingBoxesNow').name('创建掉落的盒子')
gui.add(guiFn, 'showPhysicsInfo').name('显示物理信息')

// 对象管理器控制
const objectFolder = gui.addFolder('静态对象管理')
objectFolder.add(guiFn, 'showTrackInfo').name('显示跑道信息')
objectFolder.add(guiFn, 'resetTrackPosition').name('重置跑道位置')
objectFolder.add(guiFn, 'showAllObjects').name('显示所有对象')
objectFolder.add(guiFn, 'showPhysicsConstants').name('显示物理常量')

// 地面尺寸控制
const groundSizeFolder = gui.addFolder('地面尺寸控制')
groundSizeFolder.add(groundSizeControl, 'sizeX', 50, 500, 10)
  .name('地面X轴半尺寸')
  .onFinishChange(() => {
    groundSizeControl.updateGroundSize();
  })
groundSizeFolder.add(groundSizeControl, 'sizeZ', 50, 500, 10)
  .name('地面Z轴半尺寸')
  .onFinishChange(() => {
    groundSizeControl.updateGroundSize();
  })

// 墙体缩放控制
const wallScaleFolder = gui.addFolder('墙体缩放控制')
wallScaleFolder.add(wallScaleControl, 'scale', 0.1, 20, 0.1)
  .name('墙体缩放')
  .onChange(() => {
    wallScaleControl.updateWallScale();
  })
wallScaleFolder.add(wallScaleControl, 'updateWallScale').name('手动更新缩放')

// 物理体可视化控制
const physicsVisualizationFolder = gui.addFolder('物理体可视化')
physicsVisualizationFolder.add(physicsVisualizationControl, 'showPhysicsWalls')
  .name('显示物理墙体')
  .onChange(() => {
    physicsVisualizationControl.togglePhysicsVisualization();
  })
physicsVisualizationFolder.add(physicsVisualizationControl, 'togglePhysicsVisualization').name('切换可视化')

// gridHelper现在由SceneManager管理

onMounted(async () => {

    // 初始化全局状态对象（只保留真正全局的状态）
    globalState = {
      physicsWorld: undefined,
      physicsBodies: undefined
    };

    // 初始化场景管理器
    sceneManager = new SceneManager();
    scene = sceneManager.getScene();

    // 创建相机和渲染器
    camera = sceneManager.createCamera(width, height);
    renderer = sceneManager.createRenderer(dom.value, width, height);

    // 初始化灯光
    sceneManager.initializeLights();

    // 创建场景控制器
    const controls = sceneManager.createSceneControls();

    // 初始化物理管理器
    physicsManager = new PhysicsManager(scene, globalState);

    // 初始化其他管理器
    mmdModelManager = new MMDModelManager(scene, renderer, globalState);
    testBoxManager = new TestBoxManager(scene, physicsManager);

    // 加载模型
    await mmdModelManager.loadModel();

    // 获取相机和控制器
    lookCamera = mmdModelManager.getLookCamera();
    cameraControls = mmdModelManager.getCameraControls();

    // 初始化测试物体
    // testBoxManager.initializeTestObjects();

    // 创建对象管理器并创建椭圆跑道
    objectManager = new ObjectManager(scene, globalState, physicsManager);


    // 创建物理地面
    physicsManager.createGround();

    hadRenderCamera = camera

    // 添加窗口事件监听器
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 相机辅助器更新现在在animate函数中处理
    animate(); // 启动渲染循环
})

onUnmounted(() => {
  // 移除窗口事件监听器
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);

  // 清理所有管理器资源
  if (mmdModelManager) {
    mmdModelManager.cleanup();
  }

  if (physicsManager) {
    physicsManager.cleanup();
  }

  if (sceneManager) {
    sceneManager.cleanup();
  }
})

// 模型实例现在由MMDModelManager管理

// CreateCamera、CreateRender、createAxesHelper函数现在由SceneManager处理

// loadModel函数现在由MMDModelManager处理

// 全局声明现在通过GlobalState接口管理，不再使用window全局变量

// createBox函数现在由TestBoxManager处理

// createRamp函数现在由TestBoxManager处理

function animate() {
  requestAnimationFrame(animate);

  // 1. 更新MMD模型（处理用户输入，同步到物理身体）
  if (mmdModelManager) {
    mmdModelManager.update(1/120);
  }

  // 2. 更新物理世界（计算碰撞和物理响应）
  if (physicsManager) {
    physicsManager.update();
  }

  // 3. 将物理引擎的计算结果同步回模型
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model) {
      model.syncFromPhysics();
      // 更新模型的辅助器
      model.updateModelHelpers();
      model.updateCameraHelpers();
    }
  }

  // 4. 更新场景
  if (sceneManager) {
    sceneManager.update();
  }

  // 5. 渲染场景
  if (sceneManager) {
    sceneManager.render(hadRenderCamera);
  }
}

// light函数现在由SceneManager处理

window.addEventListener('resize', function () {
  width = window.innerWidth
  height = window.innerHeight
  if (sceneManager) {
    sceneManager.handleResize(width, height);
  }
})

function handleKeyDown(event: KeyboardEvent) {
  if (mmdModelManager) {
    mmdModelManager.handleKeyDown(event);
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (mmdModelManager) {
    mmdModelManager.handleKeyUp(event);
  }
}

// keyMap现在由MMDModelManager管理

// initPhysicsWorld和createGround函数现在由PhysicsManager处理

// createFallingBoxes函数现在由TestBoxManager处理
</script>

<template>
  <div class="model" ref="dom"></div>
</template>

<style scoped></style>
