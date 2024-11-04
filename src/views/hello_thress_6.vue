<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ref, onMounted } from 'vue'
const container = ref<HTMLElement>();
const myTextLoader = new THREE.TextureLoader();
const myCamera = new THREE.PerspectiveCamera(150, window.innerWidth / window.innerHeight, 1, 10000);
const myScene = new THREE.Scene();
const myRender = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});
myRender.setSize(window.innerWidth, window.innerHeight);
myRender.setClearColor(0x000000, 1.0);
myTextLoader.load('@/../public/model/360qjt2.jpg',function(myTexture){
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024); //用于创建一个立方体贴图渲染目标。这里传入的参数 1024 表示每个面的分辨率是 1024x1024 像素。
    const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);// 是一个特殊的相机，用于渲染立方体贴图。它有三个参数
    cubeCamera.position.set(0, 0, 0);
    cubeCamera.update(myRender, myScene);
    cubeRenderTarget.fromEquirectangularTexture(myRender, myTexture); //方法将一个等距柱状投影纹理（equirectangular texture）转换为立方体贴图。myTexture 是加载的等距柱状投影纹理。
    myScene.background = cubeRenderTarget.texture
    // myScene.background = myTexture
})

onMounted(() => {
    container.value!.appendChild(myRender.domElement);
});
const controls = new OrbitControls(myCamera, myRender.domElement);
let long = 0,lat = 0,phi = 0,theta = 0;
const animate = () => {
    requestAnimationFrame(animate);
    long+=0.15;
    // lat = Math.max(-85,Math.min(85,lat));
    phi = THREE.MathUtils.degToRad(90);
    // phi = THREE.MathUtils.degToRad(90 - lat);
    theta = THREE.MathUtils.degToRad(long);
    myCamera.position.x =  Math.cos(theta) * 100;
    myCamera.position.y =  Math.sin(theta)* 100;
    myCamera.position.z =  Math.sin(theta)* 100;
    // console.log( myCamera.position.x,myCamera.position.y,myCamera.position.z);
    
    myCamera.lookAt(myScene.position);
    // myRender.render(myScene, myCamera);
    controls.update(); 
    myRender.render(myScene, myCamera); 
};
animate();
// 解释 animate 函数
// requestAnimationFrame(animate):

// 这行代码用于请求浏览器在下一次重绘之前调用 animate 函数，从而实现动画效果。这是一个递归调用，确保动画持续进行。
// long += 0.15:

// long 变量表示经度，每次调用 animate 函数时，经度增加 0.15 度，使相机位置逐渐变化，产生旋转效果。
// lat = Math.max(-85, Math.min(85, lat)):

// lat 变量表示纬度，这行代码确保纬度值在 -85 到 85 度之间，防止相机位置超出合理范围。
// phi = THREE.MathUtils.degToRad(90 - lat):

// 将纬度转换为弧度，并计算 phi 角度。phi 是从正上方（90度）到纬度 lat 的角度。
// theta = THREE.MathUtils.degToRad(long):

// 将经度转换为弧度，计算 theta 角度。theta 是从正前方（0度）到经度 long 的角度。
// myCamera.position.x = Math.sin(phi) * Math.cos(theta):

// 计算相机在 x 轴上的位置。使用球坐标系中的公式将 phi 和 theta 转换为笛卡尔坐标系中的 x 坐标。
// myCamera.position.y = Math.cos(phi):

// 计算相机在 y 轴上的位置。使用球坐标系中的公式将 phi 转换为笛卡尔坐标系中的 y 坐标。
// myCamera.position.z = Math.sin(phi) * Math.sin(theta):

// 计算相机在 z 轴上的位置。使用球坐标系中的公式将 phi 和 theta 转换为笛卡尔坐标系中的 z 坐标。
// myCamera.lookAt(myScene.position):

// 使相机始终朝向场景的中心位置。lookAt 方法将相机的方向设置为指向指定的目标点。
// myRender.render(myScene, myCamera):

// 渲染场景。这行代码将当前场景和相机的状态渲染到画布上，显示最新的画面
</script>

<template>
  <div class="" ref="container"></div>
</template>

<style scoped lang="less"></style>