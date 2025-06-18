import * as THREE from 'three';
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { AnimationClip } from 'three/src/animation/AnimationClip.js';
import { AnimationAction } from 'three/src/animation/AnimationAction.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { KeyframeTrack } from 'three';
import { Model } from './Model';

// MMDModel类 - 继承自Model基类，特化为MMD模型
export class MMDModel extends Model {
  declare mesh: THREE.SkinnedMesh<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.Material | THREE.Material[]>;
  walkAction?: AnimationAction;
  standAction?: AnimationAction;
  
  constructor() {
    super();
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
      const helper = new MMDAnimationHelper();
      helper.add(mmd, { physics: true });
      this.mesh = mmd;
      const meshSize = this.getModelDimensions()
      const minWidth = 10;  // 网格基本单位
      const scaleXZ = Math.max(minWidth / meshSize.width, minWidth / meshSize.depth);
      const scaleFactor = Math.max(1, scaleXZ); // 至少保持原大小
      this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.mesh.position.set(0,0,0)
      this.getModelDimensions()
      // 计算模型的包围盒
      const boundingBox = new THREE.Box3().setFromObject(this.mesh);
      
      // 创建胶囊体
      const { capsuleVisual } = this.createCapsule(boundingBox);
      
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
      this.getModelDimensions()
    } catch (error) {
      console.error('加载模型或动画时出错:', error);
    }
  }
  
  // 创建胶囊体 - 实现基类抽象方法
  createCapsule(boundingBox: THREE.Box3): { playerCapsule: Capsule, capsuleVisual: THREE.Mesh } {
    // 计算模型尺寸
    const modelHeight = boundingBox.max.y - boundingBox.min.y;
    const modelWidth = Math.max(
      boundingBox.max.x - boundingBox.min.x,
      boundingBox.max.z - boundingBox.min.z
    );
      
    // 根据模型尺寸设置胶囊体参数
    const radius = modelWidth * 0.25; // 胶囊体半径缩小为模型宽度的25%
    const height = modelHeight * 0.6; // 胶囊体高度缩小为模型高度的60%
    
    // 创建起点和终点，用于定义胶囊体的轴线
    const start = new THREE.Vector3(0, radius * 0.8, 0); // 降低胶囊体底部中心点
    const end = new THREE.Vector3(0, height * 0.9 + radius, 0); // 调整胶囊体顶部中心点
    const playerCapsule = new Capsule(start, end, radius);
    
    // 创建可视化的胶囊体网格（用于显示）
    const capsuleGeometry = new THREE.CapsuleGeometry(radius, height, 8, 16);
    const capsuleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    const capsuleVisual = new THREE.Mesh(capsuleGeometry, capsuleMaterial);
    
    // 调整胶囊体位置，使其最低端与平面相切并更好地贴合模型
    capsuleVisual.position.y = radius * 0.8 + height * 0.9 / 2;
    
    // 将可视化胶囊体添加为模型的子对象
    this.mesh.add(capsuleVisual);
    
    // 保存胶囊体参数
    this.playerCapsule = playerCapsule;
    this.capsuleParams = {
      visual: capsuleVisual,
      radius,
      height
    };
    
    // 设置全局变量以保持兼容性
    window.playerCapsule = this.playerCapsule;
    window.capsuleParams = this.capsuleParams;
    
    return { playerCapsule, capsuleVisual };
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
      
    // 初始化辅助线可见性对象
    window.helpersVisible = {
      skeletonHelper: skeletonHelper,
      boxHelper: boxHelper,
      capsuleVisual: capsuleVisual,
      octreeHelpers: []
    };
    
    // 设置更新函数
    const updateHelpers = () => {
      boxHelper.update();
      // 骨骼辅助线会自动更新
        
      // 更新物理胶囊体和可视化胶囊体
      this.updateCapsulePosition();
      
      // 处理碰撞检测
      this.handleCollision();
    };
      
    // 将更新函数添加到全局变量，以便在animate中调用
    window.updateModelHelpers = updateHelpers;
  }
  
  // 重写基类的updateCapsulePosition方法，添加骨骼动画相关的胶囊体更新
  updateCapsulePosition(): void {
    if (!this.playerCapsule || !this.capsuleParams) return;
    
    // 先调用基类方法进行基本更新
    super.updateCapsulePosition();
    
    // 获取模型当前位置
    const modelPosition = this.mesh.position.clone();
    const { radius, height, visual } = this.capsuleParams;
    
    // 如果需要，可以根据骨骼动画更新胶囊体的尺寸
    if (this.mesh.skeleton && this.mesh.skeleton.bones.length > 0) {
      // 计算骨骼的边界
      let minY = Infinity;
      let maxY = -Infinity;
      
      this.mesh.skeleton.bones.forEach(bone => {
        const bonePosition = new THREE.Vector3();
        bone.getWorldPosition(bonePosition);
        minY = Math.min(minY, bonePosition.y);
        maxY = Math.max(maxY, bonePosition.y);
      });
      
      // 如果有有效的骨骼高度，更新胶囊体
      if (minY !== Infinity && maxY !== -Infinity) {
        const newHeight = maxY - minY;
        
        // 更新物理胶囊体，使用调整后的高度
        const adjustedHeight = newHeight * 0.9; // 使用90%的骨骼高度
        this.playerCapsule.start.y = modelPosition.y + radius * 0.8;
        this.playerCapsule.end.y = modelPosition.y + adjustedHeight + radius;
        
        // 更新可视化胶囊体
        visual.position.y = radius * 0.8 + adjustedHeight/2;
        visual.scale.y = adjustedHeight / height;
      }
    }
  }
  
  // 碰撞检测
  handleCollision(): void {
    if (!window.worldOctrees || !window.worldOctrees.length || !this.playerCapsule) return;
    
    // 遍历所有八叉树进行碰撞检测
    for (const octree of window.worldOctrees) {
      // 检查胶囊体是否与八叉树中的物体相交
      const result = octree.capsuleIntersect(this.playerCapsule);
      
      // 如果发生碰撞，处理碰撞响应
      if (result) {
        // 计算碰撞法线的垂直分量
        const verticalComponent = Math.abs(result.normal.y);
        
        // 如果法线有较大的垂直分量，说明是斜坡
        if (verticalComponent > 0.1) {
          // 对于斜坡，我们需要沿着斜面移动
          // 计算沿斜面的移动分量
          const slideDirection = new THREE.Vector3()
            .copy(result.normal)
            .multiplyScalar(result.depth);
            
          // 将垂直分量稍微放大，以便能够"爬"上斜坡
          slideDirection.y *= 1.2;
          
          // 应用移动
          this.mesh.position.add(slideDirection);
          
          // 更新胶囊体位置
          this.playerCapsule.start.add(slideDirection);
          this.playerCapsule.end.add(slideDirection);
        } else {
          // 对于普通碰撞，直接推离碰撞点
          const pushVector = new THREE.Vector3()
            .copy(result.normal)
            .multiplyScalar(result.depth);
          
          this.mesh.position.add(pushVector);
          
          // 更新胶囊体位置
          this.playerCapsule.start.add(pushVector);
          this.playerCapsule.end.add(pushVector);
        }
      }
    }
  }
  
  // 更新动画
  updateAnimation(deltaTime: number): void {
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
  getModelDimensions(): { width: number; height: number; depth: number } {
    console.log(this.mesh);
    if (!this.mesh || !(this.mesh instanceof THREE.Mesh)) {
      return { width: 0, height: 0, depth: 0 };
    }

    const geometry = this.mesh.geometry;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    this.modelSize = {
      width: box.max.x - box.min.x,
      height: box.max.y - box.min.y,
      depth: box.max.z - box.min.z,
    }
    console.log('modelSize:', this.modelSize);
    return {
      width: box.max.x - box.min.x,
      height: box.max.y - box.min.y,
      depth: box.max.z - box.min.z,
    };
  }
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
    worldOctrees?: any[];
    helpersVisible?: {
      skeletonHelper?: THREE.SkeletonHelper;
      boxHelper?: THREE.BoxHelper;
      capsuleVisual?: THREE.Mesh;
      octreeHelpers?: THREE.Object3D[];
    };
  }
} 