<script setup lang="ts">

// 声明Ammo全局变量
declare var Ammo: any;

import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GridHelper } from 'three/src/helpers/GridHelper.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
// 导入MMDModel类
import { MMDModel } from '../models/MMDModel';
import { GLTFModel } from '../models/GLTFModel';
// 导入cannon-es物理引擎
import * as CANNON from 'cannon-es';

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
      position.y += 55; // 在模型头上方创建盒子
      createBox(0x00ff00, position);
    }
  },
  // 创建一组掉落的盒子
  createFallingBoxesNow: () => {
    createFallingBoxes();
  },
  // 显示物理世界信息
  showPhysicsInfo: () => {
    if (window.physicsWorld) {
      console.log('物理世界信息：', window.physicsWorld);
      console.log('物理对象数量:', window.physicsWorld.bodies.length);
      
      // 显示所有物理对象的位置
      window.physicsWorld.bodies.forEach((body: CANNON.Body, index: number) => {
        console.log(`物理对象 ${index}:`, {
          位置: body.position,
          质量: body.mass,
          类型: body.type === CANNON.Body.STATIC ? '静态' : '动态',
          形状数量: body.shapes.length
        });
      });
    } else {
      console.log('物理世界未初始化！');
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

const gridHelper = new GridHelper(1000, 100, 0x444444, 0x444444);
scene.add(gridHelper);

onMounted(() => {
  // 初始化物理世界
  initPhysicsWorld();

  Ammo().then(async function (AmmoLib: any) {
    Ammo = AmmoLib;
    camera = CreateCamera()
    renderer = CreateRender()
    light()
    createAxesHelper()

    await loadModel()
    
    // 创建静态盒子（边界）
    createBox(0xff0000, new THREE.Vector3(0, 5, -105))
    createBox(0xffff00, new THREE.Vector3(0, 5, 105))
    createBox(0x66ccff, new THREE.Vector3(105, 5, 0))
    createBox(0xff00fff, new THREE.Vector3(-105, 5, 0))
    
    // 创建可以掉落的盒子
    // createFallingBoxes();
    
    // 创建不同角度的斜坡用于测试
    createRamp(new THREE.Vector3(0, 0, -60), new THREE.Vector3(80, 2, 55), 20, 0xD2691E); // 宽一点的20度斜坡
    
    // 创建物理地面
    createGround();
    
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
  // mmdModel = new GLTFModel();
  // await mmdModel.load(scene, '/model/newtest.glb');
  mmdModel = new MMDModel();
  await mmdModel.load(scene, '/lm/楈柌v2.pmx', '/lm/走路.vmd', '/lm/站立.vmd');
}

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
    helpersVisible?: {
      skeletonHelper?: THREE.SkeletonHelper;
      boxHelper?: THREE.BoxHelper;
      capsuleVisual?: THREE.Mesh;
    };
    cameraHelpers?: {
      lookCameraHelper?: THREE.CameraHelper;
    };
    // Cannon.js 物理世界
    physicsWorld?: CANNON.World;
    // 物理对象与Three.js对象的映射
    physicsBodies?: Map<CANNON.Body, THREE.Object3D>;
    // 角色物理身体
    playerBody?: CANNON.Body;
  }
}

function createBox(color: THREE.ColorRepresentation, position: THREE.Vector3) {
  // 创建Three.js几何体
  const boxSize = { width: 10, height: 10, depth: 10 };
  const boxGeometry = new THREE.BoxGeometry(boxSize.width, boxSize.height, boxSize.depth);
  const boxMaterial = new THREE.MeshStandardMaterial({ color });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(position.x, position.y, position.z);
  box.castShadow = true;
  box.receiveShadow = true;
  scene.add(box);
  
  // 添加简单的线框辅助器
  // const boxHelper = new THREE.BoxHelper(box, 0x00ff00);
  // scene.add(boxHelper);
  
  // 如果物理世界已初始化，创建物理对象
  if (window.physicsWorld) {
    // 创建Cannon.js物理体
    const boxShape = new CANNON.Box(new CANNON.Vec3(boxSize.width/2, boxSize.height/2, boxSize.depth/2));
    
    // 创建物理身体 - 设置质量为非零值，使其受重力影响
    const boxBody = new CANNON.Body({
      mass: 5, // 设置质量为5，使其受重力影响
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: new CANNON.Material({
        friction: 0.3,
        restitution: 0.3 // 弹性
      })
    });
    
    // 添加形状到物理身体
    boxBody.addShape(boxShape);
    
    // 为物体添加碰撞事件监听
    // boxBody.addEventListener('collide', (event) => {
    //   console.log('箱子碰撞事件', event);
    // });
    
    // 添加到物理世界
    window.physicsWorld.addBody(boxBody);
    
    // 关联物理体和可视化对象
    if (!window.physicsBodies) {
      window.physicsBodies = new Map();
    }
    window.physicsBodies.set(boxBody, box);
    
    console.log(`创建箱子物理对象: 位置(${position.x}, ${position.y}, ${position.z}), 质量: 5kg`);
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
  const angleRad = angle * Math.PI / 180;
  ramp.rotation.x = angleRad;
  
  // 添加到场景
  scene.add(ramp);
  
  // 添加简单的线框辅助器
  // const boxHelper = new THREE.BoxHelper(ramp, 0x00ff00);
  // scene.add(boxHelper);
  
  // 添加调试信息
  console.log("创建斜坡:", {
    位置: position.clone(),
    尺寸: size.clone(),
    角度: angle,
    旋转弧度: angleRad
  });
  
  // 如果物理世界已初始化，创建物理对象
  if (window.physicsWorld) {
    // 创建Cannon.js物理体
    const rampShape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
    
    // 创建物理身体
    const rampBody = new CANNON.Body({
      mass: 0, // 质量为0表示静态物体
      position: new CANNON.Vec3(position.x, position.y, position.z),
      material: new CANNON.Material({
        friction: 0.3, // 摩擦系数
        restitution: 0.2 // 弹性系数
      })
    });
    
    // 添加形状并旋转
    rampBody.addShape(rampShape);
    rampBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), angleRad);
    
    // 为斜坡添加碰撞事件监听
    // rampBody.addEventListener('collide', (event) => {
    //   console.log('斜坡碰撞事件', event);
    // });
    
    // 添加到物理世界
    window.physicsWorld.addBody(rampBody);
    
    // 关联物理体和可视化对象
    if (!window.physicsBodies) {
      window.physicsBodies = new Map();
    }
    window.physicsBodies.set(rampBody, ramp);
    
    console.log(`创建斜坡物理对象: 位置(${position.x}, ${position.y}, ${position.z}), 角度${angle}度`);
  }
  
  return ramp;
}

function animate() {
  requestAnimationFrame(animate);

  // 更新物理世界
  if (window.physicsWorld) {
    const timeStep = 1/60;
    window.physicsWorld.step(timeStep);
    
    // 同步物理对象和可视化对象
    if (window.physicsBodies) {
      for (const [body, mesh] of window.physicsBodies.entries()) {
        mesh.position.copy(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
        mesh.quaternion.copy(new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w));
      }
    }
    
    // 如果存在玩家物理身体，同步到模型
    if (window.playerBody && mmdModel && mmdModel.mesh) {
      // 获取模型尺寸，用于计算正确的位置偏移
      const dimensions = mmdModel.getModelDimensions();
      const height = dimensions.height;
      
      // 计算模型底部位置 = 胶囊体中心位置 - 高度/2
      mmdModel.mesh.position.y = window.playerBody.position.y - height / 2;
      
      // 如果物理身体有水平速度，也同步X和Z位置
      if (Math.abs(window.playerBody.velocity.x) > 0.01 || Math.abs(window.playerBody.velocity.z) > 0.01) {
        mmdModel.mesh.position.x = window.playerBody.position.x;
        mmdModel.mesh.position.z = window.playerBody.position.z;
      }
      
      // 如果物理身体有旋转，可以考虑同步旋转（通常不需要，因为我们设置了fixedRotation）
      // mmdModel.mesh.quaternion.copy(new THREE.Quaternion(
      //   window.playerBody.quaternion.x,
      //   window.playerBody.quaternion.y,
      //   window.playerBody.quaternion.z,
      //   window.playerBody.quaternion.w
      // ));
    }
  }

  // 使用mmdModel更新模型
  mmdModel.update(1/120, cameraControls, lookCamera);
  
  // 确保模型移动后立即更新胶囊体位置
  if (window.playerCapsule && mmdModel && mmdModel.mesh) {
    mmdModel.updateCapsulePosition();
  }
    
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

// 初始化物理世界
function initPhysicsWorld() {
  console.log("初始化物理世界...");
  
  // 创建物理世界
  const world = new CANNON.World();
  
  // 设置重力 - 使用更强的重力效果
  world.gravity.set(0, -20, 0);
  
  // 设置物理世界参数
  world.broadphase = new CANNON.NaiveBroadphase();
  world.allowSleep = false; // 禁止物体休眠，确保所有物体都保持活跃
  
  // 创建默认接触材质
  const defaultMaterial = new CANNON.Material('default');
  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
      friction: 0.5, // 增加摩擦力
      restitution: 0.3, // 弹性系数
      contactEquationStiffness: 1e8, // 增加接触刚度
      contactEquationRelaxation: 3
    }
  );
  
  // 添加接触材质到世界
  world.addContactMaterial(defaultContactMaterial);
  world.defaultContactMaterial = defaultContactMaterial;
  
  // 保存到全局变量
  window.physicsWorld = world;
  window.physicsBodies = new Map();
  
  console.log("物理世界初始化完成，重力设置为", world.gravity);
  return world;
}

// 创建地面
function createGround() {
  if (!window.physicsWorld) return;
  
  // 创建地面平面
  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({
    mass: 0, // 质量为0表示静态物体
    material: new CANNON.Material({
      friction: 0.5, // 增加摩擦力
      restitution: 0.3 // 弹性系数
    })
  });
  
  // 添加形状
  groundBody.addShape(groundShape);
  
  // 旋转地面使其朝上
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  groundBody.position.set(0, 0, 0);
  
  // 添加碰撞事件监听器
  // groundBody.addEventListener('collide', (event) => {
  //   console.log('地面碰撞事件', event);
  // });
  
  // 添加到物理世界
  window.physicsWorld.addBody(groundBody);
  
  // 创建地面可视化
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
  const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x666666,
    transparent: true,
    opacity: 0.8
  });
  const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  
  // 关联物理体和可视化对象
  if (!window.physicsBodies) {
    window.physicsBodies = new Map();
  }
  window.physicsBodies.set(groundBody, groundMesh);
  
  console.log("地面创建完成");
}

// 创建多个掉落的盒子，用于测试物理效果
function createFallingBoxes() {
  // 创建不同高度的掉落盒子
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * 40 - 20; // -20到20之间的随机值
    const z = Math.random() * 40 - 20;
    const y = 20 + i * 5; // 不同高度
    const color = new THREE.Color(Math.random(), Math.random(), Math.random());
    
    createBox(color, new THREE.Vector3(x, y, z));
  }
  
  console.log("创建了10个掉落的盒子");
}
</script>

<template>
  <div class="model" ref="dom"></div>
</template>

<style scoped></style>
