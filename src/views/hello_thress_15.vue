<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { gsap } from 'gsap'
//四个基本对象：场景(scene)，相机(camera)，渲染器(renderer)，物体(object)


onMounted(() => {
    const gui = new GUI({
        width: 400,
        title:'Hello GUI'
    })
    gui.hide()
    window.addEventListener("keydown",(ev)=>{
        if(ev.key==='h'){
            gui.show(gui._hidden)
        }
    })
    const debugObject = {
        color:'#66ccff',
        spin:()=>{
            gsap.to(mesh.rotation,{
                duration:1,
                y:2 * Math.PI + mesh.rotation.y
            })
        },
        subdivision:2
    }

    //Scene
    const scene = new THREE.Scene();
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    //Object
    //Geometry 
    const material = new THREE.MeshBasicMaterial({ color: debugObject.color ,wireframe:true})
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1,2,2,2),
        material
    );
    scene.add(mesh)

    //Camera
    const camera = new THREE.PerspectiveCamera(75, size.width / size.height);
    camera.position.set(3, 3, 3)
    camera.lookAt(0,0,0);
    scene.add(camera);

    //Renderer
    const canvas: HTMLCanvasElement = document.querySelector('.webgl')!;
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(size.width, size.height);

    //gui

    const oneFolder = gui.addFolder('mesh');

    oneFolder.add(mesh.position, 'y').min(-3).max(3).step(0.01)
    oneFolder.add(mesh,'visible')
    oneFolder.add(material,'wireframe')
    oneFolder.addColor(debugObject,'color').onChange(()=>{
        mesh.material.color.set(debugObject.color)
    })
    oneFolder.add(debugObject,'spin')
    oneFolder.add(debugObject,'subdivision').min(1).max(20).step(1)
    .onChange(()=>{
        mesh.geometry.dispose()
        mesh.geometry = new THREE.BoxGeometry(
            1,1,1,
            debugObject.subdivision,debugObject.subdivision,debugObject.subdivision
        )
    })

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

    canvas.addEventListener("dblclick",()=>{
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
        camera.lookAt(0,0,0);
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