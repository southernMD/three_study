import { BVHPhysics } from '@/physics/BVHPhysics';
import { filterColliders } from '@/utils/3d-chat/filterColliders';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Egg {
    mesh: THREE.Object3D | null = null;
    bvhPhysics: BVHPhysics;
    scene: THREE.Scene;
    private isCollided: boolean = false;
    private collisionRadius: number = 2; // 鸡蛋的碰撞半径
    private breakSound: HTMLAudioElement | null = null;

    // 静态鸡蛋模型资源
    private static eggModel: THREE.Object3D | null = null;
    private static brokenEggModel: THREE.Object3D | null = null;
    private static isEggModelsLoaded = false;
    private static gltfLoader = new GLTFLoader();

    private mapEggPositionDistance: Map<string, THREE.Mesh> = new Map();
    
    constructor(scene: THREE.Scene, bvhPhysics: BVHPhysics) {
        this.scene = scene;
        this.bvhPhysics = bvhPhysics;
        this.initializeSound();
        this.createEggFromTemplate();
    }

    /**
     * 初始化音效
     */
    private initializeSound(): void {
        try {
            // 尝试加载破碎音效（如果存在的话）
            this.breakSound = new Audio('/model/eggShoot.wav');
            this.breakSound.volume = 0.3;
            this.breakSound.preload = 'auto';
        } catch (error) {
            console.log('🔇 鸡蛋破碎音效文件不存在，将静默运行');
            this.breakSound = null;
        }
    }

    /**
     * 播放破碎音效
     */
    private playBreakSound(): void {
        if (this.breakSound) {
            try {
                this.breakSound.currentTime = 0;
                this.breakSound.play().catch(e => {
                    console.log('🔇 音效播放失败（可能需要用户交互）:', e.message);
                });
            } catch (error) {
                console.log('🔇 音效播放出错:', error);
            }
        }
    }

    /**
     * 从静态模板创建鸡蛋实例
     */
    private createEggFromTemplate(): void {
        // 从静态模板获取鸡蛋模型实例
        this.mesh = Egg.getEggInstance();

        if (!this.mesh) {
            console.warn('❌ 无法获取鸡蛋模型，创建备用模型');
            this.createFallbackEgg();
            return;
        }

        // 初始化物理属性
        this.mesh.userData.velocity = new THREE.Vector3(0, 0, 0);
        this.mesh.userData.collider = new THREE.Sphere(this.mesh.position, this.collisionRadius);
        this.mesh.userData.mass = 0.5; // 鸡蛋质量

        // 添加到场景
        this.scene.add(this.mesh);

        console.log('🥚 鸡蛋实例创建成功', {
            position: this.mesh.position,
            scale: this.mesh.scale,
            children: this.mesh.children.length
        });
    }

    /**
     * 创建备用的鸡蛋（简单球体）
     */
    private createFallbackEgg(): void {
        const geometry = new THREE.SphereGeometry(2, 16, 12);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xfff8dc, // 蛋壳色
            roughness: 0.8,
            metalness: 0.1
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // 初始化物理属性
        this.mesh.userData.velocity = new THREE.Vector3(0, 0, 0);
        this.mesh.userData.collider = new THREE.Sphere(this.mesh.position, this.collisionRadius);
        this.mesh.userData.mass = 0.5;
        
        this.scene.add(this.mesh);
        console.log('🥚 使用备用鸡蛋模型');
    }

    /**
     * 发射鸡蛋
     */
    public shoot(camera: THREE.Camera, mouseX: number, mouseY: number): void {
        if (!this.mesh) {
            console.warn('❌ 鸡蛋模型未加载完成');
            return;
        }

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(mouseX, mouseY);
        raycaster.setFromCamera(mouse, camera);

        // 设置发射位置
        this.mesh.position.copy(camera.position).addScaledVector(raycaster.ray.direction, 3);

        // 设置发射速度
        const velocity = new THREE.Vector3()
            .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
            .addScaledVector(raycaster.ray.direction, 10 * Math.random() + 15)
            .multiplyScalar(15); // 稍微降低速度，让鸡蛋更真实

        this.mesh.userData.velocity = velocity;

        console.log('🥚🚀 鸡蛋发射!', {
            position: this.mesh.position.clone(),
            velocity: velocity.clone(),
            direction: raycaster.ray.direction.clone()
        });
    }

    /**
     * 更新鸡蛋物理状态
     */
    public updateProjectileEgg(delta: number, camera?: THREE.Camera): boolean {
        if (!this.mesh || !this.bvhPhysics || this.isCollided) return false;

        const velocity = this.mesh.userData.velocity as THREE.Vector3;
        const eggCollider = this.mesh.userData.collider as THREE.Sphere;

        if (!velocity || !eggCollider) return false;

        // 应用重力
        const gravity = this.bvhPhysics.params.gravity;
        velocity.y += gravity * delta;

        // 更新位置
        eggCollider.center.addScaledVector(velocity, delta);
        this.mesh.position.copy(eggCollider.center);

        // 添加旋转效果
        this.mesh.rotation.x += velocity.length() * delta * 0.01;
        this.mesh.rotation.z += velocity.length() * delta * 0.005;

        // 检查是否掉出世界
        if (this.mesh.position.y < -80) {
            return false;
        }

        // 性能优化：只对在相机视野内的鸡蛋进行碰撞检测
        if (camera && !this.isInCameraView(camera)) {
            return true; // 不在视野内，但继续存在
        }

        // 碰撞检测
        return this.checkCollision();
    }

    /**
     * 碰撞检测
     */
    private checkCollision(): boolean {
        if (!this.mesh) return false;

        const colliders = this.bvhPhysics.getColliders();
        const eggCollider = this.mesh.userData.collider as THREE.Sphere;

        
        // 临时变量用于碰撞检测
        const tempSphere = new THREE.Sphere();
        const deltaVec = new THREE.Vector3();

        tempSphere.copy(eggCollider);
        let collided = false;
        let colliderId: string | null = null;

        filterColliders(colliders, this.mapEggPositionDistance, this.mesh.position)

        this.mapEggPositionDistance.forEach((collider, objectId) => { 
            if (collider.geometry && (collider.geometry as any).boundsTree) {
                (collider.geometry as any).boundsTree.shapecast({
                    intersectsBounds: (box: THREE.Box3) => {
                        return box.intersectsSphere(tempSphere);
                    },

                    intersectsTriangle: (tri: any) => {
                        tri.closestPointToPoint(tempSphere.center, deltaVec);
                        deltaVec.sub(tempSphere.center);
                        const distance = deltaVec.length();

                        if (distance < tempSphere.radius) {
                            collided = true;
                            colliderId = objectId;
                        }
                    }
                });
            }
        })
        // 如果发生碰撞，立刻替换为破碎的鸡蛋
        if (collided) {
            this.onEggCollision(colliderId!, collided);
            return false; // 返回false表示需要移除这个鸡蛋
        }

        return true;
    }

    /**
     * 鸡蛋碰撞事件处理
     */
    private onEggCollision(objectId: string, object: any): void {
        if (!this.mesh || this.isCollided) return;
        
        this.isCollided = true;
        console.log(`🥚💥 鸡蛋碰撞事件:`, {
            eggPosition: this.mesh.position,
            objectId: objectId,
            objectName: object?.name || 'Unknown'
        });

        // 播放破碎音效
        this.playBreakSound();

        // 记录碰撞位置
        const collisionPosition = this.mesh.position.clone();
        
        // 移除完整的鸡蛋
        this.removeEgg();
        
        // 加载并显示破碎的鸡蛋
        this.loadBrokenEgg(collisionPosition);
    }

    /**
     * 获取破碎鸡蛋模型
     */
    private loadBrokenEgg(position: THREE.Vector3): void {
        // 从静态模板获取破碎鸡蛋模型实例
        const brokenEgg = Egg.getBrokenEggInstance();

        if (!brokenEgg) {
            console.warn('❌ 无法获取破碎鸡蛋模型，使用备用效果');
            this.createBrokenEggEffect(position);
            return;
        }

        // 设置破碎鸡蛋的位置
        brokenEgg.position.copy(position);
        this.scene.add(brokenEgg);

        // 5秒后移除破碎的鸡蛋
        setTimeout(() => {
            this.scene.remove(brokenEgg);
            // 清理资源
            brokenEgg.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
            });
        }, 5000);

        console.log('🥚💥 破碎鸡蛋模型创建成功');
    }

    /**
     * 创建破碎鸡蛋的粒子效果（备用方案）
     */
    private createBrokenEggEffect(position: THREE.Vector3): void {
        const particleCount = 10;
        const particles: THREE.Mesh[] = [];
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.2, 8, 6);
            const material = new THREE.MeshStandardMaterial({ 
                color: Math.random() > 0.5 ? 0xfff8dc : 0xffff99 // 蛋壳色或蛋黄色
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            ));
            
            this.scene.add(particle);
            particles.push(particle);
        }
        
        // 3秒后移除粒子
        setTimeout(() => {
            particles.forEach(particle => {
                this.scene.remove(particle);
                particle.geometry.dispose();
                if (particle.material instanceof THREE.Material) {
                    particle.material.dispose();
                }
            });
        }, 3000);
        
        console.log('🥚💥 使用备用破碎效果');
    }

    /**
     * 检查是否在相机视野内
     */
    private isInCameraView(camera: THREE.Camera): boolean {
        if (!this.mesh) return false;
        
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4();

        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);

        const boundingSphere = new THREE.Sphere(this.mesh.position, 10);
        return frustum.intersectsSphere(boundingSphere);
    }

    /**
     * 移除鸡蛋
     */
    public removeEgg(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            
            // 清理资源
            this.mesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry?.dispose();
                    if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
            });
            
            this.mesh = null;
        }
    }

    /**
     * 检查鸡蛋是否已准备好
     */
    public isReady(): boolean {
        return this.mesh !== null;
    }


    /**
     * 静态方法：预加载鸡蛋模型（不添加到场景）
     */
    static async createEgg(): Promise<void> {
        if (Egg.isEggModelsLoaded) {
            console.log('🥚 鸡蛋模型已加载，跳过重复加载');
            return;
        }

        try {
            console.log('🥚 开始预加载鸡蛋模型...');

            // 并行加载两个模型
            const [eggGltf, brokenEggGltf] = await Promise.all([
                Egg.gltfLoader.loadAsync('/model/egg/egg.glb'),
                Egg.gltfLoader.loadAsync('/model/egg/egg_broken.glb')
            ]);

            // 保存模型作为静态资源（不添加到场景）
            Egg.eggModel = eggGltf.scene;
            Egg.brokenEggModel = brokenEggGltf.scene;

            // 设置模型属性
            Egg.setupEggModel(Egg.eggModel,0.5);
            Egg.setupEggModel(Egg.brokenEggModel,0.05);

            Egg.isEggModelsLoaded = true;
            console.log('✅ 鸡蛋模型预加载完成', {
                eggChildren: Egg.eggModel.children.length,
                brokenEggChildren: Egg.brokenEggModel.children.length
            });
        } catch (error) {
            console.error('❌ 鸡蛋模型预加载失败:', error);
            Egg.isEggModelsLoaded = false;
        }
    }

    /**
     * 静态方法：设置鸡蛋模型属性
     */
    private static setupEggModel(model: THREE.Object3D,scale:number): void {
        model.scale.set(scale,scale,scale);
        model.castShadow = true;
        model.receiveShadow = true;

        // 遍历所有子网格设置阴影
        model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    /**
     * 静态方法：获取鸡蛋模型实例（克隆）
     */
    static getEggInstance(): THREE.Object3D | null {
        if (!Egg.isEggModelsLoaded || !Egg.eggModel) {
            console.warn('❌ 鸡蛋模型未加载，无法获取实例');
            return null;
        }
        return Egg.eggModel.clone();
    }

    /**
     * 静态方法：获取破碎鸡蛋模型实例（克隆）
     */
    static getBrokenEggInstance(): THREE.Object3D | null {
        if (!Egg.isEggModelsLoaded || !Egg.brokenEggModel) {
            console.warn('❌ 破碎鸡蛋模型未加载，无法获取实例');
            return null;
        }
        return Egg.brokenEggModel.clone();
    }

    /**
     * 静态方法：检查鸡蛋模型是否已加载
     */
    static isEggReady(): boolean {
        return Egg.isEggModelsLoaded;
    }

    /**
     * 静态方法：获取鸡蛋模型加载状态
     */
    static getEggStatus(): { loaded: boolean; eggModel: boolean; brokenEggModel: boolean } {
        return {
            loaded: Egg.isEggModelsLoaded,
            eggModel: Egg.eggModel !== null,
            brokenEggModel: Egg.brokenEggModel !== null
        };
    }
}
