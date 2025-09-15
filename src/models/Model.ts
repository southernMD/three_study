import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GlobalState } from '../types/GlobalState';
import { BVHPhysics } from '../physics/BVHPhysics';
import { Ball } from './Ball';

// 基础模型类 - 完全基于BVH物理系统
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
    Space: boolean;
  };

  // BVH物理系统
  protected bvhPhysics?: BVHPhysics;
  private playerIsOnGround = true; // 初始化为在地面上
  private playerVelocity = new THREE.Vector3();
  private upVector = new THREE.Vector3(0, 1, 0);
  private delta = 0.016;

  // 碰撞相关
  protected playerCapsule?: Capsule;
  protected capsuleParams?: {
    radius: number;
    height: number;
    visual: THREE.Mesh;
  };

  // 相机辅助器
  private cameraHelpers?: {
    lookCameraHelper?: THREE.CameraHelper;
    targetCameraHelper?: THREE.CameraHelper;
  };

  // 模型辅助器
  protected helpersVisible?: {
    skeletonHelper?: THREE.SkeletonHelper;
    boxHelper?: THREE.BoxHelper;
    capsuleVisual?: THREE.Mesh;
  };

  // 全局状态
  protected globalState: GlobalState;

  // 相机控制器变化处理函数
  private cameraControlsChangeHandler?: (event: any) => void;
  private controlsChangeTimeout?: number;

  // BVH碰撞检测开关
  public bvhCollisionEnabled: boolean = false;

  protected moveSpeed = 150
  protected currentCameraAngle = 0 // 当前相机角度

  //bvh
  private tempVector = new THREE.Vector3();
  private tempVector2 = new THREE.Vector3();

  // 右键发射小球功能相关
  private spheres: Ball[] = [];
  private sphereParams = {
    sphereSize: 1,
    maxSpheres: 50 // 最大小球数量，防止内存泄漏
  };

  constructor(globalState: GlobalState) {
    this.globalState = globalState;
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false,
    };
    this.modelSize = { width: 0, height: 0, depth: 0 };
    this.bvhPhysics = globalState.bvhPhysics;
  }

  // 抽象方法
  abstract update(): void;

  // 获取模型三维尺寸 - 抽象方法，子类需要实现
  abstract setModelDimensions(): { width: number; height: number; depth: number };

  // 开始行走动画 - 子类需要实现具体逻辑
  abstract startWalking(): void;

  // 停止行走动画 - 子类需要实现具体逻辑
  abstract stopWalking(): void;

  // 获取已计算的模型尺寸
  getModelDimensions(): { width: number; height: number; depth: number } {
    return this.modelSize;
  }


  /**
   * 创建胶囊体碰撞检测 (完全按照ModelBefore.ts)
   */
  protected createCapsule(): { playerCapsule: Capsule, capsuleVisual: THREE.Mesh } {
    // 使用this.modelSize获取模型精确尺寸
    const dimensions = this.getModelDimensions();

    // 安全检查：如果modelSize还没有计算，使用默认值
    if (dimensions.width === 0 || dimensions.height === 0 || dimensions.depth === 0) {
      console.warn('⚠️ 模型尺寸未计算，使用默认胶囊体尺寸');
      dimensions.width = 1;
      dimensions.height = 2;
      dimensions.depth = 1;
    }

    // 计算胶囊体参数 - 完全贴合模型
    // 半径设为模型宽度和深度中较大值的一半
    const radius = Math.max(dimensions.width, dimensions.depth) / 4;

    // 确保半径不为0或NaN
    const safeRadius = Math.max(0.1, radius || 0.1);

    // 调整高度，使圆弧部分完全包裹模型顶部和底部
    // 胶囊体总长度 = 中间圆柱体部分 + 两端半球部分
    // 因此我们需要将模型高度减去两个半径(两端的半球)，得到中间圆柱体部分的高度
    const safeHeight = Math.max(1, dimensions.height || 1);
    const cylinderHeight = Math.max(0, safeHeight - 2 * safeRadius);

    // 重要调整：将起点抬高到地面上，防止穿透地面
    // 胶囊体起点应该在模型底部位置 + 半径，这样胶囊体底部刚好与地面接触
    const start = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + safeRadius, // 将起点抬高半径的距离，防止穿透地面
      this.mesh.position.z
    );

    // 胶囊体终点相应上移
    const end = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + safeHeight - safeRadius, // 相应调整终点位置
      this.mesh.position.z
    );

    const playerCapsule = new Capsule(start, end, safeRadius);

    // 创建胶囊体可视化
    const capsuleGeometry = new THREE.CapsuleGeometry(safeRadius, cylinderHeight, 16, 8);
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
      radius: safeRadius,
      height: safeHeight
    };

    console.log('✅ 创建胶囊体成功:', {
      模型位置: this.mesh.position,
      模型尺寸: dimensions,
      安全半径: safeRadius,
      安全高度: safeHeight,
      圆柱体高度: cylinderHeight,
      总高度: cylinderHeight + 2 * safeRadius,
      起点: start,
      终点: end,
      底部距地面: safeRadius // 底部到地面的距离
    });

    return { playerCapsule, capsuleVisual };
  }

  /**
   * 更新胶囊体位置
   */
  protected updateCapsulePosition(): void {
    if (!this.playerCapsule || !this.mesh || !this.capsuleParams) {
      console.log('❌ 胶囊体更新失败，组件缺失:', {
        playerCapsule: !!this.playerCapsule,
        mesh: !!this.mesh,
        capsuleParams: !!this.capsuleParams
      });
      return;
    }

    const { radius, height } = this.capsuleParams;

    // 检查NaN值
    if (isNaN(this.mesh.position.x) || isNaN(this.mesh.position.y) || isNaN(this.mesh.position.z)) {
      console.error('❌ 网格位置包含NaN，跳过胶囊体更新');
      return;
    }

    if (isNaN(radius) || isNaN(height) || radius <= 0 || height <= 0) {
      console.error('❌ 胶囊体参数无效:', { radius, height });
      return;
    }

    // 更新胶囊体位置
    this.playerCapsule.start.copy(this.mesh.position);
    this.playerCapsule.start.y += radius;

    this.playerCapsule.end.copy(this.mesh.position);
    this.playerCapsule.end.y += height - radius;

    // 更新可视化位置
    this.capsuleParams.visual.position.copy(this.mesh.position);
    this.capsuleParams.visual.position.y += height / 2;

    // 调试信息（偶尔打印）
    if (Math.random() < 0.01) {
      console.log('🔄 胶囊体位置更新:', {
        meshPosition: this.mesh.position,
        capsuleVisualPosition: this.capsuleParams.visual.position,
        visible: this.capsuleParams.visual.visible,
        inScene: !!this.capsuleParams.visual.parent
      });
    }
  }

  /**
   * 使用BVH进行碰撞检测和物理更新（参考characterMovement.js）
   */
  handleBVHPhysics(delta: number): void {
    if (!this.bvhPhysics || !this.mesh || !this.playerCapsule || !this.capsuleParams) {
      console.log('❌ BVH物理系统组件缺失:', {
        bvhPhysics: !!this.bvhPhysics,
        mesh: !!this.mesh,
        playerCapsule: !!this.playerCapsule,
        capsuleParams: !!this.capsuleParams
      });
      return;
    }

    // 应用重力 (完全按照characterMovement.js第307-315行)
    if (this.playerIsOnGround) {
      this.playerVelocity.y = delta * this.bvhPhysics.params.gravity;
    } else {
      this.playerVelocity.y += delta * this.bvhPhysics.params.gravity;
    }

    // 调试信息 (可选)
    // if (Math.random() < 0.01) { // 只偶尔打印，避免日志过多
    //   console.log('🏃 BVH物理更新:', {
    //     position: this.mesh.position.y.toFixed(2),
    //     velocity: this.playerVelocity.y.toFixed(2),
    //     onGround: this.playerIsOnGround,
    //     gravity: this.bvhPhysics.params.gravity
    //   });
    // }

    // 应用速度到位置
    this.mesh.position.addScaledVector(this.playerVelocity, delta);

    // 处理键盘输入移动（传入相机角度）
    this.handleMovementInput(delta, this.currentCameraAngle);

    // 更新模型矩阵
    this.mesh.updateMatrixWorld();

    // 使用新的分离碰撞体检测
    this.performSeparateCollidersDetection(delta);

    // // 简单的地面检测
    // if (this.mesh.position.y < 0) {
    //   debugger
    //   this.mesh.position.y = 0;
    //   this.playerIsOnGround = true;
    //   this.playerVelocity.y = 0;
    // } else {
    //   this.playerIsOnGround = false;
    // }

    // 更新胶囊体位置
    this.updateCapsulePosition();

    // 如果角色掉得太低，重置位置
    if (this.mesh.position.y < -25) {
      this.resetPosition();
    }
  }

  /**
   * 处理键盘输入移动（完全按照characterMovement.js实现）
   */
  private handleMovementInput(delta: number, cameraAngle: number = 0): void {
    // 🔥 跳跃逻辑已移至 handleKeyDown 中，参考 characterMovement.js

    if (!this.mesh || !this.isWalking) return;

    // 按照characterMovement.js的实现：
    // W键 - 向前移动（相对于相机朝向）
    if (this.keys.ArrowUp) {
      this.tempVector.set(0, 0, -1).applyAxisAngle(this.upVector, cameraAngle);
      this.mesh.position.addScaledVector(this.tempVector, this.moveSpeed * delta);
    }

    // S键 - 向后移动
    if (this.keys.ArrowDown) {
      this.tempVector.set(0, 0, 1).applyAxisAngle(this.upVector, cameraAngle);
      this.mesh.position.addScaledVector(this.tempVector, this.moveSpeed * delta);
    }

    // A键 - 向左移动
    if (this.keys.ArrowLeft) {
      this.tempVector.set(-1, 0, 0).applyAxisAngle(this.upVector, cameraAngle);
      this.mesh.position.addScaledVector(this.tempVector, this.moveSpeed * delta);
    }

    // D键 - 向右移动
    if (this.keys.ArrowRight) {
      this.tempVector.set(1, 0, 0).applyAxisAngle(this.upVector, cameraAngle);
      this.mesh.position.addScaledVector(this.tempVector, this.moveSpeed * delta);
    }


  }

  /**
   * 重置角色位置
   */
  private resetPosition(): void {
    this.playerVelocity.set(0, 0, 0);
    this.mesh.position.set(0, 5, 0); // 重置到安全位置
    this.updateCapsulePosition();
    console.log('🔄 角色位置已重置');
  }

  /**
   * 处理键盘事件
   */
  handleKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.ArrowUp = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.ArrowDown = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.ArrowLeft = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.ArrowRight = true;
        break;
      case 'Space':
        this.keys.Space = true;
        // 🔥 参考 characterMovement.js 第164-172行：在 keydown 事件中立即处理跳跃
        if (this.playerIsOnGround) {
          console.log('🦘 执行跳跃');
          // 不要直接设置一个很大的速度，而是直接改变位置，然后设置一个适当的速度
          // 先直接改变一点位置，模拟初始冲量
          this.mesh.position.y += 1.0;
          // 立即更新胶囊体位置，避免碰撞检测问题
          this.updateCapsulePosition();
          // 然后设置一个适当的向上速度
          this.playerVelocity.y = 40.0;
          this.playerIsOnGround = false;
        }
        break;
    }

    // 检查是否开始行走
    const anyDirectionKeyPressed = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;
    if (anyDirectionKeyPressed && !this.isWalking) {
      this.isWalking = true;
      this.startWalking();
    }

    // 🔥 跳跃逻辑已移至上面的 Space 按键处理中
  }

  handleKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.ArrowUp = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.ArrowDown = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.ArrowLeft = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.ArrowRight = false;
        break;
      case 'Space':
        this.keys.Space = false;
        break;
    }

    // 检查是否停止行走
    const anyDirectionKeyPressed = this.keys.ArrowUp || this.keys.ArrowDown || this.keys.ArrowLeft || this.keys.ArrowRight;
    if (!anyDirectionKeyPressed && this.isWalking) {
      this.isWalking = false;
      this.stopWalking();
    }
  }

  /**
   * 主更新方法
   */
  updateMovement(): void {
    this.handleBVHPhysics(this.delta);
  }

  // ==================== BVH 物理系统方法 ====================

  /**
   * 对分离的碰撞体组执行碰撞检测
   */
  private performSeparateCollidersDetection(delta: number): void {
    if (!this.bvhPhysics) return;

    const colliders = this.bvhPhysics.getColliders();
    const colliderMapping = this.bvhPhysics.getColliderMapping();

    if (!this.mesh || !this.playerCapsule || !this.capsuleParams) return;

    // 临时变量
    const tempBox = new THREE.Box3();
    const tempMat = new THREE.Matrix4();
    const tempSegment = new THREE.Line3();
    const capsuleInfo = this.capsuleParams;

    // 保存原始胶囊体位置
    const originalCapsuleStart = this.playerCapsule.start.clone();

    // 从 Capsule 创建 Line3 segment
    tempSegment.start.copy(this.playerCapsule.start);
    tempSegment.end.copy(this.playerCapsule.end);

    let totalDeltaVector = new THREE.Vector3();
    let hasCollision = false;
    let collisionInfo: Array<{ objectId: string; object: any; deltaVector: THREE.Vector3 }> = [];

    // 对每个分离的碰撞体进行检测
    colliders.forEach((collider, objectId) => {
      if (!collider.geometry || !(collider.geometry as any).boundsTree) return;

      // 重置临时变量
      tempBox.makeEmpty();
      tempMat.copy(collider.matrixWorld).invert();

      // 重置segment到原始位置
      tempSegment.start.copy(this.playerCapsule!.start);
      tempSegment.end.copy(this.playerCapsule!.end);

      // 转换到碰撞体局部空间
      tempSegment.start.applyMatrix4(tempMat);
      tempSegment.end.applyMatrix4(tempMat);

      // 计算包围盒
      tempBox.expandByPoint(tempSegment.start);
      tempBox.expandByPoint(tempSegment.end);
      tempBox.min.addScalar(-capsuleInfo.radius);
      tempBox.max.addScalar(capsuleInfo.radius);

      let colliderHasCollision = false;

      // BVH碰撞检测
      (collider.geometry as any).boundsTree.shapecast({
        intersectsBounds: (box: THREE.Box3) => box.intersectsBox(tempBox),

        intersectsTriangle: (tri: any) => {
          const triPoint = this.tempVector;
          const capsulePoint = this.tempVector2;

          const distance = tri.closestPointToSegment(tempSegment, triPoint, capsulePoint);
          if (distance < capsuleInfo.radius) {
            const depth = capsuleInfo.radius - distance;
            const direction = capsulePoint.sub(triPoint).normalize();

            tempSegment.start.addScaledVector(direction, depth);
            tempSegment.end.addScaledVector(direction, depth);
            colliderHasCollision = true;
          }
        }
      });

      if (colliderHasCollision) {
        // 计算该碰撞体的位置调整
        const newPosition = this.tempVector;
        newPosition.copy(tempSegment.start).applyMatrix4(collider.matrixWorld);

        const deltaVector = new THREE.Vector3();
        deltaVector.subVectors(newPosition, originalCapsuleStart);

        // 累积位置调整
        totalDeltaVector.add(deltaVector);
        hasCollision = true;

        // 记录碰撞信息
        collisionInfo.push({
          objectId: objectId,
          object: colliderMapping.get(objectId),
          deltaVector: deltaVector.clone()
        });

        // console.log(`🎯 角色碰撞: ${objectId}`, {
        //   objectName: colliderMapping.get(objectId)?.constructor.name || 'Unknown',
        //   deltaVector: deltaVector
        // });
      }
    });

    if (hasCollision) {
      // 处理累积的碰撞结果
      const wasOnGround = this.playerIsOnGround;
      this.playerIsOnGround = totalDeltaVector.y > Math.abs(delta * this.playerVelocity.y * 0.25);

      const offset = Math.max(0.0, totalDeltaVector.length() - 1e-5);
      totalDeltaVector.normalize().multiplyScalar(offset);

      // 调整角色位置
      this.mesh.position.add(totalDeltaVector);

      if (!this.playerIsOnGround) {
        totalDeltaVector.normalize();
        this.playerVelocity.addScaledVector(totalDeltaVector, -totalDeltaVector.dot(this.playerVelocity));
      } else {
        this.playerVelocity.set(0, 0, 0);
      }

      // 触发角色碰撞事件
      this.onPlayerCollision(collisionInfo);
    }
  }


  /**
   * 角色碰撞事件处理
   */
  private onPlayerCollision(collisionInfo: Array<{ objectId: string; object: any; deltaVector: THREE.Vector3 }>): void {
    // 这里可以添加角色碰撞的特殊逻辑
    // 比如：触发机关、收集物品、受到伤害等

    collisionInfo.forEach(info => {
      // console.log(`🚶 角色碰撞事件:`, {
      //   objectId: info.objectId,
      //   objectName: info.object?.constructor.name || 'Unknown',
      //   deltaVector: info.deltaVector
      // });
    });
  }



  /**
   * 获取BVH物理系统状态
   */
  public getBVHPhysicsStatus(): {
    isOnGround: boolean;
    velocity: THREE.Vector3;
    position: THREE.Vector3;
    hasPhysics: boolean;
  } {
    return {
      isOnGround: this.playerIsOnGround,
      velocity: this.playerVelocity.clone(),
      position: this.mesh ? this.mesh.position.clone() : new THREE.Vector3(),
      hasPhysics: !!this.bvhPhysics
    };
  }

  /**
   * 调试：检查BVH物理状态
   */
  public debugBVHPhysics(): void {
    if (!this.mesh) {
      console.log('❌ 模型不存在');
      return;
    }

    const status = this.getBVHPhysicsStatus();
    console.log('🔍 BVH物理状态检查:');
    console.log(`   模型位置: (${status.position.x.toFixed(2)}, ${status.position.y.toFixed(2)}, ${status.position.z.toFixed(2)})`);
    console.log(`   速度: (${status.velocity.x.toFixed(2)}, ${status.velocity.y.toFixed(2)}, ${status.velocity.z.toFixed(2)})`);
    console.log(`   在地面: ${status.isOnGround ? '是' : '否'}`);
    console.log(`   BVH物理系统: ${status.hasPhysics ? '已初始化' : '未初始化'}`);
  }

  // ==================== 相机系统方法 ====================

  /**
   * 创建跟随相机 - 创建一个跟随模型的相机
   */
  public createLookCamera(scene: THREE.Scene): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 5, 800);
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

  /**
   * 创建相机控制器
   */
  public createCameraControls(
    camera: THREE.Camera,
    domElement: HTMLElement,
    renderer?: THREE.WebGLRenderer
  ): OrbitControls {
    const controls = new OrbitControls(camera, domElement);
    // 修复角度设置 - 不设置minAzimuthAngle以允许360度旋转
    // controls.minAzimuthAngle = -Infinity; // 允许无限制水平旋转
    // controls.maxAzimuthAngle = Infinity;
    controls.maxPolarAngle = Math.PI * 3 / 4; // 限制垂直角度
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
    this.cameraControlsChangeHandler = (_event) => {
      this.handleCameraControlsChange(controls, camera, renderer);
    };

    // 添加控制器变化事件监听器
    controls.addEventListener('change', this.cameraControlsChangeHandler);
    controls.addEventListener('change', ()=>{
      // const polarAngle = controls.getPolarAngle();
      // console.log(`当前仰角: ${polarAngle} 弧度 (约 ${THREE.MathUtils.radToDeg(polarAngle)} 度)`);
    });
    return controls;
  }

  /**
   * 处理相机控制器变化事件
   */
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

  /**
   * 清理相机控制器资源
   */
  public cleanupCameraControls(controls: OrbitControls): void {
    if (this.cameraControlsChangeHandler) {
      controls.removeEventListener('change', this.cameraControlsChangeHandler);
      this.cameraControlsChangeHandler = undefined;
    }

    if (this.controlsChangeTimeout) {
      clearTimeout(this.controlsChangeTimeout);
      this.controlsChangeTimeout = undefined;
    }
  }

  /**
   * 更新相机跟随（在动画循环中调用）
   */
  public updateCameraFollow(camera: THREE.PerspectiveCamera, controls: OrbitControls): void {
    if (!this.mesh) return;

    // 更新当前相机角度（这是关键！）
    this.currentCameraAngle = controls.getAzimuthalAngle();

    // 保存相机当前位置相对于目标点的偏移
    const cameraOffset = new THREE.Vector3().subVectors(
      camera.position,
      controls.target
    );

    // 更新控制器目标到角色位置
    controls.target.copy(this.mesh.position);

    // 根据角色高度调整目标点Y坐标
    controls.target.y += 1 * this.modelSize?.height;

    // 根据保存的偏移更新相机位置
    camera.position.copy(controls.target).add(cameraOffset);

    // 更新控制器，应用变更
    controls.update();
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

  /**
   * 切换胶囊体可视化
   */
  public toggleCapsuleVisibility(): void {
    if (this.capsuleParams && this.capsuleParams.visual) {
      this.capsuleParams.visual.visible = !this.capsuleParams.visual.visible;
      console.log(`胶囊体可视化: ${this.capsuleParams.visual.visible ? '显示' : '隐藏'}`);
      console.log('胶囊体信息:', {
        position: this.capsuleParams.visual.position,
        scale: this.capsuleParams.visual.scale,
        parent: this.capsuleParams.visual.parent?.name || 'no parent'
      });
    } else {
      console.log('❌ 胶囊体参数或可视化对象不存在:', {
        capsuleParams: !!this.capsuleParams,
        visual: !!(this.capsuleParams?.visual)
      });
    }
  }

  // ==================== 右键发射小球功能 ====================

  /**
   * 发射小球（由外部调用，不处理事件）
   * @param camera 相机对象
   * @param scene 场景对象
   * @param mouseX 鼠标X坐标（标准化设备坐标）
   * @param mouseY 鼠标Y坐标（标准化设备坐标）
   */
  public shootSphere(camera: THREE.Camera, scene: THREE.Scene, mouseX: number, mouseY: number): void {
    if (!this.bvhPhysics) {
      console.warn('❌ BVH物理系统未初始化，无法发射小球');
      return;
    }
    const ball = new Ball(scene, this.bvhPhysics);
    ball.shoot(camera, mouseX, mouseY);
    this.spheres.push(ball)
  }

  /**
   * 更新所有发射的小球物理状态
   * @param delta 时间增量
   * @param camera 相机对象（用于视野检测优化）
   */
  public updateProjectileSpheres(delta: number, camera?: THREE.Camera): void {
    if (!this.bvhPhysics) return;

    for (let i = 0; i < this.spheres.length; i++) {
      const ball = this.spheres[i];
      const isSuccess = ball.updateProjectileSphere(delta, camera);
      if(!isSuccess){
        ball.removeSphere();
        this.spheres.splice(i, 1);
        i--;
      }
    }
  }

  /**
   * 清理所有发射的小球
   * @param scene 场景对象
   */
  public clearAllSpheres(scene: THREE.Scene): void {
    this.spheres.forEach(ball => {
      scene.remove(ball.sphere);
      ball.sphere.geometry.dispose();
      if (ball.sphere.material instanceof THREE.Material) {
        ball.sphere.material.dispose();
      }
    });
    this.spheres.length = 0;
    console.log('🧹 已清理所有发射的小球');
  }

  /**
   * 清理小球资源
   * @param scene 场景对象
   */
  public disposeSphereShooter(scene: THREE.Scene): void {
    // 清理所有小球
    this.clearAllSpheres(scene);
    console.log('🗑️ 小球资源已清理');
  }

  /**
   * 获取当前小球数量
   */
  public getSphereCount(): number {
    return this.spheres.length;
  }

  /**
   * 设置小球参数
   * @param params 小球参数
   */
  public setSphereParams(params: Partial<typeof this.sphereParams>): void {
    Object.assign(this.sphereParams, params);
    console.log('⚙️ 小球参数已更新:', this.sphereParams);
  }
}