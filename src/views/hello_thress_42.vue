<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import earthVertexShader from '@/assets/42/shaders/earth/vertex.vs'
import earthFragmentShader from '@/assets/42/shaders/earth/fragment.fs'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import atmosphereVertexShader from '@/assets/42/shaders/atmosphere/vertex.vs'
import atmosphereFragmentShader from '@/assets/42/shaders/atmosphere/fragment.fs'
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

    /**
     * Earth
     */

     const earthDayTexture = textureLoader.load('/42/earth/day.jpg');
     earthDayTexture.colorSpace = THREE.SRGBColorSpace;
     earthDayTexture.anisotropy = 8
     const earthNightTexture = textureLoader.load('/42/earth/night.jpg');
     earthNightTexture.anisotropy = 8
     earthNightTexture.colorSpace = THREE.SRGBColorSpace;
     const earthSpecularCloudsTexture = textureLoader.load('/42/earth/specularClouds.jpg');
     earthSpecularCloudsTexture.anisotropy = 8

    const earthParameters = {
        atmosphereDayColor :"#00aaff",
        atmosphereTwilightColor:"#ff6600"
    }

    gui.addColor(earthParameters, 'atmosphereDayColor').onChange(()=>{
        earthMaterial.uniforms.uAtmosphereDayColor.value.set(earthParameters.atmosphereDayColor)
        atmosphereMaterial.uniforms.uAtmosphereDayColor.value.set(earthParameters.atmosphereDayColor)
    })
    gui.addColor(earthParameters, 'atmosphereTwilightColor').onChange(()=>{
        earthMaterial.uniforms.uAtmosphereTwilightColor.value.set(earthParameters.atmosphereTwilightColor)
        atmosphereMaterial.uniforms.uAtmosphereTwilightColor.value.set(earthParameters.atmosphereTwilightColor)
    })


    // Mesh
    const earthGeometry = new THREE.SphereGeometry(2, 64, 64)
    const earthMaterial = new THREE.ShaderMaterial({
        vertexShader: earthVertexShader,
        fragmentShader: earthFragmentShader,
        uniforms:
        {
            uDayTexture: { value: earthDayTexture },
            uNightTexture: { value: earthNightTexture },
            uSpecularCloudsTexture: { value: earthSpecularCloudsTexture },
            uSunDirection: { value: new THREE.Vector3(0,0,1) },
            uAtmosphereDayColor: { value: new THREE.Color(earthParameters.atmosphereDayColor) },
            uAtmosphereTwilightColor: { value: new THREE.Color(earthParameters.atmosphereTwilightColor) },
            // uTime: { value: 0 },
            // uRoughness: { value: 0.5 },
            // uMetalness: { value: 0.5 },
            // uCloudsIntensity: { value: 0.5 },
        }
    })
    const earth = new THREE.Mesh(earthGeometry, earthMaterial)
    scene.add(earth)

    //atmosphre
    const atmosphereMaterial = new THREE.ShaderMaterial({
        side:THREE.BackSide,
        transparent:true,
        uniforms:{
            uSunDirection: { value: new THREE.Vector3(0,0,1) },
            uAtmosphereDayColor: { value: new THREE.Color(earthParameters.atmosphereDayColor) },
            uAtmosphereTwilightColor: { value: new THREE.Color(earthParameters.atmosphereTwilightColor) },
        },
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader

    })
    const atmosphere = new THREE.Mesh(earthGeometry, atmosphereMaterial)
    atmosphere.scale.set(1.04,1.04,1.04)
    scene.add(atmosphere)

    const sunSpherical = new THREE.Spherical(1, Math.PI / 2, 0.5)
    const sunDirection = new THREE.Vector3().setFromSpherical(sunSpherical)

    const updateSun = ()=>{
        sunDirection.setFromSpherical(sunSpherical)

        debugSun.position.copy(sunDirection).multiplyScalar(5)
        earthMaterial.uniforms.uSunDirection.value.copy(sunDirection)
        atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirection)
    }

    const debugSun = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.1,2),
        new THREE.MeshBasicMaterial()
    )
    scene.add(debugSun)
    updateSun()


    gui.add(sunSpherical, 'phi').min(0).max(Math.PI).onChange(updateSun)
    gui.add(sunSpherical, 'theta').min(-Math.PI).max(Math.PI).onChange(updateSun)
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
    camera.position.x = 12
    camera.position.y = 5
    camera.position.z = 4
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
    renderer.setPixelRatio(sizes.pixelRatio)
    renderer.setClearColor('#000011')

    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()

        earth.rotation.y = elapsedTime * 0.5

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