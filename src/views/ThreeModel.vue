<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";
import { AnimationMixer } from 'three/src/animation/AnimationMixer.js';
import { AnimationClip } from 'three/src/animation/AnimationClip.js';
import type { KeyframeTrack } from 'three';
import { AnimationAction } from 'three/src/animation/AnimationAction.js';
import { GridHelper } from 'three/src/helpers/GridHelper.js';
const scene = new THREE.Scene()
const dom = ref()
let width = innerWidth
let height = innerHeight
let camera: THREE.PerspectiveCamera
let lookCamera: THREE.PerspectiveCamera
let isCameraRender = true
let isLookCameraRender = false
let hadRenderCamera: THREE.PerspectiveCamera
let myPerCamLookHelper: THREE.CameraHelper
let renderer: THREE.WebGLRenderer
let cameraControls:OrbitControls
const gui = new GUI()

const guiFn = {
  changeCamera: () => {
    if(isCameraRender){
      hadRenderCamera = lookCamera
      isCameraRender = false
      isLookCameraRender = true
    }else{
      hadRenderCamera = camera
      isCameraRender = true
      isLookCameraRender = false
    }
    // CreateCameraControls(hadRenderCamera,renderer.domElement)
  },
  reSetReimu: () => {
    lookCamera.position.set(0, 13, 2);
    lookCamera.lookAt(0, 10,1000)
    mmdMesh.position.set(0, 0, 0)
    mmdMesh.rotation.set(0, 0, 0)
    cameraControls.target.set(0,13,4);
    cameraControls.maxAzimuthAngle = -Math.PI / 2;
    cameraControls.minAzimuthAngle = Math.PI / 2;
    cameraControls.maxPolarAngle = Math.PI * 3 / 4;
    myPerCamLookHelper.update()
    renderer.render(scene, hadRenderCamera);
  }
}

gui.add(guiFn, 'changeCamera').name('改变相机')
gui.add(guiFn, 'reSetReimu').name('回到原点')
const gridHelper = new GridHelper(1000, 100, 0x444444, 0x444444);
scene.add(gridHelper);

onMounted(() => {

  Ammo().then(async function (AmmoLib) {
    Ammo = AmmoLib;
    camera = CreateCamera()
    renderer = CreateRender()
    light()
    createAxesHelper()

    await loadModel()
    createBox(0xff0000,new THREE.Vector3(0,5,-105))
    createBox(0xffff00,new THREE.Vector3(0,5,105))
    createBox(0x66ccff,new THREE.Vector3(105,5,0))
    createBox(0xff00fff,new THREE.Vector3(-105,5,0))
    createBox(0xff00fff,new THREE.Vector3(0,55,0))
    lookCamera = CreateLookCamera()
    hadRenderCamera = camera
    // uiControls()
    CreateCameraControls(lookCamera,renderer.domElement)
    cameraControls.target.set(0, 13, 4);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    myPerCamLookHelper.update()
    animate(); // 启动渲染循环
  });

})

onUnmounted(()=>{
  scene.remove(gridHelper)
})
function CreateLookCamera() {
  const myCameraLook = new THREE.PerspectiveCamera(45, 1, 1, 200);
  myPerCamLookHelper = new THREE.CameraHelper(myCameraLook);
  myCameraLook.position.set(0, 13, 2);
  myCameraLook.lookAt(0, 10,1000)
  scene.add(myPerCamLookHelper);
  return myCameraLook;
}

function updateLookCamera(x: number, y: number, z: number) {
  lookCamera.position.set(x, y ,z);
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

const helper = new MMDAnimationHelper();
let mixer: THREE.AnimationMixer;
let mmdMesh: THREE.SkinnedMesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.Material | THREE.Material[]>;
let walkAction: AnimationAction;
let standAction: AnimationAction;

async function loadModel() {
  const loader = new MMDLoader();

  // 加载模型
  loader.load('/lm/楈柌v2.pmx', (mmd) => {
    helper.add(mmd, {
      physics: true,
    });
    mmdMesh = mmd
    // 创建动画混合器
    mixer = new AnimationMixer(mmdMesh);

    // 加载走路动画
    loader.loadAnimation('/lm/走路.vmd', mmdMesh, (animationData: any) => {
      const walkClip = new AnimationClip('walk', -1, animationData.tracks as KeyframeTrack[]);
      walkAction = mixer.clipAction(walkClip);
      walkAction.setLoop(THREE.LoopRepeat, Infinity);

      // 加载站立动画
      loader.loadAnimation('/lm/站立.vmd', mmdMesh, (animationData: any) => {
        console.log(animationData);
        const standClip = new AnimationClip('stand', -1, animationData.tracks as KeyframeTrack[]);
        standAction = mixer.clipAction(standClip);
        standAction.setLoop(THREE.LoopRepeat, Infinity);
        // 默认播放站立动画
        standAction.play();
        scene.add(mmdMesh);
      }, () => { }, (err) => {
        console.log(err);
      });
    }, () => { }, (err) => {
      console.log(err);
    });
  }, () => { }, (err) => {
    console.log(err);
  });
}
function createBox(color:THREE.ColorRepresentation,position:THREE.Vector3) {
  const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
  const boxMaterial = new THREE.MeshStandardMaterial({ color });
  const box = new THREE.Mesh(boxGeometry, boxMaterial);
  box.position.set(position.x,position.y,position.z);
  scene.add(box);
  return box;
}
function animate() {
  requestAnimationFrame(animate);

  if (mixer) {
    mixer.update(1 / 60); // 假设每帧时间为1/60秒
  }

  if (isWalking) {
    // 根据按键状态移动模型
    const speed = 100; // 移动速度
    const delta = 1 / 60; // 时间间隔
    console.log(mmdMesh.position);
    console.log(lookCamera.position);
    
    
    if (keys.ArrowUp) {
      mmdMesh.position.setZ(mmdMesh.position.z + speed * delta);
      cameraControls.target.set(mmdMesh.position.x,mmdMesh.position.y + 13,mmdMesh.position.z + speed * delta + 2);
      cameraControls.maxAzimuthAngle = -Math.PI / 2;
      cameraControls.minAzimuthAngle = Math.PI / 2;
      cameraControls.maxPolarAngle = Math.PI * 3 / 4;
    }
    if (keys.ArrowDown) {
      mmdMesh.position.setZ(mmdMesh.position.z - speed * delta);
      // cameraControls.target.set(mmdMesh.position.x,mmdMesh.position.y + 13,mmdMesh.position.z - speed * delta - 2);
      // cameraControls.maxAzimuthAngle = Math.PI / 2;
      // cameraControls.minAzimuthAngle = -Math.PI / 2;
      // cameraControls.maxPolarAngle = Math.PI * 3 / 4;
    }
    if (keys.ArrowLeft) {
      mmdMesh.position.setX(mmdMesh.position.x - speed * delta);
      // cameraControls.target.set(mmdMesh.position.x  - speed * delta - 2,mmdMesh.position.y + 13,mmdMesh.position.z);
      // cameraControls.minAzimuthAngle = 0
      // cameraControls.maxAzimuthAngle = Math.PI
      // cameraControls.maxPolarAngle = Math.PI * 3 / 4;
    }
    if (keys.ArrowRight) {
      mmdMesh.position.setX(mmdMesh.position.x + speed * delta);
      // cameraControls.target.set(mmdMesh.position.x  + speed * delta + 2,mmdMesh.position.y + 13,mmdMesh.position.z);
      // cameraControls.minAzimuthAngle =  Math.PI
      // cameraControls.maxAzimuthAngle = 0
      // cameraControls.maxPolarAngle = Math.PI * 3 / 4;
    }
    //把模型位置赋值给updateLookCamera
    // 根据方向键更新模型朝向
    if (keys.ArrowUp && keys.ArrowLeft) {
      mmdMesh.rotation.y = Math.PI * 1.75; // 朝向上左
      updateLookCamera(mmdMesh.position.x - 2, mmdMesh.position.y + 13, mmdMesh.position.z + 2);
      updateLookAt(-1000, 10,1000)
    } else if (keys.ArrowUp && keys.ArrowRight) {
      mmdMesh.rotation.y = Math.PI * 0.25; // 朝向上右
      updateLookCamera(mmdMesh.position.x + 2, mmdMesh.position.y + 13, mmdMesh.position.z + 2);
      updateLookAt(1000, 10,1000)
    } else if (keys.ArrowDown && keys.ArrowLeft) {
      mmdMesh.rotation.y = Math.PI * 1.25; // 朝向下左
      updateLookCamera(mmdMesh.position.x - 2, mmdMesh.position.y + 13, mmdMesh.position.z - 2);
      updateLookAt(-1000, 10,-1000)
    } else if (keys.ArrowDown && keys.ArrowRight) {
      mmdMesh.rotation.y = Math.PI * 0.75; // 朝向下右
      updateLookCamera(mmdMesh.position.x + 2, mmdMesh.position.y + 13, mmdMesh.position.z - 2);
      updateLookAt(1000, 10,-1000)
    } else if (keys.ArrowUp) {
      // mmdMesh.rotation.y = 0; // 朝向上
      updateLookCamera(mmdMesh.position.x, mmdMesh.position.y + 13, mmdMesh.position.z + 2);
      updateLookAt(0, 10,1000)
    } else if (keys.ArrowDown) {
      // mmdMesh.rotation.y = Math.PI; // 朝向下
      updateLookCamera(mmdMesh.position.x, mmdMesh.position.y + 13, mmdMesh.position.z - 2);
      updateLookAt(0, 10,-1000)
    } else if (keys.ArrowLeft) {
      // mmdMesh.rotation.y = Math.PI * 1.5; // 朝向左
      updateLookCamera(mmdMesh.position.x - 2, mmdMesh.position.y + 13, mmdMesh.position.z);
      updateLookAt(-1000, 10,0)
    } else if (keys.ArrowRight) {
      // mmdMesh.rotation.y = Math.PI * 0.5; // 朝向右
      updateLookCamera(mmdMesh.position.x + 2, mmdMesh.position.y + 13, mmdMesh.position.z);
      updateLookAt(1000, 10,0)
    }
  }
  myPerCamLookHelper.update();
  lookCamera.updateProjectionMatrix();
  if(cameraControls)cameraControls.update()
  renderer.render(scene, hadRenderCamera);
}

function light() {
  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(1000, 1000, 1000)
  scene.add(pointLight)
  //可视化点光源
  const pointLightHelper = new THREE.PointLightHelper(pointLight, 10)
  scene.add(pointLightHelper);
}


window.addEventListener('resize', function () {
  width = window.innerWidth
  height = window.innerHeight
  renderer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
})

let isWalking = false;
function handleKeyDown(event: KeyboardEvent) {
  //@ts-ignore
  switch (keyMap[event.key] ?? event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      if (!isWalking) {
        isWalking = true;
        walkAction.play();
        standAction.stop();
      }
      break;
  }
}
function handleKeyUp(event: KeyboardEvent) {
  //@ts-ignore
  switch (keyMap[event.key] ?? event.key) {
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      if (isWalking) {
        isWalking = false;
        walkAction.stop();
        standAction.play();
      }
      break;
  }
}

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
};

const keyMap = {
  'w':'ArrowUp',
  's':'ArrowDown',
  'a':'ArrowLeft',
  'd':'ArrowRight',
  'W':'ArrowUp',
  'S':'ArrowDown',
  'A':'ArrowLeft',
  'D':'ArrowRight',
}

window.addEventListener('keydown', (event) => {
  //@ts-ignore
  keys[keyMap[event.key] ?? event.key] = true;
});

window.addEventListener('keyup', (event) => {
  //@ts-ignore
  keys[keyMap[event.key] ?? event.key] = false;
});

function CreateCameraControls(camera:THREE.Camera, domElement:HTMLElement) {
  cameraControls = new OrbitControls(camera, domElement);
  cameraControls.maxAzimuthAngle = -Math.PI / 2;
  cameraControls.minAzimuthAngle = Math.PI / 2;
  cameraControls.maxPolarAngle = Math.PI * 3 / 4;
  cameraControls.addEventListener('change', function () {
      renderer.render(scene, camera)
  })
}
</script>

<template>
  <div class="model" ref="dom"></div>
</template>

<style scoped></style>
