import * as THREE from 'three';
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { AnimationClip } from 'three/src/animation/AnimationClip.js';
import { AnimationAction } from 'three/src/animation/AnimationAction.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { KeyframeTrack } from 'three';
import { Model } from './Model';
import { GlobalState } from '../types/GlobalState';

// MMDModel类 - 继承自Model基类，特化为MMD模型
export class MMDModel extends Model {
  declare mesh: THREE.SkinnedMesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.Material | THREE.Material[]>;
  walkAction?: AnimationAction;
  standAction?: AnimationAction;
  private helper: MMDAnimationHelper | null = null;
  
  constructor(globalState: GlobalState) {
    super(globalState);
    this.mesh = new THREE.SkinnedMesh();
  }

  // 加载模型
  async load(scene: THREE.Scene, modelPath: string, walkAnimPath: string, standAnimPath: string): Promise<void> {
    const loader = new MMDLoader();
    
    // 创建一个加载MMD模型的Promise
    const loadModel = (): Promise<THREE.SkinnedMesh> => {
      return new Promise((resolve, reject) => {
        loader.load(
          modelPath, 
          (mmd) => resolve(mmd), 
          undefined, 
          (err) => reject(err)
        );
      });
    };
    
    // 创建一个加载动画的Promise
    const loadAnimation = (mesh: THREE.SkinnedMesh, animPath: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        loader.loadAnimation(
          animPath, 
          mesh, 
          (animationData) => resolve(animationData), 
          undefined, 
          (err) => reject(err)
        );
      });
    };
    
    try {
      // 加载模型
      const mmd = await loadModel();
      this.helper = new MMDAnimationHelper();
      this.helper.add(mmd, { physics: false }); // 禁用MMD物理引擎，使用我们自己的Cannon.js物理引擎
      this.mesh = mmd;
      const meshSize = this.setModelDimensions()
      const minWidth = 10;  // 网格基本单位
      const scaleXZ = Math.max(minWidth / meshSize.width, minWidth / meshSize.depth);
      const scaleFactor = Math.max(1, scaleXZ); // 至少保持原大小
      this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.mesh.position.set(0,0,0)
      this.setModelDimensions()
      
      // 创建胶囊体
      const { playerCapsule,capsuleVisual } = this.createCapsule();

      // 设置全局状态引用
      this.playerCapsule = playerCapsule;
      
      // 创建物理身体
      this.createPhysicsBody();

      // 添加辅助视觉效果
      this.setupHelpers(scene, capsuleVisual);
      
      // 创建动画混合器
      this.mixer = new THREE.AnimationMixer(this.mesh);
      
      // 加载走路动画
      const walkAnimData = await loadAnimation(this.mesh, walkAnimPath);
      const walkClip = new AnimationClip('walk', -1, walkAnimData.tracks as KeyframeTrack[]);
      this.walkAction = this.mixer.clipAction(walkClip);
      this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
      
      // 加载站立动画
      const standAnimData = await loadAnimation(this.mesh, standAnimPath);
      const standClip = new AnimationClip('stand', -1, standAnimData.tracks as KeyframeTrack[]);
      this.standAction = this.mixer.clipAction(standClip);
      this.standAction.setLoop(THREE.LoopRepeat, Infinity);
      
      // 默认播放站立动画
      this.standAction.play();
      
      // 添加到场景
      scene.add(this.mesh);
      this.setModelDimensions()
    } catch (error) {
      console.error('加载模型或动画时出错:', error);
    }
  }
  // 设置辅助视觉效果 - 实现基类抽象方法
  setupHelpers(scene: THREE.Scene, capsuleVisual: THREE.Mesh): void {
    // 添加骨骼辅助线
    const skeletonHelper = new THREE.SkeletonHelper(this.mesh);
    skeletonHelper.visible = true;
    scene.add(skeletonHelper);
      
    // 添加包围盒辅助线
    const boxHelper = new THREE.BoxHelper(this.mesh, 0xffff00);
    scene.add(boxHelper);
      
    scene.add(capsuleVisual);

    // 初始化辅助线可见性对象（使用父类的私有属性）
    this.helpersVisible = {
      skeletonHelper: skeletonHelper,
      boxHelper: boxHelper,
      capsuleVisual: capsuleVisual
    };

    // 注意：updateModelHelpers方法现在在父类Model中定义
  }
  
  // 更新动画
  updateAnimation(deltaTime: number): void {
    // 更新MMD动画助手
    if (this.helper) {
      this.helper.update(deltaTime);
    }

    // 更新动画混合器
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }
  
  // 开始行走动画 - 实现基类抽象方法
  startWalking(): void {
    if (this.walkAction && this.standAction) {
      this.walkAction.play();
      this.standAction.stop();
    }
  }
  
  // 停止行走动画 - 实现基类抽象方法
  stopWalking(): void {
    if (this.walkAction && this.standAction) {
      this.walkAction.stop();
      this.standAction.play();
    }
  }
  
  // 为了保持向后兼容，添加这些别名方法
  startWalk(): void {
    this.startWalking();
  }
  
  stopWalk(): void {
    this.stopWalking();
  }
  
  resetPosition(): void {
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
  }

  // 获取模型三维尺寸
  setModelDimensions(): { width: number; height: number; depth: number } {
    if (!this.mesh) {
      return { width: 0, height: 0, depth: 0 };
    }

    // 使用Box3.setFromObject计算整个模型的边界盒（包括所有子网格）
    const boundingBox = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 存储尺寸
    this.modelSize = {
      width: size.x,
      height: size.y,
      depth: size.z
    };
    
    return this.modelSize;
  }
}

// 全局声明现在通过GlobalState接口管理，不再使用window全局变量