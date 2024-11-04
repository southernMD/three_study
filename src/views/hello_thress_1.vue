
<script setup lang="ts">
//正交相机单立方体
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {onMounted,ref,Ref} from 'vue'
const container:Ref<HTMLElement | null> = ref(null)
const myScene = new THREE.Scene(); //创建场景
const myRender = new THREE.WebGL1Renderer();// 创建渲染器
const myWidth = window.innerWidth; //设置窗口宽度
const myHeight = window.innerHeight;//设置窗口高度
const k = myWidth / myHeight; //设置长宽比
const s = 120;//设置三维场景显示范围控制系数
const myCamera = new THREE.OrthographicCamera(-s * k, s * k, s, -s, 1, 1000);
onMounted(() => {

    myRender.setSize(myWidth, myHeight);
    myRender.setClearColor(0xffffff,0.8);
    container.value!.append(myRender.domElement);
    const myLight = new THREE.PointLight("red"); //红色点光源
    myLight.position.set(400, 800, 300);
    myScene.add(myLight); //添加到场景中

    myCamera.position.set(400, 300, 200); //设置相机位置
    myCamera.lookAt(myScene.position); //设置相机方向(指向的场景对象) 
    const myGeometry = new THREE.BoxGeometry(100, 100, 100); //创建一个立方体几何对象Geometry
    const myMaterial = new THREE.MeshLambertMaterial({ color: 0xffbf00 }); //材质对象Material
    const myMesh = new THREE.Mesh(myGeometry, myMaterial);  //网格模型对象Mesh
    myScene.add(myMesh); //网格模型添加到场景中
    myRender.render(myScene, myCamera); //执行渲染操作

    // 处理窗口大小变化
    window.addEventListener('resize', () => {
        // myCamera.aspect = window.innerWidth / window.innerHeight;
        // myCamera.updateProjectionMatrix();
        myRender.setSize(window.innerWidth, window.innerHeight);
    });
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

<style scoped lang="less"></style>