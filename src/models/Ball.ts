import { BVHPhysics } from '@/physics/BVHPhysics';
import * as THREE from 'three';

export class Ball {
    sphere: THREE.Mesh;
    bvhPhysics: BVHPhysics;
    scene: THREE.Scene;
    constructor(scene: THREE.Scene, bvhPhysics: BVHPhysics) {
        this.scene = scene
        this.sphere = this.createProjectileSphere(scene);
        scene.add(this.sphere);
        this.bvhPhysics = bvhPhysics;
    }

    private createProjectileSphere(scene: THREE.Scene): THREE.Mesh {
        // 随机颜色
        const white = new THREE.Color(0xffffff);
        const color = new THREE.Color(0x263238 / 2).lerp(white, Math.random() * 0.5 + 0.5);

        // 创建小球几何体和材质
        const geometry = new THREE.SphereGeometry(10, 40, 40);
        const material = new THREE.MeshStandardMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);

        // 设置阴影
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        if (material) {
            material.shadowSide = 2;
        }



        // 初始化物理属性
        sphere.userData.velocity = new THREE.Vector3(0, 0, 0);
        sphere.userData.collider = new THREE.Sphere(sphere.position, 1);



        // 添加到场景和数组
        // scene.add(sphere);


        // this.spheres.push(sphere);

        // // 限制小球数量，防止内存泄漏
        // if (this.spheres.length > this.sphereParams.maxSpheres) {
        //     const oldSphere = this.spheres.shift();
        //     if (oldSphere) {
        //         scene.remove(oldSphere);
        //         oldSphere.geometry.dispose();
        //         if (oldSphere.material instanceof THREE.Material) {
        //             oldSphere.material.dispose();
        //         }
        //     }
        // }

        return sphere;
    }

    /**
       * 发射小球（由外部调用，不处理事件）
       * @param camera 相机对象
       * @param scene 场景对象
       * @param mouseX 鼠标X坐标（标准化设备坐标）
       * @param mouseY 鼠标Y坐标（标准化设备坐标）
       */
    public shoot(camera: THREE.Camera, mouseX: number, mouseY: number): void {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(mouseX, mouseY);
        raycaster.setFromCamera(mouse, camera);

        this.sphere.position.copy(camera.position).addScaledVector(raycaster.ray.direction, 3);

        const velocity = new THREE.Vector3()
            .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
            .addScaledVector(raycaster.ray.direction, 10 * Math.random() + 15)
            .multiplyScalar(20);

        this.sphere.userData.velocity = velocity;
        this.sphere.userData.mass = Math.pow(this.sphere.scale.x, 3) * Math.PI * 4 / 3;
    }

    /**
     * 更新所有发射的小球物理状态
     * @param delta 时间增量
     * @param camera 相机对象（用于视野检测）
     * @returns 是否成功更新
     */
    public updateProjectileSphere(delta: number, camera?: THREE.Camera): boolean {
        if (!this.bvhPhysics) return false;

        const sphere = this.sphere
        const velocity = sphere.userData.velocity as THREE.Vector3;
        const sphereCollider = sphere.userData.collider as THREE.Sphere;

        if (!velocity || !sphereCollider) return false;

        // 应用重力（从BVH物理系统获取）
        const gravity = this.bvhPhysics.params.gravity;
        velocity.y += gravity * delta;

        // 更新位置
        sphereCollider.center.addScaledVector(velocity, delta);
        sphere.position.copy(sphereCollider.center);

        // 检查是否掉出世界
        if (sphere.position.y < -80) {
            return false;
        }

        // 性能优化：只对在相机视野内的小球进行碰撞检测
        if (camera && !this.isInCameraView(camera)) {
            console.log("不在视野内，跳过碰撞检测");
            return false; // 不在视野内，跳过碰撞检测
        }
        console.log("在视野内，碰撞检测");

        // 获取分离的碰撞体组
        const colliders = this.bvhPhysics.getColliders();
        const colliderMapping = this.bvhPhysics.getColliderMapping();

        // 临时变量用于碰撞检测
        const tempSphere = new THREE.Sphere();
        const deltaVec = new THREE.Vector3();

        // 对每个分离的碰撞体进行碰撞检测
        tempSphere.copy(sphereCollider);
        let collided = false;
        let collisionInfo: { objectId: string; object: any } | undefined = undefined;
        const colliderArr = Array.from(colliders.values());
        const objectIdArr = Array.from(colliders.keys());
        for (let j = 0; j < colliderArr.length; j++) { 
            if (collided) break; // 如果已经碰撞，跳过其他检测

            const collider = colliderArr[j];
            const objectId = objectIdArr[j];
            if (collider.geometry && (collider.geometry as any).boundsTree) {
                (collider.geometry as any).boundsTree.shapecast({
                    intersectsBounds: (box: THREE.Box3) => {
                        return box.intersectsSphere(tempSphere);
                    },

                    intersectsTriangle: (tri: any) => {
                        // 获取最近点和距离
                        tri.closestPointToPoint(tempSphere.center, deltaVec);
                        deltaVec.sub(tempSphere.center);
                        const distance = deltaVec.length();

                        if (distance < tempSphere.radius) {
                            // 移动小球位置到三角形外部
                            const radius = tempSphere.radius;
                            const depth = distance - radius;
                            deltaVec.multiplyScalar(1 / distance);
                            tempSphere.center.addScaledVector(deltaVec, depth);
                            collided = true;

                            // 记录碰撞信息
                            collisionInfo = {
                                objectId: objectId,
                                object: colliderMapping.get(objectId)
                            };
                        }
                    }
                });
            }
        }


        //发生碰撞
        if (collided && collisionInfo) {
            // 反射速度
            deltaVec.subVectors(tempSphere.center, sphereCollider.center).normalize();
            velocity.reflect(deltaVec);

            // 应用阻尼
            const dot = velocity.dot(deltaVec);
            velocity.addScaledVector(deltaVec, -dot * 0.5);
            velocity.multiplyScalar(Math.max(1.0 - delta, 0));

            // 更新位置
            sphereCollider.center.copy(tempSphere.center);
            sphere.position.copy(sphereCollider.center);

            // 触发碰撞事件（可选）
            if (collisionInfo) {
                this.onSphereCollision(sphere, collisionInfo.objectId, collisionInfo.object);
            }
        }
        return true; // 不在视野内，跳过碰撞检测
    }

    /**
     * 检查小球是否在相机视野范围内
     * @param camera 相机对象
     * @returns 是否在视野内
     */
    private isInCameraView(camera: THREE.Camera): boolean {
        // 创建视锥体
        const frustum = new THREE.Frustum();
        const matrix = new THREE.Matrix4();

        // 计算相机的投影视图矩阵
        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);

        // 创建小球的包围球
        const boundingSphere = new THREE.Sphere(this.sphere.position, 40); // 小球半径为40

        // 检查包围球是否与视锥体相交
        return frustum.intersectsSphere(boundingSphere);
    }

    /**
     * 移除小球
     */
    public removeSphere(): void {
        this.scene.remove(this.sphere);
        if (this.sphere.material instanceof THREE.Material) {
            this.sphere.material.dispose();
        }
    }

    /**
     * 小球碰撞事件处理（可扩展）
     * @param sphere 碰撞的小球
     * @param objectId 碰撞对象的ID
     * @param object 碰撞的对象
     */
    private onSphereCollision(sphere: THREE.Mesh, objectId: string, object: any): void {
        // console.log(`🎯 小球碰撞事件:`, {
        //     spherePosition: sphere.position,
        //     objectId: objectId,
        //     objectName: object?.name || 'Unknown'
        // });

        // 这里可以添加更多碰撞效果，比如：
        // - 粒子效果
        // - 声音效果
        // - 对象交互
        // - 分数计算等
    }
}