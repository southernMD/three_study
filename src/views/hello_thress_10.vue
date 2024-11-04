<script setup lang="ts">
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';
import { ref, onMounted } from 'vue';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'stats.js'
import * as CANNON from 'cannon'
const canvas = ref<HTMLCanvasElement>()
//设置重力
  const world = new CANNON.World()
  world.gravity.set(0, -9.82, 0)
    //添加材质
  const defaultMaterial = new CANNON.Material('default')
  //摩擦力 弹力
  const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.1,
    restitution: 0.7,
  })
  world.addContactMaterial(defaultContactMaterial)
  //设置刚体球
  const sphereShape = new CANNON.Sphere(1)
  const sphereBody = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    shape: sphereShape,
    material: defaultMaterial
  })
  // sphereBody.applyForce(new CANNON.Vec3(100, 0, 0), new CANNON.Vec3(0, 0, 0))
  sphereBody.applyImpulse(new CANNON.Vec3(10, 0, 0), new CANNON.Vec3(0, 0, 0))
  world.addBody(sphereBody)
  //设置刚体平面
  // const planeShape = new CANNON.Plane() //无限的屏幕
  const floorShape = new CANNON.Box(new CANNON.Vec3(7.5, 0.1, 7.5))
  const floorBody = new CANNON.Body()
  floorBody.mass = 0
  floorBody.addShape(floorShape)
  floorBody.material = defaultMaterial
  // floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2) 默认法线为z轴需要旋转
  world.addBody(floorBody)
onMounted(() => {
  // Canvas
  console.log(canvas);
  const stats = new Stats();
  // Scene
  const scene = new THREE.Scene()

  // Size
  const sizes = {
    width: window.innerWidth - 3,
    height: window.innerHeight - 3,
  }

  // Camera
  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
  camera.position.set(4, 4, 15)

  // Controls
  const controls = new OrbitControls(camera, canvas.value)
  controls.enableDamping = true
  controls.zoomSpeed = 0.3

  /**
   * Objects
   */
  // material
  const material = new THREE.MeshStandardMaterial()

  // sphere
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), material)
  sphere.position.setX(1)
  sphere.castShadow = true
  scene.add(sphere)

 
  // plane
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), material)
  plane.rotateX(-Math.PI / 2)
  plane.receiveShadow = true
  scene.add(plane)

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
  const renderer = new THREE.WebGLRenderer({
    canvas:canvas.value,
    // antialias: true,
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true

  // Animations
  const clock = new THREE.Clock()
  let oldElapsedTime = 0
  const tick = () => {
    stats.begin()
    controls.update()

    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    world.step(1 / 60, deltaTime, 3)
    // @ts-ignore
    sphere.position.copy(sphereBody.position)
    // Render
    renderer.render(scene, camera)
    stats.end()
    requestAnimationFrame(tick)
  }

  tick()

  /**
   * Debug
   */
  const gui = new GUI()
  gui.add(controls, 'autoRotate')
  gui.add(controls, 'autoRotateSpeed', 0.1, 10, 0.01)
  gui.add(material, 'wireframe')
  gui.add(directionLightHelper, 'visible').name('directionLightHelper visible')
  function createAxesHelper() {
    const axesHelper = new THREE.AxesHelper(150)
    axesHelper.setColors(new THREE.Color("red"),new THREE.Color("yellow"),new THREE.Color("green"))
    scene.add(axesHelper)
  }
  createAxesHelper()
})

</script>

<template>
  <canvas class="" ref="canvas"></canvas>
</template>

<style scoped lang="less"></style>