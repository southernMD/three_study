<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ref, onMounted } from 'vue'
const container = ref<HTMLElement>();
const myRender = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
myRender.setSize(window.innerWidth, window.innerHeight);
myRender.setClearColor(0x000000, 1.0);
const myScene = new THREE.Scene();
const myCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
myCamera.position.z = 2500
//创建透视相机辅助线相机
const myPerCam = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 250, 1000);
const myPerCamHelper = new THREE.CameraHelper(myPerCam);
myScene.add(myPerCamHelper);
//画绿色球
const myObjMesh = new THREE.Mesh(
    new THREE.SphereGeometry(100, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0x66ccff,wireframe:true })
);
myScene.add(myObjMesh);
onMounted(() => {
    container.value!.appendChild(myRender.domElement);
});
const controls = new OrbitControls(myCamera, myRender.domElement);
const animate = () => {
    requestAnimationFrame(animate);
    const r = Date.now() * 0.0005;
    myObjMesh.position.x = Math.cos(r) * 500;
    myObjMesh.position.y = Math.sin(r) * 500;
    myObjMesh.position.z = Math.sin(r) * 500;
    myPerCam.lookAt(myObjMesh.position);
    // myRender.setViewport(0, 0, window.innerWidth, window.innerHeight);
    controls.update(); 
    myRender.render(myScene, myCamera); 
};
animate();
</script>

<template>
  <div class="" ref="container"></div>
</template>

<style scoped lang="less"></style>