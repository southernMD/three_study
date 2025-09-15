import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { Model } from './Model';
import { GlobalState } from '../types/GlobalState';

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
  constructor(globalState: GlobalState) {
    super(globalState);
    this.mesh = new THREE.Object3D();
    this.mixer = new THREE.AnimationMixer(this.mesh);
  }
  update(): void {
    // 更新动画混合器
    if (this.mixer) {
      this.mixer.update(1/60);
    }
  }

  /**
   * 切换辅助线可见性
   */
  toggleHelpers(): void {
    if (this.helpersVisible) {
      const { boxHelper, capsuleVisual } = this.helpersVisible;

      // 获取当前状态（以胶囊体为准）
      const currentVisibility = capsuleVisual ? capsuleVisual.visible : true;
      const newVisibility = !currentVisibility;

      // 切换包围盒辅助线可见性
      if (boxHelper) {
        boxHelper.visible = newVisibility;
      }

      // 切换胶囊体可见性
      if (capsuleVisual) {
        capsuleVisual.visible = newVisibility;
      }

      console.log(`人物辅助线显示状态: ${newVisibility ? '显示' : '隐藏'}`);
    }
  }

  /**
   * 设置辅助视觉效果
   */
  setupHelpers(scene: THREE.Scene, capsuleVisual: THREE.Mesh): void {
    // 创建包围盒辅助线
    const boxHelper = new THREE.BoxHelper(this.mesh, 0xffff00);

    // 添加到场景
    scene.add(boxHelper);

    // 保存引用以便控制可见性
    this.helpersVisible = {
      boxHelper,
      capsuleVisual
    };
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
      const meshSize = this.setModelDimensions()
      const minWidth = 8;  // 网格基本单位
      const scaleXZ = Math.max(minWidth / meshSize.width, minWidth / meshSize.depth);
      const scaleFactor = Math.max(1, scaleXZ); // 至少保持原大小
      this.mesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      this.mesh.position.set(0,2,0)
      this.setModelDimensions()
      
      // 创建混合器
      this.mixer = new THREE.AnimationMixer(this.mesh);

      // 保存动画
      this.animations = gltf.animations;
      
      // 设置动画
      this.setupAnimations();
      
      // 创建胶囊体碰撞检测 - 按照ModelBefore.ts
      const { playerCapsule, capsuleVisual } = this.createCapsule();

      // 添加胶囊体可视化到场景
      scene.add(capsuleVisual);

      // 设置辅助器
      this.setupHelpers(scene, capsuleVisual);

      // 更新胶囊体位置
      this.updateCapsulePosition();
      
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

  // 获取模型三维尺寸
  setModelDimensions(): { width: number; height: number; depth: number } {
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