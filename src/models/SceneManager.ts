import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GridHelper } from 'three/src/helpers/GridHelper.js';
import { GlobalState } from '../types/GlobalState';

/**
 * SceneManager类 - 专门管理场景的类
 * 整合了场景初始化、灯光、相机、渲染等功能
 */
export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gridHelper: GridHelper;
  private axesHelper: THREE.AxesHelper;
  private controls: OrbitControls;
  
  // 灯光
  private mainLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private pointLight: THREE.PointLight;

  constructor() {
    this.scene = new THREE.Scene();
    this.initializeScene();
  }

  /**
   * 初始化场景
   */
  private initializeScene(): void {
    // 创建网格辅助器
    this.gridHelper = new GridHelper(1000, 100, 0x444444, 0x444444);
    this.scene.add(this.gridHelper);

    // 创建坐标轴辅助器
    this.axesHelper = new THREE.AxesHelper(150);
    this.scene.add(this.axesHelper);
  }

  /**
   * 创建相机
   */
  createCamera(width: number, height: number): THREE.PerspectiveCamera {
    // 创建一个透视投影对象
    this.camera = new THREE.PerspectiveCamera(50, width / height, 1, 8000);
    // 设置相机的位置
    this.camera.position.set(100, 50, 100);
    // 相机的视线 观察目标点的坐标
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    return this.camera;
  }

  /**
   * 创建渲染器
   */
  createRenderer(domElement: HTMLElement, width: number, height: number): THREE.WebGLRenderer {
    // 添加渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    // 设置屏幕像素比
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x888888);
    this.renderer.setSize(width, height);
    domElement.appendChild(this.renderer.domElement);
    this.renderer.render(this.scene, this.camera);
    
    return this.renderer;
  }

  /**
   * 创建场景控制器
   */
  createSceneControls(): OrbitControls {
    if (!this.camera || !this.renderer) {
      throw new Error('Camera and renderer must be created before controls');
    }
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    return this.controls;
  }

  /**
   * 初始化灯光
   */
  initializeLights(): void {
    // 主光源（白色，高强度）
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.mainLight.position.set(10, 200, 100);
    this.mainLight.castShadow = true; // 启用阴影
    this.scene.add(this.mainLight);

    // 环境光（柔和补光）
    this.ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(this.ambientLight);

    // 保留原有点光源（可选）
    this.pointLight = new THREE.PointLight(0xffffff, 0.5, 500);
    this.pointLight.position.set(50, 50, 50);
    this.scene.add(this.pointLight);
  }

  /**
   * 更新场景（在动画循环中调用）
   */
  update(): void {
    // 更新相机投影矩阵
    if (this.camera) {
      this.camera.updateProjectionMatrix();
    }

    // 更新控制器
    if (this.controls) {
      this.controls.update();
    }

    // 注意：相机辅助器和模型辅助器现在由各自的模型管理
  }

  /**
   * 渲染场景
   */
  render(camera?: THREE.Camera): void {
    if (this.renderer && this.scene) {
      const renderCamera = camera || this.camera;
      this.renderer.render(this.scene, renderCamera);
    }
  }

  /**
   * 处理窗口大小变化
   */
  handleResize(width: number, height: number): void {
    if (this.renderer) {
      this.renderer.setSize(width, height);
    }
    
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * 获取场景
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * 获取相机
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * 获取渲染器
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * 获取控制器
   */
  getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 移除网格辅助器
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
    }
    
    // 移除坐标轴辅助器
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
    }
    
    // 释放控制器
    if (this.controls) {
      this.controls.dispose();
    }
    
    // 释放渲染器
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    // 清理场景
    if (this.scene) {
      this.scene.clear();
    }
  }
}
