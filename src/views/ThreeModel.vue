<script setup lang="ts">

import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GridHelper } from 'three/src/helpers/GridHelper.js';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';
// 导入管理器类
import { MMDModelManager } from '../models/managers/MMDModelManager';
import { TestBoxManager } from '../models/managers/TestBoxManager';
import { SceneManager } from '../models/managers/SceneManager';
import { ObjectManager } from '../models/managers/ObjectManager';
import { PHYSICS_CONSTANTS, getGroundFullSize } from '../constants/PhysicsConstants';
import { GlobalState } from '../types/GlobalState';
import { BVHPhysics } from '../physics/BVHPhysics';

import Stats from 'stats.js';

// 扩展Window接口，添加statsMonitor属性
declare global {
  interface Window {
    statsMonitor?: Stats;
    lastTime?: number;
    targetFPS?: number; // 目标FPS
    frameInterval?: number; // 帧间隔时间
  }
}

// BVH物理系统已集成到模型中，不再需要CANNON

let scene: THREE.Scene
const dom = ref()
let width = innerWidth
let height = innerHeight
let camera: THREE.PerspectiveCamera
let lookCamera: THREE.PerspectiveCamera
let isCameraRender = true
let hadRenderCamera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let cameraControls: OrbitControls
const gui = new GUI()

// 管理器实例
let mmdModelManager: MMDModelManager
let testBoxManager: TestBoxManager
let sceneManager: SceneManager
let objectManager: ObjectManager

// 全局状态对象
let globalState: GlobalState

const guiFn = {
  changeCamera: () => {
    if (isCameraRender) {
      hadRenderCamera = camera
      isCameraRender = false
    } else {
      hadRenderCamera = lookCamera
      isCameraRender = true
    }
  },
  reSetReimu: () => {
    // 使用MMDModelManager重置位置
    mmdModelManager.resetPosition();
  },
  toggleHelpers: () => {
    // 使用MMDModelManager切换辅助线
    mmdModelManager.toggleHelpers();
  },
  toggleCapsuleVisibility: () => {
    if (mmdModelManager && mmdModelManager.isModelLoaded()) {
      const model = mmdModelManager.getModel();
      if (model) {
        model.toggleCapsuleVisibility();
      }
    }
  },
  // 演示强制走路动画
  forceWalk: () => {
    mmdModelManager.forceWalk();
  },
  // 演示强制站立动画
  forceStand: () => {
    mmdModelManager.forceStand();
  },
  // 清理所有发射的小球
  clearSpheres: () => {
    if (mmdModelManager && mmdModelManager.isModelLoaded()) {
      const model = mmdModelManager.getModel();
      if (model) {
        model.clearAllSpheres(scene);
      }
    }
  },
  // 获取当前小球数量
  getSphereCount: () => {
    if (mmdModelManager && mmdModelManager.isModelLoaded()) {
      const model = mmdModelManager.getModel();
      if (model) {
        const count = model.getSphereCount();
        console.log(`当前小球数量: ${count}`);
        return count;
      }
    }
    return 0;
  },
  // 显示碰撞体信息
  showColliderInfo: () => {
    const bvhPhysics = globalState.bvhPhysics;
    if (!bvhPhysics) {
      console.log('❌ BVH物理系统未初始化');
      return;
    }

    const colliders = bvhPhysics.getColliders();
    const mapping = bvhPhysics.getColliderMapping();

    console.log('🔍 碰撞体信息:');
    console.log(`  分离碰撞体数量: ${colliders.size}`);

    if (colliders.size > 0) {
      console.log('  碰撞体列表:');
      colliders.forEach((collider, objectId) => {
        const object = mapping.get(objectId);
        console.log(`    - ID: ${objectId}`);
        console.log(`      名称: ${collider.name}`);
        console.log(`      对象: ${object?.name || 'Unknown'}`);
        console.log(`      顶点数: ${collider.geometry.attributes.position?.count || 0}`);
      });
    } else {
      const unifiedCollider = bvhPhysics.getCollider();
      if (unifiedCollider) {
        console.log('  使用统一碰撞体:');
        console.log(`    名称: ${unifiedCollider.name}`);
        console.log(`    顶点数: ${unifiedCollider.geometry.attributes.position?.count || 0}`);
      } else {
        console.log('  没有可用的碰撞体');
      }
    }
  },
  // 演示在当前位置创建一个碰撞箱
  createBoxHere: () => {
    mmdModelManager.createBoxHere((color, position) => {
      testBoxManager.createBox(color, position);
    });
  },
  // 创建一组掉落的盒子
  createFallingBoxesNow: () => {
    testBoxManager.createFallingBoxes();
  },
  // 显示物理世界信息（已移除 PhysicsManager）
  showPhysicsInfo: () => {
    console.log('ℹ️ PhysicsManager 已移除，现在使用 BVH 物理系统');
  },
  // 检查碰撞检测状态
  checkCollisionStatus: () => {
    console.log('🔍 检查BVH碰撞检测状态...');

    // 检查全局BVH物理系统
    if (globalState.bvhPhysics) {
      const colliders = globalState.bvhPhysics.getColliders();
      console.log(`📊 BVH碰撞体数量: ${colliders.length}`);
      colliders.forEach((collider, index) => {
        console.log(`  碰撞体 ${index}: ${collider.name}, 顶点数: ${collider.geometry.attributes.position.count}`);
      });
    } else {
      console.log('❌ 全局BVH物理系统未找到');
    }

    // 检查人物BVH物理状态
    const model = mmdModelManager?.getModel();
    if (model && 'debugBVHPhysics' in model) {
      (model as any).debugBVHPhysics();
    } else {
      console.log('❌ 人物模型未找到或不支持BVH物理检查');
    }
  },
  // 检查BVH物理状态
  checkPhysicsSync: () => {
    console.log('🔍 检查BVH物理状态...');
    const model = mmdModelManager?.getModel();
    if (model && 'getBVHPhysicsStatus' in model) {
      const status = (model as any).getBVHPhysicsStatus();
      console.log('📊 BVH物理状态:', status);
    } else {
      console.log('❌ 人物模型未找到或不支持BVH物理状态检查');
    }
  },



  // 显示跑道信息
  showTrackInfo: () => {
    const mainTrack = objectManager?.getMainTrack();
    if (mainTrack) {
      console.log('跑道信息:', mainTrack.getTrackInfo());
    }
  },
  // 重置跑道位置
  resetTrackPosition: () => {
    const mainTrack = objectManager?.getMainTrack();
    if (mainTrack) {
      mainTrack.setPosition(0, 0, 0);
    }
  },
  // 显示所有对象信息
  showAllObjects: () => {
    console.log('所有静态对象:', objectManager?.getAllObjects());
    console.log('对象类型统计:', objectManager?.getObjectTypeStats());
    console.log('对象总数:', objectManager?.getObjectCount());
  },
  // 显示物理常量信息
  showPhysicsConstants: () => {
    console.log('🔧 物理世界常量:');
    console.log('   📏 地面半尺寸:', `X=${PHYSICS_CONSTANTS.GROUND_SIZE_X}, Z=${PHYSICS_CONSTANTS.GROUND_SIZE_Z}, Y=${PHYSICS_CONSTANTS.GROUND_SIZE_Y}`);
    console.log('   📐 地面完整尺寸:', getGroundFullSize());
    console.log('   🌍 重力:', PHYSICS_CONSTANTS.GRAVITY);
    console.log('   🤝 地面摩擦力:', PHYSICS_CONSTANTS.GROUND_FRICTION);
    console.log('   ⚡ 地面弹性:', PHYSICS_CONSTANTS.GROUND_RESTITUTION);
  },



}
// 地面尺寸控制对象
const groundSizeControl = {
  sizeX: PHYSICS_CONSTANTS.GROUND_SIZE_X,
  sizeX: PHYSICS_CONSTANTS.GROUND_SIZE_X,
  sizeZ: PHYSICS_CONSTANTS.GROUND_SIZE_Z,
  updateGroundSize: () => {
    // 更新物理常量
    (PHYSICS_CONSTANTS as any).GROUND_SIZE_X = groundSizeControl.sizeX;
    (PHYSICS_CONSTANTS as any).GROUND_SIZE_Z = groundSizeControl.sizeZ;

    // 🔥 通过 ObjectManager 重新生成地面和边界墙体
    if (objectManager) {
      objectManager.regenerateGroundAndWalls().then(() => {
        // 重新生成后恢复墙体缩放
        const wall = objectManager.getWall('boundary-walls');
        if (wall) {
          wall.wallScale = wallScaleControl.scale;
          wall.recreateBoundaryWalls();
          console.log(`✅ 地面更新完成，墙体缩放恢复: ${wallScaleControl.scale}`);
        }

        // 🔥 重新生成BVH碰撞体
        setTimeout(() => {
          setupBVHCollision();
        }, 200);
      });
      console.log(`🔄 地面尺寸更新: X=${groundSizeControl.sizeX}, Z=${groundSizeControl.sizeZ}`);
    }
  }
}

// 墙体缩放控制对象
const wallScaleControl = {
  scale: 14, // 默认缩放值
  updateWallScale: () => {
    console.log('🔧 尝试更新墙体缩放...');
    const wall = objectManager?.getWall('boundary-walls');
    console.log('🔍 获取到的墙体对象:', wall);
    if (wall) {
      wall.wallScale = wallScaleControl.scale;
      wall.recreateBoundaryWalls();
      console.log(`✅ 墙体缩放已更新为: ${wallScaleControl.scale}`);
    } else {
      console.log('❌ 边界墙体不存在，可能已被清除');
      // 尝试重新生成墙体
      if (objectManager) {
        objectManager.regenerateBoundaryWalls().then(() => {
          const newWall = objectManager.getWall('boundary-walls');
          if (newWall) {
            newWall.wallScale = wallScaleControl.scale;
            newWall.recreateBoundaryWalls();
            console.log(`✅ 重新生成后墙体缩放已更新为: ${wallScaleControl.scale}`);
          }
        });
      }
    }
  }
}

// 物理体可视化控制对象
const physicsVisualizationControl = {
  showPhysicsWalls: true,

  // BVH 可视化控制（参考 characterMovement.js）
  displayCollider: false,
  displayBVH: false,
  visualizeDepth: 10,
  togglePhysicsVisualization: () => {
    // 查找所有物理墙体可视化对象
    const physicsVisualizations: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.name.includes('PhysicsWallVisualization')) {
        physicsVisualizations.push(child);
        console.log(`🔍 找到物理体可视化: ${child.name}, 位置(${child.position.x.toFixed(1)}, ${child.position.y.toFixed(1)}, ${child.position.z.toFixed(1)}), 可见性: ${child.visible}`);
      }
    });

    // 切换可见性
    physicsVisualizations.forEach(obj => {
      obj.visible = physicsVisualizationControl.showPhysicsWalls;
    });

    console.log(`🔍 物理墙体可视化: ${physicsVisualizationControl.showPhysicsWalls ? '显示' : '隐藏'} (${physicsVisualizations.length}个对象)`);
  },

  // BVH 可视化控制方法（参考 characterMovement.js）
  toggleCollider: () => {
    console.log(`🔄 切换碰撞体可视化: ${physicsVisualizationControl.displayCollider ? '开启' : '关闭'}`);

    // 🔥 控制 BVHPhysics 系统的碰撞体可视化
    if (globalState.bvhPhysics) {
      globalState.bvhPhysics.params.displayCollider = physicsVisualizationControl.displayCollider;
      globalState.bvhPhysics.updateVisualization();
      console.log(`   🌍 BVHPhysics 碰撞体: ${physicsVisualizationControl.displayCollider ? '显示' : '隐藏'}`);
    }

    // 控制学校建筑的碰撞体可视化
    const schoolBuilding = objectManager?.getMainSchoolBuilding();
    if (schoolBuilding && 'setVisualizationParams' in schoolBuilding) {
      (schoolBuilding as any).setVisualizationParams({
        displayCollider: physicsVisualizationControl.displayCollider
      });
      console.log(`   🏢 学校建筑碰撞体: ${physicsVisualizationControl.displayCollider ? '显示' : '隐藏'}`);
    }

    // 控制墙体的碰撞体可视化
    const boundaryWalls = objectManager?.getWall('boundary-walls');
    if (boundaryWalls && 'setVisualizationParams' in boundaryWalls) {
      (boundaryWalls as any).setVisualizationParams({
        displayCollider: physicsVisualizationControl.displayCollider
      });
      console.log(`   🧱 边界墙体碰撞体: ${physicsVisualizationControl.displayCollider ? '显示' : '隐藏'}`);
    }
  },

  toggleBVH: () => {
    console.log(`🔄 切换BVH辅助线可视化: ${physicsVisualizationControl.displayBVH ? '开启' : '关闭'}`);

    // 🔥 控制 BVHPhysics 系统的BVH可视化
    if (globalState.bvhPhysics) {
      globalState.bvhPhysics.params.displayBVH = physicsVisualizationControl.displayBVH;
      globalState.bvhPhysics.updateVisualization();
      console.log(`   🌍 BVHPhysics BVH辅助线: ${physicsVisualizationControl.displayBVH ? '显示' : '隐藏'}`);
    }

    // 控制学校建筑的BVH可视化
    const schoolBuilding = objectManager?.getMainSchoolBuilding();
    if (schoolBuilding && 'setVisualizationParams' in schoolBuilding) {
      (schoolBuilding as any).setVisualizationParams({
        displayBVH: physicsVisualizationControl.displayBVH
      });
      console.log(`   🏢 学校建筑BVH: ${physicsVisualizationControl.displayBVH ? '显示' : '隐藏'}`);
    }

    // 控制墙体的BVH可视化
    const boundaryWalls = objectManager?.getWall('boundary-walls');
    if (boundaryWalls && 'setVisualizationParams' in boundaryWalls) {
      (boundaryWalls as any).setVisualizationParams({
        displayBVH: physicsVisualizationControl.displayBVH
      });
      console.log(`   🧱 边界墙体BVH: ${physicsVisualizationControl.displayBVH ? '显示' : '隐藏'}`);
    }
  },

  updateBVHDepth: () => {
    console.log(`🔄 更新BVH可视化深度: ${physicsVisualizationControl.visualizeDepth}`);

    // 🔥 控制 BVHPhysics 系统的BVH可视化深度
    if (globalState.bvhPhysics) {
      globalState.bvhPhysics.params.visualizeDepth = physicsVisualizationControl.visualizeDepth;
      globalState.bvhPhysics.updateVisualization();
      console.log(`   🌍 BVHPhysics BVH深度: ${physicsVisualizationControl.visualizeDepth}`);
    }

    // 控制学校建筑的BVH可视化深度
    const schoolBuilding = objectManager?.getMainSchoolBuilding();
    if (schoolBuilding && 'setVisualizationParams' in schoolBuilding) {
      (schoolBuilding as any).setVisualizationParams({
        visualizeDepth: physicsVisualizationControl.visualizeDepth
      });
      console.log(`   🏢 学校建筑BVH深度: ${physicsVisualizationControl.visualizeDepth}`);
    }

    // 控制墙体的BVH可视化深度
    const boundaryWalls = objectManager?.getWall('boundary-walls');
    if (boundaryWalls && 'setVisualizationParams' in boundaryWalls) {
      (boundaryWalls as any).setVisualizationParams({
        visualizeDepth: physicsVisualizationControl.visualizeDepth
      });
      console.log(`   🧱 边界墙体BVH深度: ${physicsVisualizationControl.visualizeDepth}`);
    }
  }
}

gui.add(guiFn, 'changeCamera').name('改变相机')
gui.add(guiFn, 'reSetReimu').name('回到原点')
gui.add(guiFn, 'toggleHelpers').name('显示/隐藏人物辅助线')
gui.add(guiFn, 'toggleCapsuleVisibility').name('显示/隐藏胶囊体')
gui.add(guiFn, 'forceWalk').name('播放走路动画')
gui.add(guiFn, 'forceStand').name('播放站立动画')
gui.add(guiFn, 'createBoxHere').name('在当前位置创建箱子')
gui.add(guiFn, 'createFallingBoxesNow').name('创建掉落的盒子')
gui.add(guiFn, 'showPhysicsInfo').name('显示物理信息')
gui.add(guiFn, 'checkCollisionStatus').name('检查碰撞状态')
gui.add(guiFn, 'checkPhysicsSync').name('检查物理同步')

// 小球发射功能
const sphereFolder = gui.addFolder('小球发射功能')
sphereFolder.add(guiFn, 'clearSpheres').name('清理所有小球')
sphereFolder.add(guiFn, 'getSphereCount').name('显示小球数量')
sphereFolder.add(guiFn, 'showColliderInfo').name('显示碰撞体信息')
sphereFolder.add({ info: '右键点击屏幕发射小球' }, 'info').name('使用说明').listen()
sphereFolder.open()


// 对象管理器控制
const objectFolder = gui.addFolder('静态对象管理')
objectFolder.add(guiFn, 'showTrackInfo').name('显示跑道信息')
objectFolder.add(guiFn, 'resetTrackPosition').name('重置跑道位置')
objectFolder.add(guiFn, 'showAllObjects').name('显示所有对象')
objectFolder.add(guiFn, 'showPhysicsConstants').name('显示物理常量')

// 地面尺寸控制
const groundSizeFolder = gui.addFolder('地面尺寸控制')
groundSizeFolder.add(groundSizeControl, 'sizeX', 50, 5000, 10)
  .name('地面X轴半尺寸')
  .onFinishChange(() => {
    groundSizeControl.updateGroundSize();
  })
groundSizeFolder.add(groundSizeControl, 'sizeZ', 50, 5000, 10)
  .name('地面Z轴半尺寸')
  .onFinishChange(() => {
    groundSizeControl.updateGroundSize();
  })

// 墙体缩放控制
const wallScaleFolder = gui.addFolder('墙体缩放控制')
wallScaleFolder.add(wallScaleControl, 'scale', 0.1, 50, 0.1)
  .name('墙体缩放')
  .onChange(() => {
    wallScaleControl.updateWallScale();
  })
wallScaleFolder.add(wallScaleControl, 'updateWallScale').name('手动更新缩放')

// 跑道变换控制
const trackTransformControl = {
  positionX: 0,
  positionZ: 0,
  rotationY: 0,
  scale: 8, // 默认值，会在跑道创建后更新
  updateTrackTransform: () => {
    const mainTrack = objectManager?.getMainTrack();
    if (mainTrack) {
      // 设置位置（只控制XZ，Y保持为0）
      mainTrack.setPosition(trackTransformControl.positionX, 0, trackTransformControl.positionZ);

      // 设置旋转（只控制Y轴旋转）
      mainTrack.setRotationDegrees(0, trackTransformControl.rotationY, 0);

      // 设置缩放
      mainTrack.setUniformScale(trackTransformControl.scale);

      // 更新所有健身器材的物理体和可视化
      if ('updateAllGymEquipmentPhysicsAndVisualization' in mainTrack) {
        (mainTrack as any).updateAllGymEquipmentPhysicsAndVisualization();
      }

      console.log(`跑道变换更新: 位置(${trackTransformControl.positionX}, 0, ${trackTransformControl.positionZ}), 旋转Y: ${trackTransformControl.rotationY}°, 缩放: ${trackTransformControl.scale}`);
      console.log(`健身器材物理体和可视化已同步更新`);
    }
  },
  resetTrack: () => {
    // 重置到ObjectManager中设置的初始值
    const mainTrack = objectManager?.getMainTrack();
    if (mainTrack) {
      const position = mainTrack.getPosition();
      const rotation = mainTrack.getRotationDegrees();
      const scale = mainTrack.getScale();

      trackTransformControl.positionX = position.x;
      trackTransformControl.positionZ = position.z;
      trackTransformControl.rotationY = rotation.y;
      trackTransformControl.scale = scale.x; // 假设是统一缩放

      // 更新GUI显示
      trackFolder.controllers.forEach(controller => {
        controller.updateDisplay();
      });
    }
  },
  // 从跑道对象同步当前值到GUI
  syncFromTrack: () => {
    const mainTrack = objectManager?.getMainTrack();
    if (mainTrack) {
      const position = mainTrack.getPosition();
      const rotation = mainTrack.getRotationDegrees();
      const scale = mainTrack.getScale();

      trackTransformControl.positionX = position.x;
      trackTransformControl.positionZ = position.z;
      trackTransformControl.rotationY = rotation.y;
      trackTransformControl.scale = scale.x; // 假设是统一缩放

      // 更新GUI显示
      trackFolder.controllers.forEach(controller => {
        controller.updateDisplay();
      });

      console.log(`从跑道同步GUI值: 位置(${position.x}, ${position.z}), 旋转Y: ${rotation.y}°, 缩放: ${scale.x}`);
    }
  }
}

const trackFolder = gui.addFolder('跑道变换控制')
trackFolder.add(trackTransformControl, 'positionX', -5000, 5000, 1)
  .name('X轴位置')
  .onChange(() => {
    trackTransformControl.updateTrackTransform();
  })
trackFolder.add(trackTransformControl, 'positionZ', -5000, 5000, 1)
  .name('Z轴位置')
  .onChange(() => {
    trackTransformControl.updateTrackTransform();
  })
trackFolder.add(trackTransformControl, 'rotationY', -180, 180, 1)
  .name('Y轴旋转(度)')
  .onChange(() => {
    trackTransformControl.updateTrackTransform();
  })
trackFolder.add(trackTransformControl, 'scale', 0.1, 20, 0.1)
  .name('整体缩放')
  .onChange(() => {
    trackTransformControl.updateTrackTransform();
  })
trackFolder.add(trackTransformControl, 'updateTrackTransform').name('手动更新变换')
trackFolder.add(trackTransformControl, 'syncFromTrack').name('同步GUI值')
trackFolder.add(trackTransformControl, 'resetTrack').name('重置跑道')

// 物理体可视化控制
const physicsVisualizationFolder = gui.addFolder('物理体可视化')
physicsVisualizationFolder.add(physicsVisualizationControl, 'showPhysicsWalls')
  .name('显示物理墙体')
  .onChange(() => {
    physicsVisualizationControl.togglePhysicsVisualization();
  })

// BVH 可视化子文件夹（参考 characterMovement.js）
const bvhFolder = physicsVisualizationFolder.addFolder('BVH 碰撞检测')
bvhFolder.add(physicsVisualizationControl, 'displayCollider')
  .name('显示碰撞体')
  .onChange(() => {
    physicsVisualizationControl.toggleCollider();
  })
bvhFolder.add(physicsVisualizationControl, 'displayBVH')
  .name('显示BVH辅助线')
  .onChange(() => {
    physicsVisualizationControl.toggleBVH();
  })
bvhFolder.add(physicsVisualizationControl, 'visualizeDepth', 1, 20, 1)
  .name('BVH可视化深度')
  .onChange(() => {
    physicsVisualizationControl.updateBVHDepth();
  })
bvhFolder.open()

physicsVisualizationFolder.add(physicsVisualizationControl, 'togglePhysicsVisualization').name('切换可视化')

// 性能设置控制
const performanceControl = {
  targetFPS: 60,
  lowQualityMode: false,
  updateFPSTarget: () => {
    window.targetFPS = performanceControl.targetFPS;
    window.frameInterval = 1000 / window.targetFPS;
    console.log(`目标FPS已设置为: ${window.targetFPS}, 帧间隔: ${window.frameInterval.toFixed(2)}ms`);
  },
  toggleLowQualityMode: () => {
    // 切换低质量模式
    if (renderer) {
      if (performanceControl.lowQualityMode) {
        // 低质量模式
        renderer.setPixelRatio(1.0);
        renderer.shadowMap.enabled = false;
        console.log('已启用低质量模式');
      } else {
        // 恢复正常质量
        renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
        console.log('已恢复正常质量模式');
      }
    }
  }
}

// 性能设置文件夹
const performanceFolder = gui.addFolder('性能设置')
performanceFolder.add(performanceControl, 'targetFPS', 15, 60, 5)
  .name('目标FPS')
  .onChange(() => {
    performanceControl.updateFPSTarget();
  })
performanceFolder.add(performanceControl, 'lowQualityMode')
  .name('低质量模式')
  .onChange(() => {
    performanceControl.toggleLowQualityMode();
  })
performanceFolder.add(performanceControl, 'updateFPSTarget').name('应用FPS设置')
performanceFolder.open()

// gridHelper现在由SceneManager管理

onMounted(async () => {

    // 初始化场景管理器
    sceneManager = new SceneManager();
    scene = sceneManager.getScene();

    // 初始化BVH物理系统
    const bvhPhysics = new BVHPhysics(scene);

    // 初始化全局状态对象
    globalState = {
      bvhPhysics: bvhPhysics
    };

    // 创建相机和渲染器
    camera = sceneManager.createCamera(width, height);
    renderer = sceneManager.createRenderer(dom.value, width, height);

    // 初始化灯光
    sceneManager.initializeLights();

    // 创建场景控制器
    const controls = sceneManager.createSceneControls();

    // 初始化其他管理器
    mmdModelManager = new MMDModelManager(scene, renderer, globalState);
    testBoxManager = new TestBoxManager(scene);

    // 加载模型
    await mmdModelManager.loadModel();

    // 获取相机和控制器
    lookCamera = mmdModelManager.getLookCamera();
    cameraControls = mmdModelManager.getCameraControls();

    console.log('📷 相机初始化状态:', {
      lookCamera: !!lookCamera,
      cameraControls: !!cameraControls,
      camera: !!camera,
      lookCameraType: lookCamera?.type,
      cameraType: camera?.type
    });

    // 初始化测试物体
    // testBoxManager.initializeTestObjects();

    // 创建对象管理器并创建椭圆跑道
    objectManager = new ObjectManager(scene);

    await objectManager.create();

    // 等待跑道创建完成后同步GUI值
    setTimeout(() => {
      trackTransformControl.syncFromTrack();
      // 更新GUI显示
      trackFolder.controllers.forEach(controller => {
        controller.updateDisplay();
      });
    }, 1000); // 给跑道创建一些时间

    // 🔥 地面现在由 ObjectManager 管理，在 objectManager.create() 中创建

    // 🔥 设置BVH碰撞检测 - 等待所有模型加载完毕
    setTimeout(() => {
      setupBVHCollision();
    }, 3000); // 增加等待时间，确保所有模型都已加载并添加到场景

    // 🔥 监听墙体重新创建事件，重新生成BVH碰撞体
    window.addEventListener('wallsRecreated', () => {
      console.log('🔄 收到墙体重新创建事件，重新生成BVH碰撞体');
      setTimeout(() => {
        setupBVHCollision();
      }, 200); // 稍微延迟确保墙体完全创建完毕
    });

    hadRenderCamera = camera

    // 添加窗口事件监听器
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 添加右键发射小球事件监听器
    let mouseDownPosition = { x: 0, y: 0 };

    renderer.domElement.addEventListener('mousedown', (event: MouseEvent) => {
      if (event.button === 2) { // 右键
        mouseDownPosition.x = event.clientX;
        mouseDownPosition.y = event.clientY;
      }
    });

    renderer.domElement.addEventListener('mouseup', (event: MouseEvent) => {
      if (event.button === 2) { // 右键抬起
        // 检查是否是点击（而不是拖拽）
        const totalDelta = Math.abs(event.clientX - mouseDownPosition.x) +
                          Math.abs(event.clientY - mouseDownPosition.y);
        if (totalDelta > 2) return;

        // 计算鼠标在标准化设备坐标中的位置
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

        // 发射小球
        if (mmdModelManager && mmdModelManager.isModelLoaded()) {
          const model = mmdModelManager.getModel();
          if (model && hadRenderCamera) {
            model.shootSphere(hadRenderCamera, scene, mouseX, mouseY);
          }
        }
      }
    });

    // 阻止右键菜单
    renderer.domElement.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
    });

    // 创建性能监视器
    const stats = new Stats();
    document.body.appendChild(stats.dom);
    
    // 将stats对象存储到全局变量，以便在animate函数中使用
    window.statsMonitor = stats;
    
    // 设置目标FPS和帧间隔时间
    window.targetFPS = 60; // 设置目标FPS为30
    window.frameInterval = 1000 / window.targetFPS; // 计算帧间隔时间
    window.lastTime = 0; // 初始化上一帧时间
    
    // 相机辅助器更新现在在animate函数中处理
    animate(); // 启动渲染循环
})

onUnmounted(() => {
  // 移除窗口事件监听器
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);

  // 清理小球资源
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model) {
      model.disposeSphereShooter(scene);
    }
  }

  // 清理所有管理器资源
  if (mmdModelManager) {
    mmdModelManager.cleanup();
  }

  // PhysicsManager 已移除

  if (sceneManager) {
    sceneManager.cleanup();
  }

  // 清理性能监视器
  if (window.statsMonitor && window.statsMonitor.dom && window.statsMonitor.dom.parentNode) {
    window.statsMonitor.dom.parentNode.removeChild(window.statsMonitor.dom);
    window.statsMonitor = undefined;
  }
})

// 模型实例现在由MMDModelManager管理

// CreateCamera、CreateRender、createAxesHelper函数现在由SceneManager处理

// loadModel函数现在由MMDModelManager处理

// 全局声明现在通过GlobalState接口管理，不再使用window全局变量

// createBox函数现在由TestBoxManager处理

// createRamp函数现在由TestBoxManager处理

function animate(timestamp?: number) {
  // 帧率控制
  if (!timestamp) timestamp = performance.now();
  
  // 计算帧间隔
  const elapsed = timestamp - (window.lastTime || 0);
  
  // 如果时间间隔小于目标帧间隔，则跳过此帧
  if (window.frameInterval && elapsed < window.frameInterval) {
    requestAnimationFrame(animate);
    return;
  }
  
  // 更新上一帧时间
  window.lastTime = timestamp - (elapsed % (window.frameInterval || 16.67));
  
  requestAnimationFrame(animate);
  
  // 更新性能监视器
  if (window.statsMonitor) {
    window.statsMonitor.update();
  }

  // 1. 更新MMD模型（处理用户输入，同步到物理身体）
  if (mmdModelManager) {
    mmdModelManager.update(1/120);
  }

  // 2. 更新BVH物理系统（集成在模型中）
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model) {
      // 使用BVH物理系统更新模型
      model.updateMovement();

      // 更新发射的小球物理（传递相机进行视野优化）
      model.updateProjectileSpheres(1/120, hadRenderCamera);

      // 只在需要调试时才更新辅助器（包围盒、胶囊体等）
      // 注释掉这些行可以提高性能
      // model.updateModelHelpers();
      // model.updateCameraHelpers();
    }
  }

  // 3. 更新相机跟随
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();

    if (model && lookCamera && cameraControls) {
      model.updateCameraFollow(lookCamera, cameraControls);
    }
  }

  if (sceneManager) {
    // 使用当前选择的渲染相机
    sceneManager.update();
    sceneManager.render(hadRenderCamera);
  }
}

// light函数现在由SceneManager处理

window.addEventListener('resize', function () {
  width = window.innerWidth
  height = window.innerHeight
  if (sceneManager) {
    sceneManager.handleResize(width, height);
  }
})

function handleKeyDown(event: KeyboardEvent) {
  if (mmdModelManager) {
    mmdModelManager.handleKeyDown(event);
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (mmdModelManager) {
    mmdModelManager.handleKeyUp(event);
  }
}

// keyMap现在由MMDModelManager管理

// PhysicsManager 已移除，现在使用 BVH 物理系统

// createFallingBoxes函数现在由TestBoxManager处理

// 🔥 新的统一BVH碰撞检测设置
function setupBVHCollision() {
  console.log('🔧 设置BVH碰撞检测...');

  // 获取人物模型
  const model = mmdModelManager?.getModel();
  if (!model) {
    console.log('⚠️ 人物模型未找到');
    return;
  }

  // 获取BVH物理系统
  const bvhPhysics = globalState.bvhPhysics;
  if (!bvhPhysics) {
    console.log('⚠️ BVH物理系统未初始化');
    return;
  }

  // 🔥 新功能：创建分离的碰撞体组
  console.log('🌍 开始创建分离碰撞体组...');
  const separateColliders = bvhPhysics.createSeparateColliders(objectManager.getAllObjects());

  if (separateColliders.size > 0) {
    console.log(`✅ 分离碰撞体组创建成功! 数量: ${separateColliders.size}`);

    // 打印每个碰撞体的信息
    separateColliders.forEach((collider, objectId) => {
      console.log(`  - ${objectId}: ${collider.name}`);
    });
  } else {
    console.log('⚠️ 分离碰撞体组创建失败，回退到统一碰撞体...');

    // 回退到统一碰撞体
    const sceneCollider = bvhPhysics.createSceneCollider(objectManager.getAllObjects());
    if (sceneCollider) {
      console.log('✅ 统一场景碰撞体创建成功');
    } else {
      console.log('❌ 统一场景碰撞体创建失败');
    }
  }

  console.log('🎯 BVH碰撞检测设置完成');
}

</script>

<template>
  <div class="model" ref="dom"></div>
</template>

<style scoped></style>
