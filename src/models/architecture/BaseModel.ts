import * as THREE from 'three';

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
  protected isCollider: boolean = false; // 标记是否为碰撞体
  protected name: string = ''

  // 变换属性
  private _position: THREE.Vector3;
  private _rotation: THREE.Euler;
  private _scale: THREE.Vector3;

  // 构造函数重载声明
  constructor(scene: THREE.Scene , initialTransform: InitialTransform);
  constructor(scene: THREE.Scene , initialTransform: InitialTransform, name:string);

  // 构造函数实现
  constructor(
    scene: THREE.Scene,
    initialTransform?: InitialTransform,
    name: string = 'staticModel',
  ) {
    this.scene = scene;
    this.modelGroup = new THREE.Group();
    this.name = name

    // 初始化变换属性
    this._position = this.parseVector3(initialTransform?.position, new THREE.Vector3(0, 0, 0));
    this._rotation = this.parseEuler(initialTransform?.rotation, new THREE.Euler(0, 0, 0));
    this._scale = this.parseScale(initialTransform?.scale, new THREE.Vector3(1, 1, 1));

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

  // 注意：BVH碰撞体现在由 BVHPhysics.createSceneCollider 统一管理
  // 不再需要单独的碰撞体创建方法

  /**
   * 更新模型组的变换矩阵
   */
  private updateTransform(): void {
    this.modelGroup.position.copy(this._position);
    this.modelGroup.rotation.copy(this._rotation);
    this.modelGroup.scale.copy(this._scale);

    // BVH碰撞体会自动更新，无需手动同步
  }

  /**
   * 获取模型组引用
   */
  getModelGroup(): THREE.Group {
    return this.modelGroup;
  }

    /**
   * 获取模型组引用
   */
  setModelGroup(group:THREE.Group) {
    this.modelGroup = group
  }

  /**
   * 添加到场景
   */
  addToScene(): void {
    if (!this.scene.children.includes(this.modelGroup)) {
      this.modelGroup.name = this.name
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

    // BVH碰撞体会在BVHPhysics系统中自动清理
    // 这里只需要标记为非碰撞体
    this.isCollider = false;

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
   * 获取模型的边界包围盒大小
   * @param model 要计算边界包围盒的模型对象
   * @returns 包围盒的尺寸 { width, height, depth }
   */
  static getBoundingBoxSize(model: THREE.Object3D): { width: number; height: number; depth: number } {
    // 创建边界包围盒
    const box = new THREE.Box3().setFromObject(model);

    // 计算尺寸
    const size = box.getSize(new THREE.Vector3());

    console.log(`📦 模型 "${model.name}" 的边界包围盒:`);
    console.log(`   📏 尺寸: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
    console.log(`   📍 中心: ${box.getCenter(new THREE.Vector3()).toArray().map(v => v.toFixed(2)).join(', ')}`);

    return {
      width: size.x,
      height: size.y,
      depth: size.z
    };
  }

  /**
   * 获取当前模型的边界包围盒大小
   * @returns 包围盒的尺寸 { width, height, depth }
   */
  getBoundingBoxSize(): { width: number; height: number; depth: number } {
    return BaseModel.getBoundingBoxSize(this.modelGroup);
  }

  /**
   * 获取指定对象的边界包围盒大小（实例方法）
   * @param model 要计算边界包围盒的模型对象
   * @returns 包围盒的尺寸 { width, height, depth }
   */
  getObjectBoundingBoxSize(model: THREE.Object3D): { width: number; height: number; depth: number } {
    return BaseModel.getBoundingBoxSize(model);
  }

  /**
   * 抽象方法 - 子类必须实现模型创建逻辑
   */
  abstract create(): Promise<void>;
}
