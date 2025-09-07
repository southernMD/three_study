import * as THREE from 'three';
import { BaseModel, InitialTransform } from "./BaseModel";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { MeshBVH, MeshBVHHelper, StaticGeometryGenerator } from 'three-mesh-bvh';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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
    private physicsBodies: CANNON.Body[] = [];
    private collider: THREE.Mesh | null = null;
    private visualizer: MeshBVHHelper | null = null;

    private physicsBodyVisualization: THREE.Mesh | null = null;

    public buildingScale: number

    private visualParams = {
        displayCollider: true,  // 显示碰撞体线框
        displayBVH: true,       // 显示BVH辅助线
        displayWireframe: true, // 显示线框辅助
        displayPhysicsBody: true, // 显示物理体
        visualizeDepth: 10
    };

    constructor(scene: THREE.Scene, buildingScale: number, physicsWorld?: CANNON.World);
    constructor(scene: THREE.Scene, buildingScale: number, physicsWorld: CANNON.World | undefined, initialTransform: InitialTransform);
    constructor(scene: THREE.Scene, buildingScale: number, initialTransform: InitialTransform);

    constructor(
        scene: THREE.Scene,
        buildingScale: number = 1,
        physicsWorldOrTransform?: CANNON.World | InitialTransform,
        initialTransform?: InitialTransform,
    ) {
        // 使用静态方法来正确处理参数
        super(scene,
            SchoolBuilding.resolvePhysicsWorld(physicsWorldOrTransform, initialTransform),
            SchoolBuilding.resolveTransform(physicsWorldOrTransform, initialTransform) || undefined
        );

        this.buildingScale = buildingScale;
        console.log('🏫 SchoolBuilding 构造函数调用完成');
        console.log('🔍 物理世界状态:', this.physicsWorld ? '✅ 已传递' : '❌ 未传递');
    }

    // 静态方法来解析物理世界参数
    private static resolvePhysicsWorld(
        physicsWorldOrTransform?: CANNON.World | InitialTransform,
        initialTransform?: InitialTransform
    ): CANNON.World | undefined {
        if (initialTransform) {
            // 如果有第四个参数，说明第三个参数是物理世界
            return physicsWorldOrTransform as CANNON.World;
        } else if (physicsWorldOrTransform && 'bodies' in physicsWorldOrTransform) {
            // 检查是否是物理世界对象
            return physicsWorldOrTransform as CANNON.World;
        }
        return undefined;
    }

    // 静态方法来解析变换参数
    private static resolveTransform(
        physicsWorldOrTransform?: CANNON.World | InitialTransform,
        initialTransform?: InitialTransform
    ): InitialTransform | undefined {
        if (initialTransform) {
            return initialTransform;
        } else if (physicsWorldOrTransform && !('bodies' in physicsWorldOrTransform)) {
            // 如果不是物理世界对象，则是变换参数
            return physicsWorldOrTransform as InitialTransform;
        }
        return undefined;
    }

    async create(): Promise<void> {
        console.log('🏫 开始创建学校建筑...');
        await this.load();
        console.log('🏫 学校建筑模型加载完成，准备创建物理体...');
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
            this.logModelInfo();
        } catch (error) {
            console.error('❌ 学校建筑模型处理失败:', error);
            throw error;
        }
    }

    private logModelInfo(): void {
        if (!this.buildingObject) return;
        const bounds = BaseModel.getBoundingBoxSize(this.buildingObject);
        console.log(`   📐 学校建筑尺寸: 宽${bounds.width.toFixed(2)} × 高${bounds.height.toFixed(2)} × 深${bounds.depth.toFixed(2)}`);
    }

    /**
     * 强制使用简单Box物理体（调试用）
     */
    forceCreateSimplePhysicsBody(): void {
        console.log('🔧 强制创建简单Box物理体...');

        // 清除现有物理体
        this.physicsBodies.forEach(body => {
            if (this.physicsWorld) {
                this.physicsWorld.removeBody(body);
            }
        });
        this.physicsBodies = [];

        // 创建简单物理体
        this.createSimpleCannonPhysicsBody();
    }



    /**
     * 创建建筑物理体（用CANNON，参考characterMovement.js的几何体处理方式）
     */
    createWallPhysicsBody(): void {
        if (!this.buildingObject) {
            console.log('⚠️ 建筑对象缺失，跳过学校建筑物理体创建');
            return;
        }

        console.log('🔧 开始创建学校建筑复杂物理体...');

        try {
            // 1. 确保建筑对象的变换已更新
            this.buildingObject.updateMatrixWorld(true);
            console.log('🔄 建筑对象变换已更新');

            // 2. 使用StaticGeometryGenerator生成合并几何体（参考characterMovement.js）
            const staticGenerator = new StaticGeometryGenerator(this.buildingObject);
            staticGenerator.attributes = ['position'];

            const mergedGeometry = staticGenerator.generate();
            console.log(`   📊 合并几何体顶点数: ${mergedGeometry.attributes.position.count}`);

            // 详细检查几何体
            if (mergedGeometry.attributes.position.count === 0) {
                throw new Error('StaticGeometryGenerator 生成的几何体为空');
            }

            // 检查几何体边界
            mergedGeometry.computeBoundingBox();
            const bbox = mergedGeometry.boundingBox;
            if (bbox) {
                console.log(`   📦 StaticGeometryGenerator几何体边界: min(${bbox.min.x.toFixed(1)}, ${bbox.min.y.toFixed(1)}, ${bbox.min.z.toFixed(1)}) max(${bbox.max.x.toFixed(1)}, ${bbox.max.y.toFixed(1)}, ${bbox.max.z.toFixed(1)})`);

                const size = bbox.max.clone().sub(bbox.min);
                console.log(`   📏 StaticGeometryGenerator几何体尺寸: ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)}`);
            }

            // 对比建筑物的实际边界
            const buildingBbox = new THREE.Box3().setFromObject(this.buildingObject);
            console.log(`   🏢 建筑物实际边界: min(${buildingBbox.min.x.toFixed(1)}, ${buildingBbox.min.y.toFixed(1)}, ${buildingBbox.min.z.toFixed(1)}) max(${buildingBbox.max.x.toFixed(1)}, ${buildingBbox.max.y.toFixed(1)}, ${buildingBbox.max.z.toFixed(1)})`);

            const buildingSize = buildingBbox.max.clone().sub(buildingBbox.min);
            console.log(`   🏢 建筑物实际尺寸: ${buildingSize.x.toFixed(1)} × ${buildingSize.y.toFixed(1)} × ${buildingSize.z.toFixed(1)}`);

            // 检查是否匹配
            const geometrySize = bbox ? bbox.max.clone().sub(bbox.min) : new THREE.Vector3();
            const sizeMatch = bbox && Math.abs(geometrySize.x - buildingSize.x) < 1 && Math.abs(geometrySize.y - buildingSize.y) < 1 && Math.abs(geometrySize.z - buildingSize.z) < 1;
            console.log(`   🔍 几何体与建筑物尺寸是否匹配: ${sizeMatch ? '✅ 是' : '❌ 否'}`);

            if (!sizeMatch) {
                console.log(`   ⚠️ StaticGeometryGenerator可能没有正确应用建筑物的缩放变换`);
            }

            // 验证几何体是否有效
            if (!mergedGeometry.attributes.position || mergedGeometry.attributes.position.count === 0) {
                console.error('❌ StaticGeometryGenerator 生成的几何体为空');
                console.log('🔍 建筑对象信息:');
                console.log('   - 子对象数量:', this.buildingObject.children.length);
                console.log('   - 是否有几何体:', this.buildingObject.children.some(child => (child as THREE.Mesh).geometry));

                // 尝试手动遍历建筑对象
                let totalVertices = 0;
                this.buildingObject.traverse((child) => {
                    if ((child as THREE.Mesh).geometry) {
                        const geometry = (child as THREE.Mesh).geometry as THREE.BufferGeometry;
                        if (geometry.attributes.position) {
                            totalVertices += geometry.attributes.position.count;
                            console.log(`   - 子对象 ${child.name}: ${geometry.attributes.position.count} 顶点`);
                        }
                    }
                });
                console.log(`   - 总顶点数: ${totalVertices}`);

                throw new Error('生成的几何体无效或为空');
            }

            // 3. 创建可视化（用于调试）- 先创建可视化，这样可以看到BVH
            this.createVisualizationFromGeometry(mergedGeometry.clone());

            // 4. 从合并几何体创建CANNON物理体
            this.createCannonTrimeshFromGeometry(mergedGeometry);

            // 5. 添加到场景
            if (this.collider) {
                this.scene.add(this.collider);
                console.log('✅ 碰撞体已添加到场景');
            }
            if (this.visualizer) {
                this.scene.add(this.visualizer);
                console.log('✅ BVH可视化器已添加到场景');
            }

            // 7. 设置初始可见性
            this.updateVisualizationVisibility();

            console.log('✅ 学校建筑CANNON精确物理体创建完成');

        } catch (error) {
            console.error('❌ 学校建筑物理体创建失败:', error);
            console.error('错误详情:', (error as Error).message);
            console.log('❌ 不创建任何物理体，避免错误的小物理体');
        }
    }

    /**
     * 从合并几何体创建CANNON Trimesh物理体
     */
    private createCannonTrimeshFromGeometry(geometry: THREE.BufferGeometry): void {
        if (!this.physicsWorld) {
            console.log('⚠️ 物理世界未初始化，跳过CANNON物理体创建');
            return;
        }

        console.log('🔧 从合并几何体创建CANNON Trimesh...');

        // 获取顶点数据
        const positions = geometry.attributes.position.array;
        let vertices: number[] = Array.from(positions);

        // 关键修复：检查顶点数据是否需要手动应用建筑物缩放
        if (this.buildingObject) {
            const worldScale = new THREE.Vector3();
            this.buildingObject.getWorldScale(worldScale);

            console.log(`   🔍 建筑物缩放: (${worldScale.x.toFixed(2)}, ${worldScale.y.toFixed(2)}, ${worldScale.z.toFixed(2)})`);

            // 检查第一个顶点的大小，判断是否需要缩放
            if (vertices.length >= 3) {
                const firstVertexMagnitude = Math.sqrt(vertices[0]*vertices[0] + vertices[1]*vertices[1] + vertices[2]*vertices[2]);
                console.log(`   🔍 第一个顶点大小: ${firstVertexMagnitude.toFixed(1)}`);

                // 如果顶点很小但建筑物很大，说明需要手动缩放
                if (firstVertexMagnitude < 100 && (worldScale.x > 1 || worldScale.y > 1 || worldScale.z > 1)) {
                    console.log(`   🔧 手动应用缩放到顶点数据...`);
                    for (let i = 0; i < vertices.length; i += 3) {
                        vertices[i] *= worldScale.x;     // X
                        vertices[i + 1] *= worldScale.y; // Y
                        vertices[i + 2] *= worldScale.z; // Z
                    }
                    console.log(`   ✅ 已应用缩放，新的第一个顶点大小: ${Math.sqrt(vertices[0]*vertices[0] + vertices[1]*vertices[1] + vertices[2]*vertices[2]).toFixed(1)}`);
                } else {
                    console.log(`   ✅ 顶点数据已经包含正确缩放`);
                }
            }
        }

        // 创建面索引 - 关键修复
        const faces: number[] = [];
        if (geometry.index) {
            // 有索引的几何体
            const indices = geometry.index.array;
            console.log(`   📊 原始索引数量: ${indices.length}`);

            // 确保索引是三角形面（每3个索引组成一个面）
            for (let i = 0; i < indices.length; i += 3) {
                if (i + 2 < indices.length) {
                    faces.push(indices[i], indices[i + 1], indices[i + 2]);
                }
            }
        } else {
            // 无索引的几何体，每3个顶点组成一个面
            console.log('   📊 无索引几何体，生成顺序索引');
            for (let i = 0; i < positions.length / 3; i += 3) {
                if (i + 2 < positions.length / 3) {
                    faces.push(i, i + 1, i + 2);
                }
            }
        }

        console.log(`   📊 生成的面索引数量: ${faces.length}`);

        // 验证面索引的有效性
        const maxVertexIndex = vertices.length / 3 - 1;
        let invalidFaces = 0;
        for (let i = 0; i < faces.length; i++) {
            if (faces[i] > maxVertexIndex || faces[i] < 0) {
                invalidFaces++;
            }
        }

        if (invalidFaces > 0) {
            console.warn(`   ⚠️ 发现 ${invalidFaces} 个无效面索引`);
        }

        console.log(`   📊 CANNON Trimesh数据: ${vertices.length / 3} 顶点, ${faces.length / 3} 面`);

        // 验证数据完整性
        if (vertices.length === 0 || faces.length === 0) {
            throw new Error('几何体数据为空');
        }

        if (vertices.length % 3 !== 0) {
            throw new Error(`顶点数据不完整: ${vertices.length} (应该是3的倍数)`);
        }

        if (faces.length % 3 !== 0) {
            throw new Error(`面数据不完整: ${faces.length} (应该是3的倍数)`);
        }

        // 强制使用Trimesh，不使用错误的ConvexPolyhedron
        let shape: CANNON.Shape;
        debugger
        try {
            console.log('   🔧 强制创建Trimesh（忽略顶点数量限制）...');
            shape = new CANNON.Trimesh(vertices, faces);
            console.log('   ✅ 使用Trimesh创建精确碰撞体');
        } catch (error) {
            console.error('   ❌ Trimesh创建失败:', error);
            throw error; // 不回退，直接抛出错误
        }

        // 创建CANNON物理体，使用与Model兼容的材质
        const body = new CANNON.Body({
            mass: 0, // 静态物体
            material: new CANNON.Material({
                friction: 0.5, // 与Model.ts中的摩擦力保持一致
                restitution: 0.3 // 与Model.ts中的弹性系数保持一致
            })
        });

        body.addShape(shape);

        // 正确修复：StaticGeometryGenerator的顶点已经包含世界坐标，
        // 所以物理体必须放在原点，不能再次变换
        body.position.set(0, 0, 0);
        body.quaternion.set(0, 0, 0, 1);

        console.log(`   ✅ 物理体位置设置在原点，因为顶点数据已包含世界坐标`);

        console.log(`   📍 最终物理体位置: (${body.position.x.toFixed(1)}, ${body.position.y.toFixed(1)}, ${body.position.z.toFixed(1)})`);

        // 记录建筑物的实际位置用于调试
        if (this.buildingObject) {
            const worldPosition = new THREE.Vector3();
            this.buildingObject.getWorldPosition(worldPosition);
            console.log(`   📍 建筑物世界位置: (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})`);
            console.log(`   � 建筑物缩放: (${this.buildingObject.scale.x.toFixed(2)}, ${this.buildingObject.scale.y.toFixed(2)}, ${this.buildingObject.scale.z.toFixed(2)})`);
        }

        // 添加到物理世界
        this.physicsWorld.addBody(body);
        this.physicsBodies.push(body);

        // 创建物理体可视化
        this.createTrimeshVisualization(body, vertices, faces);

        console.log(`✅ CANNON物理体已创建并添加到物理世界`);
    }

    /**
     * 创建ConvexPolyhedron替代Trimesh（解决堆栈溢出的根本方案）
     */
    private createConvexPolyhedronFromVertices(vertices: number[], faces: number[]): CANNON.Shape {
        console.log('🔧 创建ConvexPolyhedron替代Trimesh...');

        // 改进的简化算法：保持更多细节，但限制顶点数量
        const maxVertices = 128; // 增加最大顶点数量以保持更多细节
        const totalVertices = vertices.length / 3;

        let simplifiedVertices: CANNON.Vec3[] = [];
        let simplifiedFaces: number[][] = [];

        if (totalVertices <= maxVertices) {
            // 如果顶点数量在限制内，直接使用所有顶点
            for (let i = 0; i < vertices.length; i += 3) {
                simplifiedVertices.push(new CANNON.Vec3(
                    vertices[i],
                    vertices[i + 1],
                    vertices[i + 2]
                ));
            }

            // 处理面数据 - 修复：确保面索引正确
            for (let i = 0; i < faces.length; i += 3) {
                const v0 = faces[i];
                const v1 = faces[i + 1];
                const v2 = faces[i + 2];

                // 验证索引有效性
                if (v0 < simplifiedVertices.length && v0 >= 0 &&
                    v1 < simplifiedVertices.length && v1 >= 0 &&
                    v2 < simplifiedVertices.length && v2 >= 0 &&
                    v0 !== v1 && v1 !== v2 && v0 !== v2) {
                    simplifiedFaces.push([v0, v1, v2]);
                }
            }
        } else {
            // 需要简化：使用更智能的采样策略
            const step = Math.ceil(totalVertices / maxVertices);
            const vertexMap = new Map<number, number>(); // 原始索引到新索引的映射

            // 采样顶点
            for (let i = 0; i < vertices.length; i += 3 * step) {
                const originalIndex = i / 3;
                const newIndex = simplifiedVertices.length;
                vertexMap.set(originalIndex, newIndex);

                simplifiedVertices.push(new CANNON.Vec3(
                    vertices[i],
                    vertices[i + 1],
                    vertices[i + 2]
                ));
            }

            // 处理面数据，只保留所有顶点都存在的面
            for (let i = 0; i < faces.length; i += 3) {
                const v0 = vertexMap.get(faces[i]);
                const v1 = vertexMap.get(faces[i + 1]);
                const v2 = vertexMap.get(faces[i + 2]);

                // 验证索引有效性和唯一性
                if (v0 !== undefined && v1 !== undefined && v2 !== undefined &&
                    v0 !== v1 && v1 !== v2 && v0 !== v2) {
                    simplifiedFaces.push([v0, v1, v2]);
                }
            }
        }

        console.log(`   📊 ConvexPolyhedron数据: ${simplifiedVertices.length} 顶点, ${simplifiedFaces.length} 面`);

        // 验证数据完整性
        if (simplifiedVertices.length < 4) {
            throw new Error(`ConvexPolyhedron 顶点数量不足: ${simplifiedVertices.length} (至少需要4个)`);
        }

        if (simplifiedFaces.length < 4) {
            throw new Error(`ConvexPolyhedron 面数量不足: ${simplifiedFaces.length} (至少需要4个)`);
        }

        // 验证每个面都有3个顶点
        for (let i = 0; i < simplifiedFaces.length; i++) {
            const face = simplifiedFaces[i];
            if (!face || face.length !== 3) {
                throw new Error(`面 ${i} 无效: ${face ? face.length : 0} 个顶点 (需要3个)`);
            }
        }

        try {
            // 创建ConvexPolyhedron
            const convexShape = new CANNON.ConvexPolyhedron({
                vertices: simplifiedVertices,
                faces: simplifiedFaces
            });

            console.log('   ✅ ConvexPolyhedron 创建成功');
            return convexShape;

        } catch (error) {
            console.error('   ❌ ConvexPolyhedron 创建失败:', error);

            // 回退到简单的Box形状
            console.log('   🔄 回退到Box形状...');

            // 计算边界框
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

            for (const vertex of simplifiedVertices) {
                minX = Math.min(minX, vertex.x);
                minY = Math.min(minY, vertex.y);
                minZ = Math.min(minZ, vertex.z);
                maxX = Math.max(maxX, vertex.x);
                maxY = Math.max(maxY, vertex.y);
                maxZ = Math.max(maxZ, vertex.z);
            }

            const width = (maxX - minX) / 2;
            const height = (maxY - minY) / 2;
            const depth = (maxZ - minZ) / 2;

            console.log(`   📦 Box尺寸: ${width.toFixed(1)} × ${height.toFixed(1)} × ${depth.toFixed(1)}`);

            return new CANNON.Box(new CANNON.Vec3(width, height, depth));
        }
    }

    /**
     * 创建Trimesh物理体的可视化
     */
    private createTrimeshVisualization(body: CANNON.Body, vertices: number[], faces: number[]): void {
        // 创建几何体用于可视化
        const visualGeometry = new THREE.BufferGeometry();
        visualGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        if (faces.length > 0) {
            visualGeometry.setIndex(faces);
        }

        // 创建线框材质
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000ff, // 蓝色线框
            transparent: true,
            opacity: 1.0,
            wireframe: true
        });

        const wireframeMesh = new THREE.Mesh(visualGeometry, wireframeMaterial);
        wireframeMesh.name = 'SchoolBuildingTrimeshVisualization';

        // 位置与物理体一致
        wireframeMesh.position.set(
            body.position.x,
            body.position.y,
            body.position.z
        );

        wireframeMesh.quaternion.set(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
        );

        wireframeMesh.visible = true;
        this.scene.add(wireframeMesh);
        this.physicsBodyVisualization = wireframeMesh;

        console.log(`   👁️ Trimesh可视化已创建`);
    }

    /**
     * 从几何体创建可视化辅助线
     */
    private createVisualizationFromGeometry(geometry: THREE.BufferGeometry): void {
        try {
            console.log('🔧 开始创建BVH和可视化辅助线...');

            // 确保几何体有正确的属性
            if (!geometry.attributes.position) {
                console.error('❌ 几何体缺少position属性');
                return;
            }

            console.log(`📊 几何体信息: ${geometry.attributes.position.count} 顶点`);

            // 创建BVH用于可视化（参考characterMovement.js）
            geometry.boundsTree = new MeshBVH(geometry);
            console.log('✅ BVH创建成功');

            // 创建碰撞体网格（红色线框）
            const colliderGeometry = geometry.clone();
            this.collider = new THREE.Mesh(colliderGeometry);
            this.collider.material = new THREE.MeshBasicMaterial({
                wireframe: true,
                opacity: 0.5,
                transparent: true,
                color: 0xff0000 // 红色线框
            });
            this.collider.name = 'SchoolBuildingCollider';

            // 重要：不要应用变换到碰撞体，因为StaticGeometryGenerator已经处理了变换
            // 碰撞体应该在原点，与物理体位置一致
            this.collider.position.set(0, 0, 0);
            this.collider.rotation.set(0, 0, 0);
            this.collider.scale.set(1, 1, 1);

            console.log('✅ 碰撞体网格创建完成');

            // 创建BVH可视化辅助线
            this.visualizer = new MeshBVHHelper(this.collider, this.visualParams.visualizeDepth);
            this.visualizer.name = 'SchoolBuildingBVHHelper';
            console.log('✅ BVH可视化辅助线创建完成');

            console.log('   ✅ 所有可视化辅助线创建完成');

        } catch (error) {
            console.error('   ❌ 可视化辅助线创建失败:', error);
            console.error('错误详情:', (error as Error).stack);
        }
    }

    private createSimpleCannonPhysicsBody(): void {
        if (!this.physicsWorld || !this.buildingObject) {
            console.log('⚠️ 物理世界未初始化，跳过物理体创建');
            return;
        }

        console.log('🔧 创建简单CANNON物理体（Box形状）...');

        const bounds = BaseModel.getBoundingBoxSize(this.buildingObject);
        const worldScale = new THREE.Vector3();
        this.buildingObject.getWorldScale(worldScale);

        const physicsWidth = bounds.width * worldScale.x;
        const physicsHeight = bounds.height * worldScale.y;
        const physicsDepth = bounds.depth * worldScale.z;

        const shape = new CANNON.Box(new CANNON.Vec3(
            physicsWidth / 2,
            physicsHeight / 2,
            physicsDepth / 2
        ));

        // 使用与Model兼容的材质参数
        const body = new CANNON.Body({
            mass: 0, // 静态物体
            type: CANNON.Body.STATIC,
            material: new CANNON.Material({
                friction: 0.5, // 与Model.ts中的摩擦力保持一致
                restitution: 0.3 // 与Model.ts中的弹性系数保持一致
            })
        });

        body.addShape(shape);

        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        this.buildingObject.getWorldPosition(worldPosition);
        this.buildingObject.getWorldQuaternion(worldQuaternion);

        body.position.set(
            worldPosition.x,
            worldPosition.y + physicsHeight / 2,
            worldPosition.z
        );

        body.quaternion.set(
            worldQuaternion.x,
            worldQuaternion.y,
            worldQuaternion.z,
            worldQuaternion.w
        );

        this.physicsWorld.addBody(body);
        this.physicsBodies.push(body);

        this.createPhysicsBodyVisualization(body, physicsWidth, physicsHeight, physicsDepth);

        console.log(`✅ 简单CANNON物理体已创建: 位置(${body.position.x.toFixed(1)}, ${body.position.y.toFixed(1)}, ${body.position.z.toFixed(1)})`);
        console.log(`   📐 物理体尺寸: ${physicsWidth.toFixed(1)} × ${physicsHeight.toFixed(1)} × ${physicsDepth.toFixed(1)}`);
    }





    private createPhysicsBodyVisualization(physicsBody: CANNON.Body, width: number, height: number, depth: number): void {
        const boxGeometry = new THREE.BoxGeometry(width, height, depth);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000ff,
            transparent: true,
            opacity: 1.0,
            wireframe: true
        });

        const wireframeMesh = new THREE.Mesh(boxGeometry, wireframeMaterial);
        wireframeMesh.name = 'SchoolBuildingPhysicsBodyVisualization';

        wireframeMesh.position.set(
            physicsBody.position.x,
            physicsBody.position.y,
            physicsBody.position.z
        );

        wireframeMesh.quaternion.set(
            physicsBody.quaternion.x,
            physicsBody.quaternion.y,
            physicsBody.quaternion.z,
            physicsBody.quaternion.w
        );

        wireframeMesh.visible = true;
        this.scene.add(wireframeMesh);
        this.physicsBodyVisualization = wireframeMesh;

        console.log(`   👁️ 物理体可视化已创建: 位置(${wireframeMesh.position.x.toFixed(1)}, ${wireframeMesh.position.y.toFixed(1)}, ${wireframeMesh.position.z.toFixed(1)})`);
    }

    private updateVisualizationVisibility(): void {
        if (this.collider) {
            this.collider.visible = this.visualParams.displayCollider;
        }
        if (this.visualizer) {
            this.visualizer.visible = this.visualParams.displayBVH;
        }

        if (this.physicsBodyVisualization) {
            this.physicsBodyVisualization.visible = this.visualParams.displayPhysicsBody;
        }
    }

    setPhysicsVisualizationVisible(visible: boolean): void {
        this.visualParams.displayPhysicsBody = visible;
        this.updateVisualizationVisibility();
        console.log(`学校建筑物理体可视化: ${visible ? '显示' : '隐藏'}`);
    }

    setBVHVisualizationVisible(visible: boolean): void {
        this.visualParams.displayBVH = visible;
        this.updateVisualizationVisibility();
        console.log(`学校建筑BVH辅助线: ${visible ? '显示' : '隐藏'}`);
    }

    setColliderVisible(visible: boolean): void {
        this.visualParams.displayCollider = visible;
        this.updateVisualizationVisibility();
        console.log(`学校建筑碰撞体线框: ${visible ? '显示' : '隐藏'}`);
    }

    setBVHVisualizeDepth(depth: number): void {
        this.visualParams.visualizeDepth = Math.max(1, Math.min(20, depth));
        if (this.visualizer) {
            this.visualizer.depth = this.visualParams.visualizeDepth;
            this.visualizer.update();
        }
        console.log(`学校建筑BVH可视化深度: ${this.visualParams.visualizeDepth}`);
    }

    /**
     * 获取CANNON物理体数组（用于外部访问）
     */
    getPhysicsBodies(): CANNON.Body[] {
        return this.physicsBodies;
    }

    /**
     * 获取碰撞体（用于可视化调试）
     */
    getCollider(): THREE.Mesh | null {
        return this.collider;
    }

    /**
     * 获取BVH可视化器
     */
    getBVHVisualizer(): MeshBVHHelper | null {
        return this.visualizer;
    }

    /**
     * 检查BVH是否正确创建
     */
    checkBVHStatus(): boolean {
        if (!this.collider) {
            console.log('❌ 碰撞体未创建');
            return false;
        }

        const geometry = this.collider.geometry as THREE.BufferGeometry;
        if (!geometry.boundsTree) {
            console.log('❌ BVH未创建');
            return false;
        }

        console.log('✅ BVH状态检查:');
        console.log(`   - 碰撞体存在: ${this.collider ? '是' : '否'}`);
        console.log(`   - BVH存在: ${geometry.boundsTree ? '是' : '否'}`);
        console.log(`   - BVH可视化器存在: ${this.visualizer ? '是' : '否'}`);

        if (this.visualizer) {
            console.log(`   - BVH可视化器可见: ${this.visualizer.visible ? '是' : '否'}`);
        }

        // 检查碰撞体位置
        if (this.collider) {
            console.log(`   - 碰撞体位置: (${this.collider.position.x.toFixed(1)}, ${this.collider.position.y.toFixed(1)}, ${this.collider.position.z.toFixed(1)})`);
        }

        // 检查物理体位置
        if (this.physicsBodies.length > 0) {
            const body = this.physicsBodies[0];
            console.log(`   - 物理体位置: (${body.position.x.toFixed(1)}, ${body.position.y.toFixed(1)}, ${body.position.z.toFixed(1)})`);
        }

        return true;
    }

    /**
     * 测试物理碰撞（调试用）
     */
    testPhysicsCollision(testPosition: THREE.Vector3): boolean {
        if (this.physicsBodies.length === 0) {
            console.log('❌ 没有物理体可测试');
            return false;
        }

        console.log(`🧪 测试位置 (${testPosition.x.toFixed(1)}, ${testPosition.y.toFixed(1)}, ${testPosition.z.toFixed(1)}) 的碰撞`);

        // 创建一个测试球体
        const testRadius = 1;
        const testShape = new CANNON.Sphere(testRadius);
        const testBody = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(testPosition.x, testPosition.y, testPosition.z)
        });
        testBody.addShape(testShape);

        // 临时添加到物理世界
        if (this.physicsWorld) {
            this.physicsWorld.addBody(testBody);

            // 运行一步物理模拟
            this.physicsWorld.step(1/60);

            // 检查是否有碰撞
            const hasCollision = testBody.velocity.length() < 0.1; // 如果速度很小，可能发生了碰撞

            console.log(`   碰撞结果: ${hasCollision ? '有碰撞' : '无碰撞'}`);
            console.log(`   测试体最终位置: (${testBody.position.x.toFixed(1)}, ${testBody.position.y.toFixed(1)}, ${testBody.position.z.toFixed(1)})`);

            // 清理测试体
            this.physicsWorld.removeBody(testBody);

            return hasCollision;
        }

        return false;
    }

    /**
     * 验证物理体位置是否正确（新增调试方法）
     */
    validatePhysicsBodyPosition(): void {
        console.log('🔍 验证学校建筑物理体位置...');

        if (this.physicsBodies.length === 0) {
            console.log('❌ 没有物理体');
            return;
        }

        if (!this.buildingObject) {
            console.log('❌ 没有建筑对象');
            return;
        }

        // 获取建筑物的边界框
        const bbox = new THREE.Box3().setFromObject(this.buildingObject);
        console.log(`📦 建筑物边界框: min(${bbox.min.x.toFixed(1)}, ${bbox.min.y.toFixed(1)}, ${bbox.min.z.toFixed(1)}) max(${bbox.max.x.toFixed(1)}, ${bbox.max.y.toFixed(1)}, ${bbox.max.z.toFixed(1)})`);

        // 检查每个物理体
        this.physicsBodies.forEach((body, index) => {
            console.log(`🔸 物理体 ${index}:`);
            console.log(`   位置: (${body.position.x.toFixed(1)}, ${body.position.y.toFixed(1)}, ${body.position.z.toFixed(1)})`);
            console.log(`   形状类型: ${body.shapes[0].constructor.name}`);

            // 检查物理体是否在建筑物边界框内或附近
            const bodyPos = body.position;
            const isNearBuilding = bodyPos.x >= bbox.min.x - 10 && bodyPos.x <= bbox.max.x + 10 &&
                                  bodyPos.y >= bbox.min.y - 10 && bodyPos.y <= bbox.max.y + 10 &&
                                  bodyPos.z >= bbox.min.z - 10 && bodyPos.z <= bbox.max.z + 10;

            if (isNearBuilding) {
                console.log(`   ✅ 物理体位置合理`);
            } else {
                console.log(`   ❌ 物理体位置可能不正确，距离建筑物太远`);
            }
        });
    }

    /**
     * 检查是否有有效的CANNON物理体
     */
    hasValidPhysicsBody(): boolean {
        return this.physicsBodies.length > 0;
    }

    /**
     * 获取物理体详细信息（用于调试）
     */
    getPhysicsBodyInfo(): any[] {
        return this.physicsBodies.map((body, index) => ({
            index,
            position: {
                x: body.position.x,
                y: body.position.y,
                z: body.position.z
            },
            mass: body.mass,
            type: body.type === CANNON.Body.STATIC ? '静态' : '动态',
            shapes: body.shapes.length,
            material: {
                friction: body.material?.friction || 'N/A',
                restitution: body.material?.restitution || 'N/A'
            }
        }));
    }

    /**
     * 验证物理体是否在物理世界中
     */
    validatePhysicsBodyInWorld(): boolean {
        if (!this.physicsWorld) {
            console.log('⚠️ 物理世界未初始化');
            return false;
        }

        const worldBodies = this.physicsWorld.bodies;
        let validBodies = 0;

        this.physicsBodies.forEach((body, index) => {
            if (worldBodies.includes(body)) {
                validBodies++;
                console.log(`✅ 物理体 ${index} 已在物理世界中`);
            } else {
                console.log(`❌ 物理体 ${index} 不在物理世界中`);
            }
        });

        console.log(`📊 学校建筑物理体验证: ${validBodies}/${this.physicsBodies.length} 个物理体在物理世界中`);
        return validBodies === this.physicsBodies.length;
    }

    clearPhysicsBodies(): void {
        if (this.physicsWorld) {
            this.physicsBodies.forEach(body => {
                this.physicsWorld!.removeBody(body);
            });
        }
        this.physicsBodies = [];
        console.log('🧹 学校建筑物理体已清理');
    }

    dispose(): void {
        this.clearPhysicsBodies();

        if (this.collider) {
            this.scene.remove(this.collider);
            if (this.collider.geometry) {
                this.collider.geometry.dispose();
            }
            if (this.collider.material instanceof THREE.Material) {
                this.collider.material.dispose();
            }
            this.collider = null;
        }

        if (this.visualizer) {
            this.scene.remove(this.visualizer);
            this.visualizer = null;
        }



        if (this.physicsBodyVisualization) {
            this.scene.remove(this.physicsBodyVisualization);
            if (this.physicsBodyVisualization.geometry) {
                this.physicsBodyVisualization.geometry.dispose();
            }
            if (this.physicsBodyVisualization.material instanceof THREE.Material) {
                this.physicsBodyVisualization.material.dispose();
            }
            this.physicsBodyVisualization = null;
        }

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
        console.log('🏫 SchoolBuilding 已完全清理');
    }
}