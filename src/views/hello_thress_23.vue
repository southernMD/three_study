<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

const guiParameter = {
    count:1000,
    size: 0.1,
    radius: 5,
    branches: 3,
    spin: 1,
    randomness: 0.2,
    randomnessPower: 3,
}
let geometry
let material: THREE.PointsMaterial | undefined
let points: THREE.Object3D<THREE.Object3DEventMap> | null

onMounted(() => {
    const generateGalaxy = () => {
        geometry = new THREE.BufferGeometry()
        let positions = new Float32Array(guiParameter.count * 3)
        if(points != null){
            geometry.dispose()
            material!.dispose()
            scene.remove(points)
        }
        for(let i = 0 ; i < guiParameter.count; i++){
            const i3 = i * 3
            const radius = Math.random() * guiParameter.radius
            const spinAngle = radius* guiParameter.spin 
            const branchAngle = (i % guiParameter.branches) /guiParameter.branches * Math.PI * 2

            const randomX = Math.pow(Math.random(), guiParameter.randomnessPower) * (Math.random() < 0.5 ? 1 : -1)
            const randomY = Math.pow(Math.random(), guiParameter.randomnessPower) * (Math.random() < 0.5 ? 1 : -1)
            const randomZ = Math.pow(Math.random(), guiParameter.randomnessPower) * (Math.random() <0.5 ? 1 : -1)

            positions[i3] = Math.sin(branchAngle + spinAngle) * radius + randomX
            positions[i3 + 1] = randomY
            positions[i3 + 2] = Math.cos(branchAngle + spinAngle) * radius + randomZ
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        material = new THREE.PointsMaterial({
            size: guiParameter.size,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        })
        points = new THREE.Points(geometry, material)
        scene.add(points)
    }

    /**
     * Base
     */
    // Debug
    const gui = new GUI()

    gui.add(guiParameter, 'count').min(100).max(1000000).step(100).onFinishChange(generateGalaxy)
    gui.add(guiParameter, 'size').min(0.001).max(0.1).step(0.001).onFinishChange(generateGalaxy)
    gui.add(guiParameter, 'radius').min(0.5).max(20).step(0.001).onFinishChange(generateGalaxy)
    gui.add(guiParameter, 'branches').min(2).max(20).step(1).onFinishChange(generateGalaxy)
    gui.add(guiParameter, 'spin').min(-5).max(5).step(0.001).onFinishChange(generateGalaxy)
    gui.add(guiParameter, 'randomness').min(0).max(2).step(0.001).onFinishChange(generateGalaxy)
    gui.add(guiParameter, 'randomnessPower').min(1).max(10).step(0.001).onFinishChange(generateGalaxy)

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()

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
    camera.position.x = 3
    camera.position.y = 3
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

    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()

        // Update controls
        controls.update()

        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }
    generateGalaxy()
    tick()

})
</script>

<style scoped lang="less"></style>