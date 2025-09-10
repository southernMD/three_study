import * as THREE from 'three';
import { BaseModel, InitialTransform } from "./BaseModel";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';

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

export class SchoolBuilding extends BaseModel {
    public buildingObject: THREE.Object3D | null = null;
    public buildingScale: number = 25;

    // BVH 碰撞检测相关
    private collider: THREE.Mesh | null = null;
    private visualizer: MeshBVHHelper | null = null;

    private visualParams = {
        displayCollider: false,  // 默认不显示碰撞体线框
        displayBVH: false,       // 默认不显示BVH辅助线
        visualizeDepth: 10
    };

    constructor(
        scene: THREE.Scene,
        initialTransform?: InitialTransform
    ) {
        super(scene, initialTransform as InitialTransform);
    }

    /**
     * 实现 BaseModel 的抽象方法
     */
    async create(): Promise<void> {
        await this.load();
    }

    async load(): Promise<void> {
        console.log('📁 开始加载学校建筑模型文件...');

        const loader = new GLTFLoader();
        const loadModel = (): Promise<GLTF> => {
            return new Promise((resolve, reject) => {
                loader.load(
                    '/model/building/schoolBuild1.glb',
                    (gltf) => {
            console.log('✅ 学校建筑模型文件加载成功');
                        resolve(gltf);
                    },
                    (progress) => {
                        console.log('📊 学校建筑模型加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
                    },
                    (err) => {
                        console.error('❌ 学校建筑模型文件加载失败:', err);
                        reject(err);
                    }
                );
            });
        };

        try {
            const gltf = await loadModel();
            console.log('🔍 开始提取学校建筑模型...');

            this.buildingObject = gltf.scene.clone();
            this.buildingObject.name = 'SchoolBuilding';
            this.buildingObject.scale.setScalar(this.buildingScale);
            this.modelGroup.add(this.buildingObject);
            this.addToScene();

            // 创建BVH碰撞检测
            setTimeout(() => {
                this.createBVHCollision();
            }, 1000);

            console.log('✅ 学校建筑模型加载完成');

        } catch (error) {
            console.error('❌ 学校建筑模型加载失败:', error);
        }
    }

    /**
     * 创建BVH碰撞检测（参考characterMovement.js）
     */
    private createBVHCollision(): void {
        if (!this.buildingObject) {
            console.log('⚠️ 建筑对象未初始化，跳过BVH创建');
            return;
        }

        console.log('🔧 开始创建学校建筑BVH碰撞检测...');

        try {
            // 1. 确保建筑对象的变换已更新
            this.buildingObject.updateMatrixWorld(true);
            console.log('🔄 建筑对象变换已更新');

            // 记录建筑物的变换信息
            const buildingPos = this.buildingObject.position;
            const buildingScale = this.buildingObject.scale;
            console.log(`📍 建筑物位置: (${buildingPos.x.toFixed(1)}, ${buildingPos.y.toFixed(1)}, ${buildingPos.z.toFixed(1)})`);
            console.log(`📏 建筑物缩放: (${buildingScale.x.toFixed(2)}, ${buildingScale.y.toFixed(2)}, ${buildingScale.z.toFixed(2)})`);

            // 2. 使用StaticGeometryGenerator生成合并几何体（参考characterMovement.js）
            const staticGenerator = new StaticGeometryGenerator(this.buildingObject);
            staticGenerator.attributes = ['position'];

            const mergedGeometry = staticGenerator.generate();
            console.log(`📊 合并几何体顶点数: ${mergedGeometry.attributes.position.count}`);

            // 检查几何体的边界框
            mergedGeometry.computeBoundingBox();
            if (mergedGeometry.boundingBox) {
                const bbox = mergedGeometry.boundingBox;
                console.log(`📦 几何体边界框:`);
                console.log(`   min: (${bbox.min.x.toFixed(1)}, ${bbox.min.y.toFixed(1)}, ${bbox.min.z.toFixed(1)})`);
                console.log(`   max: (${bbox.max.x.toFixed(1)}, ${bbox.max.y.toFixed(1)}, ${bbox.max.z.toFixed(1)})`);

                // 🔥 关键问题：如果Y最小值不是0，说明建筑物悬浮在空中！
                if (bbox.min.y > 0.1) {
                    console.log(`⚠️ 警告：建筑物悬浮在空中！Y最小值: ${bbox.min.y.toFixed(1)}`);
                    console.log(`🔧 需要将几何体向下移动 ${bbox.min.y.toFixed(1)} 单位`);
                }
            }

            // 3. 修复几何体位置：将建筑物底部对齐到地面
            if (mergedGeometry.boundingBox && mergedGeometry.boundingBox.min.y > 0.1) {
                const offsetY = -mergedGeometry.boundingBox.min.y;
                console.log(`🔧 修复建筑物位置：向下移动 ${Math.abs(offsetY).toFixed(1)} 单位`);

                // 将几何体向下移动，使底部对齐到Y=0
                mergedGeometry.translate(0, offsetY, 0);

                // 重新计算边界框
                mergedGeometry.computeBoundingBox();
                if (mergedGeometry.boundingBox) {
                    const newBbox = mergedGeometry.boundingBox;
                    console.log(`📦 修复后的几何体边界框:`);
                    console.log(`   min: (${newBbox.min.x.toFixed(1)}, ${newBbox.min.y.toFixed(1)}, ${newBbox.min.z.toFixed(1)})`);
                    console.log(`   max: (${newBbox.max.x.toFixed(1)}, ${newBbox.max.y.toFixed(1)}, ${newBbox.max.z.toFixed(1)})`);
                }
            }

            // 4. 创建BVH
            mergedGeometry.boundsTree = new MeshBVH(mergedGeometry);
            console.log('✅ BVH创建成功');

            // 5. 创建碰撞体网格（参考characterMovement.js）
            this.collider = new THREE.Mesh(mergedGeometry);
            this.collider.material = new THREE.MeshBasicMaterial({
                wireframe: true,
                opacity: 0.5,
                transparent: true,
                color: 0xff0000 // 红色线框
            });
            this.collider.name = 'SchoolBuildingCollider';

            // 关键修复：碰撞体应该在原点，因为StaticGeometryGenerator已经包含了世界变换
            this.collider.position.set(0, 0, 0);
            this.collider.rotation.set(0, 0, 0);
            this.collider.scale.set(1, 1, 1);
            this.collider.updateMatrixWorld(true);

            // 调试：记录碰撞体的最终位置和边界框
            console.log(`🔴 碰撞体位置: (${this.collider.position.x.toFixed(1)}, ${this.collider.position.y.toFixed(1)}, ${this.collider.position.z.toFixed(1)})`);

            // 检查碰撞体的世界边界框
            const colliderBox = new THREE.Box3().setFromObject(this.collider);
            console.log(`📦 碰撞体世界边界框:`);
            console.log(`   min: (${colliderBox.min.x.toFixed(1)}, ${colliderBox.min.y.toFixed(1)}, ${colliderBox.min.z.toFixed(1)})`);
            console.log(`   max: (${colliderBox.max.x.toFixed(1)}, ${colliderBox.max.y.toFixed(1)}, ${colliderBox.max.z.toFixed(1)})`);

            // 6. 创建BVH可视化辅助线
            this.visualizer = new MeshBVHHelper(this.collider, this.visualParams.visualizeDepth);
            this.visualizer.name = 'SchoolBuildingBVHHelper';

            // 7. 添加到场景（默认不显示）
            if (this.visualParams.displayCollider) {
                this.scene.add(this.collider);
                console.log('✅ 碰撞体已添加到场景');
            }

            if (this.visualParams.displayBVH) {
                this.scene.add(this.visualizer);
                console.log('✅ BVH可视化器已添加到场景');
            }

            console.log('✅ 学校建筑BVH碰撞检测创建完成');

        } catch (error) {
            console.error('❌ 学校建筑BVH创建失败:', error);
            console.error('错误详情:', (error as Error).message);
        }
    }

    /**
     * 获取BVH碰撞体（供Model.ts使用）
     */
    public getCollider(): THREE.Mesh | null {
        return this.collider;
    }

    /**
     * 设置可视化参数
     */
    public setVisualizationParams(params: {
        displayCollider?: boolean;
        displayBVH?: boolean;
        visualizeDepth?: number;
    }): void {
        if (params.displayCollider !== undefined) {
            this.visualParams.displayCollider = params.displayCollider;
            if (this.collider) {
                if (params.displayCollider) {
                    this.scene.add(this.collider);
                } else {
                    this.scene.remove(this.collider);
                }
            }
        }

        if (params.displayBVH !== undefined) {
            this.visualParams.displayBVH = params.displayBVH;
            if (this.visualizer) {
                if (params.displayBVH) {
                    this.scene.add(this.visualizer);
                } else {
                    this.scene.remove(this.visualizer);
                }
            }
        }

        if (params.visualizeDepth !== undefined) {
            this.visualParams.visualizeDepth = params.visualizeDepth;
            if (this.visualizer) {
                this.visualizer.depth = params.visualizeDepth;
                this.visualizer.update();
            }
        }
    }

    public dispose(): void {
        // 清理BVH相关资源
        if (this.collider) {
            this.scene.remove(this.collider);
            if (this.collider.geometry) {
                this.collider.geometry.dispose();
            }
            if (this.collider.material) {
                (this.collider.material as THREE.Material).dispose();
            }
            this.collider = null;
        }

        if (this.visualizer) {
            this.scene.remove(this.visualizer);
            this.visualizer = null;
        }

        // 清理建筑对象
        if (this.buildingObject) {
            this.buildingObject.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            this.modelGroup.remove(this.buildingObject);
            this.buildingObject = null;
        }

        super.dispose();
    }
}
