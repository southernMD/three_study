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
import { PhysicsManager } from '../models/managers/PhysicsManager';
import { ObjectManager } from '../models/managers/ObjectManager';
import { PHYSICS_CONSTANTS, getGroundFullSize } from '../constants/PhysicsConstants';
import { GlobalState } from '../types/GlobalState';
// 导入cannon-es物理引擎
import * as CANNON from 'cannon-es';

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
let physicsManager: PhysicsManager
let objectManager: ObjectManager

// 全局状态对象
let globalState: GlobalState

const guiFn = {
  changeCamera: () => {
    if (isCameraRender) {
      hadRenderCamera = lookCamera
      isCameraRender = false
    } else {
      hadRenderCamera = camera
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
  // 演示强制走路动画
  forceWalk: () => {
    mmdModelManager.forceWalk();
  },
  // 演示强制站立动画
  forceStand: () => {
    mmdModelManager.forceStand();
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
  // 显示物理世界信息
  showPhysicsInfo: () => {
    if (physicsManager) {
      physicsManager.showPhysicsInfo();
      physicsManager.checkCollisionDetection();
    }
  },
  // 检查碰撞检测状态
  checkCollisionStatus: () => {
    console.log('🔍 开始检查碰撞检测状态...');

    // 检查人物物理体
    const model = mmdModelManager?.getModel();
    if (model) {
      const modelValid = model.validatePhysicsBodyInWorld();
      const modelInfo = model.getPhysicsBodyInfo();
      console.log('👤 人物物理体状态:', modelValid ? '✅ 正常' : '❌ 异常');
      console.log('👤 人物物理体信息:', modelInfo);
    }

    // 建筑物理体检查已移除

    // 检查物理世界总体状态
    if (physicsManager) {
      physicsManager.checkCollisionDetection();
    }
  },
  // 检查物理同步
  checkPhysicsSync: () => {
    console.log('🔍 检查物理同步...');
    const model = mmdModelManager?.getModel();
    if (model && 'checkPhysicsSync' in model) {
      (model as any).checkPhysicsSync();
    } else {
      console.log('❌ 人物模型未找到或不支持物理同步检查');
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

  // 测试BVH碰撞检测修复
  testBVHFix: () => {
    console.log('🔧 测试BVH碰撞检测修复...');
    const model = mmdModelManager?.getModel();

    if (!model || !model.mesh) {
      console.log('❌ 人物模型未找到');
      return;
    }

    // 记录当前位置和相机位置
    const currentPos = model.mesh.position.clone();
    const lookCamera = mmdModelManager?.getLookCamera();
    const currentCameraPos = lookCamera ? lookCamera.position.clone() : null;

    console.log(`📍 测试前人物位置: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`);
    if (currentCameraPos) {
      console.log(`📷 测试前相机位置: (${currentCameraPos.x.toFixed(1)}, ${currentCameraPos.y.toFixed(1)}, ${currentCameraPos.z.toFixed(1)})`);
    }

    // 启用BVH碰撞检测
    if ('toggleBVHCollisionEnabled' in model) {
      (model as any).toggleBVHCollisionEnabled();
    }

    // 等待几帧，然后检查位置变化
    setTimeout(() => {
      const newPos = model.mesh.position.clone();
      const newCameraPos = lookCamera ? lookCamera.position.clone() : null;

      console.log(`📍 测试后人物位置: (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)}, ${newPos.z.toFixed(1)})`);
      if (newCameraPos) {
        console.log(`📷 测试后相机位置: (${newCameraPos.x.toFixed(1)}, ${newCameraPos.y.toFixed(1)}, ${newCameraPos.z.toFixed(1)})`);
      }

      // 计算位置变化
      const posChange = currentPos.distanceTo(newPos);
      const cameraChange = currentCameraPos && newCameraPos ? currentCameraPos.distanceTo(newCameraPos) : 0;

      console.log(`📏 人物位置变化: ${posChange.toFixed(3)}`);
      console.log(`📏 相机位置变化: ${cameraChange.toFixed(3)}`);

      // 检查是否有异常的位置变化
      if (posChange > 0.1) {
        console.log('⚠️ 人物位置发生了异常变化！');
      } else {
        console.log('✅ 人物位置保持稳定');
      }

      if (cameraChange > 0.1) {
        console.log('⚠️ 相机位置发生了异常变化！');
      } else {
        console.log('✅ 相机位置保持稳定');
      }

      // 获取BVH状态
      if ('getBVHCollisionStatus' in model) {
        const status = (model as any).getBVHCollisionStatus();
        console.log(`🔍 BVH状态: 启用=${status.bvhEnabled}, 距建筑=${status.distanceToBuilding ? status.distanceToBuilding.toFixed(1) : 'N/A'}`);
      }
    }, 100);
  },

  // 测试BVH碰撞检测状态
  testBVHCollision: () => {
    console.log('🧪 测试BVH碰撞检测状态...');
    const model = mmdModelManager?.getModel();
    const schoolBuilding = objectManager?.getMainSchoolBuilding();

    if (!model || !schoolBuilding) {
      console.log('❌ 模型或建筑物未找到');
      return;
    }

    // 获取BVH碰撞状态
    if ('getBVHCollisionStatus' in model) {
      const status = (model as any).getBVHCollisionStatus();
      console.log('🔍 BVH碰撞状态:');
      console.log(`   BVH启用: ${status.bvhEnabled ? '是' : '否'}`);
      console.log(`   在地面: ${status.isOnGround ? '是' : '否'}`);
      console.log(`   速度: (${status.velocity.x.toFixed(2)}, ${status.velocity.y.toFixed(2)}, ${status.velocity.z.toFixed(2)})`);
      console.log(`   注册的碰撞体数量: ${status.colliderCount}`);
      console.log(`   人物位置: (${status.position.x.toFixed(1)}, ${status.position.y.toFixed(1)}, ${status.position.z.toFixed(1)})`);
      console.log(`   到建筑距离: ${status.distanceToBuilding ? status.distanceToBuilding.toFixed(1) : 'N/A'}`);
    }

    // 检查建筑物BVH状态
    const collider = schoolBuilding.getCollider();
    if (collider) {
      console.log('🏢 建筑物BVH信息:');
      console.log(`   碰撞体名称: ${collider.name}`);
      console.log(`   顶点数: ${collider.geometry.attributes.position.count}`);
      console.log(`   BVH树存在: ${(collider.geometry as any).boundsTree ? '是' : '否'}`);
      console.log(`   可见性: ${collider.visible ? '可见' : '隐藏'}`);

      // 检查建筑物边界框
      const bbox = new THREE.Box3().setFromObject(collider);
      console.log(`   建筑边界框:`);
      console.log(`     min: (${bbox.min.x.toFixed(1)}, ${bbox.min.y.toFixed(1)}, ${bbox.min.z.toFixed(1)})`);
      console.log(`     max: (${bbox.max.x.toFixed(1)}, ${bbox.max.y.toFixed(1)}, ${bbox.max.z.toFixed(1)})`);
    } else {
      console.log('❌ 建筑物BVH碰撞体未创建');
    }
  },

  // 测试BVH碰撞检测范围
  testBVHRange: () => {
    console.log('🎯 测试BVH碰撞检测范围...');
    const model = mmdModelManager?.getModel();

    if (!model || !model.mesh) {
      console.log('❌ 人物模型未找到');
      return;
    }

    // 记录当前位置
    const currentPos = model.mesh.position.clone();
    console.log(`📍 当前位置: (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`);

    // 测试不同位置的BVH状态
    const testPositions = [
      { name: '原点', pos: new THREE.Vector3(0, 0, 0) },
      { name: '远离建筑', pos: new THREE.Vector3(100, 0, 100) },
      { name: '接近建筑', pos: new THREE.Vector3(0, 0, 50) },
      { name: '建筑内部', pos: new THREE.Vector3(0, 0, 0) }
    ];

    testPositions.forEach(test => {
      // 临时移动人物到测试位置
      model.mesh.position.copy(test.pos);

      // 获取BVH状态
      if ('getBVHCollisionStatus' in model) {
        const status = (model as any).getBVHCollisionStatus();
        console.log(`🔍 ${test.name} (${test.pos.x}, ${test.pos.y}, ${test.pos.z}):`);
        console.log(`   到建筑距离: ${status.distanceToBuilding ? status.distanceToBuilding.toFixed(1) : 'N/A'}`);
        console.log(`   是否在检测范围内: ${status.distanceToBuilding && status.distanceToBuilding <= 15 ? '是' : '否'}`);
      }
    });

    // 恢复原始位置
    model.mesh.position.copy(currentPos);
    console.log('📍 已恢复到原始位置');
  },

  // 测试碰撞事件
  testCollisionEvent: () => {
    console.log('🎯 测试碰撞事件...');
    const model = mmdModelManager?.getModel();

    if (!model || !model.mesh) {
      console.log('❌ 人物模型未找到');
      return;
    }

    // 记录移动前的位置
    const beforePos = model.mesh.position.clone();
    console.log(`📍 移动前位置: (${beforePos.x.toFixed(1)}, ${beforePos.y.toFixed(1)}, ${beforePos.z.toFixed(1)})`);

    // 尝试向前移动一小步
    const moveDirection = new THREE.Vector3(0, 0, 1);
    model.mesh.position.add(moveDirection);

    // 手动触发BVH碰撞检测
    if ('handleBVHCollision' in model) {
      (model as any).handleBVHCollision();
    }

    // 检查移动后的位置
    const afterPos = model.mesh.position.clone();
    console.log(`📍 移动后位置: (${afterPos.x.toFixed(1)}, ${afterPos.y.toFixed(1)}, ${afterPos.z.toFixed(1)})`);

    const distance = beforePos.distanceTo(afterPos);
    console.log(`📏 实际移动距离: ${distance.toFixed(3)}`);

    if (distance < 0.9) {
      console.log('🔥 检测到碰撞！位置被调整');
    } else {
      console.log('✅ 没有碰撞，正常移动');
    }
  },

  // 测试BVH对齐
  testBVHAlignment: () => {
    console.log('🎯 测试BVH对齐...');
    const schoolBuilding = objectManager?.getMainSchoolBuilding();
    const model = mmdModelManager?.getModel();

    if (!schoolBuilding || !model) {
      console.log('❌ 建筑物或模型未找到');
      return;
    }

    // 检查建筑物位置
    const buildingObj = schoolBuilding.getBuildingObject();
    if (buildingObj) {
      const buildingPos = buildingObj.position;
      console.log(`🏢 建筑物位置: (${buildingPos.x.toFixed(1)}, ${buildingPos.y.toFixed(1)}, ${buildingPos.z.toFixed(1)})`);
    }

    // 检查碰撞体位置
    const collider = schoolBuilding.getCollider();
    if (collider) {
      const colliderPos = collider.position;
      console.log(`🔴 碰撞体位置: (${colliderPos.x.toFixed(1)}, ${colliderPos.y.toFixed(1)}, ${colliderPos.z.toFixed(1)})`);

      // 检查几何体边界框
      collider.geometry.computeBoundingBox();
      if (collider.geometry.boundingBox) {
        const bbox = collider.geometry.boundingBox;
        console.log(`📦 碰撞体边界框:`);
        console.log(`   min: (${bbox.min.x.toFixed(1)}, ${bbox.min.y.toFixed(1)}, ${bbox.min.z.toFixed(1)})`);
        console.log(`   max: (${bbox.max.x.toFixed(1)}, ${bbox.max.y.toFixed(1)}, ${bbox.max.z.toFixed(1)})`);
      }
    }

    // 检查人物位置
    if (model.mesh) {
      const playerPos = model.mesh.position;
      console.log(`👤 人物位置: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)})`);
    }
  },

  // 测试启用/禁用BVH碰撞检测
  toggleBVHCollision: () => {
    console.log('🎯 切换BVH碰撞检测...');
    const model = mmdModelManager?.getModel();

    if (!model) {
      console.log('❌ 人物模型未找到');
      return;
    }

    // 切换BVH碰撞检测状态
    if ('toggleBVHCollisionEnabled' in model) {
      (model as any).toggleBVHCollisionEnabled();

      // 切换后立即显示调试信息
      if ('debugBVHCollision' in model) {
        (model as any).debugBVHCollision();
      }
    } else {
      console.log('❌ 模型不支持BVH碰撞检测切换');
    }
  },

  // 调试BVH碰撞检测状态
  debugBVH: () => {
    console.log('🔍 调试BVH碰撞检测状态...');
    const model = mmdModelManager?.getModel();

    if (!model) {
      console.log('❌ 人物模型未找到');
      return;
    }

    if ('debugBVHCollision' in model) {
      (model as any).debugBVHCollision();
    } else {
      console.log('❌ 模型不支持BVH调试');
    }
  },


}

// 地面尺寸控制对象
const groundSizeControl = {
  sizeX: PHYSICS_CONSTANTS.GROUND_SIZE_X,
  sizeZ: PHYSICS_CONSTANTS.GROUND_SIZE_Z,
  updateGroundSize: () => {
    // 更新物理常量
    (PHYSICS_CONSTANTS as any).GROUND_SIZE_X = groundSizeControl.sizeX;
    (PHYSICS_CONSTANTS as any).GROUND_SIZE_Z = groundSizeControl.sizeZ;

    // 重新生成地面和边界墙体
    if (objectManager) {
      objectManager.regenerateGroundAndWalls().then(() => {
        // 重新生成后恢复墙体缩放
        const wall = objectManager.getWall('boundary-walls');
        if (wall) {
          wall.wallScale = wallScaleControl.scale;
          wall.recreateBoundaryWalls();
          console.log(`✅ 地面更新完成，墙体缩放恢复: ${wallScaleControl.scale}`);
        }
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
    const schoolBuilding = objectManager?.getMainSchoolBuilding();
    if (schoolBuilding && 'setVisualizationParams' in schoolBuilding) {
      (schoolBuilding as any).setVisualizationParams({
        displayCollider: physicsVisualizationControl.displayCollider
      });
      console.log(`🔄 碰撞体可视化: ${physicsVisualizationControl.displayCollider ? '开启' : '关闭'}`);
    }
  },

  toggleBVH: () => {
    const schoolBuilding = objectManager?.getMainSchoolBuilding();
    if (schoolBuilding && 'setVisualizationParams' in schoolBuilding) {
      (schoolBuilding as any).setVisualizationParams({
        displayBVH: physicsVisualizationControl.displayBVH
      });
      console.log(`🔄 BVH可视化: ${physicsVisualizationControl.displayBVH ? '开启' : '关闭'}`);
    }
  },

  updateBVHDepth: () => {
    const schoolBuilding = objectManager?.getMainSchoolBuilding();
    if (schoolBuilding && 'setVisualizationParams' in schoolBuilding) {
      (schoolBuilding as any).setVisualizationParams({
        visualizeDepth: physicsVisualizationControl.visualizeDepth
      });
      console.log(`🔄 BVH可视化深度: ${physicsVisualizationControl.visualizeDepth}`);
    }
  }
}

gui.add(guiFn, 'changeCamera').name('改变相机')
gui.add(guiFn, 'reSetReimu').name('回到原点')
gui.add(guiFn, 'toggleHelpers').name('显示/隐藏人物辅助线')
gui.add(guiFn, 'forceWalk').name('播放走路动画')
gui.add(guiFn, 'forceStand').name('播放站立动画')
gui.add(guiFn, 'createBoxHere').name('在当前位置创建箱子')
gui.add(guiFn, 'createFallingBoxesNow').name('创建掉落的盒子')
gui.add(guiFn, 'showPhysicsInfo').name('显示物理信息')
gui.add(guiFn, 'checkCollisionStatus').name('检查碰撞状态')
gui.add(guiFn, 'checkPhysicsSync').name('检查物理同步')
gui.add(guiFn, 'testBVHCollision').name('测试BVH状态')
gui.add(guiFn, 'testCollisionEvent').name('测试碰撞事件')
gui.add(guiFn, 'testBVHAlignment').name('测试BVH对齐')
gui.add(guiFn, 'toggleBVHCollision').name('切换BVH碰撞检测')

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

// gridHelper现在由SceneManager管理

onMounted(async () => {

    // 初始化全局状态对象（只保留真正全局的状态）
    globalState = {
      physicsWorld: undefined,
      physicsBodies: undefined
    };

    // 初始化场景管理器
    sceneManager = new SceneManager();
    scene = sceneManager.getScene();

    // 创建相机和渲染器
    camera = sceneManager.createCamera(width, height);
    renderer = sceneManager.createRenderer(dom.value, width, height);

    // 初始化灯光
    sceneManager.initializeLights();

    // 创建场景控制器
    const controls = sceneManager.createSceneControls();

    // 初始化物理管理器
    physicsManager = new PhysicsManager(scene, globalState);

    // 初始化其他管理器
    mmdModelManager = new MMDModelManager(scene, renderer, globalState);
    testBoxManager = new TestBoxManager(scene, physicsManager);

    // 加载模型
    await mmdModelManager.loadModel();

    // 获取相机和控制器
    lookCamera = mmdModelManager.getLookCamera();
    cameraControls = mmdModelManager.getCameraControls();

    // 初始化测试物体
    // testBoxManager.initializeTestObjects();

    // 创建对象管理器并创建椭圆跑道
    objectManager = new ObjectManager(scene, globalState, physicsManager);

    // 等待跑道创建完成后同步GUI值
    setTimeout(() => {
      trackTransformControl.syncFromTrack();
      // 更新GUI显示
      trackFolder.controllers.forEach(controller => {
        controller.updateDisplay();
      });
    }, 1000); // 给跑道创建一些时间

    // 创建物理地面
    physicsManager.createGround();

    // 设置BVH碰撞检测
    setTimeout(() => {
      setupBVHCollision();
    }, 1500); // 等待建筑物加载完成

    hadRenderCamera = camera

    // 添加窗口事件监听器
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 相机辅助器更新现在在animate函数中处理
    animate(); // 启动渲染循环
})

onUnmounted(() => {
  // 移除窗口事件监听器
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);

  // 清理所有管理器资源
  if (mmdModelManager) {
    mmdModelManager.cleanup();
  }

  if (physicsManager) {
    physicsManager.cleanup();
  }

  if (sceneManager) {
    sceneManager.cleanup();
  }
})

// 模型实例现在由MMDModelManager管理

// CreateCamera、CreateRender、createAxesHelper函数现在由SceneManager处理

// loadModel函数现在由MMDModelManager处理

// 全局声明现在通过GlobalState接口管理，不再使用window全局变量

// createBox函数现在由TestBoxManager处理

// createRamp函数现在由TestBoxManager处理

function animate() {
  requestAnimationFrame(animate);

  // 1. 更新MMD模型（处理用户输入，同步到物理身体）
  if (mmdModelManager) {
    mmdModelManager.update(1/120);
  }

  // 2. 更新物理世界（计算碰撞和物理响应）
  if (physicsManager) {
    physicsManager.update();
  }

  // 3. 将物理引擎的计算结果同步回模型
  if (mmdModelManager && mmdModelManager.isModelLoaded()) {
    const model = mmdModelManager.getModel();
    if (model) {
      model.syncFromPhysics();
      // 更新模型的辅助器
      model.updateModelHelpers();
      model.updateCameraHelpers();
    }
  }

  // 4. 更新场景
  if (sceneManager) {
    sceneManager.update();
  }

  // 5. 渲染场景
  if (sceneManager) {
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

// initPhysicsWorld和createGround函数现在由PhysicsManager处理

// createFallingBoxes函数现在由TestBoxManager处理

// 设置BVH碰撞检测
function setupBVHCollision() {
  console.log('🔧 设置BVH碰撞检测...');

  // 获取人物模型
  const model = mmdModelManager?.getModel();
  if (!model || !('registerBVHCollider' in model)) {
    console.log('⚠️ 人物模型未找到或不支持BVH碰撞检测');
    return;
  }

  // 获取学校建筑
  const schoolBuilding = objectManager?.getMainSchoolBuilding();
  if (!schoolBuilding) {
    console.log('⚠️ 学校建筑未找到');
    return;
  }

  // 获取建筑物的BVH碰撞体
  const collider = schoolBuilding.getCollider();
  if (collider) {
    (model as any).registerBVHCollider(collider);
    console.log('✅ 学校建筑BVH碰撞体已注册到人物模型');
  } else {
    console.log('⚠️ 学校建筑BVH碰撞体未创建，稍后重试...');
    // 如果BVH还没创建，再等一会儿重试
    setTimeout(() => {
      const retryCollider = schoolBuilding.getCollider();
      if (retryCollider) {
        (model as any).registerBVHCollider(retryCollider);
        console.log('✅ 学校建筑BVH碰撞体已注册到人物模型（重试成功）');
      } else {
        console.log('❌ 学校建筑BVH碰撞体创建失败');
      }
    }, 1000);
  }
}

</script>

<template>
  <div class="model" ref="dom"></div>
</template>

<style scoped></style>
