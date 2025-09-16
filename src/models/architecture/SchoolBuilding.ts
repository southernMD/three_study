import * as THREE from 'three';
import { BaseModel, InitialTransform } from "./BaseModel";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';
import { doorGroups,doors } from './doors';
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

// 门组接口定义
interface DoorGroupData {
    name: string;
    mesh: THREE.Object3D | null;
    isOpen: boolean;
    type: string;
}

export class SchoolBuilding extends BaseModel {
    public buildingObject: THREE.Object3D | null = null;
    public buildingScale: number = 25;

    // 门组副本 - 从doors.ts的doorGroups转换而来，按类型分类
    private normalDoors: DoorGroupData[][] = [];      // 普通门 (type: "")
    private bigDoors: DoorGroupData[][] = [];         // 大门 (type: "big")
    private openDoors: DoorGroupData[][] = [];        // 开放门 (type: "openDoor")

    constructor(
        scene: THREE.Scene,
        initialTransform?: InitialTransform
    ) {
        super(scene, initialTransform as InitialTransform);
        this.initializeDoorGroups();
    }

    /**
     * 初始化门组数据结构，按类型分类
     */
    private initializeDoorGroups(): void {
        console.log('🚪 初始化门组数据结构...');

        // 将doors.ts中的doorGroups转换为我们的数据结构，按类型分类
        doorGroups.forEach((doorGroup) => {
            const [doorNames, isOpen, type] = doorGroup;
            const doorNamesArray = doorNames as string[];
            const doorType = type as string;

            // 创建门数据组
            const doorDataGroup = doorNamesArray.map((doorName) => ({
                name: doorName,
                mesh: null, // 初始为null，稍后在findAndPopulateDoors中填充
                isOpen: isOpen as boolean,
                type: doorType
            }));

            // 根据类型分类存储
            if (doorType === "") {
                this.normalDoors.push(doorDataGroup);
            } else if (doorType === "big") {
                this.bigDoors.push(doorDataGroup);
            } else if (doorType === "openDoor") {
                this.openDoors.push(doorDataGroup);
            }
        });

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

            // 查找并填充门对象
            this.findAndPopulateDoors(this.buildingObject.children);

            this.modelGroup.add(this.buildingObject);
            this.addToScene();
            console.log('✅ 学校建筑模型加载完成');

        } catch (error) {
            console.error('❌ 学校建筑模型加载失败:', error);
        }
    }

    /**
     * 查找并填充门对象到门组数据结构中
     */
    private findAndPopulateDoors(children: THREE.Object3D[]): void {
        console.log('🔍 开始查找并填充门对象...');


        // 遍历建筑物的所有子对象
        children.forEach((child) => {
            if (doors.includes(child.name)) {
                // 在所有门组数据中查找对应的门
                let found = false;

                // 搜索普通门
                if (!found) {
                    found = this.searchAndFillDoor(child, this.normalDoors, '普通门');
                }

                // 搜索大门
                if (!found) {
                    found = this.searchAndFillDoor(child, this.bigDoors, '大门');
                }

                // 搜索开放门
                if (!found) {
                    found = this.searchAndFillDoor(child, this.openDoors, '开放门');
                }
            }
        });

        debugger
    }

    /**
     * 在指定门组中搜索并填充门对象
     */
    private searchAndFillDoor(child: THREE.Object3D, doorGroups: DoorGroupData[][], typeName: string): boolean {
        for (let groupIndex = 0; groupIndex < doorGroups.length; groupIndex++) {
            const group = doorGroups[groupIndex];

            for (let doorIndex = 0; doorIndex < group.length; doorIndex++) {
                const doorData = group[doorIndex];

                if (doorData.name === child.name) {
                    // 找到匹配的门，填充mesh引用
                    doorData.mesh = child;
                    return true; // 找到后返回true
                }
            }
        }
        return false; // 未找到返回false
    }

    /**
     * 获取普通门组数据
     */
    public getNormalDoors(): DoorGroupData[][] {
        return this.normalDoors;
    }

    /**
     * 获取大门组数据
     */
    public getBigDoors(): DoorGroupData[][] {
        return this.bigDoors;
    }

    /**
     * 获取开放门组数据
     */
    public getOpenDoors(): DoorGroupData[][] {
        return this.openDoors;
    }

    /**
     * 获取指定类型的门组
     */
    public getDoorGroupByType(type: 'normal' | 'big' | 'open', groupIndex: number): DoorGroupData[] | null {
        let targetGroups: DoorGroupData[][];

        switch (type) {
            case 'normal':
                targetGroups = this.normalDoors;
                break;
            case 'big':
                targetGroups = this.bigDoors;
                break;
            case 'open':
                targetGroups = this.openDoors;
                break;
            default:
                return null;
        }

        if (groupIndex >= 0 && groupIndex < targetGroups.length) {
            return targetGroups[groupIndex];
        }
        return null;
    }

    /**
     * 获取门的状态信息
     */
    public getDoorStats(): {
        total: number;
        found: number;
        missing: number;
        normalDoors: { total: number; found: number };
        bigDoors: { total: number; found: number };
        openDoors: { total: number; found: number };
    } {
        const normalStats = this.getDoorTypeStats(this.normalDoors);
        const bigStats = this.getDoorTypeStats(this.bigDoors);
        const openStats = this.getDoorTypeStats(this.openDoors);

        const total = normalStats.total + bigStats.total + openStats.total;
        const found = normalStats.found + bigStats.found + openStats.found;

        return {
            total,
            found,
            missing: total - found,
            normalDoors: normalStats,
            bigDoors: bigStats,
            openDoors: openStats
        };
    }

    /**
     * 获取指定类型门的统计信息
     */
    private getDoorTypeStats(doorGroups: DoorGroupData[][]): { total: number; found: number } {
        let total = 0;
        let found = 0;

        doorGroups.forEach(group => {
            group.forEach(doorData => {
                total++;
                if (doorData.mesh) found++;
            });
        });

        return { total, found };
    }

    findDoorIndex(doorPair: string[],child: THREE.Object3D){
        for (let i = 0; i < doorPair.length; i++) {
            if(doorPair[i] === child.name){
                return {
                    name:child.name,
                    mesh:child
                }
            }
        }
        return 
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
