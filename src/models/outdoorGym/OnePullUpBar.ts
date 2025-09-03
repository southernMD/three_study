import * as THREE from 'three';
import * as CANNON from 'cannon-es';
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
 * 单杠健身器材类
 */
export class OnePullUpBar extends BaseModel {
  private loader: GLTFLoader;
  private modelObject: THREE.Object3D | null = null;
  private boundingBoxHelper: THREE.BoxHelper | null = null;
  private physicsVisualization: THREE.Mesh | null = null;
  private secondPillarBody: CANNON.Body | null = null;
  private secondPillarVisualization: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, physicsWorld?: CANNON.World);
  constructor(scene: THREE.Scene, physicsWorld: CANNON.World | undefined, initialTransform: InitialTransform);
  constructor(scene: THREE.Scene, initialTransform: InitialTransform);
  constructor(
    scene: THREE.Scene,
    physicsWorldOrTransform?: CANNON.World | InitialTransform,
    initialTransform?: InitialTransform
  ) {
    super(scene, physicsWorldOrTransform as any, initialTransform as InitialTransform);
    this.modelGroup.name = 'OnePullUpBar';
    this.loader = new GLTFLoader();
  }

  /**
   * 创建单杠模型
   * @param scaleMultiplier 缩放倍数，默认为1
   */
  async create(scaleMultiplier: number = 1): Promise<void> {
    console.log(`开始加载单杠模型，缩放倍数: ${scaleMultiplier}...`);

    try {
      await this.loadModel();

      // 应用缩放
      // if (scaleMultiplier !== 1) {
      //   this.applyScale(scaleMultiplier);
      // }

      // 创建物理体
      // this.createModelPhysicsBody();

      // 创建包围盒显示
      // this.createBoundingBoxHelper();

      // 不调用 addToScene()，由外部管理添加到场景
      console.log(`单杠模型创建完成，缩放倍数: ${scaleMultiplier}`);
    } catch (error) {
      console.error('单杠模型创建失败:', error);
      throw error;
    }
  }

  /**
   * 创建模型物理体（参考WallAndDoor的createWallPhysicsBody方法）
   */
  public createModelPhysicsBody(): void {
    if (!this.physicsWorld || !this.modelObject) {
      console.log('⚠️ 物理世界未初始化或模型对象缺失，跳过单杠物理体创建');
      return;
    }

    // 获取模型的原始尺寸（未缩放前）
    const originalBounds = BaseModel.getBoundingBoxSize(this.modelObject!);

    // 获取模型在世界坐标系中的实际缩放
    this.modelObject.updateMatrixWorld(true);
    const worldScale = new THREE.Vector3();
    this.modelObject.getWorldScale(worldScale);
    console.log(worldScale,'ppp1223');
    
    // 计算实际的物理体尺寸（原始尺寸 × 世界缩放）
    const physicsWidth = 5;
    const physicsHeight = originalBounds.height;
    const physicsDepth = 5;

    // 创建物理体形状（盒子）- CANNON.Box需要半尺寸
    const shape = new CANNON.Box(new CANNON.Vec3(
      physicsWidth ,   // 半宽
      physicsHeight,  // 半高
      physicsDepth    // 半深
    ));

    // 创建物理体
    const body = new CANNON.Body({
      mass: 0, // 静态物体
      material: new CANNON.Material({
        friction: 0.8,
        restitution: 0.1
      })
    });

    // 添加形状
    body.addShape(shape);

    // 获取模型在世界坐标系中的实际位置
    const worldPosition = new THREE.Vector3();
    this.modelObject.getWorldPosition(worldPosition);

    console.log(`   📍 模型世界位置: (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)}, ${worldPosition.z.toFixed(2)})`);

    // 设置物理体位置（直接使用世界位置，Y轴加上高度的一半让底部贴地）

    body.position.set(
      worldPosition.x - 7 ,
      physicsHeight / 2,
      worldPosition.z - 5
    );

    // 使用模型对象的实际四元数旋转
    const worldQuaternion = new THREE.Quaternion();
    this.modelObject.getWorldQuaternion(worldQuaternion);
    console.log(worldQuaternion,'1q1');
    if(worldQuaternion.y != 0){
      body.position.set(
        worldPosition.x - 7 ,
        physicsHeight / 2,
        worldPosition.z + 7
      );
    }
    body.quaternion.set(
      worldQuaternion.x,
      worldQuaternion.y,
      worldQuaternion.z,
      worldQuaternion.w
    );

    console.log(`   🔄 物理体四元数: (${worldQuaternion.x.toFixed(3)}, ${worldQuaternion.y.toFixed(3)}, ${worldQuaternion.z.toFixed(3)}, ${worldQuaternion.w.toFixed(3)})`);

    // 添加到物理世界
    this.physicsWorld.addBody(body);
    this.physicsBody = body;

    // 创建物理体包围盒可视化
    this.createPhysicsBodyVisualization(body, physicsWidth, physicsHeight, physicsDepth);

    // 创建第二个柱子物理体，间隔一个 originalBounds.width 的距离
    this.createSecondPillarPhysicsBody(originalBounds, worldScale, worldPosition, worldQuaternion, physicsHeight);

    console.log(`   ⚡ 单杠物理体已创建:`);
    console.log(`   ⚡ 物理体位置: (${body.position.x.toFixed(1)}, ${body.position.y.toFixed(1)}, ${body.position.z.toFixed(1)})`);
    console.log(`   ⚡ 物理体尺寸: (${physicsWidth.toFixed(1)}, ${physicsHeight.toFixed(1)}, ${physicsDepth.toFixed(1)})`);
  }

  /**
   * 创建第二个柱子物理体
   */
  private createSecondPillarPhysicsBody(
    originalBounds: { width: number; height: number; depth: number },
    worldScale: THREE.Vector3,
    worldPosition: THREE.Vector3,
    worldQuaternion: THREE.Quaternion,
    physicsHeight: number
  ): void {
    // 计算第二个柱子的物理体尺寸
    const pillarWidth = 5
    const pillarHeight = originalBounds.height ;
    const pillarDepth = 5

    // 创建第二个柱子的物理体形状
    const pillarShape = new CANNON.Box(new CANNON.Vec3(
      pillarWidth,
      pillarHeight,
      pillarDepth
    ));

    // 创建第二个柱子的物理体
    const pillarBody = new CANNON.Body({
      mass: 0, // 静态物体
      material: new CANNON.Material({
        friction: 0.8,
        restitution: 0.1
      })
    });

    pillarBody.addShape(pillarShape);


    console.log(`   📍 模型世界位置: (${worldPosition.x.toFixed(2)}, ${worldPosition.y.toFixed(2)}, ${worldPosition.z.toFixed(2)})`);
    // 设置物理体位置（直接使用世界位置，Y轴加上高度的一半让底部贴地）

    pillarBody.position.set(
      worldPosition.x + 5 - originalBounds.depth ,
      physicsHeight / 2,
      worldPosition.z - 5 
    );

    console.log(worldQuaternion,'1q1');
    if(worldQuaternion.y != 0){
      pillarBody.position.set(
        worldPosition.x - 7 ,
        physicsHeight / 2,
        worldPosition.z - 5 + originalBounds.depth 
      );
    }
    pillarBody.quaternion.set(
      worldQuaternion.x,
      worldQuaternion.y,
      worldQuaternion.z,
      worldQuaternion.w
    );

    // 添加到物理世界
    if (this.physicsWorld) {
      this.physicsWorld.addBody(pillarBody);
    }

    // 保存第二个柱子的物理体引用
    this.secondPillarBody = pillarBody;

    // 创建第二个柱子的可视化
    this.createSecondPillarVisualization(pillarBody, pillarWidth, pillarHeight, pillarDepth);

  }

  /**
   * 创建第二个柱子的物理体包围盒可视化
   */
  private createSecondPillarVisualization(physicsBody: CANNON.Body, width: number, height: number, depth: number): void {
    // 创建线框几何体，尺寸与物理体完全一致
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);

    // 创建线框材质（使用蓝色区分第二个柱子）
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff, // 蓝色线框
      transparent: true,
      opacity: 0.8,
      wireframe: true
    });

    // 创建线框网格
    const wireframeMesh = new THREE.Mesh(boxGeometry, wireframeMaterial);
    wireframeMesh.name = 'PullUpBarSecondPillarPhysicsVisualization';

    // 设置位置与物理体完全一致
    wireframeMesh.position.set(
      physicsBody.position.x,
      physicsBody.position.y,
      physicsBody.position.z
    );

    // 设置旋转与物理体完全一致
    wireframeMesh.quaternion.set(
      physicsBody.quaternion.x,
      physicsBody.quaternion.y,
      physicsBody.quaternion.z,
      physicsBody.quaternion.w
    );

    // 直接添加到场景，不添加到模型组（因为位置是世界坐标）
    this.scene.add(wireframeMesh);

    // 保存第二个柱子的可视化引用
    this.secondPillarVisualization = wireframeMesh;

    console.log(`   👁️ 第二个柱子物理体包围盒可视化已创建: 位置(${wireframeMesh.position.x.toFixed(1)}, ${wireframeMesh.position.y.toFixed(1)}, ${wireframeMesh.position.z.toFixed(1)})`);
  }

  /**
   * 创建物理体包围盒可视化
   */
  private createPhysicsBodyVisualization(physicsBody: CANNON.Body, width: number, height: number, depth: number): void {
    // 创建线框几何体，尺寸与物理体完全一致
    const boxGeometry = new THREE.BoxGeometry(width, height, depth);

    // 创建线框材质
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // 绿色线框
      transparent: true,
      opacity: 0.8,
      wireframe: true
    });

    // 创建线框网格
    const wireframeMesh = new THREE.Mesh(boxGeometry, wireframeMaterial);
    wireframeMesh.name = 'PullUpBarPhysicsVisualization';

    // 设置位置与物理体完全一致
    wireframeMesh.position.set(
      physicsBody.position.x,
      physicsBody.position.y,
      physicsBody.position.z
    );

    // 设置旋转与物理体完全一致
    wireframeMesh.quaternion.set(
      physicsBody.quaternion.x,
      physicsBody.quaternion.y,
      physicsBody.quaternion.z,
      physicsBody.quaternion.w
    );

    // 直接添加到场景，不添加到模型组（因为位置是世界坐标）
    this.scene.add(wireframeMesh);

    // 保存引用用于后续控制
    this.physicsVisualization = wireframeMesh;

    console.log(`   👁️ 单杠物理体包围盒可视化已创建: 位置(${wireframeMesh.position.x.toFixed(1)}, ${wireframeMesh.position.y.toFixed(1)}, ${wireframeMesh.position.z.toFixed(1)})`);
  }

  /**
   * 设置物理体包围盒可视化的显示状态
   * @param visible 是否显示物理体包围盒
   */
  setPhysicsVisualizationVisible(visible: boolean): void {
    // 控制第一个柱子可视化
    if (this.physicsVisualization) {
      this.physicsVisualization.visible = visible;
    }

    // 控制第二个柱子可视化
    if (this.secondPillarVisualization) {
      this.secondPillarVisualization.visible = visible;
    }

    console.log(`单杠物理体包围盒显示: ${visible ? '开启' : '关闭'}`);
  }

  /**
   * 更新物理体和可视化（当跑道变化时调用）
   */
  updatePhysicsAndVisualization(): void {
    if (!this.physicsWorld || !this.modelObject) {
      console.log('⚠️ 物理世界未初始化或模型对象缺失，跳过更新');
      return;
    }

    console.log('🔄 开始更新单杠物理体和可视化...');

    // 清理现有的物理体和可视化
    this.clearExistingPhysicsAndVisualization();

    // 重新创建物理体和可视化
    this.createModelPhysicsBody();

    console.log('✅ 单杠物理体和可视化更新完成');
  }

  /**
   * 清理现有的物理体和可视化
   */
  private clearExistingPhysicsAndVisualization(): void {
    // 清理所有物理体
    if (this.physicsWorld) {
      if (this.physicsBody) {
        this.physicsWorld.removeBody(this.physicsBody);
        this.physicsBody = undefined;
      }
      if (this.secondPillarBody) {
        this.physicsWorld.removeBody(this.secondPillarBody);
        this.secondPillarBody = null;
      }
    }

    // 清理所有可视化
    if (this.physicsVisualization) {
      this.scene.remove(this.physicsVisualization);
      this.physicsVisualization.geometry.dispose();
      if (this.physicsVisualization.material instanceof THREE.Material) {
        this.physicsVisualization.material.dispose();
      }
      this.physicsVisualization = null;
    }

    if (this.secondPillarVisualization) {
      this.scene.remove(this.secondPillarVisualization);
      this.secondPillarVisualization.geometry.dispose();
      if (this.secondPillarVisualization.material instanceof THREE.Material) {
        this.secondPillarVisualization.material.dispose();
      }
      this.secondPillarVisualization = null;
    }

    console.log('   🧹 所有物理体和可视化已清理');
  }


  /**
   * 创建包围盒辅助显示
   */
  private createBoundingBoxHelper(): void {
    if (!this.modelObject) {
      console.log('跳过单杠包围盒创建：缺少模型对象');
      return;
    }

    // 创建包围盒辅助线
    this.boundingBoxHelper = new THREE.BoxHelper(this.modelObject, 0x00ff00); // 绿色包围盒
    this.boundingBoxHelper.name = 'PullUpBarBoundingBox';

    // 添加到模型组
    this.modelGroup.add(this.boundingBoxHelper);

    console.log('单杠包围盒辅助显示创建完成');
  }

  /**
   * 设置包围盒显示状态
   * @param visible 是否显示包围盒
   */
  setBoundingBoxVisible(visible: boolean): void {
    if (this.boundingBoxHelper) {
      this.boundingBoxHelper.visible = visible;
      console.log(`单杠包围盒显示: ${visible ? '开启' : '关闭'}`);
    }
  }

  /**
   * 更新包围盒（当模型变换后调用）
   */
  updateBoundingBox(): void {
    if (this.boundingBoxHelper && this.modelObject) {
      this.boundingBoxHelper.setFromObject(this.modelObject);
      console.log('单杠包围盒已更新');
    }
  }

  /**
   * 加载GLTF模型
   */
  private async loadModel(): Promise<void> {
    const loadModel = (): Promise<GLTF> => {
      return new Promise((resolve, reject) => {
        this.loader.load(
          '/model/outdoorGym/OnePullUpBar.glb',
          (gltf) => resolve(gltf),
          (progress) => {
            console.log('单杠模型加载进度:', (progress.loaded / progress.total * 100) + '%');
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
          child.material.roughness = 0.7;
          child.material.metalness = 0.3;
        }
      }
    });

    // 设置模型名称
    this.modelObject.name = 'PullUpBarModel';
    
    console.log('单杠模型设置完成');
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
    // 清理第一个柱子物理体
    if (this.physicsBody && this.physicsWorld) {
      this.physicsWorld.removeBody(this.physicsBody);
    }

    // 清理第二个柱子物理体
    if (this.secondPillarBody && this.physicsWorld) {
      this.physicsWorld.removeBody(this.secondPillarBody);
      this.secondPillarBody = null;
    }

    // 清理包围盒辅助显示
    if (this.boundingBoxHelper) {
      this.modelGroup.remove(this.boundingBoxHelper);
      this.boundingBoxHelper.dispose();
      this.boundingBoxHelper = null;
    }

    // 清理第一个柱子物理体可视化
    if (this.physicsVisualization) {
      this.scene.remove(this.physicsVisualization);
      this.physicsVisualization.geometry.dispose();
      if (this.physicsVisualization.material instanceof THREE.Material) {
        this.physicsVisualization.material.dispose();
      }
      this.physicsVisualization = null;
    }

    // 清理第二个柱子物理体可视化
    if (this.secondPillarVisualization) {
      this.scene.remove(this.secondPillarVisualization);
      this.secondPillarVisualization.geometry.dispose();
      if (this.secondPillarVisualization.material instanceof THREE.Material) {
        this.secondPillarVisualization.material.dispose();
      }
      this.secondPillarVisualization = null;
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

    console.log('单杠模型已销毁');
  }
}
