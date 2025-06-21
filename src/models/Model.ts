import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshBVH } from 'three-mesh-bvh';

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
    visual: THREE.Mesh;
    radius: number;
    height: number;
  };

  // 旋转状态
  leftRotate: number | undefined = undefined;
  rightRotate: number | undefined = undefined;

  // 相机控制器相关
  private cameraControlsChangeHandler?: (event: any) => void;
  private controlsChangeTimeout?: number;

  // 临时变量，用于碰撞检测计算
  private tempVector = new THREE.Vector3();
  private tempVector2 = new THREE.Vector3();
  private tempBox = new THREE.Box3();
  private tempMat = new THREE.Matrix4();
  private tempSegment = new THREE.Line3();

  constructor() {
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
    const camera = new THREE.PerspectiveCamera(45, 1, 1, 200);
    const cameraHelper = new THREE.CameraHelper(camera);

    // 设置相机位置
    if (this.mesh) {
      camera.position.set(
        this.mesh.position.x,
        this.mesh.position.y + 1 * this.modelSize?.height,
        this.mesh.position.z + 2
      );
    } else {
      camera.position.set(0, 13, 2);
    }

    // 添加相机辅助线到场景
    scene.add(cameraHelper);

    // 将相机辅助线存储到全局变量，以便其他地方可以访问
    if (!window.cameraHelpers) {
      window.cameraHelpers = {};
    }
    window.cameraHelpers.lookCameraHelper = cameraHelper;

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
        this.mesh.position.z + 3
      );
    }

    // 创建一个具名的事件处理函数
    this.cameraControlsChangeHandler = (event) => {
      this.handleCameraControlsChange(controls, camera, renderer);
    };

    // 添加控制器变化事件监听器
    controls.addEventListener('change', this.cameraControlsChangeHandler);

    return controls;
  }

  // 处理相机控制器变化事件
  protected handleCameraControlsChange(controls: OrbitControls, camera: THREE.Camera, renderer?: THREE.WebGLRenderer): void {
    const azimuthAngle = controls.getAzimuthalAngle();

    // 更新模型旋转
    if (this.mesh) {
      this.mesh.rotation.y = azimuthAngle + Math.PI;

      // 更新相机位置
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.position.x = this.mesh.position.x - 2 * Math.sin(azimuthAngle);
        camera.position.z = this.mesh.position.z - 2 * Math.cos(azimuthAngle);

        // 更新控制器目标
        controls.target.set(
          this.mesh.position.x - 3 * Math.sin(azimuthAngle),
          this.mesh.position.y + 1 * this.modelSize?.height,
          this.mesh.position.z - 3 * Math.cos(azimuthAngle)
        );
      }
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

    // 更新全局引用
    window.playerCapsule = this.playerCapsule;
  }

  // 碰撞检测
  handleCollision(): void {
    if (!window.worldOctrees || !window.worldOctrees.length || !this.playerCapsule || !this.mesh) return;

    // 遍历所有八叉树进行碰撞检测
    for (const octree of window.worldOctrees) {
      // 检查胶囊体是否与八叉树中的物体相交
      const result = octree.capsuleIntersect(this.playerCapsule);

      // 如果发生碰撞，处理碰撞响应
      if (result) {
        // 计算碰撞法线的垂直分量
        const verticalComponent = Math.abs(result.normal.y);

        // 如果法线有较大的垂直分量，说明是斜坡
        if (verticalComponent > 0.1) {
          // 对于斜坡，我们需要沿着斜面移动
          // 计算沿斜面的移动分量
          const slideDirection = new THREE.Vector3()
            .copy(result.normal)
            .multiplyScalar(result.depth);

          // 将垂直分量稍微放大，以便能够"爬"上斜坡
          slideDirection.y *= 1.2;

          // 应用移动
          this.mesh.position.add(slideDirection);

          // 更新胶囊体位置
          this.playerCapsule.start.add(slideDirection);
          this.playerCapsule.end.add(slideDirection);
        } else {
          // 对于普通碰撞，直接推离碰撞点
          const pushVector = new THREE.Vector3()
            .copy(result.normal)
            .multiplyScalar(result.depth);

          this.mesh.position.add(pushVector);

          // 更新胶囊体位置
          this.playerCapsule.start.add(pushVector);
          this.playerCapsule.end.add(pushVector);
        }
      }
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

    // 更新位置
    if (this.isWalking) {
      const speed = 100; // 移动速度
      const azimuthAngle = cameraControls.getAzimuthalAngle();

      if (this.keys.ArrowUp) {
        this.move('forward', speed, delta);
        lookCamera.position.x = this.mesh.position.x - 2 * Math.sin(azimuthAngle);
        lookCamera.position.y = lookCamera.position.y;
        lookCamera.position.z = this.mesh.position.z - 2 * Math.cos(azimuthAngle);
      }
      if (this.keys.ArrowDown) {
        this.move('backward', speed, delta);
        lookCamera.position.x = this.mesh.position.x - 2 * Math.sin(azimuthAngle);
        lookCamera.position.y = lookCamera.position.y;
        lookCamera.position.z = this.mesh.position.z - 2 * Math.cos(azimuthAngle);
      }

      // 保存旋转状态
      if (!this.leftRotate) this.leftRotate = this.mesh.rotation.y;
      if (!this.rightRotate) this.rightRotate = this.mesh.rotation.y;

      if (this.keys.ArrowLeft) {
        this.move('left', speed, delta);
        lookCamera.position.x = this.mesh.position.x - 2 * Math.sin(azimuthAngle);
        lookCamera.position.y = lookCamera.position.y;
        lookCamera.position.z = this.mesh.position.z - 2 * Math.cos(azimuthAngle);
        this.leftRotate = this.mesh.rotation.y;
      }
      if (this.keys.ArrowRight) {
        this.move('right', speed, delta);
        lookCamera.position.x = this.mesh.position.x - 2 * Math.sin(azimuthAngle);
        lookCamera.position.y = lookCamera.position.y;
        lookCamera.position.z = this.mesh.position.z - 2 * Math.cos(azimuthAngle);
        this.rightRotate = this.mesh.rotation.y;
      }

      // 更新相机目标
      cameraControls.target.set(
        this.mesh.position.x - 3 * Math.sin(azimuthAngle),
        this.mesh.position.y + 1 * this.modelSize?.height,
        this.mesh.position.z - 3 * Math.cos(azimuthAngle)
      );
    }
    // 检查是否存在worldBVHMeshes，如果存在则使用BVH碰撞检测
    if (window.worldBVHMeshes && window.worldBVHMeshes.length > 0) {
      this.handleBVHCollision();
    }
    // 否则继续使用原有的八叉树碰撞检测
    else if (window.worldOctrees && window.worldOctrees.length > 0) {
      this.handleCollision();
    }
  }
  // 重置模型位置
  resetPosition(): void {
    if (!this.mesh) return;
    this.mesh.position.set(0, 0, 0);
    this.mesh.rotation.set(0, 0, 0);
  }

  // 切换辅助线可见性
  toggleHelpers(): void {
    if (window.helpersVisible) {
      const { boxHelper, capsuleVisual } = window.helpersVisible;

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

    // 重置旋转状态
    this.leftRotate = undefined;
    this.rightRotate = undefined;
  }

  // 获取模型三维尺寸
  abstract getModelDimensions(): { width: number; height: number; depth: number };

  // 开始行走动画 - 子类需要实现具体逻辑
  abstract startWalking(): void;

  // 停止行走动画 - 子类需要实现具体逻辑
  abstract stopWalking(): void;

  // 使用three-mesh-bvh的碰撞检测
  handleBVHCollision(): void {
    if (!window.worldBVHMeshes || !window.worldBVHMeshes.length || !this.playerCapsule || !this.mesh) return;

    // 从capsule获取胶囊体信息
    const capsuleStart = this.playerCapsule.start.clone();
    const capsuleEnd = this.playerCapsule.end.clone();
    const capsuleRadius = this.playerCapsule.radius;

    // 临时变量用于碰撞检测计算
    const tempVector = new THREE.Vector3();
    const tempVector2 = new THREE.Vector3();
    const tempBox = new THREE.Box3();
    const tempMat = new THREE.Matrix4();
    const normal = new THREE.Vector3();
    
    // 遍历所有使用BVH的网格
    for (const mesh of window.worldBVHMeshes) {
      // 跳过没有BVH的网格
      if (!mesh.geometry.boundsTree) continue;
      
      // 获取网格的世界变换的逆矩阵，将胶囊体转换到网格的局部空间
      tempMat.copy(mesh.matrixWorld).invert();

      // 在局部空间中的胶囊体线段
      const localStart = capsuleStart.clone().applyMatrix4(tempMat);
      const localEnd = capsuleEnd.clone().applyMatrix4(tempMat);
      
      // 创建本地空间的线段
      const localSegment = new THREE.Line3(localStart, localEnd);

      // 创建边界盒，用于快速检测
      tempBox.makeEmpty();
      tempBox.expandByPoint(localStart);
      tempBox.expandByPoint(localEnd);
      // 扩展边界盒，考虑胶囊体半径
      tempBox.min.addScalar(-capsuleRadius);
      tempBox.max.addScalar(capsuleRadius);

      let collisionOccurred = false;
      let isRamp = false; // 是否是斜坡
      
      // 使用BVH进行碰撞检测
      mesh.geometry.boundsTree.shapecast({
        intersectsBounds: box => box.intersectsBox(tempBox),
        
        intersectsTriangle: tri => {
          // 计算三角形到胶囊体线段的最短距离点
          const triPoint = tempVector.clone();
          const capsulePoint = tempVector2.clone();
          
          // 使用三角形到线段的最短距离函数
          const distance = tri.closestPointToSegment(localSegment, triPoint, capsulePoint);
          
          // 如果距离小于胶囊体半径，认为发生碰撞
          if (distance < capsuleRadius) {
            console.log("碰撞");
            
            // 获取三角形法线
            tri.getNormal(normal);
            
            // 计算需要移动的深度和方向
            const depth = capsuleRadius - distance;
            const direction = capsulePoint.sub(triPoint).normalize();
            
            // 判断是否为斜坡：通过检查法线与垂直向上的夹角
            // normal.y是法线的垂直分量，值接近1表示表面接近水平
            // 0.7 ≈ cos(45°)，表示斜率小于45度的表面视为可攀爬的斜坡
            
            if (normal.y > Math.cos(Math.PI / 4)) {
              // 这是可攀爬的斜坡
              isRamp = true;
              
              // 沿斜坡表面滑动（包含一些垂直分量，使人物能够攀爬）
              const slideDirection = new THREE.Vector3().copy(direction);
              // 稍微增强垂直分量
              slideDirection.y *= 1.2;
              
              localSegment.start.addScaledVector(slideDirection, depth);
              localSegment.end.addScaledVector(slideDirection, depth);
            } else {
              // 这是陡峭表面（如柱子），无法攀爬
              // 水平阻挡，但不向上移动
              const blockDirection = new THREE.Vector3().copy(direction);
              
              // 保留水平分量，但不要垂直攀爬
              blockDirection.y = 0;
              // 如果水平分量为零，防止归一化错误
              if (blockDirection.lengthSq() > 0.001) {
                blockDirection.normalize();
                localSegment.start.addScaledVector(blockDirection, depth);
                localSegment.end.addScaledVector(blockDirection, depth);
              } else {
                // 完全垂直碰撞，向后轻微推
                const backDirection = new THREE.Vector3().copy(this.mesh.position).sub(triPoint).normalize();
                backDirection.y = 0;
                if (backDirection.lengthSq() > 0.001) {
                  backDirection.normalize();
                  localSegment.start.addScaledVector(backDirection, depth);
                  localSegment.end.addScaledVector(backDirection, depth);
                }
              }
            }
            
            collisionOccurred = true;
          }
          
          // 继续检查其他三角形
          return false;
        }
      });
      
      // 如果发生碰撞，更新模型位置
      if (collisionOccurred) {
        // 将调整后的胶囊体起点转回世界空间
        const newPosition = new THREE.Vector3().copy(localSegment.start).applyMatrix4(mesh.matrixWorld);
        
        // 计算模型需要移动的向量
        const deltaVector = new THREE.Vector3().subVectors(newPosition, this.mesh.position);
        
        // 如果是非斜坡碰撞，限制垂直移动
        if (!isRamp) {
          deltaVector.y = Math.min(deltaVector.y, 0); // 只允许向下或水平移动，不能向上
        }
        
        // 应用位移
        const offset = Math.max(0.0, deltaVector.length() - 1e-5);
        if (offset > 0) {
          deltaVector.normalize().multiplyScalar(offset);
          this.mesh.position.add(deltaVector);
        }
        
        // 更新胶囊体位置
        this.updateCapsulePosition();
      }
    }
  }
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

    // 保存全局引用
    window.capsuleParams = this.capsuleParams;

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
}

// 添加全局声明
declare global {
  interface Window {
    updateModelHelpers?: () => void;
    playerCapsule?: Capsule;
    capsuleParams?: {
      visual: THREE.Mesh;
      radius: number;
      height: number;
    };
    worldOctrees?: any[];
    worldBVHMeshes?: THREE.Mesh[];
    helpersVisible?: {
      skeletonHelper?: THREE.SkeletonHelper;
      boxHelper?: THREE.BoxHelper;
      capsuleVisual?: THREE.Mesh;
      octreeHelpers?: THREE.Object3D[];
      bvhHelpers?: any[];
    };
    cameraHelpers?: {
      lookCameraHelper?: THREE.CameraHelper;
    };
  }
} 