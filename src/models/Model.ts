import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshBVH } from 'three-mesh-bvh';
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

    const cylinderHeight = Math.max(0, height);
    this.playerCapsule.start.set(
      this.mesh.position.x,
      this.mesh.position.y + radius, // 将起点抬高半径的距离，防止穿透地面
      this.mesh.position.z
    );

    // 胶囊体终点相应上移
    this.playerCapsule.end.set(
      this.mesh.position.x,
      this.mesh.position.y - radius, // 相应调整终点位置
      this.mesh.position.z
    );

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

    // 更新位置
    if (this.isWalking) {
      const speed = 100; // 移动速度

      if (this.keys.ArrowUp) this.move('forward', speed, delta);
      if (this.keys.ArrowDown)this.move('backward', speed, delta);
      if (this.keys.ArrowLeft)this.move('left', speed, delta);
      if (this.keys.ArrowRight) this.move('right', speed, delta);
    }
    
    // 如果存在物理世界，处理用户输入到物理身体的同步
    if (this.globalState.physicsWorld) {
      // 处理用户输入到物理身体的同步（仅在移动时）
      this.handlePhysicsCollision();

      // 注意：物理引擎计算和结果同步现在在ThreeModel.vue中控制时机
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

    // 重要调整：将起点抬高到地面上，防止穿透地面
    // 胶囊体起点应该在模型底部位置 + 半径，这样胶囊体底部刚好与地面接触
    const start = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + radius, // 将起点抬高半径的距离，防止穿透地面
      this.mesh.position.z
    );

    // 胶囊体终点相应上移
    const end = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y - radius, // 相应调整终点位置
      this.mesh.position.z
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
        friction: 0.5,
        restitution: 0.3
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

    // 只在用户输入时同步模型位置到物理身体（用于移动控制）
    if (this.isWalking) {
      // 同步模型位置到物理身体的XZ平面
      this.playerBody.position.x = this.mesh.position.x;
      this.playerBody.position.z = this.mesh.position.z;

      // 计算物理胶囊体中心点相对于模型底部的偏移
      // 胶囊体中心应该在模型中心高度位置
      this.playerBody.position.y = this.mesh.position.y + height / 2;
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

      // 始终同步物理身体的位置到模型
      // 计算模型底部位置 = 胶囊体中心位置 - 高度/2
      this.mesh.position.y = this.playerBody.position.y - height / 2;
      this.mesh.position.x = this.playerBody.position.x;
      this.mesh.position.z = this.playerBody.position.z;
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
}

// 全局声明现在通过GlobalState接口管理，不再使用window全局变量