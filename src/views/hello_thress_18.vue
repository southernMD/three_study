<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { onMounted } from 'vue';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
onMounted(() => {



    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()
    /**
     * fonts
     * 
     */
    const fontLoader = new FontLoader()
    fontLoader.load(
        '/fonts/helvetiker_regular.typeface.json',
        (font) => {
            const textGeometry = new TextGeometry('Hello Three.js', {
                font: font,
                size: 0.5,
                height: 0.2,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.03,
                bevelOffset: 0,
                bevelSegments: 5
            })
            // textGeometry.computeBoundingBox()
            // //x y - bevelSize ,z - bevelThickness
            // textGeometry.translate(
            //     - (textGeometry.boundingBox!.max.x - 0.03) * 0.5,
            //     - (textGeometry.boundingBox!.max.y - 0.03) * 0.5,
            //     - (textGeometry.boundingBox!.max.z - 0.03) * 0.5
            // )
            textGeometry.center()
            const material = new THREE.MeshMatcapMaterial()
            const matcapTextures = new THREE.TextureLoader().load('/18/matcaps/3.png')
            material.matcap = matcapTextures
            const cube = new THREE.Mesh(
                textGeometry,
                material
            )

            scene.add(cube)
            const donutGeometry = new THREE.TorusGeometry(0.3, 0.2, 20, 45)
            const donutMaterial = new THREE.MeshMatcapMaterial({ matcap: matcapTextures })
            donutMaterial.matcap = matcapTextures

            for (let i = 0; i < 1000; i++) {
                const donut = new THREE.Mesh(
                    donutGeometry,
                    donutMaterial
                )
                donut.position.x = (Math.random() - 0.5) * 50
                donut.position.y = (Math.random() - 0.5) * 50
                donut.position.z = (Math.random() - 0.5) * 50
                donut.rotation.x = Math.random() * Math.PI
                donut.rotation.y = Math.random() * Math.PI
                scene.add(donut)
            }
        }
    )

    /**
     * Textures
     */
    const textureLoader = new THREE.TextureLoader()

    /**
     * Object
     */

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
    camera.position.y = 2
    camera.position.z = 3
    scene.add(camera)

    // Controls
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 60

        /**
     * Base
     */
    // Debug
    const gui = new GUI()
    gui.add(controls,'autoRotateSpeed').min(0).max(120).step(0.5)
    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    /**
     * AXE
     */
    // const axesHelper = new THREE.AxesHelper(2)
    // scene.add(axesHelper)
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

    tick()
})
</script>

<style scoped lang="less"></style>