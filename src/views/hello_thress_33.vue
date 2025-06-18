<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import testVertexShader from '@/assets/33/shaders/vertex.vs'
import testFragmentShader from '@/assets/33/shaders/fragment.fs'
onMounted(() => {
    /**
     * Base
     */
    // Debug
    const gui = new GUI({ width: 340 })
    const debugObj ={
        depthColor: '#66ccff',
        surfaceColor: '#8888ff'
    }

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()

    /**
     * Water
     */
    // Geometry
    const waterGeometry = new THREE.PlaneGeometry(2, 2, 512, 512)

    // Material
    const waterMaterial = new THREE.ShaderMaterial({
        vertexShader: testVertexShader,
        fragmentShader: testFragmentShader,
        uniforms:{
            uBigWavesElevation:{value:0.2},
            uBigWavesFrequency:{value:new THREE.Vector2(4,1.5)},
            uTime:{value:0},
            uBigWavesSpeed:{value:0.2},

            uSmallWavesElevation:{value:0.15},
            uSmallWavesFrequency:{value:3},
            uSmallWavesSpeed:{value:0.2},
            uSmallWavesIterations:{value:4},

            uDepthColor:{value:new THREE.Color(debugObj.depthColor)},
            uSurfaceColor:{value:new THREE.Color(debugObj.surfaceColor)},
            uColorOffset:{value:0.05},
            uColorMultiplier:{value:5}
        },
        side: THREE.DoubleSide
    })
    gui.add(waterMaterial.uniforms.uBigWavesElevation,'value').min(0).max(1).step(0.001).name('uBigWavesElevation')
    gui.add(waterMaterial.uniforms.uBigWavesFrequency.value,'x').min(2).max(8).step(0.001).name('uBigWavesFrequencX')
    gui.add(waterMaterial.uniforms.uBigWavesFrequency.value,'y').min(0).max(4).step(0.001).name('uBigWavesFrequencY')
    gui.add(waterMaterial.uniforms.uBigWavesSpeed,'value').min(0).max(4).step(0.001).name('uBigWavesSpeed')

    gui.add(waterMaterial.uniforms.uSmallWavesElevation,'value').min(0).max(1).step(0.001).name('uSmallWavesElevation')
    gui.add(waterMaterial.uniforms.uSmallWavesFrequency,'value').min(0).max(5).step(0.001).name('uSmallWavesFrequency')
    gui.add(waterMaterial.uniforms.uSmallWavesSpeed,'value').min(0).max(4).step(0.001).name('uSmallWavesSpeed')
    gui.add(waterMaterial.uniforms.uSmallWavesIterations,'value').min(1).max(7).step(1).name('uSmallWavesIterations')
    
    gui.addColor(debugObj,'depthColor').name('depthColor').onChange(value => {
        waterMaterial.uniforms.uDepthColor.value.set(value)
    })
    gui.addColor(debugObj,'surfaceColor').name('surfaceColor').onChange(value => {
        waterMaterial.uniforms.uSurfaceColor.value.set(value)
    })
    gui.add(waterMaterial.uniforms.uColorOffset,'value').min(0).max(1).step(0.001).name('uColorOffset')
    gui.add(waterMaterial.uniforms.uColorMultiplier,'value').min(0).max(10).step(0.001).name('uColorMultiplier')

    // Mesh
    const water = new THREE.Mesh(waterGeometry, waterMaterial)
    water.rotation.x = - Math.PI * 0.5
    scene.add(water)

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
    camera.position.set(1, 1, 1)
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
        waterMaterial.uniforms.uTime.value = elapsedTime

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