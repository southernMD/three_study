<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import shadingVertexShader from '@/assets/39/shaders/vertex.vs'
import shadingFragmentShader from '@/assets/39/shaders/fragment.fs'
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
        height: window.innerHeight,
        pixelRatio: Math.min(window.devicePixelRatio, 2)
    }

    window.addEventListener('resize', () => {
        // Update sizes
        sizes.width = window.innerWidth
        sizes.height = window.innerHeight
        sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

        // Update camera
        camera.aspect = sizes.width / sizes.height
        camera.updateProjectionMatrix()

        // Update renderer
        renderer.setSize(sizes.width, sizes.height)
        renderer.setPixelRatio(sizes.pixelRatio)
    })

    /**
     * Camera
     */
    // Base camera
    const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
    camera.position.x = 7
    camera.position.y = 7
    camera.position.z = 7
    scene.add(camera)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    // renderer.toneMapping = THREE.ACESFilmicToneMapping
    // renderer.toneMappingExposure = 3
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)

    /**
     * Material
     */
    const materialParameters = {
        color:'#ffffff'
    }

    const material = new THREE.ShaderMaterial({
        vertexShader: shadingVertexShader,
        fragmentShader: shadingFragmentShader,
        uniforms:
        {
            uColor: new THREE.Uniform(new THREE.Color(materialParameters.color)),
        }
    })

    gui
        .addColor(materialParameters, 'color')
        .onChange(() => {
            material.uniforms.uColor.value.set(materialParameters.color)
        })

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
        '/39/suzanne.glb',
        (gltf) => {
            suzanne = gltf.scene
            suzanne.traverse((child) => {
                if (child.isMesh)
                    child.material = material
            })
            scene.add(suzanne)
        }
    )

    // Lights Helpers
    const directionalLight = new THREE.Mesh(
        new THREE.PlaneGeometry(),
        new THREE.MeshBasicMaterial({
            color:new THREE.Color().setRGB(0.1,0.1,1),
            side:THREE.DoubleSide,
        })
    )
    directionalLight.position.set(0,0,3)
    scene.add(directionalLight)

    const pointLightHelper = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.1,2),
        new THREE.MeshBasicMaterial({
            color:new THREE.Color().setRGB(0.1,0.1,1),
            side:THREE.DoubleSide,
        })
    )
    pointLightHelper.position.set(0,2.5,0)
    scene.add(pointLightHelper)

    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()

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