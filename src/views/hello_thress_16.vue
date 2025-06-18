<script setup lang="ts">
import * as THREE from 'three'
import { onMounted } from 'vue';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

onMounted(() => {
    /**
     * Textures
     */
    // const image = new Image()
    // const texture = new THREE.Texture(image)

    // image.onload = ()=>{
    //     texture.needsUpdate = true
    // }
    // image.src = '/16/door/color.jpg'
    const loaadingManager = new THREE.LoadingManager()
    loaadingManager.onStart = (url, itemsLoaded, itemsTotal)=>{
        console.log(url, itemsLoaded, itemsTotal)
    }
    loaadingManager.onLoad = ()=>{
        console.log('加载完成')
    }
    loaadingManager.onProgress = (url, itemsLoaded, itemsTotal)=>{
        console.log(url, itemsLoaded, itemsTotal)
    }
    loaadingManager.onError = (url)=>{
        console.log('加载出错', url)
    }
    const textureLoader = new THREE.TextureLoader(loaadingManager)
    // const colorTexture = textureLoader.load('/16/door/color.jpg')
    // const colorTexture = textureLoader.load('/16/checkerboard-1024x1024.png')
    // const colorTexture = textureLoader.load('/16/checkerboard-8x8.png')
    const colorTexture = textureLoader.load('/16/minecraft.png')
    const alphaTexture = textureLoader.load('/16/door/alpha.jpg')
    const heightTexture = textureLoader.load('/16/door/height.jpg')
    const normalTexture = textureLoader.load('/16/door/normal.jpg')
    const ambientOcclusionTexture = textureLoader.load('/16/door/ambientOcclusion.jpg')
    const metalnessTexture = textureLoader.load('/16/door/metalness.jpg')
    // colorTexture.offset.x = 0.3
    //设置在水平与垂直方向上重复
    // colorTexture.wrapS = THREE.RepeatWrapping
    // colorTexture.wrapT = THREE.RepeatWrapping
    // colorTexture.repeat.set(4,4)
    //旋转纹理
    // colorTexture.rotation = Math.PI / 4
    //设置为正中心
    colorTexture.center.set(0.5,0.5)
    // 设置纹理在缩小时的过滤方式
    colorTexture.minFilter = THREE.NearestMipmapNearestFilter
    //设置纹理在放大时的过滤方式
    colorTexture.magFilter = THREE.NearestFilter
    colorTexture.generateMipmaps = false
    /**
     * Base
     */
    // Canvas
    const canvas: HTMLCanvasElement = document.querySelector('canvas.webgl')!

    // Scene
    const scene = new THREE.Scene()

    /**
     * Object
     */
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshBasicMaterial({ map: colorTexture })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

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
    camera.position.x = 0
    camera.position.y = 0
    camera.position.z = 2
    scene.add(camera)

    // Controls
    const controls = new OrbitControls(camera, canvas!)
    controls.enableDamping = true

    /**
     * Renderer
     */
    const renderer = new THREE.WebGLRenderer({
        canvas
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);


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

<template>
    <canvas class="webgl"></canvas>
</template>

<style>
.webgl {
    position: absolute;
    top: 0;
    left: 0;
    outline: none;
}
</style>