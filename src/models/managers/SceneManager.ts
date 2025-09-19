import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GridHelper } from 'three/src/helpers/GridHelper.js';
import { GlobalState } from '../../types/GlobalState';
import { EXRLoader } from 'three/examples/jsm/Addons.js';

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
    // this.gridHelper = new GridHelper(1000, 100, 0x444444, 0x444444);
    // this.scene.add(this.gridHelper);

    // 创建坐标轴辅助器
    this.axesHelper = new THREE.AxesHelper(150);
    this.scene.add(this.axesHelper);
    this.createSkyBox();
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
      antialias: false, // 关闭抗锯齿以提高性能
      powerPreference: 'high-performance', // 优先使用高性能GPU
    });
    // 设置屏幕像素比 - 降低像素比可以提高性能
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
    this.renderer.setClearColor(0x888888);
    this.renderer.setSize(width, height);
    
    // 性能优化设置
    this.renderer.shadowMap.enabled = false; // 关闭阴影可以提高性能
    this.renderer.localClippingEnabled = true;
    
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
   * 创建天空图
   */
  createSkyBox(): void {
    const loader = new EXRLoader();
    loader.load('/model/background.exr', (texture) => {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      const envMap = pmremGenerator.fromEquirectangular(texture).texture;
      
      // 通过调整曝光来控制整体亮度
      this.renderer.toneMappingExposure = 0.1; // 降低曝光
      
      this.scene.environment = envMap;
      this.scene.background = texture;
      
      pmremGenerator.dispose();
    }, undefined, (error) => {
        console.error('EXR加载失败:', error);
    });
  }

  /**
   * 初始化灯光
   */
  initializeLights(): void {
    // 🌅 针对天空图环境优化的光照设置

    // 主光源（模拟太阳光，降低强度避免过曝）
    this.mainLight = new THREE.DirectionalLight(0xfff4e6, 0.6); // 暖白色，降低强度
    this.mainLight.position.set(10, 200, 100);
    // this.mainLight.castShadow = false; // 禁用阴影以提高性能

    // 优化阴影设置 - 如果需要阴影，可以使用这些设置
    // this.mainLight.castShadow = true;
    // this.mainLight.shadow.mapSize.width = 512; // 降低阴影贴图分辨率
    // this.mainLight.shadow.mapSize.height = 512;
    // this.mainLight.shadow.camera.near = 0.5;
    // this.mainLight.shadow.camera.far = 500;

    this.scene.add(this.mainLight);

    // 🌟 增强环境光来提亮暗部区域
    this.ambientLight = new THREE.AmbientLight(0x87ceeb, 1.2); // 天空蓝色调，增强强度
    this.scene.add(this.ambientLight);

    // 🌙 添加补充光源来平衡阴影区域
    const fillLight = new THREE.DirectionalLight(0xb3d9ff, 0.3); // 冷色调补光
    fillLight.position.set(-50, 100, -50); // 从另一个方向照射
    this.scene.add(fillLight);

    // 移除点光源以提高性能
    // this.pointLight = new THREE.PointLight(0xffffff, 0.5, 500);
    // this.pointLight.position.set(50, 50, 50);
    // this.scene.add(this.pointLight);
  }

  /**
   * 🎨 动态调整光照强度（用于天空图环境微调）
   */
  adjustLightingForSkybox(options: {
    mainLightIntensity?: number;
    ambientLightIntensity?: number;
    fillLightIntensity?: number;
  }): void {
    if (this.mainLight && options.mainLightIntensity !== undefined) {
      this.mainLight.intensity = options.mainLightIntensity;
    }

    if (this.ambientLight && options.ambientLightIntensity !== undefined) {
      this.ambientLight.intensity = options.ambientLightIntensity;
    }

    // 查找补充光源并调整
    if (options.fillLightIntensity !== undefined) {
      const fillLight = this.scene.children.find(child =>
        child instanceof THREE.DirectionalLight &&
        child !== this.mainLight
      ) as THREE.DirectionalLight;

      if (fillLight) {
        fillLight.intensity = options.fillLightIntensity;
      }
    }

    console.log('🌅 光照已调整:', options);
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
