import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * TestBoxManager类 - 专门管理测试方块的类
 * 整合了创建各种测试物体的功能，包括盒子、斜坡、掉落物体等
 */
export class TestBoxManager {
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * 创建一个盒子
   * @param color 盒子颜色
   * @param position 盒子位置
   * @returns 创建的盒子网格
   */
  createBox(color: THREE.ColorRepresentation, position: THREE.Vector3): THREE.Mesh {
    // 创建Three.js几何体
    const boxSize = { width: 10, height: 10, depth: 10 };
    const boxGeometry = new THREE.BoxGeometry(boxSize.width, boxSize.height, boxSize.depth);
    const boxMaterial = new THREE.MeshStandardMaterial({ color });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(position.x, position.y, position.z);
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene.add(box);
    
    // 添加简单的线框辅助器
    // const boxHelper = new THREE.BoxHelper(box, 0x00ff00);
    // this.scene.add(boxHelper);
    
    // 如果物理管理器存在，创建物理对象
    if (this.physicsManager) {
      // 创建Cannon.js物理体
      const boxShape = new CANNON.Box(new CANNON.Vec3(boxSize.width/2, boxSize.height/2, boxSize.depth/2));

      // 创建物理身体 - 设置质量为非零值，使其受重力影响
      const boxBody = new CANNON.Body({
        mass: 5, // 设置质量为5，使其受重力影响
        position: new CANNON.Vec3(position.x, position.y, position.z),
        material: new CANNON.Material({
          friction: 0.3,
          restitution: 0.3 // 弹性
        })
      });

      // 添加形状到物理身体
      boxBody.addShape(boxShape);

      // 为物体添加碰撞事件监听
      // boxBody.addEventListener('collide', (event) => {
      //   console.log('箱子碰撞事件', event);
      // });

      // 添加到物理世界
      this.physicsManager.addBody(boxBody);
      this.physicsManager.associateBodyWithMesh(boxBody, box);

      console.log(`创建箱子物理对象: 位置(${position.x}, ${position.y}, ${position.z}), 质量: 5kg`);
    }
    
    return box;
  }

  /**
   * 创建斜坡
   * @param position 斜坡位置
   * @param size 斜坡尺寸
   * @param angle 斜坡角度（度）
   * @param color 斜坡颜色
   * @returns 创建的斜坡网格
   */
  createRamp(position: THREE.Vector3, size: THREE.Vector3, angle: number, color: THREE.ColorRepresentation): THREE.Mesh {
    // 创建斜坡几何体
    const rampGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const rampMaterial = new THREE.MeshStandardMaterial({ color });
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    
    // 设置斜坡位置
    ramp.position.copy(position);
    
    // 旋转斜坡
    const angleRad = angle * Math.PI / 180;
    ramp.rotation.x = angleRad;
    
    // 添加到场景
    this.scene.add(ramp);
    
    // 添加简单的线框辅助器
    // const boxHelper = new THREE.BoxHelper(ramp, 0x00ff00);
    // this.scene.add(boxHelper);
    
    // 添加调试信息
    console.log("创建斜坡:", {
      位置: position.clone(),
      尺寸: size.clone(),
      角度: angle,
      旋转弧度: angleRad
    });
    
    // 如果物理管理器存在，创建物理对象
    if (this.physicsManager) {
      // 创建Cannon.js物理体
      const rampShape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));

      // 创建物理身体
      const rampBody = new CANNON.Body({
        mass: 0, // 质量为0表示静态物体
        position: new CANNON.Vec3(position.x, position.y, position.z),
        material: new CANNON.Material({
          friction: 0.3, // 摩擦系数
          restitution: 0.2 // 弹性系数
        })
      });

      // 添加形状并旋转
      rampBody.addShape(rampShape);
      rampBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), angleRad);

      // 为斜坡添加碰撞事件监听
      // rampBody.addEventListener('collide', (event) => {
      //   console.log('斜坡碰撞事件', event);
      // });

      // 添加到物理世界
      this.physicsManager.addBody(rampBody);
      this.physicsManager.associateBodyWithMesh(rampBody, ramp);

      console.log(`创建斜坡物理对象: 位置(${position.x}, ${position.y}, ${position.z}), 角度${angle}度`);
    }
    
    return ramp;
  }

  /**
   * 创建多个掉落的盒子，用于测试物理效果
   */
  createFallingBoxes(): void {
    // 创建不同高度的掉落盒子
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 40 - 20; // -20到20之间的随机值
      const z = Math.random() * 40 - 20;
      const y = 20 + i * 5; // 不同高度
      const color = new THREE.Color(Math.random(), Math.random(), Math.random());
      
      this.createBox(color, new THREE.Vector3(x, y, z));
    }
    
    console.log("创建了10个掉落的盒子");
  }

  /**
   * 创建边界盒子
   */
  createBoundaryBoxes(): void {
    // 创建静态盒子（边界）
    this.createBox(0xff0000, new THREE.Vector3(0, 5, -105));
    this.createBox(0xffff00, new THREE.Vector3(0, 5, 105));
    this.createBox(0x66ccff, new THREE.Vector3(105, 5, 0));
    this.createBox(0xff00fff, new THREE.Vector3(-105, 5, 0));
    
    console.log("创建了边界盒子");
  }

  /**
   * 创建测试斜坡
   */
  createTestRamps(): void {
    // 创建不同角度的斜坡用于测试
    this.createRamp(new THREE.Vector3(0, 0, -60), new THREE.Vector3(80, 2, 55), 20, 0xD2691E); // 宽一点的20度斜坡
    
    console.log("创建了测试斜坡");
  }

  /**
   * 显示物理世界信息 - 现在由PhysicsManager处理
   */

  /**
   * 初始化所有测试物体
   */
  initializeTestObjects(): void {
    this.createBoundaryBoxes();
    this.createTestRamps();
    // 可以选择性地创建掉落盒子
    // this.createFallingBoxes();
  }
}
