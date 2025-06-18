import Sizes from '@/utils/Sizes'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'

export default class Camera {
  instance: THREE.PerspectiveCamera
  controls: OrbitControls | undefined
  constructor(fov: number, aspect: number, near: number, far: number) {
    this.instance = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this.instance.position.set(6,4,8)
  }
  setOrbitControls(canvas: HTMLElement | null | undefined) {
    this.controls = new OrbitControls(this.instance, canvas)
    this.controls.enableDamping = true
  }
  resize(size:Sizes){
    this.instance.aspect = size.width! / size.height!
    this.instance.updateProjectionMatrix()
  }
  update(){
    this.controls?.update()
  }
} 
