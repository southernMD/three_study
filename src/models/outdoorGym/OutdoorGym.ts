import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseModel, InitialTransform } from '../architecture/BaseModel';

/**
 * GLTF接口定义
 */
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

/**
 * 户外健身器材组合类
 */
export class OutdoorGym extends BaseModel {
  private loader: GLTFLoader;
  private modelObject: THREE.Object3D | null = null;
  private boundingBoxHelper: THREE.BoxHelper | null = null;

  constructor(scene: THREE.Scene, initialTransform?: InitialTransform) {
    super(scene, initialTransform || {});
    this.modelGroup.name = 'OutdoorGym';
    this.loader = new GLTFLoader();
  }

  /**
   * 创建户外健身器材组合模型
   * @param scaleMultiplier 缩放倍数，默认为1
   */
  async create(scaleMultiplier: number = 1): Promise<void> {
    console.log(`开始加载户外健身器材组合模型，缩放倍数: ${scaleMultiplier}...`);

    try {
      await this.loadModel();
      // 创建包围盒显示（如果需要可以取消注释）
      // this.createBoundingBoxHelper();

      // 不调用 addToScene()，由外部管理添加到场景
      console.log(`户外健身器材组合模型创建完成，缩放倍数: ${scaleMultiplier}`);
    } catch (error) {
      console.error('户外健身器材组合模型创建失败:', error);
      throw error;
    }
  }

  /**
   * 创建包围盒辅助显示
   */
  private createBoundingBoxHelper(): void {
    if (!this.modelObject) {
      console.log('跳过户外健身器材组合包围盒创建：缺少模型对象');
      return;
    }

    // 创建包围盒辅助线
    this.boundingBoxHelper = new THREE.BoxHelper(this.modelObject, 0xff0000); // 红色包围盒
    this.boundingBoxHelper.name = 'OutdoorGymBoundingBox';

    // 添加到模型组
    this.modelGroup.add(this.boundingBoxHelper);

    console.log('户外健身器材组合包围盒辅助显示创建完成');
  }

  /**
   * 设置包围盒显示状态
   * @param visible 是否显示包围盒
   */
  setBoundingBoxVisible(visible: boolean): void {
    if (this.boundingBoxHelper) {
      this.boundingBoxHelper.visible = visible;
      console.log(`户外健身器材组合包围盒显示: ${visible ? '开启' : '关闭'}`);
    }
  }

  /**
   * 更新包围盒（当模型变换后调用）
   */
  updateBoundingBox(): void {
    if (this.boundingBoxHelper && this.modelObject) {
      this.boundingBoxHelper.setFromObject(this.modelObject);
      console.log('户外健身器材组合包围盒已更新');
    }
  }

  /**
   * 加载GLTF模型
   */
  private async loadModel(): Promise<void> {
    const loadModel = (): Promise<GLTF> => {
      return new Promise((resolve, reject) => {
        this.loader.load(
          '/model/outdoorGym/OutdoorGym.glb',
          (gltf) => resolve(gltf),
          (progress) => {
            console.log('户外健身器材组合模型加载进度:', (progress.loaded / progress.total * 100) + '%');
          },
          (error) => reject(error)
        );
      });
    };

    const gltf = await loadModel();
    this.modelObject = gltf.scene;
    
    // 设置模型属性
    this.setupModel();
    
    // 添加到模型组
    this.modelGroup.add(this.modelObject);
  }

  /**
   * 设置模型属性
   */
  private setupModel(): void {
    if (!this.modelObject) return;

    // 遍历模型，设置材质和阴影
    this.modelObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        // 如果材质是标准材质，可以调整一些属性
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.roughness = 0.6;
          child.material.metalness = 0.4;
        }
      }
    });

    // 设置模型名称
    this.modelObject.name = 'OutdoorGymModel';
    
    console.log('户外健身器材组合模型设置完成');
  }

  /**
   * 获取模型对象
   */
  getModelObject(): THREE.Object3D | null {
    return this.modelObject;
  }

  /**
   * 设置模型可见性
   */
  setVisible(visible: boolean): void {
    if (this.modelObject) {
      this.modelObject.visible = visible;
    }
  }

  /**
   * 获取模型的包围盒尺寸
   */
  getModelSize(): { width: number; height: number; depth: number } {
    if (!this.modelObject) {
      return { width: 0, height: 0, depth: 0 };
    }
    
    const box = new THREE.Box3().setFromObject(this.modelObject);
    const size = box.getSize(new THREE.Vector3());
    
    return {
      width: size.x,
      height: size.y,
      depth: size.z
    };
  }

  /**
   * 销毁模型
   */
  dispose(): void {
    // 清理包围盒辅助显示
    if (this.boundingBoxHelper) {
      this.modelGroup.remove(this.boundingBoxHelper);
      this.boundingBoxHelper.dispose();
      this.boundingBoxHelper = null;
    }

    // 清理模型对象
    if (this.modelObject) {
      this.modelObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

    // 调用父类的销毁方法
    super.dispose();

    console.log('户外健身器材组合模型已销毁');
  }
}