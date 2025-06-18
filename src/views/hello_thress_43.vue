<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import earthVertexShader from '@/assets/43/shaders/earth/vertex.vs'
import earthFragmentShader from '@/assets/43/shaders/earth/fragment.fs'
// import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
import atmosphereVertexShader from '@/assets/43/shaders/atmosphere/vertex.vs'
import atmosphereFragmentShader from '@/assets/43/shaders/atmosphere/fragment.fs'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
function getSunSpherical(latitude: number, longitude: number, date: Date) {

    // 获取当前时间（UTC 转本地时间）
    const hours = date.getUTCHours() + longitude / 15; // 15° ≈ 1 小时
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

    // 太阳赤纬计算（简化版）
    const declination = 23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180));

    // 太阳时角（角度制）
    const hourAngle = (hours - 12) * 15;

    // 太阳仰角（phi）
    const latitudeRad = latitude * (Math.PI / 180);
    const declinationRad = declination * (Math.PI / 180);
    const hourAngleRad = hourAngle * (Math.PI / 180);
    const altitude = Math.asin(
        Math.sin(latitudeRad) * Math.sin(declinationRad) +
        Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad)
    );

    // 太阳方位角（theta）
    const cosAzimuth = (Math.sin(declinationRad) - Math.sin(latitudeRad) * Math.sin(altitude)) /
        (Math.cos(latitudeRad) * Math.cos(altitude));
    let azimuth = Math.acos(cosAzimuth);
    if (hours > 12) azimuth = 2 * Math.PI - azimuth; // 下午调整方向

    return { phi: Math.PI / 2 - altitude, theta: azimuth };
}



onMounted(() => {


    /**
     * Base
     */
    // Debug
    // const gui = new GUI()

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()

    // Loaders
    const textureLoader = new THREE.TextureLoader()

    /**
     * Earth
     */

    const earthDayTexture = textureLoader.load('/43/earth/day.jpg');
    earthDayTexture.colorSpace = THREE.SRGBColorSpace;
    earthDayTexture.anisotropy = 8
    const earthNightTexture = textureLoader.load('/43/earth/night.jpg');
    earthNightTexture.anisotropy = 8
    earthNightTexture.colorSpace = THREE.SRGBColorSpace;
    const earthSpecularCloudsTexture = textureLoader.load('/43/earth/specularClouds.jpg');
    earthSpecularCloudsTexture.anisotropy = 8

    const earthParameters = {
        atmosphereDayColor: "#00aaff",
        atmosphereTwilightColor: "#00aaff"
    }

    // gui.addColor(earthParameters, 'atmosphereDayColor').onChange(() => {
    //     earthMaterial.uniforms.uAtmosphereDayColor.value.set(earthParameters.atmosphereDayColor)
    //     atmosphereMaterial.uniforms.uAtmosphereDayColor.value.set(earthParameters.atmosphereDayColor)
    // })
    // gui.addColor(earthParameters, 'atmosphereTwilightColor').onChange(() => {
    //     earthMaterial.uniforms.uAtmosphereTwilightColor.value.set(earthParameters.atmosphereTwilightColor)
    //     atmosphereMaterial.uniforms.uAtmosphereTwilightColor.value.set(earthParameters.atmosphereTwilightColor)
    // })


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
            uSunDirection: { value: new THREE.Vector3(0, 0, 1) },
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
        side: THREE.BackSide,
        transparent: true,
        uniforms: {
            uSunDirection: { value: new THREE.Vector3(0, 0, 1) },
            uAtmosphereDayColor: { value: new THREE.Color(earthParameters.atmosphereDayColor) },
            uAtmosphereTwilightColor: { value: new THREE.Color(earthParameters.atmosphereTwilightColor) },
        },
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader

    })
    const atmosphere = new THREE.Mesh(earthGeometry, atmosphereMaterial)
    atmosphere.scale.set(1.04, 1.04, 1.04)
    scene.add(atmosphere)

    const sunSpherical = new THREE.Spherical(1, Math.PI / 2, 0.5)
    const sunDirection = new THREE.Vector3().setFromSpherical(sunSpherical)
    const sunPosition = getSunSpherical(39.9, 116.4, new Date());
    sunSpherical.phi = sunPosition.phi
    sunSpherical.theta = sunPosition.theta
    const updateSun = () => {
        const now = new Date();
        const hours = now.getUTCHours() + now.getUTCMinutes() / 60;
        const phi = (hours / 24) * Math.PI * 2;
        sunSpherical.phi = phi;
        sunDirection.setFromSpherical(sunSpherical);

        debugSun.position.copy(sunDirection).multiplyScalar(15);
        earthMaterial.uniforms.uSunDirection.value.copy(sunDirection);
        atmosphereMaterial.uniforms.uSunDirection.value.copy(sunDirection);
    }

    const debugSun = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.1, 2),
        new THREE.MeshBasicMaterial()
    )
    // scene.add(debugSun)
    updateSun();
    setInterval(updateSun, 3600000);

    // gui.add(sunSpherical, 'phi').min(0).max(Math.PI).onChange(updateSun)
    // gui.add(sunSpherical, 'theta').min(-Math.PI).max(Math.PI).onChange(updateSun)
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

    //avatar
    const circleTexture = textureLoader.load('/43/avatar.jpg');
    const circle = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 32),
        new THREE.MeshBasicMaterial({
            map: circleTexture,
            side: THREE.DoubleSide,
        })
    );
    circle.position.set(-0.93, 1.067, -1.514);
    // gui.add(circle.position, 'x').min(-5).max(5).step(0.001)
    // gui.add(circle.position, 'y').min(-5).max(5).step(0.001)
    // gui.add(circle.position, 'z').min(-5).max(5).step(0.001)
    earth.add(circle)
    camera.position.copy(circle.position.clone().multiplyScalar(5))

    const fontLoader = new FontLoader()
    fontLoader.load(
        'fonts/helvetiker_regular.typeface.json',
        (font) => {
            const textGeometry = new TextGeometry('I’M In ShangHai', {
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
            const material = new THREE.MeshMatcapMaterial()
            const matcapTextures = new THREE.TextureLoader().load('/18/matcaps/3.png')
            material.matcap = matcapTextures
            const cube = new THREE.Mesh(
                textGeometry,
                material
            )
            textGeometry.center()
            cube.position.copy(circle.position.clone())
            scene.add(cube)
            cube.rotation.y = Math.PI 
            cube.position.set(0,3,0)
            // gui.add(cube.position, 'x').min(-5).max(5).step(0.01)
            // gui.add(cube.position, 'y').min(-5).max(5).step(0.01)
            // gui.add(cube.position, 'z').min(-5).max(5).step(0.01)

            // // 添加 cube 的旋转控制
            // gui.add(cube.rotation, 'x').min(-Math.PI).max(Math.PI).step(0.01)
            // gui.add(cube.rotation, 'y').min(-Math.PI).max(Math.PI).step(0.01)
            // gui.add(cube.rotation, 'z').min(-Math.PI).max(Math.PI).step(0.01)
        }
    )

    // 在场景中添加坐标轴辅助对象
    // const axesHelper = new THREE.AxesHelper(5); // 参数5表示坐标轴的长度
    // scene.add(axesHelper);
    /**
     * Animate
     */
    const clock = new THREE.Clock()
    const tick = () => {
        const elapsedTime = clock.getDelta()
        earth.rotation.y += (2 * Math.PI / 86400) * elapsedTime;
        circle.rotation.y += (2 * Math.PI / 86400) * elapsedTime;
        // Update controls
        circle.lookAt(camera.position)

        controls.update()

        // Render
        renderer.render(scene, camera)

        // Call tick again on the next frame
        window.requestAnimationFrame(tick)
    }

    tick()
})
</script>

<style scoped lang="less">
.x {}
</style>