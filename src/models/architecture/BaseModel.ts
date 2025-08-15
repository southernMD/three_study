import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * 初始变换参数接口
 */
export interface InitialTransform {
  position?: { x: number; y: number; z: number } | THREE.Vector3;
  rotation?: { x: number; y: number; z: number } | THREE.Vector3;
  scale?: { x: number; y: number; z: number } | number | THREE.Vector3; // 可以是向量或统一缩放
}

/**
 * 3D模型基类 - 提供位置、旋转、缩放等基础变换功能
 */
export abstract class BaseModel {
  protected scene: THREE.Scene;
  protected modelGroup: THREE.Group;
  protected physicsWorld?: CANNON.World;
  protected physicsBody?: CANNON.Body;

  // 变换属性
  private _position: THREE.Vector3;
  private _rotation: THREE.Euler;
  private _scale: THREE.Vector3;

  // 构造函数重载声明
  constructor(scene: THREE.Scene, physicsWorld?: CANNON.World);
  constructor(scene: THREE.Scene, physicsWorld: CANNON.World | undefined, initialTransform: InitialTransform);
  constructor(scene: THREE.Scene, initialTransform: InitialTransform);

  // 构造函数实现
  constructor(
    scene: THREE.Scene,
    physicsWorldOrTransform?: CANNON.World | InitialTransform,
    initialTransform?: InitialTransform
  ) {
    this.scene = scene;
    this.modelGroup = new THREE.Group();

    // 解析参数
    let physicsWorld: CANNON.World | undefined;
    let transform: InitialTransform | undefined;

    if (physicsWorldOrTransform) {
      // 检查第二个参数是物理世界还是变换参数
      if ('position' in physicsWorldOrTransform || 'rotation' in physicsWorldOrTransform || 'scale' in physicsWorldOrTransform) {
        // 第二个参数是变换参数
        transform = physicsWorldOrTransform as InitialTransform;
        physicsWorld = undefined;
      } else {
        // 第二个参数是物理世界
        physicsWorld = physicsWorldOrTransform as CANNON.World;
        transform = initialTransform;
      }
    }

    this.physicsWorld = physicsWorld;

    // 初始化变换属性
    this._position = this.parseVector3(transform?.position, new THREE.Vector3(0, 0, 0));
    this._rotation = this.parseEuler(transform?.rotation, new THREE.Euler(0, 0, 0));
    this._scale = this.parseScale(transform?.scale, new THREE.Vector3(1, 1, 1));

    // 应用初始变换
    this.updateTransform();
  }

  /**
   * 设置模型位置
   */
  setPosition(x: number, y: number, z: number): void {
    this._position.set(x, y, z);
    this.updateTransform();
  }

  /**
   * 获取模型位置
   */
  getPosition(): THREE.Vector3 {
    return this._position.clone();
  }

  /**
   * 设置模型旋转（弧度）
   */
  setRotation(x: number, y: number, z: number): void {
    this._rotation.set(x, y, z);
    this.updateTransform();
  }

  /**
   * 设置模型旋转（角度）
   */
  setRotationDegrees(x: number, y: number, z: number): void {
    this._rotation.set(
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z)
    );
    this.updateTransform();
  }

  /**
   * 获取模型旋转（弧度）
   */
  getRotation(): THREE.Euler {
    return this._rotation.clone();
  }

  /**
   * 获取模型旋转（角度）
   */
  getRotationDegrees(): { x: number; y: number; z: number } {
    return {
      x: THREE.MathUtils.radToDeg(this._rotation.x),
      y: THREE.MathUtils.radToDeg(this._rotation.y),
      z: THREE.MathUtils.radToDeg(this._rotation.z)
    };
  }

  /**
   * 设置模型缩放
   */
  setScale(x: number, y: number, z: number): void {
    this._scale.set(x, y, z);
    this.updateTransform();
  }

  /**
   * 设置统一缩放
   */
  setUniformScale(scale: number): void {
    this._scale.set(scale, scale, scale);
    this.updateTransform();
  }

  /**
   * 获取模型缩放
   */
  getScale(): THREE.Vector3 {
    return this._scale.clone();
  }

  /**
   * 绕X轴旋转
   */
  rotateX(angle: number): void {
    this._rotation.x += angle;
    this.updateTransform();
  }

  /**
   * 绕Y轴旋转
   */
  rotateY(angle: number): void {
    this._rotation.y += angle;
    this.updateTransform();
  }

  /**
   * 绕Z轴旋转
   */
  rotateZ(angle: number): void {
    this._rotation.z += angle;
    this.updateTransform();
  }

  /**
   * 绕任意轴旋转
   */
  rotateOnAxis(axis: THREE.Vector3, angle: number): void {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(axis.normalize(), angle);
    
    const currentQuaternion = new THREE.Quaternion();
    currentQuaternion.setFromEuler(this._rotation);
    
    currentQuaternion.multiply(quaternion);
    this._rotation.setFromQuaternion(currentQuaternion);
    
    this.updateTransform();
  }

  /**
   * 平移模型
   */
  translate(x: number, y: number, z: number): void {
    this._position.add(new THREE.Vector3(x, y, z));
    this.updateTransform();
  }

  /**
   * 沿指定方向平移
   */
  translateOnAxis(axis: THREE.Vector3, distance: number): void {
    const translation = axis.clone().normalize().multiplyScalar(distance);
    this._position.add(translation);
    this.updateTransform();
  }

  /**
   * 重置变换到初始状态
   */
  resetTransform(): void {
    this._position.set(0, 0, 0);
    this._rotation.set(0, 0, 0);
    this._scale.set(1, 1, 1);
    this.updateTransform();
  }

  /**
   * 解析位置参数
   */
  private parseVector3(
    value: { x: number; y: number; z: number } | THREE.Vector3 | undefined,
    defaultValue: THREE.Vector3
  ): THREE.Vector3 {
    if (!value) return defaultValue;
    if (value instanceof THREE.Vector3) return value.clone();
    return new THREE.Vector3(value.x, value.y, value.z);
  }

  /**
   * 解析旋转参数（角度转弧度）
   */
  private parseEuler(
    value: { x: number; y: number; z: number } | THREE.Vector3 | undefined,
    defaultValue: THREE.Euler
  ): THREE.Euler {
    if (!value) return defaultValue;
    if (value instanceof THREE.Vector3) {
      return new THREE.Euler(
        THREE.MathUtils.degToRad(value.x),
        THREE.MathUtils.degToRad(value.y),
        THREE.MathUtils.degToRad(value.z)
      );
    }
    return new THREE.Euler(
      THREE.MathUtils.degToRad(value.x),
      THREE.MathUtils.degToRad(value.y),
      THREE.MathUtils.degToRad(value.z)
    );
  }

  /**
   * 解析缩放参数
   */
  private parseScale(
    value: { x: number; y: number; z: number } | number | THREE.Vector3 | undefined,
    defaultValue: THREE.Vector3
  ): THREE.Vector3 {
    if (!value) return defaultValue;
    if (typeof value === 'number') {
      return new THREE.Vector3(value, value, value);
    }
    if (value instanceof THREE.Vector3) return value.clone();
    return new THREE.Vector3(value.x, value.y, value.z);
  }

  /**
   * 创建物理体（子类可重写）
   */
  protected createPhysicsBody(shape: CANNON.Shape, mass: number = 0): CANNON.Body {
    if (!this.physicsWorld) {
      throw new Error('物理世界未初始化');
    }

    this.physicsBody = new CANNON.Body({
      mass,
      material: new CANNON.Material({
        friction: 0.5,
        restitution: 0.3
      })
    });

    this.physicsBody.addShape(shape);
    this.updatePhysicsBodyTransform();
    this.physicsWorld.addBody(this.physicsBody);

    return this.physicsBody;
  }

  /**
   * 更新物理体的变换
   */
  protected updatePhysicsBodyTransform(): void {
    if (this.physicsBody) {
      this.physicsBody.position.set(this._position.x, this._position.y, this._position.z);
      this.physicsBody.quaternion.setFromEuler(this._rotation.x, this._rotation.y, this._rotation.z);
    }
  }

  /**
   * 更新模型组的变换矩阵
   */
  private updateTransform(): void {
    this.modelGroup.position.copy(this._position);
    this.modelGroup.rotation.copy(this._rotation);
    this.modelGroup.scale.copy(this._scale);

    // 同时更新物理体变换
    this.updatePhysicsBodyTransform();
  }

  /**
   * 获取模型组引用
   */
  getModelGroup(): THREE.Group {
    return this.modelGroup;
  }

  /**
   * 添加到场景
   */
  addToScene(): void {
    if (!this.scene.children.includes(this.modelGroup)) {
      this.scene.add(this.modelGroup);
    }
  }

  /**
   * 从场景移除
   */
  removeFromScene(): void {
    this.scene.remove(this.modelGroup);
  }

  /**
   * 销毁模型
   */
  dispose(): void {
    this.removeFromScene();

    // 清理物理体
    if (this.physicsBody && this.physicsWorld) {
      this.physicsWorld.removeBody(this.physicsBody);
      this.physicsBody = undefined;
    }

    // 递归清理所有子对象
    this.modelGroup.traverse((child) => {
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

    this.modelGroup.clear();
  }

  /**
   * 抽象方法 - 子类必须实现模型创建逻辑
   */
  abstract create(): Promise<void>;
}
