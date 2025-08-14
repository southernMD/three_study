<script setup lang="ts">

import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GridHelper } from 'three/src/helpers/GridHelper.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
// 导入管理器类
import { MMDModelManager } from '../models/MMDModelManager';
import { TestBoxManager } from '../models/TestBoxManager';
import { SceneManager } from '../models/SceneManager';
import { PhysicsManager } from '../models/PhysicsManager';
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
    testBoxManager.initializeTestObjects();

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
