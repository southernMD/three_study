import * as THREE from 'three';
import { BaseModel, InitialTransform } from "./BaseModel";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { PHYSICS_CONSTANTS, getGroundFullSize } from '../../constants/PhysicsConstants';
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
export class WallAndDoor extends BaseModel {
    // 独立的对象
    private columnObject: THREE.Object3D | null = null;    // 柱子对象
    private wallObject: THREE.Object3D | null = null;      // 墙体对象
    private gateObject: THREE.Group | null = null;     // 门对象

    // 可控制的缩放值
    public wallScale: number = 5;

    constructor(scene: THREE.Scene, physicsWorld?: CANNON.World);
    constructor(scene: THREE.Scene, physicsWorld: CANNON.World | undefined, initialTransform: InitialTransform);
    constructor(scene: THREE.Scene, initialTransform: InitialTransform);

    constructor(
        scene: THREE.Scene,
        physicsWorldOrTransform?: CANNON.World | InitialTransform,
        initialTransform?: InitialTransform
    ) {
        super(scene,physicsWorldOrTransform as any, initialTransform as InitialTransform);
        // 对象将在加载时初始化
        this.gateObject = new THREE.Group();
    }

    async load(): Promise<void> {
        const loader = new GLTFLoader();
        const loadModel = (): Promise<GLTF> => {
            return new Promise((resolve, reject) => {
                loader.load(
                    '/model/wall/graveyard_fence.glb',
                    (gltf) => resolve(gltf),
                    undefined,
                    (err) => reject(err)
                );
            });
        };

        const gltf = await loadModel();
        console.log('🔍 开始提取模型部件...');

        // 获取所有部件
        const allParts = this.findWallGroup(gltf.scene);
        console.log('📦 找到的部件:', allParts.map(p => p.name));

        // 分别提取每种类型的部件并创建独立块
        this.extractAndCreateBlocks(allParts);

        // 将独立对象添加到模型组
        // if (this.columnObject) this.modelGroup.add(this.columnObject);
        // if (this.wallObject) this.modelGroup.add(this.wallObject);
        // if (this.gateObject) this.modelGroup.add(this.gateObject);
        console.log(this.columnObject);
        console.log(this.wallObject);
        // 创建围绕地板的墙体边界
        this.createGroundBoundary();
        
        this.addToScene();
        console.log('✅ 部件提取完成，已创建独立对象');
    }

    /**
     * 提取部件并创建独立对象
     */
    private extractAndCreateBlocks(allParts: THREE.Object3D[]): void {
        console.log('🔧 开始创建独立对象...');

        for (const part of allParts) {
            const name = part.name.toLowerCase();
            console.log(`📋 处理部件: ${part.name}`);

            // 克隆部件以避免引用问题
            const clonedPart = part.clone();

            if (name.includes('fence_column_0')) {
                // 柱子对象
                this.columnObject = clonedPart;
                console.log(`🏛️ 柱子对象已创建: ${part.name}`);

            } else if (name.includes('fence_1')) {
                // 墙体对象
                this.wallObject = clonedPart;
                console.log(clonedPart);
                console.log(`🧱 墙体对象已创建: ${part.name}`);

            } else if (name.includes('fence_gate_0_2')) {
                // 门对象1
                this.gateObject?.add(clonedPart)
                console.log(`🚪 门对象1已创建: ${part.name}`);

            } else if (name.includes('fence_gate_1_3')) {
                // 门对象2
                this.gateObject?.add(clonedPart)
                console.log(`🚪 门对象2已创建: ${part.name}`);

            } else {
                console.log(`❓ 未知部件类型: ${part.name}`);
            }
        }

        console.log('📊 对象创建统计:');
        console.log(`   🏛️ 柱子对象: ${this.columnObject ? '已创建' : '未找到'}`);
        console.log(`   🧱 墙体对象: ${this.wallObject ? '已创建' : '未找到'}`);
        console.log(`   🚪 门对象: ${this.gateObject ? '已创建' : '未找到'}`);
    }

    /**
     * 创建围绕地板的墙体边界
     */
    private createGroundBoundary(): void {
        if (!this.wallObject) {
            console.log('❌ 墙体对象不存在，无法创建边界');
            return;
        }

        console.log('🏗️ 开始创建地板边界...');

        // 使用全局常量获取地面尺寸
        const groundSize = getGroundFullSize();

        console.log(`📏 使用全局常量的地面尺寸: ${groundSize.x} x ${groundSize.z}`);

        // 创建四面墙
        this.createBoundaryWalls(groundSize.x, groundSize.z, this.wallScale);

        console.log('✅ 地板边界创建完成');
    }



    /**
     * 创建边界墙体 - 沿着地面边界完全铺满
     */
    private createBoundaryWalls(sizeX: number, sizeZ: number, scale = 1): void {
        if (!this.wallObject) {
            console.log('❌ 墙体对象不存在');
            return;
        }

        // 模型在建模时的平移中心点
        const position = this.wallObject.position;
        console.log('🎯 模型原始位置偏移:', position);

        // 获取原始墙体的实际尺寸
        const wallBounds = BaseModel.getBoundingBoxSize(this.wallObject);
        const wallWidth = wallBounds.width * scale; // 单个墙体的宽度

        console.log(`🏗️ 开始沿边界铺设墙体:`);
        console.log(`   📦 原始墙体尺寸: ${wallBounds.width.toFixed(2)} x ${wallBounds.height.toFixed(2)} x ${wallBounds.depth.toFixed(2)}`);
        console.log(`   📏 缩放后墙体宽度: ${wallWidth.toFixed(2)}`);
        console.log(`   🗺️ 地面尺寸: ${sizeX} x ${sizeZ}`);

        let wallCount = 0;

        // 分别铺设四条边，每条边都从固定边界位置开始，避免累积误差
        console.log(`🏗️ 开始分别铺设四条边的墙体`);

        // 1. 南边 (下边) - 从左到右
        wallCount += this.createSideBoundaryWalls(
            'South', 0, // 名称和旋转角度
            -PHYSICS_CONSTANTS.GROUND_SIZE_X + position.x * scale, // 起始X
            -PHYSICS_CONSTANTS.GROUND_SIZE_Z + position.z * scale, // 固定Z
            wallWidth, scale,
            PHYSICS_CONSTANTS.GROUND_SIZE_X * 2, // 边长
            true, // X方向移动
            wallCount
        );

        // 2. 东边 (右边) - 从下到上，旋转180度
        wallCount += this.createSideBoundaryWalls(
            'East', Math.PI / 2 + Math.PI,
            PHYSICS_CONSTANTS.GROUND_SIZE_X, // 固定X
            -PHYSICS_CONSTANTS.GROUND_SIZE_Z + position.x * scale, // 起始Z
            wallWidth, scale,
            PHYSICS_CONSTANTS.GROUND_SIZE_Z * 2, // 边长
            false, // Z方向移动
            wallCount
        );

        // 3. 北边 (上边) - 从右到左
        wallCount += this.createSideBoundaryWalls(
            'North', Math.PI,
            PHYSICS_CONSTANTS.GROUND_SIZE_X - position.x * scale, // 起始X
            PHYSICS_CONSTANTS.GROUND_SIZE_Z , // 固定Z
            wallWidth, scale,
            PHYSICS_CONSTANTS.GROUND_SIZE_X * 2, // 边长
            true, // X方向移动 (但是负方向)
            wallCount
        );

        // 4. 西边 (左边) - 从上到下，旋转180度
        wallCount += this.createSideBoundaryWalls(
            'West', -Math.PI / 2 + Math.PI,
            -PHYSICS_CONSTANTS.GROUND_SIZE_X, // 固定X
            PHYSICS_CONSTANTS.GROUND_SIZE_Z - position.x * scale, // 起始Z
            wallWidth, scale,
            PHYSICS_CONSTANTS.GROUND_SIZE_Z * 2, // 边长
            false, // Z方向移动 (但是负方向)
            wallCount
        );

        console.log(`✅ 四条边界墙体铺设完成，总计: ${wallCount} 个墙体`);
    }

    /**
     * 创建一条边的墙体
     */
    private createSideBoundaryWalls(
        sideName: string, rotation: number,
        startX: number, startZ: number,
        wallWidth: number, scale: number,
        sideLength: number, isXDirection: boolean, startIndex: number
    ): number {
        const wallCount = Math.ceil(sideLength / wallWidth);
        let actualCount = 0;

        console.log(`🧱 创建${sideName}边墙体: 需要${wallCount}个，边长${sideLength.toFixed(1)}`);

        for (let i = 0; i < wallCount; i++) {
            const wall = this.wallObject!.clone();

            // 计算位置
            let posX, posZ;
            if (isXDirection) {
                if (sideName === 'South') {
                    // 南边：从左到右
                    posX = startX + (i * wallWidth);
                    posZ = startZ;
                } else {
                    // 北边：从右到左
                    posX = startX - (i * wallWidth);
                    posZ = startZ;
                }
            } else {
                if (sideName === 'East') {
                    // 东边：从下到上
                    posX = startX;
                    posZ = startZ + (i * wallWidth);
                } else {
                    // 西边：从上到下
                    posX = startX;
                    posZ = startZ - (i * wallWidth);
                }
            }

            wall.position.set(posX, 0, posZ);
            wall.rotation.y = rotation;
            wall.scale.set(scale, scale, scale);
            wall.name = `${sideName}BoundaryWall_${startIndex + i}`;

            // 检查是否是最后一个墙体且超过边界
            const isLastWall = (i === wallCount - 1);
            if (isLastWall) {
                const totalUsedLength = (i + 1) * wallWidth;
                if (totalUsedLength > sideLength) {
                    // 超过边界，需要裁剪
                    const excessLength = totalUsedLength - sideLength;
                    this.clipWallMaterial(wall, sideName, startX, startZ, sideLength,scale);
                    console.log(`   ✂️ ${sideName}边最后墙体超出${excessLength.toFixed(2)}，需要裁剪`);
                }
            }

            this.modelGroup.add(wall);
            actualCount++;

            console.log(`   🧱 ${sideName}边墙体 ${i + 1}/${wallCount}: 位置(${posX.toFixed(1)}, 0, ${posZ.toFixed(1)})`);
        }

        return actualCount;
    }

    /**
     * 使用材质裁剪平面裁剪墙体
     */
    private clipWallMaterial(wall: THREE.Object3D, sideName: string, startX: number, startZ: number, sideLength: number,scale:number): void {
        wall.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                // 计算边界点和法线方向
                let boundaryPoint: THREE.Vector3;
                let normal: THREE.Vector3;

                if (sideName === 'South') {
                    // 南边：右边界点，法线向左
                    boundaryPoint = new THREE.Vector3(startX + sideLength - scale * this.wallObject!.position.x , 0, startZ);
                    normal = new THREE.Vector3(-1, 0, 0);
                } else if (sideName === 'North') {
                    // 北边：左边界点，法线向右
                    boundaryPoint = new THREE.Vector3(startX - sideLength + scale * this.wallObject!.position.x, 0, startZ);
                    normal = new THREE.Vector3(1, 0, 0);
                } else if (sideName === 'East') {
                    // 东边：下边界点，法线向下（切掉下面超出的部分）
                    boundaryPoint = new THREE.Vector3(startX, 0, startZ + sideLength - scale * this.wallObject!.position.x);
                    normal = new THREE.Vector3(0, 0, -1);
                } else { // West
                    // 西边：上边界点，法线向上（切掉上面超出的部分）
                    boundaryPoint = new THREE.Vector3(startX, 0, startZ - sideLength + scale * this.wallObject!.position.x);
                    normal = new THREE.Vector3(0, 0, 1);
                }

                // 使用法线和边界点创建裁剪平面
                const clippingPlane = new THREE.Plane();
                clippingPlane.setFromNormalAndCoplanarPoint(normal, boundaryPoint);

                // 克隆材质并应用裁剪平面
                const material = Array.isArray(child.material) ? child.material[0] : child.material;
                const clonedMaterial = material.clone();
                clonedMaterial.clippingPlanes = [clippingPlane];
                clonedMaterial.clipShadows = true;
                child.material = clonedMaterial;

                console.log(`   🔧 材质裁剪: ${sideName}边，边界点(${boundaryPoint.x.toFixed(1)}, ${boundaryPoint.y.toFixed(1)}, ${boundaryPoint.z.toFixed(1)})`);
            }
        });
    }

    findWallGroup(group:THREE.Group<THREE.Object3DEventMap>): THREE.Group<THREE.Object3DEventMap>[] {
        if(group.name !== 'GLTF_SceneRootNode' && group.children.length == 1){
           return this.findWallGroup(group.children[0] as any);
        }else if(group.name === 'GLTF_SceneRootNode'){
            return group.children as any;
        }else{
            return [];
        }
    }

    async create(): Promise<void> {
        await this.load();
    }

    /**
     * 获取柱子对象
     */
    getColumnObject(): THREE.Object3D | null {
        return this.columnObject;
    }

    /**
     * 获取墙体对象
     */
    getWallObject(): THREE.Object3D | null {
        return this.wallObject;
    }

    /**
     * 获取门对象
     */
    getGate1Object(): THREE.Object3D | null {
        return this.gateObject;
    }

    /**
     * 设置柱子对象的可见性
     */
    setColumnVisible(visible: boolean): void {
        if (this.columnObject) {
            this.columnObject.visible = visible;
            console.log(`🏛️ 柱子对象可见性: ${visible ? '显示' : '隐藏'}`);
        }
    }

    /**
     * 设置墙体对象的可见性
     */
    setWallVisible(visible: boolean): void {
        if (this.wallObject) {
            this.wallObject.visible = visible;
            console.log(`🧱 墙体对象可见性: ${visible ? '显示' : '隐藏'}`);
        }
    }

    /**
     * 设置门对象的可见性
     */
    setGateVisible(visible: boolean): void {
        if (this.gateObject) {
            this.gateObject.visible = visible;
            console.log(`🚪 门对象可见性: ${visible ? '显示' : '隐藏'}`);
        }
    }

    /**
     * 获取对象的统计信息
     */
    getObjectStats(): {
        hasColumn: boolean;
        hasWall: boolean;
        hasGate: boolean;
    } {
        return {
            hasColumn: this.columnObject !== null,
            hasWall: this.wallObject !== null,
            hasGate: this.gateObject !== null,
        };
    }

    /**
     * 重新创建边界墙（用于实时更新scale）
     */
    recreateBoundaryWalls(): void {
        if (!this.wallObject) {
            console.log('❌ 墙体对象不存在，无法重新创建边界');
            return;
        }

        // 清除现有的边界墙、裁剪平面和边界点可视化
        const boundaryWalls = this.modelGroup.children.filter(child =>
            child.name.includes('BoundaryWall') ||
            child.name.includes('ClippingPlane') ||
            child.name.includes('BoundaryPoint')
        );
        boundaryWalls.forEach(wall => {
            this.modelGroup.remove(wall);
        });

        console.log(`🔄 重新创建边界墙，scale: ${this.wallScale}`);

        // 重新创建边界墙
        const groundSize = getGroundFullSize();
        this.createBoundaryWalls(groundSize.x, groundSize.z, this.wallScale);
    }
}