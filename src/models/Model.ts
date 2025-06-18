import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 基础模型类 - 包含通用功能如键盘事件、胶囊体碰撞、移动等
export abstract class Model {
  abstract mesh: THREE.Object3D;
  protected mixer: THREE.AnimationMixer;
  protected modelSize:{
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
  
  constructor() {
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };
    this.modelSize = {
      width:0,
      height:0,
      depth:0
    }
    this.mixer = new THREE.AnimationMixer(new THREE.Object3D());
  }
  
  // 创建胶囊体 - 子类需要实现具体逻辑
  abstract createCapsule(boundingBox: THREE.Box3): { playerCapsule: Capsule, capsuleVisual: THREE.Mesh };
  
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
        this.mesh.position.y + 0.75 * this.modelSize?.height, 
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
        this.mesh.position.y + 0.75 * this.modelSize?.height, 
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
          this.mesh.position.y + 0.75 * this.modelSize?.height,
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
  
  // 更新胶囊体位置
  updateCapsulePosition(): void {
    if (!this.playerCapsule || !this.capsuleParams || !this.mesh) return;
    
    // 获取模型当前位置
    const modelPosition = this.mesh.position.clone();
    const { radius, height, visual } = this.capsuleParams;
    
    // 更新物理胶囊体的位置，保持与初始设置一致的比例
    this.playerCapsule.start.set(
      modelPosition.x,
      modelPosition.y + radius * 0.8,
      modelPosition.z
    );
    
    this.playerCapsule.end.set(
      modelPosition.x,
      modelPosition.y + height * 0.9 + radius,
      modelPosition.z
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
    switch(direction) {
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
        if(!this.leftRotate) this.leftRotate = this.mesh.rotation.y;
        if(!this.rightRotate) this.rightRotate = this.mesh.rotation.y;
        
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
          this.mesh.position.y + 0.75 * this.modelSize?.height, 
          this.mesh.position.z - 3 * Math.cos(azimuthAngle)
        );
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
  
  // 更新模型 - 子类需要实现具体逻辑
  abstract update(delta: number, cameraControls: OrbitControls, lookCamera: THREE.PerspectiveCamera): void;
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
    helpersVisible?: {
      skeletonHelper?: THREE.SkeletonHelper;
      boxHelper?: THREE.BoxHelper;
      capsuleVisual?: THREE.Mesh;
      octreeHelpers?: THREE.Object3D[];
    };
    cameraHelpers?: {
      lookCameraHelper?: THREE.CameraHelper;
    };
  }
} 