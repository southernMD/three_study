import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// 导入cannon-es物理引擎
import * as CANNON from 'cannon-es';
import { GlobalState } from '../types/GlobalState';

// 定义碰撞事件接口
interface CollideEvent {
  type: string;
  body: CANNON.Body;
  target: CANNON.Body;
  contact: CANNON.ContactEquation;
}

// GlobalState接口现在在ThreeModel.vue中定义

// 基础模型类 - 包含通用功能如键盘事件、胶囊体碰撞、移动等
export abstract class Model {
  abstract mesh: THREE.Object3D;
  protected mixer: THREE.AnimationMixer;
  protected modelSize: {
    width: number;
    height: number;
    depth: number;
  }
  // 键盘控制相关
  isWalking: boolean = false;
  keys: {
    ArrowUp: boolean;
    ArrowDown: boolean;
    ArrowLeft: boolean;
    ArrowRight: boolean;
  };

  // 碰撞相关
  protected playerCapsule?: Capsule;
  protected capsuleParams?: {
    radius: number;
    height: number;
    visual: THREE.Mesh;
  };

  // 物理身体
  private playerBody?: CANNON.Body;

  // BVH 碰撞检测相关
  private bvhColliders: THREE.Mesh[] = [];
  private playerIsOnGround = false;
  private playerVelocity = new THREE.Vector3();
  private upVector = new THREE.Vector3(0, 1, 0);

  // 相机辅助器
  private cameraHelpers?: {
    lookCameraHelper?: THREE.CameraHelper;
  };

  // 模型辅助器
  protected helpersVisible?: {
    skeletonHelper?: THREE.SkeletonHelper;
    boxHelper?: THREE.BoxHelper;
    capsuleVisual?: THREE.Mesh;
  };

  // 相机控制器相关
  private cameraControlsChangeHandler?: (event: any) => void;
  private controlsChangeTimeout?: number;

  // 全局状态引用
  protected globalState: GlobalState;

  // BVH 碰撞检测开关
  private bvhCollisionEnabled: boolean = false;

  constructor(globalState: GlobalState) {
    this.globalState = globalState;
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };
    this.modelSize = {
      width: 0,
      height: 0,
      depth: 0
    }
    this.mixer = new THREE.AnimationMixer(new THREE.Object3D());
  }

  // 设置辅助视觉效果 - 子类需要实现具体逻辑
  abstract setupHelpers(scene: THREE.Scene, capsuleVisual: THREE.Mesh): void;

  // 创建跟随相机 - 创建一个跟随模型的相机
  createLookCamera(scene: THREE.Scene): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(45, 1, 10, 6000);
    const cameraHelper = new THREE.CameraHelper(camera);

    // 设置相机位置
    if (this.mesh) {
      camera.position.set(
        this.mesh.position.x,
        this.mesh.position.y + 1 * this.modelSize?.height,
        this.mesh.position.z
      );
    } else {
      camera.position.set(0, 13, 2);
    }

    // 添加相机辅助线到场景
    scene.add(cameraHelper);

    // 将相机辅助线存储到私有属性
    if (!this.cameraHelpers) {
      this.cameraHelpers = {};
    }
    this.cameraHelpers.lookCameraHelper = cameraHelper;

    return camera;
  }

  // 创建相机控制器
  createCameraControls(camera: THREE.Camera, domElement: HTMLElement, renderer?: THREE.WebGLRenderer): OrbitControls {
    const controls = new OrbitControls(camera, domElement);
    controls.minAzimuthAngle = Math.PI * 2;
    controls.maxPolarAngle = Math.PI * 3 / 4;
    controls.enableZoom = false; // 禁止缩放
    controls.enablePan = false; // 禁止平移
    controls.maxDistance = 2;
    controls.keyPanSpeed = 2;

    // 设置控制器目标为模型位置上方
    if (this.mesh) {
      controls.target.set(
        this.mesh.position.x,
        this.mesh.position.y + 1 * this.modelSize?.height,
        this.mesh.position.z
      );
    }

    // 创建一个具名的事件处理函数
    this.cameraControlsChangeHandler = (event) => {
      this.handleCameraControlsChange(controls, camera, renderer);
    };

    // 添加控制器变化事件监听器
    controls.addEventListener('change', this.cameraControlsChangeHandler);
    controls.addEventListener('change', ()=>{
      const polarAngle = controls.getPolarAngle(); 
      console.log(`当前仰角: ${polarAngle} 弧度 (约 ${THREE.MathUtils.radToDeg(polarAngle)} 度)`);
    });
    return controls;
  }

  // 处理相机控制器变化事件
  protected handleCameraControlsChange(controls: OrbitControls, camera: THREE.Camera, renderer?: THREE.WebGLRenderer): void {
    const azimuthAngle = controls.getAzimuthalAngle();

    // 更新模型旋转
    if (this.mesh) {
      this.mesh.rotation.y = azimuthAngle + Math.PI;
    }

    // 如果存在事件处理函数，临时移除它
    if (this.cameraControlsChangeHandler) {
      controls.removeEventListener('change', this.cameraControlsChangeHandler);

      // 清除之前的定时器（如果存在）
      if (this.controlsChangeTimeout) {
        clearTimeout(this.controlsChangeTimeout);
      }

      // 延迟重新添加事件监听器
      this.controlsChangeTimeout = window.setTimeout(() => {
        if (this.cameraControlsChangeHandler) {
          controls.addEventListener('change', this.cameraControlsChangeHandler);
        }
      }, 10); // 使用更短的延迟时间
    }

    // 如果提供了渲染器，则重新渲染场景
    if (renderer && camera instanceof THREE.Camera) {
      renderer.render(camera.parent || new THREE.Scene(), camera);
    }
  }

  // 清理相机控制器资源
  cleanupCameraControls(controls: OrbitControls): void {
    if (this.cameraControlsChangeHandler) {
      controls.removeEventListener('change', this.cameraControlsChangeHandler);
      this.cameraControlsChangeHandler = undefined;
    }

    if (this.controlsChangeTimeout) {
      clearTimeout(this.controlsChangeTimeout);
      this.controlsChangeTimeout = undefined;
    }
  }

  // // 更新胶囊体位置
  updateCapsulePosition(): void {
    if (!this.playerCapsule || !this.capsuleParams || !this.mesh) return;

    const { radius, height, visual } = this.capsuleParams;

    // 🔧 修复：胶囊体使用本地坐标，不需要更新位置
    // 因为胶囊体是相对于模型的本地坐标系定义的
    // 在BVH碰撞检测时会通过矩阵变换转换到世界坐标
    // 这里保持胶囊体的本地坐标不变
    this.playerCapsule.start.set(0, radius, 0);
    this.playerCapsule.end.set(0, height - radius, 0);

    // 更新可视化胶囊体的位置（可视化需要世界坐标）
    if (visual) {
      visual.position.set(
        this.mesh.position.x,
        this.mesh.position.y + height / 2,
        this.mesh.position.z
      );
    }
  }

  // 移动模型
  move(direction: string, speed: number, delta: number): void {
    if (!this.mesh) return;
    switch (direction) {
      case 'forward':
        this.mesh.position.z += speed * delta * Math.cos(this.mesh.rotation.y);
        this.mesh.position.x += speed * delta * Math.sin(this.mesh.rotation.y);
        break;
      case 'backward':
        this.mesh.position.z -= speed * delta * Math.cos(this.mesh.rotation.y);
        this.mesh.position.x -= speed * delta * Math.sin(this.mesh.rotation.y);
        break;
      case 'left':
        const rightMoveX = speed * delta * Math.sin(this.mesh.rotation.y + Math.PI / 2);
        const rightMoveZ = speed * delta * Math.cos(this.mesh.rotation.y + Math.PI / 2);
        this.mesh.position.x += rightMoveX;
        this.mesh.position.z += rightMoveZ;
        break;
      case 'right':
        const leftMoveX = -speed * delta * Math.sin(this.mesh.rotation.y + Math.PI / 2);
        const leftMoveZ = -speed * delta * Math.cos(this.mesh.rotation.y + Math.PI / 2);
        this.mesh.position.x += leftMoveX;
        this.mesh.position.z += leftMoveZ;
        break;
    }
  }
  // 更新模型动作和位置 - 实现基类抽象方法
  update(delta: number, cameraControls: OrbitControls, lookCamera: THREE.PerspectiveCamera): void {
    // 更新动画
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // 如果存在物理世界，使用物理引擎控制移动
    if (this.globalState.physicsWorld && this.playerBody) {
      // 处理用户输入到物理身体的同步
      this.handlePhysicsCollision();

      // 注意：物理引擎计算和结果同步现在在ThreeModel.vue中控制时机
    } else {
      // 回退到直接位置控制（没有物理世界时）
      if (this.isWalking) {
        const speed = 100; // 移动速度

        if (this.keys.ArrowUp) this.move('forward', speed, delta);
        if (this.keys.ArrowDown)this.move('backward', speed, delta);
        if (this.keys.ArrowLeft)this.move('left', speed, delta);
        if (this.keys.ArrowRight) this.move('right', speed, delta);
      }
    }

    // BVH碰撞检测专门用于SchoolBuilding，与物理世界并存
    // 这样可以同时有物理世界的地面/跑道碰撞 + BVH的建筑物碰撞
    if (this.bvhCollisionEnabled) {
      this.handleBVHCollision();
    }

    // 无论是否在行走，都更新相机位置，确保在重力下落时相机也会跟随
    // 保存相机当前位置相对于目标点的偏移
    const cameraOffset = new THREE.Vector3().subVectors(
      lookCamera.position,
      cameraControls.target
    );
    
    // 更新控制器目标到角色位置
    cameraControls.target.copy(this.mesh.position);
    
    // 根据角色高度调整目标点Y坐标
    cameraControls.target.y += 1 * this.modelSize?.height;
    
    // 根据保存的偏移更新相机位置
    lookCamera.position.copy(cameraControls.target).add(cameraOffset);
    
    // 更新控制器，应用变更
    cameraControls.update();
  }
  // 重置模型位置
  resetPosition(): void {
    if (!this.mesh) return;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
  }

  // 切换辅助线可见性
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
   * 切换BVH碰撞检测开关
   */
  toggleBVHCollisionEnabled(): void {
    this.bvhCollisionEnabled = !this.bvhCollisionEnabled;
    console.log(`🔄 BVH碰撞检测: ${this.bvhCollisionEnabled ? '启用' : '禁用'}`);
  }

  // 处理键盘按下事件
  handleKeyDown(event: KeyboardEvent, keyMap: Record<string, string>): void {
    //@ts-ignore
    const key = keyMap[event.key] ?? event.key;
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      // 使用类型断言
      this.keys[key as keyof typeof this.keys] = true;
    }

    switch (key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
        if (!this.isWalking) {
          this.isWalking = true;
          this.startWalking();
        }
        break;
    }
  }

  // 处理键盘抬起事件
  handleKeyUp(event: KeyboardEvent, keyMap: Record<string, string>): void {
    //@ts-ignore
    const key = keyMap[event.key] ?? event.key;
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      // 使用类型断言
      this.keys[key as keyof typeof this.keys] = false;
    }

    // 检查是否所有方向键都已松开
    const anyDirectionKeyPressed = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;

    if (!anyDirectionKeyPressed && this.isWalking) {
      this.isWalking = false;
      this.stopWalking();
    }

  }

  // 获取模型三维尺寸
  abstract setModelDimensions(): { width: number; height: number; depth: number };
  
  // 获取已计算的模型尺寸
  getModelDimensions(): { width: number; height: number; depth: number } {
    return this.modelSize;
  }

  // 开始行走动画 - 子类需要实现具体逻辑
  abstract startWalking(): void;

  // 停止行走动画 - 子类需要实现具体逻辑
  abstract stopWalking(): void;

  // 创建胶囊体碰撞检测
  createCapsule(): { playerCapsule: Capsule, capsuleVisual: THREE.Mesh } {
    // 使用this.modelSize获取模型精确尺寸
    const dimensions = this.getModelDimensions();
    // 计算胶囊体参数 - 完全贴合模型
    // 半径设为模型宽度和深度中较大值的一半
    const radius = Math.max(dimensions.width, dimensions.depth) / 4;

    // 调整高度，使圆弧部分完全包裹模型顶部和底部
    // 胶囊体总长度 = 中间圆柱体部分 + 两端半球部分
    // 因此我们需要将模型高度减去两个半径(两端的半球)，得到中间圆柱体部分的高度
    const cylinderHeight = Math.max(0, dimensions.height - 2 * radius);

    // 🔧 修复：胶囊体应该使用相对于模型的本地坐标（参考characterMovement.js）
    // 胶囊体起点在模型本地坐标系的底部
    const start = new THREE.Vector3(
      0, // 本地坐标X
      radius, // 本地坐标Y：底部 + 半径
      0  // 本地坐标Z
    );

    // 胶囊体终点在模型本地坐标系的顶部
    const end = new THREE.Vector3(
      0, // 本地坐标X
      dimensions.height - radius, // 本地坐标Y：顶部 - 半径
      0  // 本地坐标Z
    );

    const playerCapsule = new Capsule(start, end, radius);

    // 创建胶囊体可视化
    const capsuleGeometry = new THREE.CapsuleGeometry(radius, dimensions.height - 2 * radius, 16, 8);
    const capsuleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    const capsuleVisual = new THREE.Mesh(capsuleGeometry, capsuleMaterial);

    // 放置在正确位置 - 需要将可视化胶囊体上移
    capsuleVisual.position.set(
      this.mesh.position.x,
      this.mesh.position.y, // 上移radius距离，防止底部穿入地面
      this.mesh.position.z
    );

    // 保存胶囊体参数
    this.playerCapsule = playerCapsule;
    this.capsuleParams = {
      visual: capsuleVisual,
      radius,
      height: dimensions.height
    };

    console.log('创建胶囊体:', {
      模型位置: this.mesh.position,
      模型尺寸: dimensions,
      胶囊半径: radius,
      圆柱体高度: cylinderHeight,
      总高度: cylinderHeight + 2 * radius,
      起点: start,
      终点: end,
      底部距地面: radius // 底部到地面的距离
    });

    return { playerCapsule, capsuleVisual };
  }

  // 创建物理身体
  createPhysicsBody(): void {
    if (!this.globalState.physicsWorld || !this.mesh) return;
    
    // 获取模型尺寸
    const dimensions = this.getModelDimensions();
    
    // 计算胶囊体参数
    const radius = Math.max(dimensions.width, dimensions.depth) / 4;
    const height = dimensions.height;
    
    // 创建物理身体 - 使用胶囊体（由圆柱体和两个球体组成）
    // 创建一个复合形状来模拟胶囊体
    const body = new CANNON.Body({
      mass: 80, // 质量，单位kg
      position: new CANNON.Vec3(
        this.mesh.position.x,
        this.mesh.position.y + height / 2, // 将身体位置调整到模型中心
        this.mesh.position.z
      ),
      fixedRotation: true, // 防止身体旋转
      linearDamping: 0.9, // 线性阻尼，减少滑动
      material: new CANNON.Material({
        friction: 0.5, // 与SchoolBuilding保持一致的摩擦力
        restitution: 0.3 // 与SchoolBuilding保持一致的弹性系数
      })
    });
    
    // 计算圆柱体的高度（总高度减去两端的球体）
    const cylinderHeight = Math.max(0, height - 2 * radius);
    
    // 1. 添加中间的圆柱体部分
    const cylinderShape = new CANNON.Cylinder(radius, radius, cylinderHeight, 16);
    body.addShape(cylinderShape, new CANNON.Vec3(0, 0, 0), new CANNON.Quaternion().setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0), 
      Math.PI / 2
    ));
    
    // 2. 添加顶部球体
    const topSphere = new CANNON.Sphere(radius);
    body.addShape(topSphere, new CANNON.Vec3(0, cylinderHeight/2, 0));
    
    // 3. 添加底部球体
    const bottomSphere = new CANNON.Sphere(radius);
    body.addShape(bottomSphere, new CANNON.Vec3(0, -cylinderHeight/2, 0));
    
    // 添加碰撞事件监听器
    body.addEventListener('collide', (event: CollideEvent) => {
      console.log('碰撞事件', event);

      // 获取碰撞信息
      const contact = event.contact;

      // 确定哪个是玩家身体，哪个是碰撞物体
      if (!this.playerBody) return; // 如果playerBody未定义，直接返回

      const otherBody = event.body === this.playerBody ? event.target : event.body;
      
      // 计算碰撞法线和深度
      const normal = contact.ni; // 碰撞法线
      const depth = contact.getImpactVelocityAlongNormal(); // 碰撞深度/速度
      
      console.log('碰撞详情:', {
        碰撞点: contact.bi.position,
        碰撞法线: normal,
        碰撞深度: depth,
        碰撞物体类型: otherBody.type === CANNON.Body.STATIC ? '静态' : '动态'
      });
      
      // 根据碰撞情况调整模型位置
      if (Math.abs(normal.y) > 0.5) {
        // 垂直碰撞（地面或天花板）
        // 将模型位置与物理身体同步
        this.mesh.position.y = this.playerBody.position.y - height / 2; // 调整为底部对齐
      } else {
        // 水平碰撞（墙壁等）
        // 计算推力
        const pushForce = new CANNON.Vec3(normal.x, 0, normal.z).scale(Math.abs(depth) * 0.1);

        // 应用推力
        this.playerBody.velocity.vadd(pushForce, this.playerBody.velocity);

        // 同步X和Z位置
        this.mesh.position.x = this.playerBody.position.x;
        this.mesh.position.z = this.playerBody.position.z;
      }
      
      // 更新胶囊体位置
      this.updateCapsulePosition();
    });
    
    // 添加到物理世界
    this.globalState.physicsWorld.addBody(body);

    // 保存到私有变量
    this.playerBody = body;
    
    console.log("创建物理胶囊体:", {
      位置: body.position,
      半径: radius,
      圆柱体高度: cylinderHeight,
      总高度: height,
      形状数量: body.shapes.length
    });
  }
  
  // 使用物理引擎进行碰撞检测
  handlePhysicsCollision(): void {
    if (!this.globalState.physicsWorld || !this.mesh || !this.playerBody) return;

    // 获取模型尺寸，用于计算偏移
    const dimensions = this.getModelDimensions();
    const height = dimensions.height;

    // 重要修复：只在移动时将输入同步到物理身体
    // 其他时候让物理引擎控制位置

    if (this.isWalking) {
      // 移动时：将当前位置作为物理体的目标位置
      this.playerBody.position.x = this.mesh.position.x;
      this.playerBody.position.z = this.mesh.position.z;
      this.playerBody.position.y = this.mesh.position.y + height / 2;
    }
    // 不移动时：让物理引擎完全控制位置（重力、碰撞等）

    // 如果在移动，给物理体一些速度，这样碰撞检测更有效
    if (this.isWalking) {
      // 计算移动方向和速度
      const speed = 100;
      const velocity = new CANNON.Vec3(0, 0, 0);

      if (this.keys.ArrowUp) {
        velocity.x += Math.sin(this.mesh.rotation.y) * speed;
        velocity.z += Math.cos(this.mesh.rotation.y) * speed;
      }
      if (this.keys.ArrowDown) {
        velocity.x -= Math.sin(this.mesh.rotation.y) * speed;
        velocity.z -= Math.cos(this.mesh.rotation.y) * speed;
      }
      if (this.keys.ArrowLeft) {
        velocity.x += Math.sin(this.mesh.rotation.y + Math.PI / 2) * speed;
        velocity.z += Math.cos(this.mesh.rotation.y + Math.PI / 2) * speed;
      }
      if (this.keys.ArrowRight) {
        velocity.x -= Math.sin(this.mesh.rotation.y + Math.PI / 2) * speed;
        velocity.z -= Math.cos(this.mesh.rotation.y + Math.PI / 2) * speed;
      }

      // 保持Y轴速度（重力）
      velocity.y = this.playerBody.velocity.y;
      this.playerBody.velocity.copy(velocity);
    } else {
      // 不移动时，清除XZ速度，保持Y轴速度（重力）
      this.playerBody.velocity.x = 0;
      this.playerBody.velocity.z = 0;
    }

    // 物理引擎会在每帧计算碰撞，然后通过syncPhysicsToModel同步回模型
  }

  /**
   * 同步物理身体到模型位置
   * 这个方法会在每帧更新时自动调用，将物理引擎的计算结果同步到模型
   */
  protected syncPhysicsToModel(): void {
    if (this.playerBody && this.mesh) {
      // 获取模型尺寸，用于计算正确的位置偏移
      const dimensions = this.getModelDimensions();
      const height = dimensions.height;

      // 重要：始终让物理引擎控制模型位置
      // 计算模型底部位置 = 胶囊体中心位置 - 高度/2
      const newY = this.playerBody.position.y - height / 2;
      const newX = this.playerBody.position.x;
      const newZ = this.playerBody.position.z;

      // 应用物理引擎计算的位置
      this.mesh.position.x = newX;
      this.mesh.position.y = newY;
      this.mesh.position.z = newZ;
    }
  }

  /**
   * 自动更新胶囊体位置
   * 这个方法会在每帧更新时自动调用
   */
  protected autoUpdateCapsulePosition(): void {
    if (this.mesh) {
      this.updateCapsulePosition();
    }
  }

  /**
   * 公共方法：同步物理状态到模型
   * 在物理引擎更新后调用，将物理计算结果同步到模型
   */
  public syncFromPhysics(): void {
    this.syncPhysicsToModel();
    this.autoUpdateCapsulePosition();
  }

  /**
   * 获取物理身体（用于调试或特殊需求）
   */
  public getPhysicsBody(): CANNON.Body | undefined {
    return this.playerBody;
  }

  /**
   * 检查是否有物理身体
   */
  public hasPhysicsBody(): boolean {
    return this.playerBody !== undefined;
  }

  /**
   * 调试：检查物理体和模型位置同步
   */
  public checkPhysicsSync(): void {
    if (!this.playerBody || !this.mesh) {
      console.log('❌ 物理体或模型不存在');
      return;
    }

    const dimensions = this.getModelDimensions();
    const height = dimensions.height;

    console.log('🔍 物理体和模型位置同步检查:');
    console.log(`   模型位置: (${this.mesh.position.x.toFixed(2)}, ${this.mesh.position.y.toFixed(2)}, ${this.mesh.position.z.toFixed(2)})`);
    console.log(`   物理体位置: (${this.playerBody.position.x.toFixed(2)}, ${this.playerBody.position.y.toFixed(2)}, ${this.playerBody.position.z.toFixed(2)})`);
    console.log(`   物理体速度: (${this.playerBody.velocity.x.toFixed(2)}, ${this.playerBody.velocity.y.toFixed(2)}, ${this.playerBody.velocity.z.toFixed(2)})`);
    console.log(`   模型高度: ${height.toFixed(2)}`);

    // 计算期望的模型位置
    const expectedModelY = this.playerBody.position.y - height / 2;
    console.log(`   期望模型Y位置: ${expectedModelY.toFixed(2)}`);

    // 检查同步误差
    const errorX = Math.abs(this.mesh.position.x - this.playerBody.position.x);
    const errorY = Math.abs(this.mesh.position.y - expectedModelY);
    const errorZ = Math.abs(this.mesh.position.z - this.playerBody.position.z);

    console.log(`   同步误差: X=${errorX.toFixed(3)}, Y=${errorY.toFixed(3)}, Z=${errorZ.toFixed(3)}`);

    if (errorX > 0.1 || errorY > 0.1 || errorZ > 0.1) {
      console.log('⚠️ 位置同步误差较大');
    } else {
      console.log('✅ 位置同步正常');
    }
  }

  /**
   * 获取物理体详细信息（用于调试）
   */
  public getPhysicsBodyInfo(): any {
    if (!this.playerBody) return null;

    return {
      position: {
        x: this.playerBody.position.x,
        y: this.playerBody.position.y,
        z: this.playerBody.position.z
      },
      mass: this.playerBody.mass,
      type: this.playerBody.type === CANNON.Body.STATIC ? '静态' : '动态',
      shapes: this.playerBody.shapes.length,
      material: {
        friction: this.playerBody.material?.friction || 'N/A',
        restitution: this.playerBody.material?.restitution || 'N/A'
      },
      velocity: {
        x: this.playerBody.velocity.x,
        y: this.playerBody.velocity.y,
        z: this.playerBody.velocity.z
      }
    };
  }

  /**
   * 验证物理体是否在物理世界中
   */
  public validatePhysicsBodyInWorld(): boolean {
    if (!this.globalState.physicsWorld || !this.playerBody) {
      console.log('⚠️ 物理世界或人物物理体未初始化');
      return false;
    }

    const worldBodies = this.globalState.physicsWorld.bodies;
    const isInWorld = worldBodies.includes(this.playerBody);

    if (isInWorld) {
      console.log('✅ 人物物理体已在物理世界中');
    } else {
      console.log('❌ 人物物理体不在物理世界中');
    }

    return isInWorld;
  }

  /**
   * 更新相机辅助器
   */
  public updateCameraHelpers(): void {
    this.cameraHelpers?.lookCameraHelper?.update();
  }

  /**
   * 更新模型辅助器
   */
  public updateModelHelpers(): void {
    if (this.helpersVisible) {
      const { boxHelper, capsuleVisual } = this.helpersVisible;

      // 更新包围盒辅助线
      if (boxHelper && this.mesh) {
        boxHelper.update();
      }

      // 更新胶囊体可视化位置（使用正确的计算逻辑）
      if (capsuleVisual && this.mesh && this.capsuleParams) {
        const cylinderHeight = Math.max(0, this.capsuleParams.height ?? 0);
        capsuleVisual.position.set(
          this.mesh.position.x,
          this.mesh.position.y + cylinderHeight / 2, // 上移radius距离，防止底部穿入地面
          this.mesh.position.z
        );
      }
    }
  }

  // ==================== BVH 碰撞检测方法 ====================

  /**
   * 注册BVH碰撞体（由建筑物等调用）
   */
  public registerBVHCollider(collider: THREE.Mesh): void {
    if (collider && collider.geometry && (collider.geometry as any).boundsTree) {
      this.bvhColliders.push(collider);
      console.log(`✅ 注册BVH碰撞体: ${collider.name || 'Unnamed'}`);
    } else {
      console.warn('⚠️ 尝试注册无效的BVH碰撞体');
    }
  }

  /**
   * 移除BVH碰撞体
   */
  public unregisterBVHCollider(collider: THREE.Mesh): void {
    const index = this.bvhColliders.indexOf(collider);
    if (index !== -1) {
      this.bvhColliders.splice(index, 1);
      console.log(`✅ 移除BVH碰撞体: ${collider.name || 'Unnamed'}`);
    }
  }

  /**
   * 使用BVH进行碰撞检测（专门用于SchoolBuilding，与物理世界并存）
   * 完全参考characterMovement.js的实现
   */
  private handleBVHCollision(): void {
    if (!this.mesh || !this.playerCapsule || !this.capsuleParams || this.bvhColliders.length === 0) {
      return;
    }

    const { radius } = this.capsuleParams;

    // 临时变量（参考characterMovement.js）
    const tempBox = new THREE.Box3();
    const tempSegment = new THREE.Line3();
    const tempVector = new THREE.Vector3();
    const tempVector2 = new THREE.Vector3();
    const tempMat = new THREE.Matrix4();
    // 遍历所有BVH碰撞体
    for (const collider of this.bvhColliders) {
      if (!collider.geometry || !(collider.geometry as any).boundsTree) {
        continue;
      }

      // 🔧 距离检查 - 只有当人物接近建筑时才进行BVH碰撞检测
      const colliderBounds = new THREE.Box3().setFromObject(collider);
      const playerPosition = this.mesh.position;
      const closestPoint = colliderBounds.clampPoint(playerPosition, new THREE.Vector3());
      const distanceToBuilding = playerPosition.distanceTo(closestPoint);

      // 设置检测距离阈值
      const detectionThreshold = 50;

      if (distanceToBuilding > detectionThreshold) {
        continue;
      }

      // � 关键修复：完全按照characterMovement.js的方式处理坐标变换
      // 1. 更新人物的世界矩阵
      this.mesh.updateMatrixWorld();

      // 2. 准备碰撞检测变量
      tempBox.makeEmpty();
      tempMat.copy(collider.matrixWorld).invert();

      // 3. 复制胶囊体线段（使用当前胶囊体位置）
      tempSegment.start.copy(this.playerCapsule.start);
      tempSegment.end.copy(this.playerCapsule.end);

      // 4. 将胶囊体转换到碰撞体的本地空间（关键步骤！）
      tempSegment.start.applyMatrix4(this.mesh.matrixWorld).applyMatrix4(tempMat);
      tempSegment.end.applyMatrix4(this.mesh.matrixWorld).applyMatrix4(tempMat);

      // 5. 获取胶囊体的轴对齐边界框
      tempBox.expandByPoint(tempSegment.start);
      tempBox.expandByPoint(tempSegment.end);
      tempBox.min.addScalar(-radius);
      tempBox.max.addScalar(radius);

      // 6. 使用BVH进行碰撞检测（完全参考characterMovement.js）
      (collider.geometry as any).boundsTree.shapecast({
        intersectsBounds: (box: THREE.Box3) => box.intersectsBox(tempBox),
        intersectsTriangle: (tri: any) => {
          // 检查三角形是否与胶囊体相交
          const triPoint = tempVector;
          const capsulePoint = tempVector2;

          const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);
          if (distance < radius) {
            const depth = radius - distance;
            const direction = capsulePoint.sub(triPoint).normalize();

            tempSegment.start.addScaledVector(direction, depth);
            tempSegment.end.addScaledVector(direction, depth);
          }
        }
      });

      // 7. 获取调整后的位置（转换回世界空间）
      const newPosition = tempVector;
      newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);

      // 8. 检查人物需要移动多少
      const deltaVector = tempVector2;
      deltaVector.subVectors(newPosition, this.mesh.position);

      // 🔧 调试：记录详细的碰撞信息
      const beforePos = this.mesh.position.clone();

      // 9. 检查是否主要是垂直调整（地面检测）
      this.playerIsOnGround = deltaVector.y > Math.abs(0.01 * this.playerVelocity.y * 0.25);

      // 10. 计算偏移量并应用
      const offset = Math.max(0.0, deltaVector.length() - 1e-5);

      // 🔧 修复：恢复位置修改，但加上更合理的条件判断
      if (offset > 1e-5) {
        deltaVector.normalize().multiplyScalar(offset);

        // � 关键修复：限制Y轴方向的异常调整，防止相机异常抬高
        const maxYAdjustment = 2.0; // 限制Y轴调整的最大幅度
        if (Math.abs(deltaVector.y) > maxYAdjustment) {
          console.log(`⚠️ 限制Y轴调整: 原始=${deltaVector.y.toFixed(3)}, 限制到=${Math.sign(deltaVector.y) * maxYAdjustment}`);
          deltaVector.y = Math.sign(deltaVector.y) * maxYAdjustment;
        }

        // 🔧 只有当人物真的在建筑附近时才应用位置调整
        if (distanceToBuilding <= 25) { // 减小距离阈值，只在真正接近建筑时才调整
          // 11. 应用位置调整
          this.mesh.position.add(deltaVector);

          // 12. 更新胶囊体位置
          this.updateCapsulePosition();

          // 详细调试日志
          const afterPos = this.mesh.position.clone();
          const actualChange = beforePos.distanceTo(afterPos);
          console.log(`🔄 BVH碰撞检测应用:`);
          console.log(`   距建筑: ${distanceToBuilding.toFixed(1)}`);
          console.log(`   计算偏移: ${offset.toFixed(3)}`);
          console.log(`   实际移动: ${actualChange.toFixed(3)}`);
          console.log(`   位置变化: (${(afterPos.x - beforePos.x).toFixed(3)}, ${(afterPos.y - beforePos.y).toFixed(3)}, ${(afterPos.z - beforePos.z).toFixed(3)})`);
        } else {
          console.log(`⚠️ BVH碰撞被忽略(距离太远): offset=${offset.toFixed(3)}, 距建筑=${distanceToBuilding.toFixed(1)}`);
        }

        // 13. 调整速度（参考characterMovement.js）
        if (!this.playerIsOnGround) {
          deltaVector.normalize();
          this.playerVelocity.addScaledVector(deltaVector, -deltaVector.dot(this.playerVelocity));
        } else {
          this.playerVelocity.set(0, 0, 0);
        }
      }
    }
  }

  /**
   * 获取所有注册的BVH碰撞体
   */
  public getBVHColliders(): THREE.Mesh[] {
    return [...this.bvhColliders];
  }

  /**
   * 获取BVH碰撞状态信息
   */
  public getBVHCollisionStatus(): {
    isOnGround: boolean;
    velocity: THREE.Vector3;
    colliderCount: number;
    position: THREE.Vector3;
    distanceToBuilding?: number;
    bvhEnabled: boolean;
  } {
    let distanceToBuilding: number | undefined;

    // 计算到最近建筑的距离
    if (this.mesh && this.bvhColliders.length > 0) {
      let minDistance = Infinity;
      for (const collider of this.bvhColliders) {
        const colliderBounds = new THREE.Box3().setFromObject(collider);
        const closestPoint = colliderBounds.clampPoint(this.mesh.position, new THREE.Vector3());
        const distance = this.mesh.position.distanceTo(closestPoint);
        minDistance = Math.min(minDistance, distance);
      }
      distanceToBuilding = minDistance === Infinity ? undefined : minDistance;
    }

    return {
      isOnGround: this.playerIsOnGround,
      velocity: this.playerVelocity.clone(),
      colliderCount: this.bvhColliders.length,
      position: this.mesh ? this.mesh.position.clone() : new THREE.Vector3(),
      distanceToBuilding,
      bvhEnabled: this.bvhCollisionEnabled
    };
  }

  /**
   * 调试方法：检查BVH碰撞检测状态
   */
  public debugBVHCollision(): void {
    console.log('🔍 BVH碰撞检测调试信息:');
    const status = this.getBVHCollisionStatus();
    console.log(`   BVH启用状态: ${status.bvhEnabled ? '启用' : '禁用'}`);
    console.log(`   注册的碰撞体数量: ${status.colliderCount}`);
    console.log(`   人物位置: (${status.position.x.toFixed(1)}, ${status.position.y.toFixed(1)}, ${status.position.z.toFixed(1)})`);
    console.log(`   到建筑距离: ${status.distanceToBuilding ? status.distanceToBuilding.toFixed(1) : 'N/A'}`);
    console.log(`   在地面: ${status.isOnGround ? '是' : '否'}`);
    console.log(`   速度: (${status.velocity.x.toFixed(2)}, ${status.velocity.y.toFixed(2)}, ${status.velocity.z.toFixed(2)})`);

    // 检查胶囊体状态
    if (this.playerCapsule && this.capsuleParams) {
      console.log(`   胶囊体半径: ${this.capsuleParams.radius.toFixed(2)}`);
      console.log(`   胶囊体起点: (${this.playerCapsule.start.x.toFixed(1)}, ${this.playerCapsule.start.y.toFixed(1)}, ${this.playerCapsule.start.z.toFixed(1)})`);
      console.log(`   胶囊体终点: (${this.playerCapsule.end.x.toFixed(1)}, ${this.playerCapsule.end.y.toFixed(1)}, ${this.playerCapsule.end.z.toFixed(1)})`);
    }
  }
}

// 全局声明现在通过GlobalState接口管理，不再使用window全局变量