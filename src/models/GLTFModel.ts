import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { Model } from './Model';

// 定义GLTF类型
interface GLTF {
  scene: THREE.Group;
  scenes: THREE.Group[];
  animations: THREE.AnimationClip[];
  cameras: THREE.Camera[];
  asset: {
    copyright?: string;
    generator?: string;
    version?: string;
    minVersion?: string;
    extensions?: any;
    extras?: any;
  };
}

export class GLTFModel extends Model {
  // 声明必要的属性
  declare mesh: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  walkAction?: THREE.AnimationAction;
  standAction?: THREE.AnimationAction;
  animations: THREE.AnimationClip[] = [];
  constructor() {
    super();
    this.mesh = new THREE.Object3D();
    this.mixer = new THREE.AnimationMixer(this.mesh);
  }
  
  // 加载GLTF模型
  async load(scene: THREE.Scene, modelPath: string): Promise<void> {
    try {
      const loader = new GLTFLoader();
      const loadModel = (): Promise<GLTF> => {
        return new Promise((resolve, reject) => {
          loader.load(
            modelPath, 
            (gltf) => resolve(gltf), 
            undefined, 
            (err) => reject(err)
          );
        });
      };
      const gltf = await loadModel();
      // 设置模型
      this.mesh = gltf.scene;
      const meshSize = this.getModelDimensions()
      const minWidth = 10;  // 网格基本单位
      const scaleXZ = Math.max(minWidth / meshSize.width, minWidth / meshSize.depth);
      const scaleFactor = Math.max(1, scaleXZ); // 至少保持原大小
      this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.mesh.position.set(0,0,0)
      this.getModelDimensions()
      
      // 创建混合器
      this.mixer = new THREE.AnimationMixer(this.mesh);

      // 保存动画
      this.animations = gltf.animations;
      
      // 设置动画
      this.setupAnimations();
      
      const { playerCapsule, capsuleVisual } = this.createCapsule();
      
      // 设置全局引用
      window.playerCapsule = playerCapsule;
      
      // 设置辅助视觉效果
      this.setupHelpers(scene, capsuleVisual);
      
      // 开始播放站立动画
      this.stopWalk();
      scene.add(this.mesh);
      console.log('GLTF模型加载成功');
      //设置模型大小
    } catch (error) {
      console.error('加载GLTF模型失败:', error);
    }
  }
  
  
  // 设置动画
  private setupAnimations(): void {
    if (this.animations.length === 0) {
      console.warn('没有找到动画');
      return;
    }
    
    // 查找walking和stand动画
    const walkAnimation = this.animations.find(anim => anim.name.toLowerCase().includes('walk'));
    const standAnimation = this.animations.find(anim => anim.name.toLowerCase().includes('stand'));
    
    if (walkAnimation) {
      this.walkAction = this.mixer.clipAction(walkAnimation);
      this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      console.warn('没有找到walking动画');
    }
    
    if (standAnimation) {
      this.standAction = this.mixer.clipAction(standAnimation);
      this.standAction.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      console.warn('没有找到stand动画');
    }
  }
  

  
  // 设置辅助视觉效果
  setupHelpers(scene: THREE.Scene, capsuleVisual: THREE.Mesh): void {
    // 创建包围盒辅助线
    const boxHelper = new THREE.BoxHelper(this.mesh, 0xffff00);
    
    // 添加到场景
    scene.add(boxHelper);
    scene.add(capsuleVisual);
    
    // 保存引用以便控制可见性
    window.helpersVisible = {
      boxHelper,
      capsuleVisual,
      octreeHelpers: []
    };
    
    // 创建更新辅助线的函数
    window.updateModelHelpers = () => {
      if (window.helpersVisible) {
        const { boxHelper, capsuleVisual } = window.helpersVisible;
        
        // 更新包围盒辅助线
        if (boxHelper) {
          boxHelper.update();
        }
        
        // 更新胶囊体位置
        if (capsuleVisual && this.mesh) {
          const cylinderHeight = Math.max(0, this.capsuleParams?.height ?? 0 );
          capsuleVisual.position.set(
            this.mesh.position.x,
            this.mesh.position.y + cylinderHeight / 2, // 上移radius距离，防止底部穿入地面
            this.mesh.position.z
          );
        }
      }
      
      // 更新胶囊体位置
      this.updateCapsulePosition();
    };
  }
  
  // 实现基类的抽象方法 - 开始行走
  startWalking(): void {
    this.startWalk();
  }
  
  // 实现基类的抽象方法 - 停止行走
  stopWalking(): void {
    this.stopWalk();
  }
  
  // 开始行走动画
  startWalk(): void {
    if (this.walkAction && this.standAction) {
      // 淡出站立动画
      this.standAction.fadeOut(0.5);
      
      // 淡入行走动画
      this.walkAction.reset();
      this.walkAction.fadeIn(0.5);
      this.walkAction.play();
    }
  }
  
  // 停止行走动画
  stopWalk(): void {
    if (this.walkAction && this.standAction) {
      // 淡出行走动画
      this.walkAction.fadeOut(0.5);
      
      // 淡入站立动画
      this.standAction.reset();
      this.standAction.fadeIn(0.5);
      this.standAction.play();
    }
  }
  // 重置位置
  resetPosition(): void {
    super.resetPosition();
    
    // 停止行走动画，播放站立动画
    this.stopWalk();
  }
  // 获取模型三维尺寸
  getModelDimensions(): { width: number; height: number; depth: number } {
    if (!this.mesh) return { width: 0, height: 0, depth: 0 };

    // GLTF模型需要从整个场景计算包围盒
    const boundingBox = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 存储尺寸
    this.modelSize = {
      width: size.x,
      height: size.y,
      depth: size.z
    };
    console.log('modelSize:', this.modelSize);
    return this.modelSize;
  }
} 