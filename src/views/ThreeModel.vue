<script setup lang="ts">

// 声明Ammo全局变量
declare var Ammo: any;

import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";
import { AnimationMixer } from 'three/src/animation/AnimationMixer.js';
import { AnimationClip } from 'three/src/animation/AnimationClip.js';
import type { KeyframeTrack } from 'three';
import { AnimationAction } from 'three/src/animation/AnimationAction.js';
import { GridHelper } from 'three/src/helpers/GridHelper.js';
import { Octree } from 'three/examples/jsm/math/Octree.js';
import { OctreeHelper } from 'three/examples/jsm/Addons.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
// 导入MMDModel类
import { MMDModel } from '../models/MMDModel';
import { GLTFModel } from '../models/GLTFModel';

// 添加全局声明
declare global {
  interface Window {
    updateModelHelpers?: () => void;
    playerCapsule?: Capsule;
    capsuleParams?: {
      visual: THREE.Mesh;
      radius: number;
      height: number;
    };
    worldOctrees?: Octree[];
    helpersVisible?: {
      skeletonHelper?: THREE.SkeletonHelper;
      boxHelper?: THREE.BoxHelper;
      capsuleVisual?: THREE.Mesh;
      octreeHelpers?: THREE.Object3D[];
    };
    cameraHelpers?: {
      lookCameraHelper?: THREE.CameraHelper;
    };
  }
}

const scene = new THREE.Scene()
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
    // 使用mmdModel重置位置
    mmdModel.resetPosition();
    lookCamera.position.set(0, 13, 2);
    cameraControls.minAzimuthAngle = Math.PI * 2
    cameraControls.maxPolarAngle = Math.PI * 3 / 4;
    window.cameraHelpers?.lookCameraHelper?.update()
    renderer.render(scene, hadRenderCamera);
  },
  toggleHelpers: () => {
    // 使用mmdModel切换辅助线
    mmdModel.toggleHelpers();
  },
  // 演示强制走路动画
  forceWalk: () => {
    mmdModel.startWalk();
    mmdModel.isWalking = true;
  },
  // 演示强制站立动画
  forceStand: () => {
    mmdModel.stopWalk();
    mmdModel.isWalking = false;
  },
  // 演示在当前位置创建一个碰撞箱
  createBoxHere: () => {
    if (mmdModel && mmdModel.mesh) {
      const position = mmdModel.mesh.position.clone();
      position.y += 5; // 在模型头上方创建盒子
      createBox(0x00ff00, position);
    }
  }
}

gui.add(guiFn, 'changeCamera').name('改变相机')
gui.add(guiFn, 'reSetReimu').name('回到原点')
gui.add(guiFn, 'toggleHelpers').name('显示/隐藏人物辅助线')
gui.add(guiFn, 'forceWalk').name('播放走路动画')
gui.add(guiFn, 'forceStand').name('播放站立动画')
gui.add(guiFn, 'createBoxHere').name('在当前位置创建箱子')
const gridHelper = new GridHelper(1000, 100, 0x444444, 0x444444);
scene.add(gridHelper);

onMounted(() => {

  Ammo().then(async function (AmmoLib: any) {
    Ammo = AmmoLib;
    camera = CreateCamera()
    renderer = CreateRender()
    light()
    createAxesHelper()

    await loadModel()
    createBox(0xff0000, new THREE.Vector3(0, 5, -105))
    createBox(0xffff00, new THREE.Vector3(0, 5, 105))
    createBox(0x66ccff, new THREE.Vector3(105, 5, 0))
    createBox(0xff00fff, new THREE.Vector3(-105, 5, 0))
    createBox(0xff00fff, new THREE.Vector3(0, 55, 0))
    
    // 创建不同角度的斜坡用于测试
    createRamp(new THREE.Vector3(20, 0, -20), new THREE.Vector3(15, 2, 30), 15, 0x8B4513); // 15度斜坡
    createRamp(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(15, 2, 30), 25, 0xA0522D); // 25度斜坡
    createRamp(new THREE.Vector3(0, 0, -60), new THREE.Vector3(40, 2, 15), 20, 0xD2691E); // 宽一点的20度斜坡
    
    lookCamera = mmdModel.createLookCamera(scene)
    hadRenderCamera = camera
    
    // 使用mmdModel的createCameraControls方法创建相机控制器，传入renderer以支持自动渲染
    cameraControls = mmdModel.createCameraControls(lookCamera, renderer.domElement, renderer);
    
    // 添加窗口事件监听器
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    window.cameraHelpers?.lookCameraHelper?.update()
    animate(); // 启动渲染循环
  });

})

onUnmounted(() => {
  scene.remove(gridHelper)
  
  // 移除窗口事件监听器
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  
  // 清理相机控制器资源
  if (mmdModel && cameraControls) {
    mmdModel.cleanupCameraControls(cameraControls);
  }
  
  // 释放控制器
  if (cameraControls) {
    cameraControls.dispose();
  }
  
  // 释放渲染器
  if (renderer) {
    renderer.dispose();
  }
  
  // 清理场景
  if (scene) {
    scene.clear();
  }
})

// 创建模型实例
let mmdModel: MMDModel | GLTFModel;

// 修改CreateLookCamera使用mmdModel
// function CreateLookCamera() {
//   const myCameraLook = new THREE.PerspectiveCamera(45, 1, 1, 200);
//   myPerCamLookHelper = new THREE.CameraHelper(myCameraLook);
//   // 确保mmdMesh已经初始化
//   if (mmdModel && mmdModel.mesh) {
//     myCameraLook.position.set(
//       mmdModel.mesh.position.x, 
//       mmdModel.mesh.position.y + 13, 
//       mmdModel.mesh.position.z + 2
//     );
//   } else {
//     myCameraLook.position.set(0, 13, 2);
//   }
//   scene.add(myPerCamLookHelper);
//   return myCameraLook;
// }

function updateLookCamera(x: number, y: number, z: number) {
  lookCamera.position.set(x, y, z);
}

function updateLookAt(x: number, y: number, z: number) {
  lookCamera.lookAt(x, y, z);
}


function CreateCamera() {
  //创建一个透视投影对象
  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 8000)
  //设置相机的位置
  camera.position.set(100, 50, 100)
  //相机的视线 观察目标点的坐标
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()

  return camera
}
function CreateRender() {
  //添加渲染器
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
  })
  //设置屏幕像素比
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setClearColor(0x888888)
  renderer.setSize(width, height)
  dom.value.appendChild(renderer.domElement)
  renderer.render(scene, camera)
  return renderer
}

function createAxesHelper() {
  const axesHelper = new THREE.AxesHelper(150)
  scene.add(axesHelper)
}

async function loadModel() {
  mmdModel = new GLTFModel();
  await mmdModel.load(scene, '/model/test.glb');
  // mmdModel = new MMDModel();
  // await mmdModel.load(scene, '/lm/楈柌v2.pmx', '/lm/走路.vmd', '/lm/站立.vmd');
}

function createBox(color: THREE.ColorRepresentation, position: THREE.Vector3) {
  const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
  const boxMaterial = new THREE.MeshStandardMaterial({ color });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(position.x, position.y, position.z);
  scene.add(box);
  
  // 创建8叉树用于碰撞检测
  const worldOctree = new Octree();
  worldOctree.fromGraphNode(box);
  const octreeHelper = new OctreeHelper(worldOctree);
  scene.add(octreeHelper);
  
  // 保存八叉树引用，用于后续碰撞检测
  if (!window.worldOctrees) {
    window.worldOctrees = [];
  }
  window.worldOctrees.push(worldOctree);
  
  // 保存八叉树辅助线引用，用于控制可见性
  if (window.helpersVisible && window.helpersVisible.octreeHelpers) {
    window.helpersVisible.octreeHelpers.push(octreeHelper);
  }
  
  return box;
}

function createRamp(position: THREE.Vector3, size: THREE.Vector3, angle: number, color: THREE.ColorRepresentation) {
  // 创建斜坡几何体
  const rampGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const rampMaterial = new THREE.MeshStandardMaterial({ color });
  const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
  
  // 设置斜坡位置
  ramp.position.copy(position);
  
  // 旋转斜坡
  ramp.rotation.x = angle * Math.PI / 180;
  
  // 添加到场景
  scene.add(ramp);
  
  // 创建8叉树用于碰撞检测
  const worldOctree = new Octree();
  worldOctree.fromGraphNode(ramp);
  const octreeHelper = new OctreeHelper(worldOctree);
  scene.add(octreeHelper);
  
  // 保存八叉树引用，用于后续碰撞检测
  if (!window.worldOctrees) {
    window.worldOctrees = [];
  }
  window.worldOctrees.push(worldOctree);
  
  // 保存八叉树辅助线引用，用于控制可见性
  if (window.helpersVisible && window.helpersVisible.octreeHelpers) {
    window.helpersVisible.octreeHelpers.push(octreeHelper);
  }
  
  return ramp;
}

function animate() {
  requestAnimationFrame(animate);
  // 使用mmdModel更新模型
  mmdModel.update(1/120, cameraControls, lookCamera);
  
  // 更新辅助线和胶囊体
  if (window.updateModelHelpers) {
    window.updateModelHelpers();
  }

  window.cameraHelpers?.lookCameraHelper?.update()
  lookCamera.updateProjectionMatrix();
  if (cameraControls) cameraControls.update();
  renderer.render(scene, hadRenderCamera);
}

function light() {
  // 主光源（白色，高强度）
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(10, 200, 100);
  mainLight.castShadow = true; // 启用阴影
  scene.add(mainLight);

  // 环境光（柔和补光）
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  // 保留原有点光源（可选）
  const pointLight = new THREE.PointLight(0xffffff, 0.5, 500);
  pointLight.position.set(50, 50, 50);
  scene.add(pointLight);
}




window.addEventListener('resize', function () {
  width = window.innerWidth
  height = window.innerHeight
  renderer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
})

function handleKeyDown(event: KeyboardEvent) {
  mmdModel.handleKeyDown(event, keyMap);
}

function handleKeyUp(event: KeyboardEvent) {
  mmdModel.handleKeyUp(event, keyMap);
}

const keyMap = {
  'w': 'ArrowUp',
  's': 'ArrowDown',
  'a': 'ArrowLeft',
  'd': 'ArrowRight',
  'W': 'ArrowUp',
  'S': 'ArrowDown',
  'A': 'ArrowLeft',
  'D': 'ArrowRight',
}

function createPoint(x: number, y: number, z: number) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([
    x, y, z  // 单个点的位置
  ]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xff0000,  // 点的颜色
    size: 1,        // 点的大小
    sizeAttenuation: true  // 是否启用大小衰减
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
}
</script>

<template>
  <div class="model" ref="dom"></div>
</template>

<style scoped></style>
