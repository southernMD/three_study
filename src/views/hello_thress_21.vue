<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'
onMounted(() => {
    //textures
    const textureLoader = new THREE.TextureLoader()
    const doorColorTexture = textureLoader.load('/21/door/color.jpg')
    const doorAlphaTexture = textureLoader.load('/21/door/alpha.jpg')
    const doorAmbientOcclusionTexture = textureLoader.load('/21/door/ambientOcclusion.jpg')
    const doorHeightTexture = textureLoader.load('/21/door/height.jpg')
    const doorMetalnessTexture = textureLoader.load('/21/door/metalness.jpg')
    const doorNormalTexture = textureLoader.load('/21/door/normal.jpg')
    const doorroughnessTexture = textureLoader.load('/21/door/roughness.jpg')

    const brickAmbientOcclusionTexture = textureLoader.load('/21/brick/ambientOcclusion.jpg')
    const brickColorTexture = textureLoader.load('/21/brick/basecolor.jpg')
    const brickheightTexture = textureLoader.load('/21/brick/height.jpg')
    const brickNormalTexture = textureLoader.load('/21/brick/normal.jpg')
    const brickroughnessTexture = textureLoader.load('/21/brick/roughness.jpg')

    const grassAmbientOcclusionTexture = textureLoader.load('/21/grass/AmbientOcclusion.jpg')
    const grassColorTexture = textureLoader.load('/21/grass/BaseColor.jpg')
    const grassheightTexture = textureLoader.load('/21/grass/Height.png')
    const grassNormalTexture = textureLoader.load('/21/grass/Normal.jpg')
    const grassroughnessTexture = textureLoader.load('/21/grass/Roughness.jpg')

    grassAmbientOcclusionTexture.repeat.set(8,8)
    grassColorTexture.repeat.set(8,8)
    grassheightTexture.repeat.set(8,8)
    grassroughnessTexture.repeat.set(8,8)
    grassNormalTexture.repeat.set(8,8)

    grassAmbientOcclusionTexture.wrapS = THREE.RepeatWrapping
    grassAmbientOcclusionTexture.wrapT = THREE.RepeatWrapping
    grassColorTexture.wrapS = THREE.RepeatWrapping
    grassColorTexture.wrapT = THREE.RepeatWrapping
    grassheightTexture.wrapS = THREE.RepeatWrapping
    grassheightTexture.wrapT = THREE.RepeatWrapping
    grassroughnessTexture.wrapS = THREE.RepeatWrapping
    grassroughnessTexture.wrapT = THREE.RepeatWrapping
    grassNormalTexture.wrapS = THREE.RepeatWrapping
    grassNormalTexture.wrapT = THREE.RepeatWrapping

    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()

    //fog
    const fog = new THREE.Fog('#262837',1,15)
    scene.fog = fog

    /**
     * House
     */
    const house = new THREE.Group()
    
    scene.add(house)

    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(4,2.5,4),
        new THREE.MeshStandardMaterial({
            map:brickColorTexture,
            aoMap:brickAmbientOcclusionTexture,
            displacementMap:brickheightTexture,
            displacementScale:0.3,
            normalMap:brickNormalTexture,
            normalScale:new THREE.Vector2(2,2),
            roughnessMap:brickroughnessTexture
        })
    )
    walls.geometry.setAttribute(
        'uv2',
        new THREE.Float16BufferAttribute(walls.geometry.attributes.uv.array,2)
    )
    walls.position.y = 1.25
    walls.castShadow = true
    house.add(walls)

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(4,1,4),
        new THREE.MeshStandardMaterial({color:'#b35f45'})
    )
    roof.position.y = walls.geometry.parameters.height + roof.geometry.parameters.height / 2
    roof.rotateY(Math.PI / 4)
    roof.castShadow = true
    house.add(roof)
    const door = new THREE.Mesh(
        new THREE.PlaneGeometry(2,2,100,100),
        new THREE.MeshStandardMaterial({
            map:doorColorTexture,
            transparent:true,
            alphaMap:doorAlphaTexture,
            aoMap:doorAmbientOcclusionTexture,
            displacementMap:doorHeightTexture,
            displacementScale:0.1,
            metalnessMap:doorMetalnessTexture,
            roughnessMap:doorroughnessTexture,
            normalMap:doorNormalTexture
        })
    )
    door.geometry.setAttribute(
        'uv2',
        new THREE.Float16BufferAttribute(door.geometry.attributes.uv.array,2)
    )
    door.position.y = 1
    door.position.z = roof.geometry.parameters.radialSegments / 2 + 0.01
    door.castShadow = true
    house.add(door)

    const bushGeometry = new THREE.SphereGeometry(1,16,16)
    const bushMaterial = new THREE.MeshStandardMaterial({color:'#89c854'})
    const bush1 = new THREE.Mesh(bushGeometry,bushMaterial)
    bush1.scale.set(0.5,0.5,0.5)
    bush1.position.set(0.8,0.2,3.2)
    const bush2 = new THREE.Mesh(bushGeometry,bushMaterial)
    bush2.scale.set(0.25,0.25,0.25)
    bush2.position.set(1.4,0.1,2.1)
    const bush3 = new THREE.Mesh(bushGeometry,bushMaterial)
    bush3.scale.set(0.4,0.4,0.4)
    bush3.position.set(-3,0.1,2.1)
    const bush4 = new THREE.Mesh(bushGeometry,bushMaterial)
    bush4.scale.set(0.5,0.5,0.5)
    bush4.position.set(-2,0.1,2.1)
    bush1.castShadow = true
    bush2.castShadow = true
    bush3.castShadow = true
    bush4.castShadow = true
    house.add(bush1,bush2,bush3,bush4)

    const graves = new THREE.Group()
    scene.add(graves)

    const graveGeometry = new THREE.BoxGeometry(0.6,0.8,0.2)
    const graveMaterial = new THREE.MeshStandardMaterial({color:'#b2b6b1'})
    for(let i = 0;i < 50 ;i++){
        const angle = Math.random() * Math.PI * 2
        const radius = 3 + Math.random() * 6
        const x = Math.sin(angle) * radius * 1.2
        const z = Math.cos(angle) * radius * 1.2
        const grave = new THREE.Mesh(graveGeometry,graveMaterial)
        grave.castShadow = true
        grave.position.set(x,0.3,z)
        grave.rotation.y = (Math.random() - 0.5)
        grave.rotation.z = (Math.random() - 0.5)
        graves.add(grave)
    }

    const plane =  new THREE.Mesh(
        new THREE.PlaneGeometry(25,25),
        new THREE.MeshStandardMaterial({
            map:grassColorTexture,
            aoMap:grassAmbientOcclusionTexture,
            displacementMap:grassheightTexture,
            displacementScale:0.3,
            normalMap:grassNormalTexture,
            normalScale:new THREE.Vector2(2,2),
            roughnessMap:grassroughnessTexture
        })
    )
    plane.geometry.setAttribute(
        'uv2',
        new THREE.Float16BufferAttribute(plane.geometry.attributes.uv.array,2)
    )
    plane.rotation.x = -Math.PI * 0.5
    plane.receiveShadow = true
    scene.add(plane)

    /**
     * Lights
     */
    // Ambient light
    const ambientLight = new THREE.AmbientLight('#b9d5ff', 0.5)
    ambientLight.intensity = 0.3
    ambientLight.castShadow = true
    scene.add(ambientLight)

    // Directional light
    const directionalLight = new THREE.DirectionalLight('#b9d5ff', 0.5)
    directionalLight.intensity = 0.3
    directionalLight.position.set(3, 2, -8)
    scene.add(directionalLight)

    // Door light
    const doorLight = new THREE.PointLight('#ff7d46', 1, 7)
    doorLight.position.set(0, 2.2, 2.7)
    doorLight.castShadow = true
    doorLight.shadow.mapSize.set(256,256)
    doorLight.shadow.camera.far = 7 
    house.add(doorLight)

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
    camera.position.x = 4
    camera.position.y = 2
    camera.position.z = 5
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
    renderer.setClearColor('#262837')
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    /**
     * Axes
     */ 
    const axesHelper = new THREE.AxesHelper(4)
    scene.add(axesHelper)

    /**
     * Base
     */
    // Debug
    const gui = new GUI()
    gui.add(ambientLight, 'intensity').min(0).max(1).step(0.001).name('ambient light intensity')
    gui.add(directionalLight, 'intensity').min(0).max(1).step(0.001).name('directional light intensity')
    gui.add(directionalLight.position, 'y').min(-4).max(4).step(0.5)
    gui.add(directionalLight.position, 'x').min(-4).max(4).step(0.5)
    gui.add(directionalLight.position, 'z').min(-4).max(4).step(0.5)

    const ghost1 = new THREE.PointLight('#ff00ff', 2, 3)
    ghost1.castShadow = true
    ghost1.shadow.mapSize.set(256,256)
    ghost1.shadow.camera.far = 7
    scene.add(ghost1)

    const ghost2 = new THREE.PointLight('red', 2, 3)
    ghost2.castShadow = true
    ghost2.shadow.mapSize.set(256,256)
    ghost2.shadow.camera.far = 7
    scene.add(ghost2)

    const ghost3 = new THREE.PointLight('yellow', 2, 3)
    ghost3.castShadow = true
    ghost3.shadow.mapSize.set(256,256)
    ghost3.shadow.camera.far = 7
    scene.add(ghost3)
    
    /**
     * Animate
     */
    const clock = new THREE.Clock()

    const tick = () => {
        // Timer
        const elapsedTime = clock.getElapsedTime()

        const ghost1Angle = elapsedTime * 0.5
        ghost1.position.x = Math.cos(ghost1Angle) * 4
        ghost1.position.z = Math.sin(ghost1Angle) * 4
        ghost1.position.y = Math.sin(elapsedTime * 3)

        const ghost2Angle = - elapsedTime * 0.5
        ghost2.position.x = Math.cos(ghost2Angle) * 5
        ghost2.position.z = Math.sin(ghost2Angle) * 5
        ghost2.position.y = Math.sin(elapsedTime * 4) + Math.sin(elapsedTime * 2.5)
 
        const ghost3Angle = - elapsedTime * 0.5
        ghost3.position.x = Math.cos(ghost3Angle) * (6 + Math.sin(elapsedTime * 0.32))
        ghost3.position.z = Math.sin(ghost3Angle) * (6 + Math.sin(elapsedTime * 0.5))
        ghost3.position.y = Math.sin(elapsedTime * 3) + Math.sin(elapsedTime * 2)

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