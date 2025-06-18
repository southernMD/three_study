<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
onMounted(() => {
    /**
     * Base
     */
    // Debug
    const gui = new GUI()

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()

    /**
     * Lights
     */
    //环境光color 强度
    const ambientLight = new THREE.AmbientLight()
    ambientLight.color = new THREE.Color(0xffffff)
    ambientLight.intensity = 0.5
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight()
    pointLight.color = new THREE.Color(0x66ccff)
    pointLight.intensity = 1
    pointLight.position.x = 2
    pointLight.position.y = 3
    pointLight.position.z = 4
    // scene.add(pointLight)

    const pointLight2 = new THREE.PointLight()
    pointLight2.color = new THREE.Color(0xff9000)
    pointLight2.intensity = 0.6
    pointLight2.position.x = -2
    pointLight2.position.y = 0
    pointLight2.position.z = -4
    pointLight2.distance = 4 //源照射的最大距离。默认值为 0（无限远）。
    pointLight2.decay = 0 //沿着光照距离的衰退量。默认值为 2。
    scene.add(pointLight2)

    //矩阵光线 
    const rectAreaLight = new THREE.RectAreaLight(0x4e00ff, 2, 5, 5)
    rectAreaLight.position.set(5, 2, 5)
    // scene.add(rectAreaLight)

    const spotLight = new THREE.SpotLight(0x78ff00)
    spotLight.intensity = 0.5
    spotLight.position.set(0, 10, 0) 
    spotLight.angle = Math.PI / 20
    scene.add(spotLight)
    //辅助线
    const helper = new THREE.SpotLightHelper(spotLight, 0xff0000)
    scene.add(helper)

    const helperRect = new RectAreaLightHelper(rectAreaLight)
    scene.add(helperRect)
    /**
     * Objects
     */
    // Material
    const material = new THREE.MeshStandardMaterial()
    material.roughness = 0.4

    // Objects
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        material
    )
    sphere.position.x = - 1.5

    const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.75, 0.75),
        material
    )

    const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.2, 32, 64),
        material
    )
    torus.position.x = 1.5

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 5),
        material
    )
    plane.rotation.x = - Math.PI * 0.5
    plane.position.y = - 0.65

    scene.add(sphere, cube, torus, plane)

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
    camera.position.x = 1
    camera.position.y = 1
    camera.position.z = 2
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

    const axesHelper = new THREE.AxesHelper(2)
    scene.add(axesHelper)

    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()

        // Update objects
        sphere.rotation.y = 0.1 * elapsedTime
        cube.rotation.y = 0.1 * elapsedTime
        torus.rotation.y = 0.1 * elapsedTime

        sphere.rotation.x = 0.15 * elapsedTime
        cube.rotation.x = 0.15 * elapsedTime
        torus.rotation.x = 0.15 * elapsedTime

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