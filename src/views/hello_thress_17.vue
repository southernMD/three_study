<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
onMounted(() => {

    /**
     * Base
     */
    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()
    /**
     * textures
     */
    const loaadingManager = new THREE.LoadingManager()
    const textureLoader = new THREE.TextureLoader(loaadingManager)
    const colorTexture = textureLoader.load('/17/door/color.jpg')
    const alphaTexture = textureLoader.load('/17/door/alpha.jpg')
    const heightTexture = textureLoader.load('/17/door/height.jpg')
    const normalTexture = textureLoader.load('/17/door/normal.jpg')
    const ambientOcclusionTexture = textureLoader.load('/17/door/ambientOcclusion.jpg')
    const metalnessTexture = textureLoader.load('/17/door/metalness.jpg')
    const roughnessTexture = textureLoader.load('/17/door/roughness.jpg')

    const matcapTexture = textureLoader.load('/17/matcaps/3.png')
    const gradientTexture = textureLoader.load('/17/gradients/3.jpg')
    /**
     * Objects
     */
    // const material = new THREE.MeshBasicMaterial({})

    // //alphaMap会将材质黑色的地方透明，白色的部分显示
    // material.transparent = true
    // material.alphaMap = alphaTexture
    // material.map = colorTexture
    // material.side = THREE.DoubleSide //双面渲染

    // const material = new THREE.MeshNormalMaterial()
    // material.normalMap = normalTexture
    // material.flatShading = true

    //Matcap作用是 模拟反射，但是只能模拟反射，不能模拟折射
    // const material = new THREE.MeshMatcapMaterial()
    // material.matcap = matcapTexture
    // material.alphaMap = alphaTexture

    //靠近材质的物体，深度基于相机远近平面。白色最近，黑色最远。
    // const material = new THREE.MeshDepthMaterial()

    const light = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(light)
    const light2 = new THREE.DirectionalLight(0xffffff, 0.5)
    light2.position.set(2, 3, 4)
    scene.add(light2)
    //一种非光泽表面的材质,没有镜面高光
    // const material = new THREE.MeshLambertMaterial()

    // 一种用于具有镜面高光的光泽表面的材质。
    // const material = new THREE.MeshPhongMaterial()
    //高光强度决定了材质表面反射光线的集中程度，值越大，高光越集中和明亮
    // material.shininess = 1000

    //一种实现卡通着色的材质。
    // const material = new THREE.MeshToonMaterial()
    // gradientTexture.minFilter = THREE.NearestFilter
    // gradientTexture.magFilter = THREE.NearestFilter
    // material.gradientMap = gradientTexture

    //Physical与Standard类似，但有类似的透明覆盖，需要更高的性能。
    const material = new THREE.MeshStandardMaterial()
    // const material = new THREE.MeshPhysicalMaterial()
    material.metalness = 0.45 // 金属
    material.roughness = 0.65 // 粗糙度
    material.map = colorTexture
    //aoMap需要第二组UV。 108行
    material.aoMap = ambientOcclusionTexture
    material.aoMapIntensity = 1
    //在渲染时根据纹理的亮度值来改变几何体的顶点位置，从而创建凹凸不平的效果
    material.displacementMap = heightTexture
    material.displacementScale = 0.05
    // 高光
    material.metalnessMap = metalnessTexture
    // 粗糙度
    material.roughnessMap = roughnessTexture
    //法线贴图
    material.normalMap = normalTexture
    material.normalScale.set(3, 3)
    //透明度贴图，alphaMap会将材质黑色的地方透明，白色的部分显示
    material.alphaMap = alphaTexture
    material.transparent = true

    /**
     * Debug
     */
    const gui = new GUI()
    gui.add(material, 'metalness').min(0).max(1).step(0.0001).name("金属度")
    gui.add(material, 'roughness').min(0).max(1).step(0.0001).name("粗糙度")
    gui.add(material, 'aoMapIntensity').min(0).max(10).step(0.0001).name("aoMapIntensity")
    gui.add(material, 'displacementScale').min(0).max(1).step(0.0001).name(" displacementScale")

    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 64, 64),
        material,
    )
    sphere.position.x = - 1.5

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1,1000,1000),
        material
    )

    const torus = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.2, 64, 128),
        material
    )
    torus.position.x = 1.5
    // scene.add(sphere, plane, torus)
    scene.add(plane)
    //添加uv2
    sphere.geometry.setAttribute(
      'uv2',
      new THREE.BufferAttribute(sphere.geometry.attributes.uv.array, 2)
    )
    plane.geometry.setAttribute(
      'uv2',
      new THREE.BufferAttribute(plane.geometry.attributes.uv.array, 2)
    )
    torus.geometry.setAttribute(
      'uv2',
      new THREE.BufferAttribute(torus.geometry.attributes.uv.array, 2)
    )
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
    camera.position.x = 1
    camera.position.y = 1
    camera.position.z = 2
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

        sphere.rotation.y = 0.1 * elapsedTime
        plane.rotation.y = 0.1 * elapsedTime
        torus.rotation.y = 0.1 * elapsedTime

        sphere.rotation.x = 0.25 * elapsedTime
        plane.rotation.x = 0.25 * elapsedTime
        torus.rotation.x = 0.25 * elapsedTime

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