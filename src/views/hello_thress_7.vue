<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ref, onMounted } from 'vue'
const container = ref<HTMLElement>();
const fov = 90;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 1000;
const myCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
let myRender: THREE.WebGLRenderer;
const myScene = new THREE.Scene();
myCamera.position.x = 100;
myCamera.position.y = 100;
myCamera.position.z = 3;
onMounted(() => {
    myRender = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
        '@/../public/model/360qjt2.jpg',
        () => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        myScene.background = texture;
    });
    myRender.setSize(window.innerWidth, window.innerHeight);
    myRender.setClearColor(0x000000, 1.0);
    container.value!.appendChild(myRender.domElement);
    createAxesHelper()
    requestAnimationFrame(render);
});
(function () {
    const color = 0xFFFFFF;
    const intensity = 3;
    const light = new THREE.AmbientLight(color, intensity);
    light.position.set(- 1, 2, 4);
    myScene.add(light);
})()
const boxWidth = 100;
const boxHeight = 100;
const boxDepth = 100;
const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

function makeInstance(geometry: THREE.BoxGeometry, color: number, x: number) {

    const material = new THREE.MeshPhongMaterial({ color });

    const cube = new THREE.Mesh(geometry, material);
    myScene.add(cube);

    cube.position.x = x;

    return cube;

}

const cubes = [
    makeInstance(geometry, 0x44aa88, 0),
    makeInstance(geometry, 0x8844aa, - 200),
    makeInstance(geometry, 0xaa8844, 200),
];

function resizeRendererToDisplaySize(renderer: { domElement: any; setSize: (arg0: any, arg1: any, arg2: boolean) => void; }) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }

    return needResize;
}

function render(time: number) {

    time *= 0.001;

    if (resizeRendererToDisplaySize(myRender)) {

        const canvas = myRender.domElement;
        myCamera.aspect = canvas.clientWidth / canvas.clientHeight;
        myCamera.updateProjectionMatrix();

    }

    cubes.forEach((cube, ndx) => {

        const speed = 1 + ndx * .1;
        const rot = time * speed;
        cube.rotation.x = rot;
        cube.rotation.y = rot;

    });
    const controls = new OrbitControls(myCamera, myRender.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    myRender.render(myScene, myCamera);

    requestAnimationFrame(render);

}

function createAxesHelper(){
    const axesHelper = new THREE.AxesHelper(150)
    myScene.add(axesHelper)
}

</script>

<template>
    <canavs class="" ref="container" />
</template>

<style scoped lang="less"></style>