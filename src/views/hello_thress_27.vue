<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

onMounted(async () => {

    /**
     * Base
     */
    // Debug
    const gui = new GUI()

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()

    /***
     * GLTFLoader
     */
    const gltfLoader: GLTFLoader = new GLTFLoader()
    const gltf = await gltfLoader.loadAsync('/26/models/Duck/glTF-Binary/Duck.glb')
    gltf.scene.position.y = -1.2
    scene.add(gltf.scene)
    /**
     * Lights
     */
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)
    


    /**
     * Objects
     */
    const object1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#ff0000' })
    )
    object1.position.x = - 2

    const object2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#ff0000' })
    )

    const object3 = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#ff0000' })
    )
    object3.position.x = 2

    scene.add(object1, object2, object3)

    /**
     * Sizes
     */
    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    window.addEventListener('resize', () => {
        // Update sizes
        sizes.width = window.innerWidth
        sizes.height = window.innerHeight

        // Update camera
        camera.aspect = sizes.width / sizes.height
        camera.updateProjectionMatrix()

        // Update renderer
        renderer.setSize(sizes.width, sizes.height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    /**
     * Camera
     */
    // Base camera
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.z = 3
    scene.add(camera)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    /***
     * Mouse
     */
    const mouse = new THREE.Vector2()
    window.addEventListener('mousemove', (event) => {
        mouse.x = (event.clientX / sizes.width) * 2 - 1
        mouse.y = -(event.clientY / sizes.height) * 2 + 1
    })

    window.addEventListener('click', () => {
        if (currentIntersect) {
            if (currentIntersect.object === object1) {
                console.log('click on object 1')
            } else if (currentIntersect.object === object2) {
                console.log('click on object 2')
            } else if (currentIntersect.object === object3) {
                console.log('click on object 3')
            }
        }
    })

    /**
     * Animate
     */
    const clock = new THREE.Clock()

    let currentIntersect: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> | null = null

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()

        // Update objects
        object1.position.y = Math.sin(0.3 * elapsedTime) * 1.5
        object2.position.y = Math.sin(0.8 * elapsedTime) * 1.5
        object3.position.y = Math.sin(1.4 * elapsedTime) * 1.5

        // Animate particles
        const rayCaster = new THREE.Raycaster()
        // const rayOrigin = new THREE.Vector3(-3,0,0)
        // const rayDirection = new THREE.Vector3(10,0,0)
        // rayDirection.normalize()
        // rayCaster.set(rayOrigin, rayDirection)
        rayCaster.setFromCamera(mouse, camera)
        const objects = [object1, object2, object3]
        const intersects = rayCaster.intersectObjects(objects)
        for (const object of objects) {
            object.material.color.set('#ff0000')
        }
        for (const intersect of intersects) {
            //@ts-ignore
            intersect.object.material.color.set(0x66ccff)
        }

        if (intersects.length) {
            if (!currentIntersect) {
                console.log('mouse enter')
            }
            currentIntersect = intersects[0]
        } else {
            if (currentIntersect) {
                console.log('mouse leave')
            }
            currentIntersect = null
        }

        //Cast a ray
        const modelIntersect = rayCaster.intersectObject(gltf.scene)
        if(modelIntersect.length > 0){
            gltf.scene.scale.set(1.2,1.2,1.2)
        }else{
            gltf.scene.scale.set(1,1,1)
        }

        // Update controls
        controls.update()

        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }

    tick()
})
</script>

<style scoped lang="less"></style>