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

            console.log('✅ 学校建筑模型加载完成');

        } catch (error) {
            console.error('❌ 学校建筑模型加载失败:', error);
        }
    }

    public dispose(): void {
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
