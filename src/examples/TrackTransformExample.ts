import * as THREE from 'three';
import { OvalRunningTrack } from '../models/architecture/OvalRunningTrack';

/**
 * 跑道变换示例 - 展示如何使用BaseModel的变换功能和构造函数重载
 */
export class TrackTransformExample {
  private scene: THREE.Scene;
  private tracks: OvalRunningTrack[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createTracksWithDifferentConstructors();
  }

  /**
   * 演示不同的构造函数重载用法
   */
  private createTracksWithDifferentConstructors(): void {
    // 1. 默认构造函数 - 无初始变换
    const track1 = new OvalRunningTrack(this.scene);
    this.tracks.push(track1);

    // 2. 只传入初始变换参数
    const track2 = new OvalRunningTrack(this.scene, {
      position: { x: 100, y: 0, z: 0 },
      rotation: { x: 0, y: 45, z: 0 }, // 45度旋转
      scale: 0.8 // 统一缩放到80%
    });
    this.tracks.push(track2);

    // 3. 传入物理世界和初始变换参数
    const track3 = new OvalRunningTrack(this.scene, undefined, {
      position: { x: -100, y: 0, z: 100 },
      rotation: { x: 0, y: -30, z: 0 },
      scale: { x: 1.2, y: 1.0, z: 0.9 } // 非统一缩放
    });
    this.tracks.push(track3);

    console.log('创建了3个不同初始变换的跑道');
  }

  async init(): Promise<void> {
    // 创建所有跑道
    for (let i = 0; i < this.tracks.length; i++) {
      await this.tracks[i].create();
      console.log(`跑道${i + 1}创建完成，位置:`, this.tracks[i].getPosition());
      console.log(`跑道${i + 1}旋转:`, this.tracks[i].getRotationDegrees());
      console.log(`跑道${i + 1}缩放:`, this.tracks[i].getScale());
    }

    // 演示各种变换操作
    this.demonstrateTransforms();
  }

  private demonstrateTransforms(): void {
    console.log('=== 跑道变换示例 ===');

    // 使用第一个跑道进行变换演示
    const track = this.tracks[0];

    // 1. 设置位置
    console.log('1. 设置跑道位置到 (10, 0, 5)');
    track.setPosition(10, 0, 5);
    console.log('当前位置:', track.getPosition());

    // 2. 设置旋转（使用角度）
    console.log('2. 绕Y轴旋转45度');
    track.setRotationDegrees(0, 45, 0);
    console.log('当前旋转角度:', track.getRotationDegrees());

    // 3. 设置缩放
    console.log('3. 缩放到1.5倍');
    track.setUniformScale(1.5);
    console.log('当前缩放:', track.getScale());

    // 4. 增量旋转
    console.log('4. 继续绕Y轴旋转30度');
    track.rotateY(THREE.MathUtils.degToRad(30));
    console.log('旋转后角度:', track.getRotationDegrees());

    // 5. 平移
    console.log('5. 向前平移10单位');
    track.translate(0, 0, 10);
    console.log('平移后位置:', track.getPosition());

    // 6. 绕任意轴旋转
    console.log('6. 绕自定义轴旋转');
    const customAxis = new THREE.Vector3(1, 1, 0).normalize();
    track.rotateOnAxis(customAxis, THREE.MathUtils.degToRad(15));
    console.log('自定义轴旋转后角度:', track.getRotationDegrees());

    // 7. 沿指定方向平移
    console.log('7. 沿右方向平移5单位');
    const rightDirection = new THREE.Vector3(1, 0, 0);
    track.translateOnAxis(rightDirection, 5);
    console.log('方向平移后位置:', track.getPosition());
  }

  /**
   * 动画演示 - 让所有跑道旋转
   */
  startRotationAnimation(): void {
    const animate = () => {
      // 让每个跑道以不同速度旋转
      this.tracks.forEach((track, index) => {
        track.rotateY(THREE.MathUtils.degToRad(1 + index * 0.5));
      });

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * 重置所有跑道变换
   */
  resetTracks(): void {
    console.log('重置所有跑道变换');
    this.tracks.forEach((track, index) => {
      track.resetTransform();
      console.log(`跑道${index + 1}重置后位置:`, track.getPosition());
      console.log(`跑道${index + 1}重置后旋转:`, track.getRotationDegrees());
      console.log(`跑道${index + 1}重置后缩放:`, track.getScale());
    });
  }

  /**
   * 获取所有跑道实例
   */
  getTracks(): OvalRunningTrack[] {
    return this.tracks;
  }

  /**
   * 获取指定索引的跑道
   */
  getTrack(index: number): OvalRunningTrack | undefined {
    return this.tracks[index];
  }
}
