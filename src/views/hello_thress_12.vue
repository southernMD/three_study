<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap';
//四个基本对象：场景(scene)，相机(camera)，渲染器(renderer)，物体(object)

onMounted(() => {
    //Scene
    const scene = new THREE.Scene();

    //Object
    //Geometry 
    const group = new THREE.Group();
    scene.add(group);
    const cube1 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: '#ff0000' })
    );
    group.add(cube1);

    const cube2 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: '#ff00ff' })
    );
    cube2.position.x = -1.5;
    group.add(cube2);
    const cube3 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: '#00ff00' })
    );
    cube3.position.x = 1.5;
    group.add(cube3);
    group.rotation.x = Math.PI / 4;
    // const geometry = new THREE.BoxGeometry(1,1,1);
    // const material = new THREE.MeshBasicMaterial({color:'#ff0000'});
    // const mesh = new THREE.Mesh(geometry,material);

    //Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
    camera.position.set(3, 2, 10)
    camera.lookAt(group.position);
    scene.add(camera);

    //Renderer
    const canvas: HTMLCanvasElement = document.querySelector('.webgl')!;
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    //对象有四种动画方式：position、rotation、quaternion、scale
    //分别是位置、旋转、四元数、缩放
    //所有继承Object3D的对象都有set方法，可以设置动画
    // mesh.position.x = 0
    // mesh.position.y = 0.6
    // mesh.position.z = 0
    // scene.add(mesh);

    //AXEHELPER
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);


    // let time = Date.now();
    const clock = new THREE.Clock();

    gsap.to(group.position, { duration: 1, delay: 1, x: 2 });
    gsap.to(group.position, { duration: 1, delay: 2, x: 0 });
    const tick = () => {
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
    //animation
    // const tick = ()=>{
    //     // const currentTime = Date.now();
    //     // const delta = currentTime - time;
    //     // time = currentTime

    //     const delta2 = clock.getElapsedTime(); //时间增量
    //     group.rotation.y = Math.PI * delta2;
    //     // group.rotation.y += 0.001 * delta;
    //     // cube1.position.z += 0.001 * delta;
    //     renderer.render(scene, camera);

    //     requestAnimationFrame(tick);
    // }

    tick();
})

</script>

<template>
    <canvas class="webgl"></canvas>
</template>
