<template>
    <canvas class="webgl"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import * as CANNON from 'cannon'

onMounted(() => {
    /**
     * sounds
     */ 
    const hitSound = new Audio('/25/sounds/hit.mp3')

    const playHitSound = (collision: { contact: { getImpactVelocityAlongNormal: () => any; }}) => {
        const impactStrength = collision.contact.getImpactVelocityAlongNormal();
        console.log(impactStrength);
        if (impactStrength > 1.5) {
            hitSound.volume = Math.random()
            hitSound.currentTime = 0
            hitSound.play()
        }
    }


    /**
     * Textures
     */
    const textureLoader = new THREE.TextureLoader()
    const cubeTextureLoader = new THREE.CubeTextureLoader()

    const environmentMapTexture = cubeTextureLoader.load([
        '/25/textures/environmentMaps/0/px.png',
        '/25/textures/environmentMaps/0/nx.png',
        '/25/textures/environmentMaps/0/py.png',
        '/25/textures/environmentMaps/0/ny.png',
        '/25/textures/environmentMaps/0/pz.png',
        '/25/textures/environmentMaps/0/nz.png'
    ])
    /**
     * Utils
    */

    const obejects: { mesh: THREE.Mesh<any>; body: CANNON.Body; }[] = []
    const geometry = new THREE.SphereGeometry(1, 32, 32)
    const material = new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
    const createShhere = (radius: number, position: THREE.Vector3) => {

        const mesh = new THREE.Mesh(geometry, material)
        mesh.scale.set(radius, radius, radius)
        mesh.castShadow = true
        mesh.position.copy(position)
        scene.add(mesh)

        const shape = new CANNON.Sphere(radius)
        const body = new CANNON.Body({
            mass: 1,
            shape,
        })
        // @ts-ignore
        body.position.copy(position)
        body.addEventListener('collide', playHitSound)
        world.addBody(body)
        obejects.push({
            mesh,
            body
        })
    }
    const geometryBox = new THREE.BoxGeometry(1, 1, 1)
    const materialBox = new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
    const createBox = (width: number, height: number, depth: number, position: THREE.Vector3) => {
        const mesh = new THREE.Mesh(geometryBox, materialBox)
        mesh.scale.set(width, height, depth)
        mesh.castShadow = true
        mesh.position.copy(position)
        scene.add(mesh)

        const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))
        const body = new CANNON.Body({
            mass: 1,
            shape
        })
        // @ts-ignore
        body.position.copy(position)
        body.addEventListener('collide', playHitSound)
        world.addBody(body)
        obejects.push({
            mesh,
            body
        })
    }
    /**
     * Debug
     */
    const gui = new GUI()
    const debugObject = {
        createSphere: () => {
            createShhere(Math.random() * 0.5, new THREE.Vector3((Math.random() - 0.5) * 3, 3, (Math.random() - 0.5) * 3))
        },
        createBox: () => {
            createBox(Math.random(), Math.random(), Math.random(), new THREE.Vector3((Math.random() - 0.5) * 3, 3, (Math.random() - 0.5) * 3))
        },
        reset:()=>{
            obejects.forEach((object) => {
                // Remove body
                object.body.removeEventListener('collide', playHitSound)
                world.remove(object.body)
                // Remove mesh
                scene.remove(object.mesh)
            })
            obejects.splice(0, obejects.length)
        }
    }
    gui.add(debugObject, 'createSphere')
    gui.add(debugObject, 'createBox')
    gui.add(debugObject, 'reset')
    /**
     * Base
     */
    // Canvas
    const canvas = document.querySelector('canvas.webgl')

    // Scene
    const scene = new THREE.Scene()



    /**
     * Physical
     */
    const world = new CANNON.World()
    world.gravity.set(0, -9.82, 0)
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.allowSleep = true
    const concreteMaterial = new CANNON.Material('concrete')
    const plasticMaterial = new CANNON.Material('plastic')

    const concretePlasticContactMaterial = new CANNON.ContactMaterial(concreteMaterial, plasticMaterial, {
        friction: 0.1,
        restitution: 0.5
    })

    world.addContactMaterial(concretePlasticContactMaterial)
    world.defaultContactMaterial = concretePlasticContactMaterial
    /**
     * Test sphere
     */
    createShhere(0.5, new THREE.Vector3(0, 5, 0))
    /**
     * Floor
     */


    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({
            color: '#777777',
            metalness: 0.3,
            roughness: 0.4,
            envMap: environmentMapTexture,
            envMapIntensity: 0.5
        })
    )
    floor.receiveShadow = true
    floor.rotation.x = - Math.PI * 0.5
    scene.add(floor)

    const floorShape = new CANNON.Plane()
    const floorBody = new CANNON.Body({
        mass: 0,
        shape: floorShape,
        material: concreteMaterial
    })
    floorBody.addShape(floorShape)
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
    world.addBody(floorBody)

    /**
     * Lights
     */
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(1024, 1024)
    directionalLight.shadow.camera.far = 15
    directionalLight.shadow.camera.left = - 7
    directionalLight.shadow.camera.top = 7
    directionalLight.shadow.camera.right = 7
    directionalLight.shadow.camera.bottom = - 7
    directionalLight.position.set(5, 5, 5)
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
    const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.set(- 3, 8, 0)
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
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    /**
     * AXES
     */
    const axesHelper = new THREE.AxesHelper(5)
    scene.add(axesHelper)

    /**
     * Animate
     */
    const clock = new THREE.Clock()
    let oldElapsedTime = 0

    const tick = () => {
        const elapsedTime = clock.getElapsedTime()
        const deltaTime = elapsedTime - oldElapsedTime
        oldElapsedTime = elapsedTime
        // Update physics
        obejects.forEach(object => {
            // @ts-ignore
            object.mesh.quaternion.copy(object.body.quaternion)
            // @ts-ignore
            object.mesh.position.copy(object.body.position)
        })

        world.step(1 / 60, deltaTime, 3)

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