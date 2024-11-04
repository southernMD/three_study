<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ref, onMounted } from 'vue'
import Stats from 'stats.js'
import * as CANNON from 'cannon'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
const canvas = ref<HTMLElement>();
let render: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene;
let controls: OrbitControls
const sizes = {
    width: window.innerWidth - 3,
    height: window.innerHeight - 3,
}
// material
const material = new THREE.MeshStandardMaterial()


function initView() {

    document.body.appendChild(stats.dom);
    // Scene
    scene = new THREE.Scene()
    // Camera
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
    camera.position.set(4, 4, 15)

    scene = new THREE.Scene()
    // Controls
    controls = new OrbitControls(camera, canvas.value)
    controls.enableDamping = true
    controls.zoomSpeed = 0.3

    // plane
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), material)
    plane.rotateX(-Math.PI / 2)
    plane.receiveShadow = true
    scene.add(plane)
    const floorShape = new CANNON.Box(new CANNON.Vec3(7.5, 0.1, 7.5))
    const floorBody = new CANNON.Body()
    floorBody.mass = 0
    floorBody.addShape(floorShape)
    floorBody.material = defaultMaterial
    floorBody.addEventListener('collide', playHitSound)
    world.addBody(floorBody)
    /**
 * Light
 */
    const directionLight = new THREE.DirectionalLight()
    directionLight.castShadow = true
    directionLight.position.set(5, 5, 6)
    const ambientLight = new THREE.AmbientLight(new THREE.Color('#ffffff'), 0.3)
    scene.add(ambientLight, directionLight)

    const directionLightHelper = new THREE.DirectionalLightHelper(directionLight, 2)
    directionLightHelper.visible = false
    scene.add(directionLightHelper)
    // Renderer
    render = new THREE.WebGLRenderer({
        canvas: canvas.value,
        // antialias: true,
    })
    render.setSize(sizes.width, sizes.height)
    render.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    render.shadowMap.enabled = true

    const gui = new GUI()
    gui.add(controls, 'autoRotate')
    gui.add(controls, 'autoRotateSpeed', 0.1, 10, 0.01)
    gui.add(material, 'wireframe')
    gui.add(directionLightHelper, 'visible').name('directionLightHelper visible')
    const sphereController = {
        addBall: () => {
            createSphere(Math.random() + 1, new THREE.Vector3((Math.random() - 1) * 4, 5, (Math.random() - 1) * 4));
        }
    };
    gui.add(sphereController, 'addBall').name('Add Ball');
    const resetBollController = {
        reset: () => {
            objectsToUpdate.forEach((object) => {
                // Remove body
                object.body.removeEventListener('collide', playHitSound)
                world.remove(object.body)
                // Remove mesh
                scene.remove(object.mesh)
            })
            objectsToUpdate.splice(0, objectsToUpdate.length)
        }
    }
    gui.add(resetBollController, 'reset')

    function createAxesHelper() {
        const axesHelper = new THREE.AxesHelper(150)
        axesHelper.setColors(new THREE.Color("red"), new THREE.Color("yellow"), new THREE.Color("green"))
        scene.add(axesHelper)
    }
    createAxesHelper()
}

const world = new CANNON.World()
world.gravity.set(0, -9.82, 0)
world.allowSleep = true;
const defaultMaterial = new CANNON.Material('default')
//摩擦力 弹力
const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.1,
    restitution: 0.7,
})
world.addContactMaterial(defaultContactMaterial)

const objectsToUpdate: Array<{
    mesh: THREE.Mesh
    body: CANNON.Body
}> = []

const sphereGeometry = new THREE.SphereGeometry(1, 32, 32)
const createSphere = (radius: number, position: THREE.Vector3) => {
    // Three.js mesh
    const mesh = new THREE.Mesh(sphereGeometry, material)
    mesh.scale.set(radius, radius, radius)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon body
    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass: 1,
        shape,
        material: defaultMaterial,
    })
    body.addEventListener('collide', playHitSound)
    // @ts-ignore
    body.position.copy(position)
    world.addBody(body)
    objectsToUpdate.push({
        mesh,
        body,
    })
}
/**
 * sound
 */
const hitSound = new Audio('public/11/zj.mp3')
const playHitSound = (collision: { contact: CANNON.ContactEquation }) => {
    const impactStrength = calculateImpactStrength(collision.contact)
    console.log(impactStrength);
    if (impactStrength > -1.5) {
        hitSound.volume = Math.random()
        hitSound.currentTime = 0
        hitSound.play()
    }
}

const calculateImpactStrength = (contact: CANNON.ContactEquation): number => {
    const ri = contact.ri;
    const rj = contact.rj;
    const n = contact.ni;
    const vrel = rj.vsub(ri); // 相对速度
    const impactStrength = vrel.dot(n); // 沿法线方向的相对速度
    return impactStrength;
};
onMounted(() => {
    initView();
    createSphere(1, new THREE.Vector3(0, 5, 0))
    animate();
});
const clock = new THREE.Clock()
let oldElapsedTime = 0
const stats = new Stats();

const animate = () => {
    controls.update()
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    world.step(1 / 60, deltaTime, 3)
    objectsToUpdate.forEach((object) => {
        // @ts-ignore
        object.mesh.position.copy(object.body.position)
        // @ts-ignore
        object.mesh.quaternion.copy(object.body.quaternion)
    })
    // Render
    render.render(scene, camera)
    stats.update()
    requestAnimationFrame(animate)
};
</script>

<template>
    <canvas class="" ref="canvas"></canvas>
</template>

<style scoped lang="less"></style>