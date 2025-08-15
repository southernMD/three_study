import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { StaticGeometryGenerator } from 'three-mesh-bvh';
import { BaseModel, InitialTransform } from './BaseModel';

/**
 * 椭圆跑道类 - 创建标准的400米椭圆跑道（胶囊形）
 */
export class OvalRunningTrack extends BaseModel {
  private textureLoader: THREE.TextureLoader;
  private loadingManager: THREE.LoadingManager;
  private isTexturesLoaded = false;

  // 修改后的椭圆跑道参数
  private straightLength = 84.39; // 直道长度（米）
  private curveRadius = 25; // 弯道半径（米）- 更小的半圆
  private laneWidth = 1.22; // 每条跑道宽度（米）
  private numberOfLanes = 8; // 跑道数量

  // 预加载的纹理
  private preloadedTextures: {
    grass: {
      color: THREE.Texture;
      normal: THREE.Texture;
      roughness: THREE.Texture;
      ao: THREE.Texture;
      displacement: THREE.Texture;
    };
    track: {
      color: THREE.Texture;
      normal: THREE.Texture;
      roughness: THREE.Texture;
      ao: THREE.Texture;
      displacement: THREE.Texture;
    };
  } | null = null;

  constructor(scene: THREE.Scene, physicsWorld?: CANNON.World);
  constructor(scene: THREE.Scene, physicsWorld: CANNON.World | undefined, initialTransform: InitialTransform);
  constructor(scene: THREE.Scene, initialTransform: InitialTransform);
  constructor(
    scene: THREE.Scene,
    physicsWorldOrTransform?: CANNON.World | InitialTransform,
    initialTransform?: InitialTransform
  ) {
    super(scene, physicsWorldOrTransform as any, initialTransform as InitialTransform);
    this.modelGroup.name = 'OvalRunningTrack';

    // 初始化加载管理器
    this.loadingManager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);

    // 设置加载完成回调
    this.loadingManager.onLoad = () => {
      this.isTexturesLoaded = true;
      console.log('所有纹理加载完成，可以显示模型');
    };

    this.loadingManager.onProgress = (url, loaded, total) => {
      console.log(`纹理加载进度: ${loaded}/${total} - ${url}`);
    };

    this.loadingManager.onError = (url) => {
      console.error('纹理加载失败:', url);
    };
  }

  /**
   * 创建椭圆形跑道
   */
  async create(): Promise<void> {
    console.log('开始预加载纹理...');

    // 1. 预加载所有纹理
    await this.preloadTextures();

    // 2. 等待纹理加载完成
    await this.waitForTexturesLoaded();

    // 3. 创建模型组件（此时纹理已全部加载完成）
    this.createGrassField();
    this.createTrack();
    this.createTrackLines();
    this.createLaneNumbers();

    // 4. 创建物理平面（在模型创建完成后）
    // this.createPhysicsPlane(); // 注释掉跑道物理体

    // 5. 添加到场景（模型会立即显示，因为纹理已准备好）
    this.addToScene();

    console.log('椭圆形跑道创建完成');
  }

  /**
   * 预加载所有纹理
   */
  private async preloadTextures(): Promise<void> {
    return new Promise((resolve) => {
      // 草地纹理
      const grassColorTexture = this.textureLoader.load('/model/running/Grass008_1K-JPG/Grass008_1K-JPG_Color.jpg');
      const grassNormalTexture = this.textureLoader.load('/model/running/Grass008_1K-JPG/Grass008_1K-JPG_NormalGL.jpg');
      const grassRoughnessTexture = this.textureLoader.load('/model/running/Grass008_1K-JPG/Grass008_1K-JPG_Roughness.jpg');
      const grassAOTexture = this.textureLoader.load('/model/running/Grass008_1K-JPG/Grass008_1K-JPG_AmbientOcclusion.jpg');
      const grassDisplacementTexture = this.textureLoader.load('/model/running/Grass008_1K-JPG/Grass008_1K-JPG_Displacement.jpg');

      // 跑道纹理
      const trackColorTexture = this.textureLoader.load('/model/running/rubberized_track_1k/rubberized_track_diff_1k.jpg');
      const trackNormalTexture = this.textureLoader.load('/model/running/rubberized_track_1k/rubberized_track_nor_dx_1k.jpg');
      const trackRoughnessTexture = this.textureLoader.load('/model/running/rubberized_track_1k/rubberized_track_rough_1k.jpg');
      const trackAOTexture = this.textureLoader.load('/model/running/rubberized_track_1k/rubberized_track_ao_1k.jpg');
      const trackDisplacementTexture = this.textureLoader.load('/model/running/rubberized_track_1k/rubberized_track_disp_1k.png');

      // 存储预加载的纹理
      this.preloadedTextures = {
        grass: {
          color: grassColorTexture,
          normal: grassNormalTexture,
          roughness: grassRoughnessTexture,
          ao: grassAOTexture,
          displacement: grassDisplacementTexture
        },
        track: {
          color: trackColorTexture,
          normal: trackNormalTexture,
          roughness: trackRoughnessTexture,
          ao: trackAOTexture,
          displacement: trackDisplacementTexture
        }
      };

      resolve();
    });
  }

  /**
   * 等待纹理加载完成
   */
  private async waitForTexturesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isTexturesLoaded) {
        resolve();
        return;
      }

      const checkLoaded = () => {
        if (this.isTexturesLoaded) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };

      checkLoaded();
    });
  }

  /**
   * 创建跑道物理平面 - 手动创建椭圆形跑道物理体
   */
  private createPhysicsPlane(): void {
    if (!this.physicsWorld) {
      console.log('没有物理世界，跳过物理平面创建');
      return;
    }

    console.log('=== 手动创建椭圆形跑道物理体 ===');

    // 创建草坪物理体
    this.createGrassFieldPhysics();

    // 创建椭圆形跑道的物理几何体
    this.createOvalTrackPhysics();

    console.log('跑道物理体创建完成');
  }

  /**
   * 创建草坪物理体
   */
  private createGrassFieldPhysics(): void {
    if (!this.physicsWorld) return;

    console.log('创建草坪物理体');

    // 创建中央矩形草地物理体
    const rectWidth = this.straightLength;
    const rectHeight = this.curveRadius * 2;
    const rectGeometry = new THREE.PlaneGeometry(rectWidth, rectHeight, 20, 20);
    rectGeometry.rotateX(-Math.PI / 2);

    // 创建左半圆草地物理体
    const leftCircleGeometry = new THREE.CircleGeometry(this.curveRadius, 16, 0, Math.PI);
    leftCircleGeometry.rotateX(-Math.PI / 2);
    leftCircleGeometry.rotateZ(0); // 不需要额外旋转
    leftCircleGeometry.translate(-this.straightLength / 2, 0, 0);

    // 创建右半圆草地物理体
    const rightCircleGeometry = new THREE.CircleGeometry(this.curveRadius, 16, 0, Math.PI);
    rightCircleGeometry.rotateX(-Math.PI / 2);
    rightCircleGeometry.rotateZ(Math.PI); // 旋转180度
    rightCircleGeometry.translate(this.straightLength / 2, 0, 0);

    // 合并草地几何体
    const grassGeometries = [rectGeometry, leftCircleGeometry, rightCircleGeometry];
    const mergedGrassGeometry = BufferGeometryUtils.mergeGeometries(grassGeometries);

    // 从几何体创建物理体
    this.createTrimeshFromGeometry(mergedGrassGeometry, '草坪');

    // 创建调试可视化
    this.createGeometryDebugVisualization(mergedGrassGeometry);

    // 清理
    grassGeometries.forEach(geo => geo.dispose());
    mergedGrassGeometry.dispose();
  }

  /**
   * 创建椭圆形跑道物理体
   */
  private createOvalTrackPhysics(): void {
    // 创建椭圆形跑道的几何体
    const trackGeometry = this.createOvalTrackGeometry();

    // 从几何体创建物理体
    this.createTrimeshFromGeometry(trackGeometry, '跑道');

    // 创建调试可视化
    this.createGeometryDebugVisualization(trackGeometry);

    // 清理
    trackGeometry.dispose();
  }

  /**
   * 创建椭圆形跑道几何体 - 基于实际跑道构造
   */
  private createOvalTrackGeometry(): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];

    // 跑道参数（与createTrack()中的参数保持一致）
    const extensionLength = this.curveRadius * 2;
    const extendedStraightLength = this.straightLength + extensionLength;

    // 为每条跑道创建几何体
    for (let lane = 1; lane <= this.numberOfLanes; lane++) {
      const innerRadius = this.curveRadius + (lane - 1) * this.laneWidth;
      const outerRadius = this.curveRadius + lane * this.laneWidth;

      // 1. 上直道几何体
      const topStraightGeometry = new THREE.PlaneGeometry(extendedStraightLength, this.laneWidth, 20, 2);
      topStraightGeometry.rotateX(-Math.PI / 2);
      topStraightGeometry.translate(extensionLength / 2, 0, innerRadius + this.laneWidth / 2);
      geometries.push(topStraightGeometry);

      // 2. 下直道几何体
      const bottomStraightGeometry = new THREE.PlaneGeometry(extendedStraightLength, this.laneWidth, 20, 2);
      bottomStraightGeometry.rotateX(-Math.PI / 2);
      bottomStraightGeometry.translate(-extensionLength / 2, 0, -(innerRadius + this.laneWidth / 2));
      geometries.push(bottomStraightGeometry);

      // 3. 左弯道几何体
      const leftCurveGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 16, 4, 0, Math.PI);
      leftCurveGeometry.rotateX(-Math.PI / 2);
      leftCurveGeometry.rotateY(Math.PI / 2);
      leftCurveGeometry.rotateZ(0); // 不需要额外旋转
      leftCurveGeometry.translate(-this.straightLength / 2, 0, 0);
      geometries.push(leftCurveGeometry);

      // 4. 右弯道几何体
      const rightCurveGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 16, 4, 0, Math.PI);
      rightCurveGeometry.rotateX(-Math.PI / 2);
      rightCurveGeometry.rotateY(Math.PI / 2);
      rightCurveGeometry.rotateZ(Math.PI); // 旋转180度
      rightCurveGeometry.translate(this.straightLength / 2, 0, 0);
      geometries.push(rightCurveGeometry);
    }

    // 添加弯道中心填充区域
    // 左半圆中心
    const leftCenterGeometry = new THREE.CircleGeometry(this.curveRadius, 16, 0, Math.PI);
    leftCenterGeometry.rotateX(-Math.PI / 2);
    leftCenterGeometry.rotateZ(0); // 不需要额外旋转
    leftCenterGeometry.rotateY(Math.PI / 2);
    leftCenterGeometry.translate(-this.straightLength / 2, 0, 0);
    geometries.push(leftCenterGeometry);

    // 右半圆中心
    const rightCenterGeometry = new THREE.CircleGeometry(this.curveRadius, 16, 0, Math.PI);
    rightCenterGeometry.rotateX(-Math.PI / 2);
    rightCenterGeometry.rotateZ(Math.PI); // 旋转180度
    rightCenterGeometry.rotateY(-Math.PI / 2);
    rightCenterGeometry.translate(this.straightLength / 2, 0, 0);
    geometries.push(rightCenterGeometry);

    // 合并所有几何体
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);

    // 清理临时几何体
    geometries.forEach(geo => geo.dispose());

    console.log(`创建椭圆跑道几何体，基于实际跑道构造`);

    return mergedGeometry;
  }

  // 存储多个物理体
  private physicsBodies: CANNON.Body[] = [];

  /**
   * 从几何体创建 CANNON Trimesh
   */
  private createTrimeshFromGeometry(geometry: THREE.BufferGeometry, name: string = 'Trimesh'): void {
    if (!this.physicsWorld) return;

    const vertices = geometry.attributes.position.array;
    const indices = geometry.index ? geometry.index.array : this.generateIndices(vertices.length / 3);

    // 转换为 CANNON 格式
    const cannonVertices: number[] = [];
    const cannonFaces: number[] = [];

    // 复制顶点数据
    for (let i = 0; i < vertices.length; i += 3) {
      cannonVertices.push(vertices[i], vertices[i + 1], vertices[i + 2]);
    }

    // 复制面数据
    for (let i = 0; i < indices.length; i += 3) {
      cannonFaces.push(indices[i], indices[i + 1], indices[i + 2]);
    }

    // 创建 Trimesh 形状
    const shape = new CANNON.Trimesh(cannonVertices, cannonFaces);

    const body = new CANNON.Body({
      mass: 0, // 静态物体
      material: new CANNON.Material({
        friction: 0.8,
        restitution: 0.1
      })
    });

    body.addShape(shape);

    // 设置物理体位置和旋转
    const position = this.getPosition();
    const rotation = this.getRotation();

    body.position.set(position.x, position.y, position.z);
    body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z);

    this.physicsWorld.addBody(body);

    // 将物理体添加到数组中，而不是覆盖
    this.physicsBodies.push(body);

    // 设置主物理体为第一个创建的物理体
    if (!this.physicsBody) {
      this.physicsBody = body;
    }

    console.log(`创建 ${name} 物理体，顶点数: ${cannonVertices.length / 3}, 面数: ${cannonFaces.length / 3}`);
  }

  /**
   * 创建几何体调试可视化
   */
  private createGeometryDebugVisualization(geometry: THREE.BufferGeometry): void {
    // 创建线框网格显示实际的物理几何体
    const debugMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });

    const debugMesh = new THREE.Mesh(geometry.clone(), debugMaterial);
    debugMesh.name = 'GeometryPhysicsDebug';
    debugMesh.position.set(0, 0.1, 0); // 稍微抬高一点显示

    this.modelGroup.add(debugMesh);

    console.log('几何体物理调试可视化已添加（绿色线框）');
  }

  /**
   * 后备物理体创建方案
   */
  private createFallbackPhysics(): void {
    console.log('使用后备物理体方案');

    // 计算跑道尺寸
    const outerRadius = this.curveRadius + (this.numberOfLanes * this.laneWidth);
    const totalLength = this.straightLength + (outerRadius * 2);
    const totalWidth = outerRadius * 2;

    // 创建简单盒子物理体
    const planeShape = new CANNON.Box(new CANNON.Vec3(totalLength / 2, 0.5, totalWidth / 2));
    this.createPhysicsBody(planeShape, 0);

    console.log(`后备物理体创建完成 - 尺寸: ${totalLength.toFixed(2)} x ${totalWidth.toFixed(2)}`);
  }

  /**
   * 为没有索引的几何体生成索引
   */
  private generateIndices(vertexCount: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      indices.push(i);
    }
    return indices;
  }

  /**
   * 创建矩形草地中心区域
   */
  private createGrassField(): void {
    if (!this.preloadedTextures) {
      console.error('纹理未预加载完成');
      return;
    }

    // 只创建中央矩形草地，不包括两端的半圆
    const rectWidth = this.straightLength;
    const rectHeight = this.curveRadius * 2;
    const rectGeometry = new THREE.PlaneGeometry(rectWidth, rectHeight, 200, 200);

    // 使用预加载的草地纹理
    const { grass } = this.preloadedTextures;

    // 设置纹理重复
    const repeatX = rectWidth / 10;
    const repeatY = rectHeight / 10;
    [grass.color, grass.normal, grass.roughness, grass.ao, grass.displacement].forEach(texture => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
    });

    const grassMaterial = new THREE.MeshStandardMaterial({
      map: grass.color,
      normalMap: grass.normal,
      roughnessMap: grass.roughness,
      aoMap: grass.ao,
      displacementMap: grass.displacement,
      displacementScale: 0.1,
      roughness: 0.8,
      metalness: 0.0
    });

    const rectGrass = new THREE.Mesh(rectGeometry, grassMaterial);
    rectGrass.rotation.x = -Math.PI / 2;
    rectGrass.position.y = 0.01;
    rectGrass.name = 'GrassField';

    // 添加第二组UV坐标用于AO贴图
    rectGrass.geometry.setAttribute(
      'uv2',
      new THREE.BufferAttribute(rectGrass.geometry.attributes.uv.array, 2)
    );

    this.modelGroup.add(rectGrass);
  }

  /**
   * 创建椭圆形塑胶跑道
   */
  private createTrack(): void {
    if (!this.preloadedTextures) {
      console.error('纹理未预加载完成');
      return;
    }

    // 使用预加载的跑道纹理
    const { track } = this.preloadedTextures;

    // 设置基础纹理属性
    [track.color, track.normal, track.roughness, track.ao, track.displacement].forEach(texture => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    });

    const trackMaterial = new THREE.MeshStandardMaterial({
      map: track.color,
      normalMap: track.normal,
      roughnessMap: track.roughness,
      aoMap: track.ao,
      displacementMap: track.displacement,
      displacementScale: 0.02,
      roughness: 0.7,
      metalness: 0.1,
      aoMapIntensity: 1.0
    });
    
    // 创建每条跑道
    for (let lane = 1; lane <= this.numberOfLanes; lane++) {
      const innerRadius = this.curveRadius + (lane - 1) * this.laneWidth;
      const outerRadius = this.curveRadius + lane * this.laneWidth;
      
      // 上直道 - 向右延伸
      const extensionLength = this.curveRadius * 2; // 延伸长度为半径的2倍，更长的延伸
      const extendedStraightLength = this.straightLength + extensionLength;
      const topStraightGeometry = new THREE.PlaneGeometry(extendedStraightLength, this.laneWidth, 100, 10);

      // 为直道创建独立的材质以设置纹理重复
      const topTrackMaterial = trackMaterial.clone();
      const repeatX = extendedStraightLength / 5;
      const repeatY = this.laneWidth / 5;

      // 设置所有纹理的重复
      if (topTrackMaterial.map) topTrackMaterial.map.repeat.set(repeatX, repeatY);
      if (topTrackMaterial.normalMap) topTrackMaterial.normalMap.repeat.set(repeatX, repeatY);
      if (topTrackMaterial.roughnessMap) topTrackMaterial.roughnessMap.repeat.set(repeatX, repeatY);
      if (topTrackMaterial.aoMap) topTrackMaterial.aoMap.repeat.set(repeatX, repeatY);
      if (topTrackMaterial.displacementMap) topTrackMaterial.displacementMap.repeat.set(repeatX, repeatY);

      const topStraight = new THREE.Mesh(topStraightGeometry, topTrackMaterial);
      topStraight.rotation.x = -Math.PI / 2;
      topStraight.position.set(extensionLength / 2, 0.02, innerRadius + this.laneWidth / 2); // 向右延伸

      // 添加第二组UV坐标
      topStraight.geometry.setAttribute(
        'uv2',
        new THREE.BufferAttribute(topStraight.geometry.attributes.uv.array, 2)
      );

      this.modelGroup.add(topStraight);

      // 下直道 - 向左延伸（方向相反）
      const bottomTrackMaterial = trackMaterial.clone();

      // 设置所有纹理的重复
      if (bottomTrackMaterial.map) bottomTrackMaterial.map.repeat.set(repeatX, repeatY);
      if (bottomTrackMaterial.normalMap) bottomTrackMaterial.normalMap.repeat.set(repeatX, repeatY);
      if (bottomTrackMaterial.roughnessMap) bottomTrackMaterial.roughnessMap.repeat.set(repeatX, repeatY);
      if (bottomTrackMaterial.aoMap) bottomTrackMaterial.aoMap.repeat.set(repeatX, repeatY);
      if (bottomTrackMaterial.displacementMap) bottomTrackMaterial.displacementMap.repeat.set(repeatX, repeatY);

      const bottomStraight = new THREE.Mesh(topStraightGeometry, bottomTrackMaterial);
      bottomStraight.rotation.x = -Math.PI / 2;
      bottomStraight.position.set(-extensionLength / 2, 0.02, -(innerRadius + this.laneWidth / 2)); // 向左延伸

      // 添加第二组UV坐标
      bottomStraight.geometry.setAttribute(
        'uv2',
        new THREE.BufferAttribute(bottomStraight.geometry.attributes.uv.array, 2)
      );

      this.modelGroup.add(bottomStraight);
      
      // 左弯道
      const leftCurveGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 32, 8, 0, Math.PI);
      const leftCurveMaterial = trackMaterial.clone();
      const circumference = Math.PI * (innerRadius + outerRadius) / 2; // 平均周长的一半
      const curveRepeatX = circumference / 10;
      const curveRepeatY = this.laneWidth / 5;

      // 设置所有纹理的重复
      if (leftCurveMaterial.map) leftCurveMaterial.map.repeat.set(curveRepeatX, curveRepeatY);
      if (leftCurveMaterial.normalMap) leftCurveMaterial.normalMap.repeat.set(curveRepeatX, curveRepeatY);
      if (leftCurveMaterial.roughnessMap) leftCurveMaterial.roughnessMap.repeat.set(curveRepeatX, curveRepeatY);
      if (leftCurveMaterial.aoMap) leftCurveMaterial.aoMap.repeat.set(curveRepeatX, curveRepeatY);
      if (leftCurveMaterial.displacementMap) leftCurveMaterial.displacementMap.repeat.set(curveRepeatX, curveRepeatY);

      const leftCurve = new THREE.Mesh(leftCurveGeometry, leftCurveMaterial);
      leftCurve.rotation.x = -Math.PI / 2;
      leftCurve.rotation.z = Math.PI / 2;
      leftCurve.position.set(-this.straightLength / 2, 0.02, 0);

      // 添加第二组UV坐标
      leftCurve.geometry.setAttribute(
        'uv2',
        new THREE.BufferAttribute(leftCurve.geometry.attributes.uv.array, 2)
      );

      this.modelGroup.add(leftCurve);

      // 右弯道
      const rightCurveMaterial = trackMaterial.clone();

      // 设置所有纹理的重复
      if (rightCurveMaterial.map) rightCurveMaterial.map.repeat.set(curveRepeatX, curveRepeatY);
      if (rightCurveMaterial.normalMap) rightCurveMaterial.normalMap.repeat.set(curveRepeatX, curveRepeatY);
      if (rightCurveMaterial.roughnessMap) rightCurveMaterial.roughnessMap.repeat.set(curveRepeatX, curveRepeatY);
      if (rightCurveMaterial.aoMap) rightCurveMaterial.aoMap.repeat.set(curveRepeatX, curveRepeatY);
      if (rightCurveMaterial.displacementMap) rightCurveMaterial.displacementMap.repeat.set(curveRepeatX, curveRepeatY);

      const rightCurve = new THREE.Mesh(leftCurveGeometry, rightCurveMaterial);
      rightCurve.rotation.x = -Math.PI / 2;
      rightCurve.rotation.z = -Math.PI / 2;
      rightCurve.position.set(this.straightLength / 2, 0.02, 0);

      // 添加第二组UV坐标
      rightCurve.geometry.setAttribute(
        'uv2',
        new THREE.BufferAttribute(rightCurve.geometry.attributes.uv.array, 2)
      );

      this.modelGroup.add(rightCurve);
    }

    // 填充半圆弯道中心的空白区域
    this.fillCurveCenter(trackMaterial);
  }

  /**
   * 填充半圆弯道中心的空白区域
   */
  private fillCurveCenter(trackMaterial: THREE.MeshStandardMaterial): void {
    // 左半圆中心填充
    const leftCenterGeometry = new THREE.CircleGeometry(this.curveRadius, 32, 0, Math.PI);
    const leftCenterMaterial = trackMaterial.clone();
    const centerRepeat = this.curveRadius / 5;

    // 设置所有纹理的重复
    if (leftCenterMaterial.map) leftCenterMaterial.map.repeat.set(centerRepeat, centerRepeat);
    if (leftCenterMaterial.normalMap) leftCenterMaterial.normalMap.repeat.set(centerRepeat, centerRepeat);
    if (leftCenterMaterial.roughnessMap) leftCenterMaterial.roughnessMap.repeat.set(centerRepeat, centerRepeat);
    if (leftCenterMaterial.aoMap) leftCenterMaterial.aoMap.repeat.set(centerRepeat, centerRepeat);
    if (leftCenterMaterial.displacementMap) leftCenterMaterial.displacementMap.repeat.set(centerRepeat, centerRepeat);

    const leftCenter = new THREE.Mesh(leftCenterGeometry, leftCenterMaterial);
    leftCenter.rotation.x = -Math.PI / 2;
    leftCenter.rotation.z = Math.PI / 2;
    leftCenter.position.set(-this.straightLength / 2, 0.02, 0);

    // 添加第二组UV坐标
    leftCenter.geometry.setAttribute(
      'uv2',
      new THREE.BufferAttribute(leftCenter.geometry.attributes.uv.array, 2)
    );

    this.modelGroup.add(leftCenter);

    // 右半圆中心填充
    const rightCenterMaterial = trackMaterial.clone();

    // 设置所有纹理的重复
    if (rightCenterMaterial.map) rightCenterMaterial.map.repeat.set(centerRepeat, centerRepeat);
    if (rightCenterMaterial.normalMap) rightCenterMaterial.normalMap.repeat.set(centerRepeat, centerRepeat);
    if (rightCenterMaterial.roughnessMap) rightCenterMaterial.roughnessMap.repeat.set(centerRepeat, centerRepeat);
    if (rightCenterMaterial.aoMap) rightCenterMaterial.aoMap.repeat.set(centerRepeat, centerRepeat);
    if (rightCenterMaterial.displacementMap) rightCenterMaterial.displacementMap.repeat.set(centerRepeat, centerRepeat);

    const rightCenter = new THREE.Mesh(leftCenterGeometry, rightCenterMaterial);
    rightCenter.rotation.x = -Math.PI / 2;
    rightCenter.rotation.z = -Math.PI / 2;
    rightCenter.position.set(this.straightLength / 2, 0.02, 0);

    // 添加第二组UV坐标
    rightCenter.geometry.setAttribute(
      'uv2',
      new THREE.BufferAttribute(rightCenter.geometry.attributes.uv.array, 2)
    );

    this.modelGroup.add(rightCenter);
  }

  /**
   * 创建跑道线条
   */
  private createTrackLines(): void {
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const extensionLength = this.curveRadius * 2; // 延伸长度为半径的2倍，更长的延伸
    const extendedStraightLength = this.straightLength + extensionLength;

    // 创建跑道分隔线
    for (let i = 1; i < this.numberOfLanes; i++) {
      const radius = this.curveRadius + i * this.laneWidth;

      // 上直线 - 向右延伸
      const topLineGeometry = new THREE.PlaneGeometry(extendedStraightLength, 0.1);
      const topLine = new THREE.Mesh(topLineGeometry, lineMaterial);
      topLine.rotation.x = -Math.PI / 2;
      topLine.position.set(extensionLength / 2, 0.03, radius); // 向右延伸
      this.modelGroup.add(topLine);

      // 下直线 - 向左延伸
      const bottomLine = new THREE.Mesh(topLineGeometry, lineMaterial);
      bottomLine.rotation.x = -Math.PI / 2;
      bottomLine.position.set(-extensionLength / 2, 0.03, -radius); // 向左延伸
      this.modelGroup.add(bottomLine);

      // 左弯道线
      const leftLineGeometry = new THREE.RingGeometry(radius - 0.05, radius + 0.05, 32, 1, 0, Math.PI);
      const leftLine = new THREE.Mesh(leftLineGeometry, lineMaterial);
      leftLine.rotation.x = -Math.PI / 2;
      leftLine.rotation.z = Math.PI / 2;
      leftLine.position.set(-this.straightLength / 2, 0.03, 0);
      this.modelGroup.add(leftLine);

      // 右弯道线
      const rightLine = new THREE.Mesh(leftLineGeometry, lineMaterial);
      rightLine.rotation.x = -Math.PI / 2;
      rightLine.rotation.z = -Math.PI / 2;
      rightLine.position.set(this.straightLength / 2, 0.03, 0);
      this.modelGroup.add(rightLine);
    }
    
    // 创建起跑线
    this.createStartLine();
  }

  /**
   * 创建起跑线
   */
  private createStartLine(): void {
    const startLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const trackOuterRadius = this.curveRadius + this.numberOfLanes * this.laneWidth;
    
    const startLineGeometry = new THREE.PlaneGeometry(0.2, trackOuterRadius - this.curveRadius);
    const startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.set(this.straightLength / 2, 0.04, (this.curveRadius + trackOuterRadius) / 2);
    startLine.name = 'StartLine';
    
    this.modelGroup.add(startLine);
  }

  /**
   * 创建跑道数字标记
   */
  private createLaneNumbers(): void {
    for (let i = 1; i <= this.numberOfLanes; i++) {
      // 在两端都创建数字
      this.createLaneNumber(i, 'top');    // 上端
      this.createLaneNumber(i, 'bottom'); // 下端
    }
  }

  /**
   * 创建单个跑道数字
   */
  private createLaneNumber(laneNumber: number, position: 'top' | 'bottom'): void {
    // 创建数字纹理
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d')!;

    // 绘制数字
    context.fillStyle = 'white';
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = 'black';
    context.font = 'bold 80px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(laneNumber.toString(), 64, 64);

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });

    // 创建数字几何体 - 调整大小以更好地贴合跑道宽度
    const numberSize = this.laneWidth * 0.8; // 数字大小为跑道宽度的80%
    const geometry = new THREE.PlaneGeometry(numberSize, numberSize);
    const numberMesh = new THREE.Mesh(geometry, material);

    // 计算位置
    const radius = this.curveRadius + (laneNumber - 0.5) * this.laneWidth;

    if (position === 'top') {
      // 上端数字位置
      numberMesh.position.set(this.straightLength / 2 - 3, 0.1, radius);
    } else {
      // 下端数字位置
      numberMesh.position.set(-this.straightLength / 2 + 3, 0.1, radius);
    }

    numberMesh.rotation.x = -Math.PI / 2;
    numberMesh.name = `LaneNumber_${laneNumber}_${position}`;

    this.modelGroup.add(numberMesh);
  }

  /**
   * 获取跑道组（兼容性方法）
   */
  getTrackGroup(): THREE.Group {
    return this.modelGroup;
  }

  /**
   * 重写 dispose 方法以清理所有物理体
   */
  dispose(): void {
    // 清理所有物理体
    if (this.physicsWorld && this.physicsBodies.length > 0) {
      this.physicsBodies.forEach(body => {
        this.physicsWorld!.removeBody(body);
      });
      this.physicsBodies = [];
    }

    // 调用父类的 dispose 方法
    super.dispose();
  }

  /**
   * 获取跑道信息
   */
  getTrackInfo() {
    return {
      straightLength: this.straightLength,
      curveRadius: this.curveRadius,
      laneWidth: this.laneWidth,
      numberOfLanes: this.numberOfLanes,
      position: this.getPosition()
    };
  }
}
