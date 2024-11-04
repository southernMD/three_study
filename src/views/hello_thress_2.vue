
<script setup lang="ts">
//两个正方形
import {ref} from 'vue'
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
const container = ref<HTMLElement>();
const myRender = new THREE.WebGL1Renderer({antialias:true}); //开启抗锯齿渲染
myRender.setSize(window.innerWidth,window.innerHeight);
myRender.setClearColor(0xffffff,0.8);
const myScene = new THREE.Scene();
const width = window.innerWidth;
const height = window.innerHeight;
const k = width / height;
const s = 24;
const myCamera = new THREE.OrthographicCamera(-s * k, s * k, s, -s, 1, 1000)
myCamera.position.set(100, 2.21, 18.1);
myCamera.lookAt(myScene.position);
//创建第一个正方体
const myGeometry = new THREE.BoxGeometry(16, 16, 16);
const myMaterial = new THREE.MeshBasicMaterial({color:0xccff00});
const myMesh1 = new THREE.Mesh(myGeometry, myMaterial);
myMesh1.translateX(-14);
myScene.add(myMesh1);
//创建第二个
const myGeometry2 = new THREE.BoxGeometry(16, 16, 16);
const myMaterial2 = new THREE.MeshBasicMaterial({color:0x00ff00});
const myMesh2 = new THREE.Mesh(myGeometry2, myMaterial2);
myMesh2.translateX(14);
myScene.add(myMesh2);
onMounted(()=>{
  container.value!.append(myRender.domElement);
  myRender.render(myScene, myCamera);
})
const controls = new OrbitControls(myCamera, myRender.domElement);
const animate = () => {
    requestAnimationFrame(animate);
    controls.update(); // 更新控件
    myRender.render(myScene, myCamera); //执行渲染操作
};
animate();
</script>

<template>
  <div class="" ref="container"></div>
</template>

<style scoped lang="less">

</style>