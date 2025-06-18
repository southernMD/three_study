<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
onMounted(async () => {


    /**
     * Base
     */
    // Debug
    const gui = new GUI()
    const global = {
        envMapIntensity: 3
    }
    gui.add(global, 'envMapIntensity').min(0).max(10).step(0.001).onChange(value => {
        flightModel.scene.traverse(child => {
            if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial){
                child.material.envMapIntensity = value
            }
        })
    })

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()
    scene.backgroundBlurriness = 0
    scene.backgroundIntensity = 1
    /***
     * Enviroment map
     */
    // const envMapLoader = new THREE.CubeTextureLoader()
    // const envMap = envMapLoader.load([
    //     '/28/environmentMaps/0/px.png',
    //     '/28/environmentMaps/0/nx.png',
    //     '/28/environmentMaps/0/py.png',
    //     '/28/environmentMaps/0/ny.png',
    //     '/28/environmentMaps/0/pz.png',
    //     '/28/environmentMaps/0/nz.png',
    // ])
    // scene.background = envMap
    // scene.environment = envMap
    
    const rgberLoader = new RGBELoader()
    const hdrTexture = await rgberLoader.loadAsync('/28/environmentMaps/2/2k.hdr')
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping
    // scene.environment = hdrTexture
    scene.background = hdrTexture

    /**
     * Loaders
     */
    const gltfLoader = new GLTFLoader()
    const flightModel = await gltfLoader.loadAsync(
        '/28/models/FlightHelmet/glTF/FlightHelmet.gltf'
    )
    flightModel.scene.scale.set(10, 10, 10)
    flightModel.scene.traverse(child => {
        if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial){
            child.material.envMapIntensity = 3
        }
    })
    scene.add(flightModel.scene)

    /**
     * Torus Knot
     */
    const torusKnot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1, 0.4, 100, 16),
        new THREE.MeshStandardMaterial({
            roughness: 0.1,
            metalness: 0.9,
            color: 0xaaaaaa,
        })
    )
    torusKnot.position.y = 4
    scene.add(torusKnot)

    //Holy donut
    const holyDonut = new THREE.Mesh(
        new THREE.TorusGeometry(5, 0.2, 16, 100),
        new THREE.MeshBasicMaterial({
            color: 0xffffff,
        })
    )
    holyDonut.layers.enable(1)
    holyDonut.position.y = 3.5
    scene.add(holyDonut)

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
        type: THREE.HalfFloatType,
    })
    scene.environment = cubeRenderTarget.texture

    //cube camera
    const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget)
    cubeCamera.layers.set(1)
    // cubeCamera.position.copy(torusKnot.position)

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
    camera.position.set(4, 5, 4)
    scene.add(camera)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.target.y = 3.5
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
        // Time
        const elapsedTime = clock.getElapsedTime()

        // Update controls
        controls.update()

        if(holyDonut){
            holyDonut.rotation.x = Math.sin(elapsedTime) * 2
            cubeCamera.update(renderer,scene)
        }

        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }

    tick()
})
</script>

<style scoped lang="less"></style>