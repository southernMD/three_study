<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
//四个基本对象：场景(scene)，相机(camera)，渲染器(renderer)，物体(object)

onMounted(() => {
    //Scene
    const scene = new THREE.Scene();
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    //Object
    //Geometry 
    const count = 50

    const positionsArray: Float32Array = new Float32Array(count * 3 * 3);
    for(let i =0 ; i < count * 3 * 3; i++){
        positionsArray[i] = (Math.random() - 0.5) * 4
        // positionsArray[i] = Math.random()
    }
    const geometry = new THREE.BufferGeometry();
    const positionsAttribute = new THREE.BufferAttribute(positionsArray, 3);
    geometry.setAttribute('position', positionsAttribute);
    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: '#ff0000' ,wireframe:true})
    );
    scene.add(mesh)

    //Camera
    const camera = new THREE.PerspectiveCamera(75, size.width / size.height);
    camera.position.set(3, 3, 3)
    camera.lookAt(mesh.position);
    scene.add(camera);

    //Renderer
    const canvas: HTMLCanvasElement = document.querySelector('.webgl')!;
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(size.width, size.height);

    //AXEHELPER
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;


    // let time = Date.now();

    window.addEventListener("resize",()=>{
        size.width = window.innerWidth;
        size.height = window.innerHeight;
        camera.aspect = size.width  / size.height
        camera.updateProjectionMatrix()
        renderer.setSize(size.width,size.height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    window.addEventListener("dblclick",()=>{
        const fullscreenElement = document.fullscreenElement 
        if(!fullscreenElement){
            if(canvas.requestFullscreen){
                canvas.requestFullscreen()
            }
        }else{
            if(document.exitFullscreen){
                document.exitFullscreen()
            }
        }
    })

    const tick = () => {
        // camera.position.x = (cursor.x * 10)
        // camera.position.y = (cursor.y * 10)
        controls.update()
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

<style>
.webgl {
    position: absolute;
    top: 0;
    left: 0;
    outline: none;
}
</style>