<script setup lang="ts">
//正交相机辅助线视角线
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ref,onMounted } from 'vue';
const container = ref<HTMLElement>();
const myAspect = window.innerWidth / window.innerHeight;
const myFrustumSize = 700;
const myRender = new THREE.WebGLRenderer({antialias:true,alpha:true}); //抗锯齿与透明背景
myRender.setSize(window.innerWidth, window.innerHeight);
myRender.setClearColor(0x000000,1.0);
const myScene = new THREE.Scene();
const myCamera = new THREE.PerspectiveCamera(1000, myAspect, 1, 5000);
myCamera.position.z = 2500;
//创建辅助正交相机
const myOrthoCamera = new THREE.OrthographicCamera(-myFrustumSize * myAspect *0.5/ 2, myFrustumSize * myAspect *0.5/ 2, myFrustumSize / 2, -myFrustumSize / 2, 150, 1000);
const myOrthoCameraHelper = new THREE.CameraHelper(myOrthoCamera);
myScene.add(myOrthoCameraHelper);
//绘制圆球
const mySphereGeometry = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 32), new THREE.MeshBasicMaterial({color: 'green',wireframe: true}));
myScene.add(mySphereGeometry);
const controls = new OrbitControls(myCamera, myRender.domElement);
function animate(){
    requestAnimationFrame(animate);
    const r = Date.now() * 0.0005;
    mySphereGeometry.position.x = Math.cos(r) * myFrustumSize;
    mySphereGeometry.position.y = Math.sin(r) * myFrustumSize;
    mySphereGeometry.position.z = Math.sin(r) * myFrustumSize;
    myOrthoCamera.lookAt(mySphereGeometry.position);
    controls.update(); // 更新控件
    myRender.render(myScene, myCamera);
}
onMounted(()=>{
    container.value!.append(myRender.domElement);
    animate()
})
</script>

<template>
  <div class="" ref="container"></div>
</template>

<style scoped lang="less"></style>