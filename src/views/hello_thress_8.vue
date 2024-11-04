<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ref, onMounted } from 'vue'
const container = ref<HTMLElement>();
const myAspect = window.innerWidth / window.innerHeight;
const myRender = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});
const myScene = new THREE.Scene();
myRender.setSize(window.innerWidth, window.innerHeight);
myRender.setClearColor(0x000000, 1.0);
const myCamera = new THREE.PerspectiveCamera(45, myAspect, 0.1, 3000);
myCamera.position.set(0, 0, 1000);
function drawGreenBool (){
    mySphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(100, 20, 20),
        new THREE.MeshBasicMaterial({ color: 0x66ccff,wireframe:true })
    );
    myScene.add(mySphereMesh);
}
let mySphereMesh:THREE.Mesh
function drawStartBg (){
    const myGeometry = new THREE.BufferGeometry();
    const positions = [];
    for(let i = 0; i < 5000; i++){
        const x = THREE.MathUtils.randFloatSpread(2000)
        const y = THREE.MathUtils.randFloatSpread(2000)
        const z = THREE.MathUtils.randFloatSpread(2000)
        positions.push(x,y,z)
    }
    myGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const myPoints = new THREE.Points(myGeometry, new THREE.PointsMaterial({ color: 0xffffff }));
    myScene.add(myPoints);
}
onMounted(() => {
    container.value!.appendChild(myRender.domElement);
    drawGreenBool();
    drawStartBg();
    animate();
    myRender.render(myScene, myCamera); 
});
const controls = new OrbitControls(myCamera, myRender.domElement);
const animate = () => {
    requestAnimationFrame(animate);
    const r = Date.now() * 0.0005;
    myCamera.position.x = Math.cos(r) * 500;
    myCamera.position.y = Math.sin(r) * 500;
    myCamera.position.z = Math.sin(r) * 500;
    // mySphereMesh.position.x = Math.cos(r) * 900;
    // mySphereMesh.position.y = Math.sin(r) * 900;
    // mySphereMesh.position.z = Math.sin(r) * 500;
    controls.update(); 
    myRender.render(myScene, myCamera); 
};
</script>

<template>
  <div class="" ref="container"></div>
</template>

<style scoped lang="less"></style>