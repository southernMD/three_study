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
myRender.setClearColor("black");
myRender.setPixelRatio(window.devicePixelRatio); //这个方法用于设置渲染器的像素比，以确保在高 DPI 显示器上渲染的内容更加清晰和细腻。
const myCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100000);
myCamera.position.set(0, 0, 3);
let myOrbitControls;
let myScene = new THREE.Scene();

function nearestPowerOfTwo(size: number): number {
    return Math.pow(2, Math.ceil(Math.log2(size)));
}

function resizeImage(image: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const size = nearestPowerOfTwo(Math.min(image.width, image.height));
    canvas.width = 100;
    canvas.height = 100;
    context.drawImage(image, 0, 0, size, size);
    return canvas;
}

function loadResizedCubeTexture(urls: string[]): Promise<THREE.Texture[]> {
    return new Promise((resolve, reject) => {
        const textures: THREE.Texture[] = [];
        const loader = new THREE.ImageLoader();

        const onLoad = (image: HTMLImageElement, index: number) => {
            console.log(image);
            
            const canvas = resizeImage(image);
            const texture = new THREE.CanvasTexture(canvas);
            textures[index] = texture;

            if (textures.length === urls.length) {
                resolve(textures);
            }
        };

        const onError = (error: any) => {
            reject(error);
        };

        urls.forEach((url, index) => {
            loader.load(url, (image) => onLoad(image, index), undefined, onError);
        });
    });
}
async function initScene (){
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load( [
        '/91/1.jpg',
        '/91/2.jpg',
        '/91/3.jpg',
        '/91/4.jpg',
        '/91/5.jpg',
        '/91/6.jpg'
    ]);
    myScene.background = texture;
}
onMounted(async() => {
    container.value!.appendChild(myRender.domElement);
    myOrbitControls = new OrbitControls(myCamera, myRender.domElement);
    await initScene()
    createAxesHelper()
    myRender.render(myScene, myCamera); 
    animate();
});
const controls = new OrbitControls(myCamera, myRender.domElement);
const animate = () => {
    requestAnimationFrame(animate);
    controls.update(); 
    myRender.render(myScene, myCamera); 
};
function createAxesHelper(){
    const axesHelper = new THREE.AxesHelper(150)
    myScene.add(axesHelper)
}

</script>

<template>
  <div class="" ref="container"></div>
</template>

<style scoped lang="less"></style>