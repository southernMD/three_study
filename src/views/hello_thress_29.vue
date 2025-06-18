<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
onMounted(() => {
    /**
     * Loaders
     */
    const gltfLoader = new GLTFLoader()
    const rgbeLoader = new RGBELoader()

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
     * Update all materials
     */
    const updateAllMaterials = () => {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                // Activate shadow here
                // child.material.envMapIntensity = scene.environmentIntensity
                child.castShadow = true
                child.receiveShadow = true
            }
        })
    }

    /**
     * Environment map
     */
    // Intensity
    scene.environmentIntensity = 1
    gui
        .add(scene, 'environmentIntensity')
        .min(0)
        .max(10)
        .step(0.001)

    // HDR (RGBE) equirectangular
    rgbeLoader.load('/28/environmentMaps/0/2k.hdr', (environmentMap) => {
        environmentMap.mapping = THREE.EquirectangularReflectionMapping

        scene.background = environmentMap
        scene.environment = environmentMap
    })
    /**
     * directional light
    * */ 

    const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
    directionalLight.position.set(-4,6.5,2.5)
    directionalLight.castShadow = true
    directionalLight.target.position.set(0, 4, 0)
    directionalLight.target.updateMatrixWorld()
    directionalLight.shadow.camera.far = 15
    directionalLight.shadow.mapSize.set(512, 512)
    scene.add(directionalLight)
    //gui group
    const groupLight = gui.addFolder('DirectionalLight')
    groupLight.add(directionalLight, 'intensity').min(0).max(10).step(0.001).name('LightIntensity')
    groupLight.add(directionalLight.position, 'x').min(-5).max(5).step(0.001).name('LightX')
    groupLight.add(directionalLight.position, 'y').min(-5).max(5).step(0.001).name('LightY')
    groupLight.add(directionalLight.position, 'z').min(-5).max(5).step(0.001).name('LightZ')
    groupLight.add(directionalLight, 'castShadow')

    //heler
    const directionalLightHelper = new THREE.CameraHelper(directionalLight.shadow.camera)
    scene.add(directionalLightHelper)
    /**
     * Models
     */
    // Helmet
    gltfLoader.load(
        '/28/models/FlightHelmet/glTF/FlightHelmet.gltf',
        (gltf) => {
            gltf.scene.scale.set(10, 10, 10)
            scene.add(gltf.scene)

            updateAllMaterials()
        }
    )
    //Textures
    const textureLoader = new THREE.TextureLoader()
    const colorTexture = textureLoader.load('/29/textures/castle_brick_broken_06/castle_brick_broken_06_diff_1k.jpg')
    const normalTexture = textureLoader.load('/29/textures/castle_brick_broken_06/castle_brick_broken_06_nor_gl_1k.png')
    const armTexture = textureLoader.load('/29/textures/castle_brick_broken_06/castle_brick_broken_06_arm_1k.jpg')

    colorTexture.colorSpace = THREE.SRGBColorSpace

    const colorTextureWood = textureLoader.load('/29/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_diff_1k.jpg')
    const normalTextureWood = textureLoader.load('/29/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_nor_gl_1k.png')
    const armTextureWood = textureLoader.load('/29/textures/wood_cabinet_worn_long/wood_cabinet_worn_long_arm_1k.jpg')

    colorTextureWood.colorSpace = THREE.SRGBColorSpace


    //wall
    const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({
            map: colorTexture,
            normalMap: normalTexture,
            aoMap: armTexture,
            roughnessMap: armTexture,
            metalnessMap: armTexture,
        })
    )
    scene.add(wall)

    wall.geometry.setAttribute('uv2', new THREE.BufferAttribute(wall.geometry.attributes.uv.array, 2))

    wall.position.z = -2
    wall.position.y = 2
    wall.castShadow = true
    wall.receiveShadow = true


    //floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({
            map: colorTextureWood,
            normalMap: normalTextureWood,
            aoMap: armTextureWood,
            roughnessMap: armTextureWood,
            metalnessMap: armTextureWood,
        })
    )
    floor.receiveShadow = true
    floor.geometry.setAttribute('uv2', new THREE.BufferAttribute(floor.geometry.attributes.uv.array, 2))
    floor.rotation.x = -Math.PI * .5
    scene.add(floor)


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
        canvas: canvas,
        antialias: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1
    gui.add(renderer, 'toneMapping',{
        No:THREE.NoToneMapping,
        Linear:THREE.LinearToneMapping,
        Reinhard:THREE.ReinhardToneMapping,
        Cineon:THREE.CineonToneMapping,
        ACESFilmic:THREE.ACESFilmicToneMapping
    })
    gui.add(renderer, 'toneMappingExposure').min(0).max(10).step(0.001)

    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    /**
     * Animate
     */
    const tick = () => {
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