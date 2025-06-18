<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'

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
     * Textures
     */
    const textureLoader = new THREE.TextureLoader()
    const bufferTexture = textureLoader.load('/22/particles/11.png')

    /**
     * particles
    */
    const particlesGeometry = new THREE.SphereGeometry(1,32,32)
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.1,
        sizeAttenuation: true,
        alphaMap:bufferTexture,
        // alphaTest: 0.001,
        // depthTest: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        // color: new THREE.Color(0xff0000)
        vertexColors: true
    })

    const particles = new THREE.Points(particlesGeometry, particlesMaterial)
    // scene.add(particles)
    const count = 150000;
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
        positions[i] = (Math.random() - 0.5) * 4
        colors[i] = Math.random()
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute('color', new THREE.BufferAttribute( colors, 3 ) );
    const ponits = new THREE.Points(
        geometry,
        particlesMaterial,
    )
    scene.add(ponits)

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

    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()
        for(let i = 0 ; i < count; i++){
            const i3 = i * 3
            const x = particlesGeometry.attributes.position.array[i3]
            positions[i3 + 1] = Math.sin(elapsedTime + x)
        }
        geometry.attributes.position.needsUpdate = true
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