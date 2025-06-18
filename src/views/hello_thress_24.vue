<template>
    <canvas class="webgl"></canvas>

    <section class="section">
        <h1>My Portfolio</h1>
    </section>
    <section class="section">
        <h2>My projects</h2>
    </section>
    <section class="section">
        <h2>Contact me</h2>
    </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import gsap from 'gsap';
onMounted(() => {
    document.querySelector('body')!.style.overflowY = 'scroll'
    document.querySelector('html')!.style.overflowY = 'scroll'
    document.querySelector('html')!.style.backgroundColor = '#1e1a20'
    let scrollY = window.scrollY
    let currentSection = 0

    window.addEventListener('scroll', () => {
        scrollY = window.scrollY

        const newSection = Math.round(scrollY / sizes.height)
        if (newSection != currentSection) {
            currentSection = newSection
            gsap.to(sections[currentSection].rotation, {
                x: '+=6',
                y: '+=6',
                duration: 1.5,
                ease: 'power1'
            })
        }
    })
    const cursor = {
        x: 0,
        y: 0
    }
    window.addEventListener('mousemove', (event) => {
        cursor.x = event.clientX / sizes.width - 0.5
        cursor.y = event.clientY / sizes.height - 0.5
    })
    document.addEventListener('mouseleave', () => {
        console.log('mouseleave');
        cursor.x = 0
        cursor.y = 0
    })
    /**
     * Debug
     */
    const gui = new GUI()

    const parameters = {
        materialColor: '#ffeded'
    }

    gui
        .addColor(parameters, 'materialColor')
        .onChange(() => {
            material.color.set(parameters.materialColor)
            particles.material.color.set(parameters.materialColor)
        })
    /**
     * Base
     */
    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()
    /**
     * Objects
     */
    //Texture
    const textureLoader = new THREE.TextureLoader()
    const gradientTexture = textureLoader.load('/24/gradients/3.jpg')
    gradientTexture.magFilter = THREE.NearestFilter
    /**
     * Test cube
     */
    const objectsDistances = 4
    const material = new THREE.MeshToonMaterial({
        color: parameters.materialColor,
        gradientMap: gradientTexture
    })
    const mesh1 = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.4, 16, 60),
        material
    )

    const mesh2 = new THREE.Mesh(
        new THREE.ConeGeometry(1, 2, 32),
        material
    )

    const mesh3 = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.8, 0.35, 100, 16),
        material
    )
    mesh1.position.y = -objectsDistances * 0
    mesh2.position.y = -objectsDistances * 1
    mesh3.position.y = -objectsDistances * 2

    mesh1.position.x = 2
    mesh2.position.x = -2
    mesh3.position.x = 2
    scene.add(mesh1, mesh2, mesh3)
    const sections = [mesh1, mesh2, mesh3]
    /**
     * Particles
    */
    const particlesCount = 20220
    const positions = new Float32Array(particlesCount * 3)
    for (let i = 0; i < particlesCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 10
        positions[i * 3 + 1] = objectsDistances * 0.5 - Math.random() * objectsDistances * sections.length
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    const particlesBufferGeometry = new THREE.BufferGeometry()
    particlesBufferGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.03,
        color: parameters.materialColor,
        sizeAttenuation: true
    })
    const particles = new THREE.Points(particlesBufferGeometry, particlesMaterial)
    scene.add(particles)

    /**
     * Lights
    */
    const directionalLight = new THREE.DirectionalLight('#ffffff', 1)
    directionalLight.position.set(1, 1, 0)
    scene.add(directionalLight)

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
    const cameraGroup = new THREE.Group()
    scene.add(cameraGroup)

    const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
    camera.position.z = 6
    cameraGroup.add(camera)

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    /**
     * Animate
     */
    const clock = new THREE.Clock()
    let previouseTime = 0

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()
        const deltaTime = elapsedTime - previouseTime
        previouseTime = elapsedTime

        camera.position.y = - scrollY / sizes.height * objectsDistances

        const parallaxX = cursor.x * 0.5
        const parallaxY = - cursor.y * 0.5
        cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 5 * deltaTime
        cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 5 * deltaTime

        //animate meshes
        for (const section of sections) {
            section.rotation.x += deltaTime * 0.1
            section.rotation.y += deltaTime * 0.12
        }
        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }

    tick()
})
</script>

<style scoped lang="less">
.webgl {
    position: fixed;
    top: 0;
    left: 0;
    outline: none;
}

.section {
    display: flex;
    align-items: center;
    height: 100vh;
    position: relative;
    color: #ffeded;
    text-transform: uppercase;
    font-size: 7vmin;
    padding-left: 10%;
    padding-right: 10%;
}

section:nth-child(odd) {
    justify-content: flex-end;
}
</style>