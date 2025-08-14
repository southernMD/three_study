import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GlobalState } from '../types/GlobalState';

/**
 * PhysicsManager类 - 专门管理物理世界的类
 * 整合了物理世界初始化、物理对象同步、碰撞检测等功能
 */
export class PhysicsManager {
  private world!: CANNON.World;
  private physicsBodies: Map<CANNON.Body, THREE.Object3D>;
  private scene: THREE.Scene;
  private timeStep: number = 1/60;
  private globalState: GlobalState;

  constructor(scene: THREE.Scene, globalState: GlobalState) {
    this.scene = scene;
    this.globalState = globalState;
    this.physicsBodies = new Map();
    this.initializePhysicsWorld();
  }

  /**
   * 初始化物理世界
   */
  private initializePhysicsWorld(): void {
    console.log("初始化物理世界...");
    
    // 创建物理世界
    this.world = new CANNON.World();
    
    // 设置重力 - 使用更强的重力效果
    this.world.gravity.set(0, -20, 0);
    
    // 设置物理世界参数
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = false; // 禁止物体休眠，确保所有物体都保持活跃
    
    // 创建默认接触材质
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      {
        friction: 0.5, // 增加摩擦力
        restitution: 0.3, // 弹性系数
        contactEquationStiffness: 1e8, // 增加接触刚度
        contactEquationRelaxation: 3
      }
    );
    
    // 添加接触材质到世界
    this.world.addContactMaterial(defaultContactMaterial);
    this.world.defaultContactMaterial = defaultContactMaterial;
    
    // 保存到全局状态
    this.globalState.physicsWorld = this.world;
    this.globalState.physicsBodies = this.physicsBodies;
    
    console.log("物理世界初始化完成，重力设置为", this.world.gravity);
  }

  /**
   * 创建地面
   */
  createGround(): void {
    if (!this.world) return;
    
    // 创建地面平面
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0, // 质量为0表示静态物体
      material: new CANNON.Material({
        friction: 0.5, // 增加摩擦力
        restitution: 0.3 // 弹性系数
      })
    });
    
    // 添加形状
    groundBody.addShape(groundShape);
    
    // 旋转地面使其朝上
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, 0, 0);
    
    // 添加碰撞事件监听器
    // groundBody.addEventListener('collide', (event) => {
    //   console.log('地面碰撞事件', event);
    // });
    
    // 添加到物理世界
    this.world.addBody(groundBody);
    
    // 创建地面可视化
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x666666,
      transparent: true,
      opacity: 0.8
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);
    
    // 关联物理体和可视化对象
    this.physicsBodies.set(groundBody, groundMesh);
    
    console.log("地面创建完成");
  }

  /**
   * 更新物理世界（在动画循环中调用）
   */
  update(): void {
    if (!this.world) return;

    // 1. 更新物理世界（计算碰撞）
    this.world.step(this.timeStep);

    // 2. 同步物理对象和可视化对象
    this.syncPhysicsObjects();

    // 3. 注意：模型的物理同步现在在ThreeModel.vue的animate函数中，在物理引擎更新之后调用
  }

  /**
   * 同步物理对象和可视化对象
   */
  private syncPhysicsObjects(): void {
    if (this.physicsBodies) {
      for (const [body, mesh] of this.physicsBodies.entries()) {
        mesh.position.copy(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
        mesh.quaternion.copy(new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w));
      }
    }
  }

  // syncPlayerPhysics和updateCapsulePosition方法已移动到Model类中
  // 现在每个模型都会在自己的update方法中自动处理物理同步

  /**
   * 添加物理体到世界
   */
  addBody(body: CANNON.Body): void {
    if (this.world) {
      this.world.addBody(body);
    }
  }

  /**
   * 关联物理体和可视化对象
   */
  associateBodyWithMesh(body: CANNON.Body, mesh: THREE.Object3D): void {
    this.physicsBodies.set(body, mesh);
  }

  /**
   * 获取物理世界
   */
  getWorld(): CANNON.World {
    return this.world;
  }

  /**
   * 获取物理体映射
   */
  getPhysicsBodies(): Map<CANNON.Body, THREE.Object3D> {
    return this.physicsBodies;
  }

  /**
   * 显示物理世界信息
   */
  showPhysicsInfo(): void {
    if (this.world) {
      console.log('物理世界信息：', this.world);
      console.log('物理对象数量:', this.world.bodies.length);
      
      // 显示所有物理对象的位置
      this.world.bodies.forEach((body: CANNON.Body, index: number) => {
        console.log(`物理对象 ${index}:`, {
          位置: body.position,
          质量: body.mass,
          类型: body.type === CANNON.Body.STATIC ? '静态' : '动态',
          形状数量: body.shapes.length
        });
      });
    } else {
      console.log('物理世界未初始化！');
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.world) {
      // 清理所有物理体
      this.world.bodies.forEach(body => {
        this.world.removeBody(body);
      });
    }
    
    this.physicsBodies.clear();
    
    // 清理全局状态引用
    this.globalState.physicsWorld = undefined;
    this.globalState.physicsBodies = undefined;
  }
}
