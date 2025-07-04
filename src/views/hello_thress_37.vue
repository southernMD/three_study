<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import testVertexShader from '@/assets/37/shaders/vertex.vs'
import testFragmentShader from '@/assets/37/shaders/fragment.fs'
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
    camera.position.set(7, 7, 7)
    scene.add(camera)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    /**
     * Renderer
     */
    const rendererParameters = {
        clearColor:'#1d1f2a'
    }

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    renderer.setClearColor(rendererParameters.clearColor)
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    gui
        .addColor(rendererParameters, 'clearColor')
        .onChange(() => {
            renderer.setClearColor(rendererParameters.clearColor)
        })

    /**
     * Material
     */
    const material = new THREE.ShaderMaterial({
        vertexShader:testVertexShader,
        fragmentShader:testFragmentShader,
        uniforms:{
            uTime:{value:0},
            uColor:{value:new THREE.Color('#ff0000')}
        },
        transparent:true,
        side: THREE.DoubleSide,
        depthWrite:false,
        blending: THREE.AdditiveBlending
    })
    gui.addColor(material.uniforms.uColor, 'value')
        .name('color')

    /**
     * Objects
     */
    // Torus knot
    const torusKnot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.6, 0.25, 128, 32),
        material
    )
    torusKnot.position.x = 3
    scene.add(torusKnot)

    // Sphere
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(),
        material
    )
    sphere.position.x = - 3
    scene.add(sphere)

    // Suzanne
    let suzanne = null
    gltfLoader.load(
        '/37/suzanne.glb',
        (gltf) => {
            suzanne = gltf.scene
            suzanne.traverse((child) => {
                if (child.isMesh)
                    child.material = material
            })
            scene.add(suzanne)
        }
    )

    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()
        material.uniforms.uTime.value = elapsedTime

        // Rotate objects
        if (suzanne) {
            suzanne.rotation.x = - elapsedTime * 0.1
            suzanne.rotation.y = elapsedTime * 0.2
        }

        sphere.rotation.x = - elapsedTime * 0.1
        sphere.rotation.y = elapsedTime * 0.2

        torusKnot.rotation.x = - elapsedTime * 0.1
        torusKnot.rotation.y = elapsedTime * 0.2

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