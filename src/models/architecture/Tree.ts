import * as THREE from "three";
import { BaseModel, InitialTransform } from "./BaseModel";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Tree extends BaseModel {
    public treeObject: THREE.Object3D | null = null;
    private static treeModel: GLTF | null = null;

    constructor(scene: THREE.Scene, initialTransform?: InitialTransform, name: string = 'tree') {
        super(scene, initialTransform as InitialTransform, name);
    }

    /**
     * 实现 BaseModel 的抽象方法
     */
    async create(): Promise<void> {
        await this.load();
    }

    async load(): Promise<void> {
        const loader = new GLTFLoader();
        const loadModel = (): Promise<GLTF> => {
            return new Promise((resolve, reject) => {
                loader.load(
                    '/model/tree/tree.glb',
                    (gltf) => {
                        console.log('树模型文件加载成功');
                        resolve(gltf);
                    },
                    (progress) => {
                        console.log('📊 树建筑模型加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
                    },
                    (err) => {
                        console.error('❌ 树建筑模型文件加载失败，使用简单盒模型替代:', err);
                        // 如果模型加载失败，创建简单的盒模型作为树
                        this.createSimpleTreeModel();
                        resolve({} as GLTF);
                    }
                );
            });
        };

        try {
            if(!Tree.treeModel){
                Tree.treeModel = await loadModel();
            }
            console.log('开始提取树模型...');
            this.treeObject = Tree.treeModel.scene.clone();
            this.treeObject.name = `tree-${this.name}`;
            this.treeObject.scale.setScalar(0.5);
            this.modelGroup.add(this.treeObject);
            // 添加到模型组
            console.log('✅ 树模型加载完成');
        } catch (error) {
            console.error('❌ 树建筑模型加载失败，使用简单模型:', error);
            this.createSimpleTreeModel();
        }
    }

    /**
     * 创建简单的树模型（盒模型）
     */
    private createSimpleTreeModel(): void {
        console.log('🌳 创建简单树模型...');

        // 创建树干
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.8, 8, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // 棕色
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        trunk.receiveShadow = true;

        // 创建树冠
        const crownGeometry = new THREE.SphereGeometry(4, 8, 6);
        const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // 绿色
        const crown = new THREE.Mesh(crownGeometry, crownMaterial);
        crown.position.y = 10;
        crown.castShadow = true;
        crown.receiveShadow = true;

        // 创建树的组合对象
        this.treeObject = new THREE.Group();
        this.treeObject.add(trunk);
        this.treeObject.add(crown);
        this.treeObject.name = `tree-${this.name}`;

        // 添加到模型组
        this.modelGroup.add(this.treeObject);

        // 添加模型组到场景
        this.scene.add(this.modelGroup);

        console.log('✅ 简单树模型创建完成');
    }

    /**
     * 设置物理碰撞（简单盒模型）
     */
    private setupPhysics(): void {
        if (!this.treeObject) return;

        // 创建简单的盒模型碰撞体
        const boxGeometry = new THREE.BoxGeometry(8, 12, 8); // 宽8，高12，深8
        const boxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });

        const collisionBox = new THREE.Mesh(boxGeometry, boxMaterial);
        collisionBox.position.copy(this.treeObject.position);
        collisionBox.position.y += 6; // 调整到树的中心高度
        collisionBox.name = `tree-collision-${this.name}`;
        collisionBox.visible = false; // 默认隐藏碰撞盒

        // 添加到场景（用于调试）
        this.scene.add(collisionBox);

        // 存储碰撞盒引用
        this.treeObject.userData.collisionBox = collisionBox;

        console.log(`✅ 树 ${this.name} 的物理碰撞盒设置完成`);
    }

    /**
     * 获取碰撞盒（用于BVH物理系统）
     */
    public getCollisionMesh(): THREE.Mesh | null {
        if (this.treeObject && this.treeObject.userData.collisionBox) {
            return this.treeObject.userData.collisionBox as THREE.Mesh;
        }
        return null;
    }

    /**
     * 切换碰撞盒可见性
     */
    public toggleCollisionBoxVisibility(visible: boolean): void {
        const collisionBox = this.getCollisionMesh();
        if (collisionBox) {
            collisionBox.visible = visible;
        }
    }

    /**
     * 销毁树对象
     */
    public dispose(): void {
        if (this.treeObject) {
            // 移除碰撞盒
            const collisionBox = this.getCollisionMesh();
            if (collisionBox) {
                this.scene.remove(collisionBox);
                if (collisionBox.geometry) collisionBox.geometry.dispose();
                if (collisionBox.material instanceof THREE.Material) {
                    collisionBox.material.dispose();
                }
            }

            // 移除树对象
            this.scene.remove(this.treeObject);

            // 清理几何体和材质
            this.treeObject.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });

            this.treeObject = null;
        }
        super.dispose();
    }

}
