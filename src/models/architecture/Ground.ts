import * as THREE from 'three';
import { BaseModel } from './BaseModel';
import { PHYSICS_CONSTANTS } from '../../constants/PhysicsConstants';

/**
 * 地面模型类
 */
export class Ground extends BaseModel {
  private groundMesh?: THREE.Mesh;
  private sizeX: number;
  private sizeZ: number;

  constructor(
    scene: THREE.Scene,
    name: string = 'ground',
    options: {
      sizeX?: number;
      sizeZ?: number;
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: number;
    } = {}
  ) {
    // 🔥 确保传递正确的 initialTransform 参数给父类
    const initialTransform = {
      position: options.position || { x: 0, y: 0, z: 0 },
      rotation: options.rotation || { x: 0, y: 0, z: 0 },
      scale: options.scale || 1
    };

    super(scene, initialTransform, name);

    this.sizeX = options.sizeX || PHYSICS_CONSTANTS.GROUND_SIZE_X;
    this.sizeZ = options.sizeZ || PHYSICS_CONSTANTS.GROUND_SIZE_Z;
  }

  /**
   * 创建地面
   */
  async create(): Promise<void> {
    console.log(`🌍 创建地面: ${this.name}, 尺寸: ${this.sizeX * 2} x ${this.sizeZ * 2}`);

    // 创建地面几何体
    const groundGeometry = new THREE.PlaneGeometry(
      this.sizeX * 2, // 完整宽度
      this.sizeZ * 2  // 完整深度
    );

    // 创建地面材质
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x336633,
      transparent: true,
      opacity: 0.8
    });

    // 创建地面网格
    this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundMesh.name = `${this.name}_mesh`;
    
    // 旋转地面使其水平
    this.groundMesh.rotation.x = -Math.PI / 2;
    
    // 设置地面位置
    this.groundMesh.position.copy(this.getPosition());

    // 添加到模型组
    this.modelGroup.add(this.groundMesh);

    // 添加到场景
    this.scene.add(this.modelGroup);

    console.log(`✅ 地面创建完成: ${this.name}`);
  }

  /**
   * 更新地面尺寸
   */
  updateSize(sizeX: number, sizeZ: number): void {
    console.log(`🔄 更新地面尺寸: ${sizeX * 2} x ${sizeZ * 2}`);
    
    this.sizeX = sizeX;
    this.sizeZ = sizeZ;

    if (this.groundMesh) {
      // 更新几何体
      this.groundMesh.geometry.dispose();
      this.groundMesh.geometry = new THREE.PlaneGeometry(
        this.sizeX * 2,
        this.sizeZ * 2
      );
    }

    console.log(`✅ 地面尺寸更新完成`);
  }

  /**
   * 获取地面网格
   */
  getGroundMesh(): THREE.Mesh | undefined {
    return this.groundMesh;
  }

  /**
   * 获取地面尺寸
   */
  getSize(): { x: number; z: number } {
    return { x: this.sizeX, z: this.sizeZ };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    console.log(`🗑️ 清理地面: ${this.name}`);

    if (this.groundMesh) {
      // 清理几何体和材质
      if (this.groundMesh.geometry) {
        this.groundMesh.geometry.dispose();
      }
      if (this.groundMesh.material) {
        if (Array.isArray(this.groundMesh.material)) {
          this.groundMesh.material.forEach(mat => mat.dispose());
        } else {
          this.groundMesh.material.dispose();
        }
      }
    }

    // 调用父类清理
    super.dispose();
  }
}
