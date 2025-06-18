<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
//四个基本对象：场景(scene)，相机(camera)，渲染器(renderer)，物体(object)

onMounted(() => {
    //Scene
    const scene = new THREE.Scene();

    //Object
    //Geometry 
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: '#ff0000' })
    );
    scene.add(mesh)

    //Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
    camera.position.set(0, 0, 10)
    camera.lookAt(mesh.position);
    scene.add(camera);

    //Renderer
    const canvas: HTMLCanvasElement = document.querySelector('.webgl')!;
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    //AXEHELPER
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);
    //手动控制相机
    const cursor ={
        x:0,y:0
    }

    window.addEventListener("mousemove",(event)=>{
        cursor.x = event.clientX / window.innerWidth - 0.5
        cursor.y = - (event.clientY / window.innerHeight - 0.5)
    })

    // let time = Date.now();

    const tick = () => {
        camera.position.x = Math.sin(cursor.x * 10) * 3
        camera.position.z = Math.cos(cursor.x * 10) * 3
        camera.position.y = (cursor.y * 5)

        // camera.position.x = (cursor.x * 10)
        // camera.position.y = (cursor.y * 10)
        camera.lookAt(mesh.position);
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
    tick();
})

</script>

<template>
    <canvas class="webgl"></canvas>
</template>
