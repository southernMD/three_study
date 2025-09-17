import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MMDModel } from '../MMDModel';
import { GLTFModel } from '../GLTFModel';
import { GlobalState } from '../../types/GlobalState';

/**
 * MMDModelManager类 - 专门管理MMD模型的类
 * 整合了模型加载、动画控制、GUI控制、键盘事件处理等功能
 */
export class MMDModelManager {
  private mmdModel: MMDModel | GLTFModel | null = null;
  private scene: THREE.Scene;
  private lookCamera: THREE.PerspectiveCamera | null = null;
  private cameraControls: OrbitControls | null = null;
  private renderer: THREE.WebGLRenderer;
  private globalState: GlobalState;

  // 键盘映射
  private keyMap = {
    'w': 'ArrowUp',
    's': 'ArrowDown',
    'a': 'ArrowLeft',
    'd': 'ArrowRight',
    'W': 'ArrowUp',
    'S': 'ArrowDown',
    'A': 'ArrowLeft',
    'D': 'ArrowRight',
  };

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, globalState: GlobalState) {
    this.scene = scene;
    this.renderer = renderer;
    this.globalState = globalState;
  }

  /**
   * 加载MMD模型
   */
  async loadModel(): Promise<void> {
    try {
      this.mmdModel = new GLTFModel(this.globalState);
      await this.mmdModel.load(this.scene, '/model/newtest.glb');
      // this.mmdModel = new MMDModel(this.globalState);
      // await this.mmdModel.load(this.scene, '/lm/楈柌v2.pmx', '/lm/走路.vmd', '/lm/站立.vmd');
      
      // 创建跟随相机
      this.lookCamera = this.mmdModel.createLookCamera(this.scene);
      
      // 创建相机控制器
      this.cameraControls = this.mmdModel.createCameraControls(
        this.lookCamera, 
        this.renderer.domElement, 
        this.renderer
      );
      
      console.log('MMD模型加载完成');
    } catch (error) {
      console.error('加载MMD模型时出错:', error);
    }
  }

  /**
   * 获取模型实例
   */
  getModel(): MMDModel | GLTFModel | null {
    return this.mmdModel;
  }

  /**
   * 获取跟随相机
   */
  getLookCamera(): THREE.PerspectiveCamera | null {
    return this.lookCamera;
  }

  /**
   * 获取相机控制器
   */
  getCameraControls(): OrbitControls | null {
    return this.cameraControls;
  }

  /**
   * 重置模型位置
   */
  resetPosition(): void {
    if (this.mmdModel && this.mmdModel.mesh) {
      this.mmdModel.mesh.position.set(0, 0, 0);
      this.mmdModel.mesh.rotation.set(0, 0, 0);
    }
    
    if (this.lookCamera) {
      this.lookCamera.position.set(0, 13, 2);
    }
    
    if (this.cameraControls) {
      this.cameraControls.minAzimuthAngle = Math.PI * 2;
      this.cameraControls.maxPolarAngle = Math.PI * 3 / 4;
    }
    

    
    // 重新渲染
    if (this.lookCamera) {
      this.renderer.render(this.scene, this.lookCamera);
    }
  }

  /**
   * 切换辅助线显示
   */
  toggleHelpers(): void {
    if (this.mmdModel && 'toggleHelpers' in this.mmdModel) {
      (this.mmdModel as any).toggleHelpers();
    } else {
      console.log('模型不支持辅助线切换');
    }
  }

  /**
   * 强制播放走路动画
   */
  forceWalk(): void {
    if (this.mmdModel) {
      this.mmdModel.startWalk();
      this.mmdModel.isWalking = true;
    }
  }

  /**
   * 强制播放站立动画
   */
  forceStand(): void {
    if (this.mmdModel) {
      this.mmdModel.stopWalk();
      this.mmdModel.isWalking = false;
    }
  }

  /**
   * 在当前位置创建箱子
   */
  createBoxHere(createBoxCallback: (color: THREE.ColorRepresentation, position: THREE.Vector3) => void): void {
    if (this.mmdModel && this.mmdModel.mesh) {
      const position = this.mmdModel.mesh.position.clone();
      position.y += 55; // 在模型头上方创建盒子
      createBoxCallback(0x00ff00, position);
    }
  }

  /**
   * 处理键盘按下事件
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (this.mmdModel) {
      this.mmdModel.handleKeyDown(event);
    }
  }

  /**
   * 处理键盘抬起事件
   */
  handleKeyUp(event: KeyboardEvent): void {
    if (this.mmdModel) {
      this.mmdModel.handleKeyUp(event);
    }
  }

  /**
   * 更新模型（在动画循环中调用）
   */
  update(deltaTime: number): void {
    if (this.mmdModel) {
      this.mmdModel.update();
      // 同时调用动画更新方法
      if ('updateAnimation' in this.mmdModel) {
        (this.mmdModel as any).updateAnimation(deltaTime);
      }

      // 更新跟随相机位置（按照three_study-main的实现）
      if (this.lookCamera && this.cameraControls) {
        this.mmdModel.updateCameraFollow(this.lookCamera, this.cameraControls);
      }
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // BVH物理系统不需要特殊的相机控制器清理
    
    // 释放控制器
    if (this.cameraControls) {
      this.cameraControls.dispose();
      this.cameraControls = null;
    }
    
    this.mmdModel = null;
    this.lookCamera = null;
  }

  /**
   * 检查模型是否已加载
   */
  isModelLoaded(): boolean {
    return this.mmdModel !== null;
  }

  /**
   * 获取模型尺寸
   */
  getModelDimensions(): { width: number; height: number; depth: number } | null {
    if (this.mmdModel && this.mmdModel.mesh) {
      const box = new THREE.Box3().setFromObject(this.mmdModel.mesh);
      const size = box.getSize(new THREE.Vector3());
      return {
        width: size.x,
        height: size.y,
        depth: size.z
      };
    }
    return null;
  }
}
