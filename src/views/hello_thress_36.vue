<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import testVertexShader from '@/assets/36/shaders/vertex.vs'
import testFragmentShader from '@/assets/36/shaders/fragment.fs'
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

    // Loaders
    const textureLoader = new THREE.TextureLoader()
    const gltfLoader = new GLTFLoader()

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
    const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
    camera.position.x = 8
    camera.position.y = 10
    camera.position.z = 12
    scene.add(camera)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.target.y = 3
    controls.enableDamping = true

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    /**
     * Model
     */
    gltfLoader.load(
        "/36/bakedModel.glb",
        (gltf) => {
            gltf.scene.getObjectByName('baked')!.material.map.anisotropy = 8
            scene.add(gltf.scene)
        }
    )
    /**
     * smoke
     */
    const perlinTexture = textureLoader.load('/36/perlin.png')
    perlinTexture.wrapS = THREE.RepeatWrapping
    perlinTexture.wrapT = THREE.RepeatWrapping
    const smokeGeometry = new THREE.PlaneGeometry(1, 1,16,64)
    smokeGeometry.translate(0,0.5,0)
    smokeGeometry.scale(1.5,6,1.5)
    const smokeMaterial = new THREE.ShaderMaterial({
        vertexShader: testVertexShader,
        fragmentShader: testFragmentShader,
        uniforms:{
            uPerlinTexture:new THREE.Uniform(perlinTexture),
            uTime:new THREE.Uniform(0),
        },
        // wireframe:true,
        depthWrite:false,
        side:THREE.DoubleSide,
        transparent:true,
    })

    const smokeMesh = new THREE.Mesh(smokeGeometry,smokeMaterial)
    smokeMesh.position.y = 1.83
    scene.add(smokeMesh)
    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()
        smokeMaterial.uniforms.uTime.value = elapsedTime

        // Update controls
        controls.update()

        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }

    tick()

});
</script>

<style scoped lang="less"></style>