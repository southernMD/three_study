<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import fireworkVectex from '@/assets/38/shaders/vertex.vs';
import fireworkFragment from '@/assets/38/shaders/fragment.fs';
import gsap from 'gsap';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
onMounted(() => {
    /**
     * Base
     */
    // Debug
    const gui = new GUI({ width: 340 })

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()

    // Loaders
    const textureLoader = new THREE.TextureLoader()

    /**
     * Sizes
     */
    const sizes = {
        width: window.innerWidth,
        height: window.innerHeight,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        pixelRatio: Math.min(window.devicePixelRatio, 2)
    }
    sizes.resolution.set(window.innerWidth * sizes.pixelRatio, window.innerHeight * sizes.pixelRatio)

    window.addEventListener('resize', () => {
        // Update sizes
        sizes.width = window.innerWidth
        sizes.height = window.innerHeight
        sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)
        sizes.resolution.set(window.innerWidth * sizes.pixelRatio, window.innerHeight * sizes.pixelRatio)

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
    camera.position.set(1.5, 0, 6)
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
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    /**
     * Fireworks
     */

    const textures = [
        textureLoader.load('/38/particles/1.png'),
        textureLoader.load('/38/particles/2.png'),
        textureLoader.load('/38/particles/3.png'),
        textureLoader.load('/38/particles/4.png'),
        textureLoader.load('/38/particles/5.png'),
        textureLoader.load('/38/particles/6.png'),
        textureLoader.load('/38/particles/7.png'),
        textureLoader.load('/38/particles/8.png'),
    ]

    const createFireworks = (count: number, position: THREE.Vector3Like, size: number, texture: THREE.Texture, radius: number, color: THREE.Color) => {
        const positionsArray = new Float32Array(count * 3)
        const sizesArray = new Float32Array(count)
        const TimeArray = new Float32Array(count)
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            const spherical = new THREE.Spherical(
                radius * (0.75 + Math.random() * 0.25),
                Math.random() * Math.PI,
                Math.random() * Math.PI * 2,
            )
            //设置中心位置为鼠标点击的位置
            const position = new THREE.Vector3().setFromSpherical(spherical)

            positionsArray[i3 + 0] = position.x
            positionsArray[i3 + 1] = position.y
            positionsArray[i3 + 2] = position.z

            sizesArray[i] = Math.random() + 0.5
            TimeArray[i] = 1 + Math.random()
        }
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3))
        geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1))
        geometry.setAttribute('aTimeMultiplier', new THREE.BufferAttribute(TimeArray, 1))
        texture.flipY = false
        const material = new THREE.ShaderMaterial({
            fragmentShader: fireworkFragment,
            vertexShader: fireworkVectex,
            uniforms: {
                uSize: new THREE.Uniform(size),
                uTime: new THREE.Uniform(0),
                uResolution: new THREE.Uniform(sizes.resolution),
                uTexture: new THREE.Uniform(texture),
                uColor: new THREE.Uniform(color),
                uProgress: new THREE.Uniform(0)
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        })
        const firework = new THREE.Points(geometry, material)
        firework.position.copy(position)
        scene.add(firework)

        const destory = () => {
            scene.remove(firework)
            geometry.dispose()
            material.dispose()
        }

        gsap.to(material.uniforms.uProgress, { value: 1, duration: 3, ease: "power1", onComplete: destory })
    }

    const createRandomFireworks = (pointer: THREE.Vector2) => {
        const count = Math.round(400 + Math.random() * 1000)
        const position = new THREE.Vector3(
            (Math.random() * 0.5) * 2 + pointer.x,
            Math.random() + pointer.y,
            (Math.random() * 0.5) * 2,
        )
        const size = 0.1 + Math.random() * 0.1;
        const texture = textures[Math.floor(Math.random() * textures.length)]
        const radius = 0.5 + Math.random();
        const color = new THREE.Color()
        color.setHSL(Math.random(), 1, 0.7)
        createFireworks(count, position, size, texture, radius, color)
    }
    window.addEventListener("click", (e) => {
        //点击位置
        const pointer = new THREE.Vector2();
        pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
        createRandomFireworks(pointer)
    })

    /**sky */
    // Add Sky
    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    const sun = new THREE.Vector3();

    /// GUI

    const effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: -0.93,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };

    function guiChanged() {

        const uniforms = sky.material.uniforms;
        uniforms['turbidity'].value = effectController.turbidity;
        uniforms['rayleigh'].value = effectController.rayleigh;
        uniforms['mieCoefficient'].value = effectController.mieCoefficient;
        uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        uniforms['sunPosition'].value.copy(sun);

        renderer.toneMappingExposure = effectController.exposure;
        renderer.render(scene, camera);

    }

    gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged);
    gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
    gui.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged);
    gui.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged);
    gui.add(effectController, 'elevation', -3, 10, 0.01).onChange(guiChanged);
    gui.add(effectController, 'azimuth', - 180, 180, 0.1).onChange(guiChanged);
    gui.add(effectController, 'exposure', 0, 1, 0.0001).onChange(guiChanged);

    guiChanged();

    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    let fireworksCounter = 0;
    const fireworksInterval = 60; // 每60帧创建一次烟花
    /**
     * Animate
     */
    const tick = () => {
        // Update controls
        controls.update()
        if (fireworksCounter % fireworksInterval === 0) {
            // createRandomFireworks();
        }
        fireworksCounter++;

        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }

    tick()
})
</script>

<style scoped lang="less"></style>