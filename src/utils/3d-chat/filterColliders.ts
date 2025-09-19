import * as THREE from 'three';

const STATIC_BVH = ['main-ground','main-track','boundary-walls']
export const filterColliders = (
    colliders: Map<string, THREE.Mesh>,
    mapPositionDistance: Map<string, THREE.Mesh>,
    objectPosition: THREE.Vector3
) => {
    colliders.forEach((collider, objectId) => {
      // 🚀 距离预筛选优化：根据碰撞体类型使用不同的筛选策略
      if(!STATIC_BVH.includes(objectId)){
        if (objectId.startsWith('school-building-region-region')) {
          const colliderBounds = new THREE.Box3().setFromObject(collider);
  
          // 检查玩家位置是否在区块边界内
          const isInside = colliderBounds.containsPoint(objectPosition);
  
          // 如果不在区块内，检查是否在100单位范围内
          let isNearby = false;
          const distanceToBox = colliderBounds.distanceToPoint(objectPosition);
          if (!isInside) {
            isNearby = distanceToBox <= 100;
          }
  
          if (isInside || isNearby) {
            mapPositionDistance.set(objectId, collider);
          }else if(!isInside && distanceToBox > 150){
            mapPositionDistance.delete(objectId);
          }
        } else {
          // 其他碰撞体：判断到中心点的距离
          const colliderBounds = new THREE.Box3().setFromObject(collider);
          const colliderCenter = colliderBounds.getCenter(new THREE.Vector3());
          const distance = colliderCenter.distanceTo(objectPosition);
  
          if (distance < 100) {
            mapPositionDistance.set(objectId, collider);
          }else if(distance > 150){
            mapPositionDistance.delete(objectId);
          }
        }
      }else{
        mapPositionDistance.set(objectId, collider);
      }
    });
}