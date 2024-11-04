

<script setup lang="ts">
import {onMounted,ref} from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
const container = ref<HTMLElement>();
const myRender = new THREE.WebGLRenderer({antialias:true})
myRender.setSize(window.innerWidth, window.innerHeight);
myRender.setClearColor(0x000000,0.8);
const myScene = new THREE.Scene();
const myCamera = new THREE.PerspectiveCamera(30,window.innerWidth/window.innerHeight,100,800);
myCamera.position.set(300,100,300);
myCamera.lookAt(new THREE.Vector3(0,0,0));
function createGeometry(translateX:number){
    const myGeometry = new THREE.BoxGeometry(50,50,50);
    const myMaterial = new THREE.MeshNormalMaterial();
    const myMesh = new THREE.Mesh(myGeometry,myMaterial);
    myMesh.position.set(translateX,0,0);
    myScene.add(myMesh);
}
onMounted(()=>{
    createGeometry(0);
    createGeometry(-70);
    createGeometry(70);
    container.value!.append(myRender.domElement);
    myRender.render(myScene, myCamera);
})
const controls = new OrbitControls(myCamera, myRender.domElement);

const animate = () => {
    requestAnimationFrame(animate);
    controls.update(); // 更新控件
    // myCamera.lookAt(new THREE.Vector3(10*Math.random(),10*Math.random(),10*Math.random()));
    myRender.render(myScene, myCamera); //执行渲染操作
};
animate();
</script>

<template>
  <div class="" ref="container"></div>
</template>

<style scoped lang="less"></style>