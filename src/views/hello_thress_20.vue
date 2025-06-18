<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
onMounted(() => {

    /**
     * Base
     */
    // Debug
    const gui = new GUI()

    /**
     * textures
     */
    const textureLoader = new THREE.TextureLoader()
    const bakedShadowTexture = textureLoader.load('/20/bakedShadow.jpg')
    const simpleShadowTexture = textureLoader.load('/20/simpleShadow.jpg')

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()

    /**
     * Lights
     */
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
    gui.add(ambientLight, 'intensity').min(0).max(3).step(0.001)
    scene.add(ambientLight)

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, .5)
    directionalLight.position.set(2, 2, - 1)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 1024
    directionalLight.shadow.mapSize.height = 1024
    directionalLight.shadow.camera.near = 2
    directionalLight.shadow.camera.far = 6
    directionalLight.shadow.camera.left = - 2
    directionalLight.shadow.camera.top = 2
    directionalLight.shadow.camera.right = 2
    directionalLight.shadow.camera.bottom = - 2
    directionalLight.shadow.bias = -0.0002

    const directionalLightCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
    directionalLightCameraHelper.visible = false
    scene.add(directionalLightCameraHelper)


    gui.add(directionalLight, 'intensity').min(0).max(3).step(0.001)
    gui.add(directionalLight.position, 'x').min(- 5).max(5).step(0.001)
    gui.add(directionalLight.position, 'y').min(- 5).max(5).step(0.001)
    gui.add(directionalLight.position, 'z').min(- 5).max(5).step(0.001)
    scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0xffffff, 1, 7) 
    pointLight.position.set(-1,1, 0)
    pointLight.castShadow = true;

    const pointLightshadowHelper = new THREE.CameraHelper(pointLight.shadow.camera)
    pointLightshadowHelper.visible = false
    scene.add(pointLightshadowHelper)
    scene.add(pointLight)

    /**
     * Materials
     */
    const material = new THREE.MeshStandardMaterial()
    material.roughness = 0.7
    gui.add(material, 'metalness').min(0).max(1).step(0.001)
    gui.add(material, 'roughness').min(0).max(1).step(0.001)

    /**
     * Objects
     */
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        material
    )
    const sphereShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5,1.5),
        new THREE.MeshStandardMaterial({
            alphaMap:simpleShadowTexture,
            transparent:true,
            color:'black'
        })
    )
    sphereShadow.rotateX(-Math.PI * .5)
    sphereShadow.rotateZ(-Math.PI * .5)
    sphereShadow.position.y = -.5 + 0.01
    scene.add(sphereShadow)
    sphere.castShadow = true

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 5),
        new THREE.MeshBasicMaterial({
            map: bakedShadowTexture
        })
    )
    plane.receiveShadow = true

    plane.rotation.x = - Math.PI * 0.5
    plane.position.y = - 0.5

    scene.add(sphere, plane)

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
    renderer.shadowMap.enabled = false   // 开启阴影
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()

        sphere.position.x = Math.cos(elapsedTime) * 1.5
        sphere.position.z = Math.sin(elapsedTime) * 1.5
        sphere.position.y = Math.abs(Math.sin(elapsedTime * 3))

        sphereShadow.position.x = sphere.position.x
        sphereShadow.position.z = sphere.position.z
        sphereShadow.material.opacity = 1 - Math.abs(sphere.position.y) * .3

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