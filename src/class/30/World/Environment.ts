import Debug from '@/utils/Debug'
import Resources from '@/utils/Resources'
import * as THREE from 'three'
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js'

export default class Environment {
    scene: THREE.Scene
    resources: Resources
    environmentMap: {
        texture: THREE.CubeTexture | null
        intensity: number
    }
    debug: typeof Debug
    debugFolder: GUI | undefined
    constructor(scene: THREE.Scene, resources: Resources) {
        this.scene = scene
        this.resources = resources
        this.environmentMap = {
            intensity: 0.4,
            texture: null
        }
        this.environmentMap!.texture = this.resources.items.environmentMapTexture
        this.environmentMap.texture!.colorSpace = THREE.SRGBColorSpace
        this.scene.environment = this.environmentMap!.texture
        this.debug =  Debug
        // this.scene.background = this.environmentMap!.texture
        this.updateMaterial()
        if (this.debug.active) {
            this.debugFolder = this.debug.gui?.addFolder('environment')
            this.debugFolder?.add(this.environmentMap, 'intensity').
                name('environmentIntensity').min(0).max(10).step(0.001).
                onChange(() => this.updateMaterial())
        }
        this.setSunLight()
    }

    setSunLight() {
        const directionalLight = new THREE.DirectionalLight('#ffffff', 4)
        directionalLight.castShadow = true
        directionalLight.shadow.camera.far = 15
        directionalLight.shadow.mapSize.set(1024, 1024)
        directionalLight.shadow.normalBias = 0.05
        directionalLight.position.set(3.5, 2, - 1.25)
        this.scene.add(directionalLight)
        if (this.debug.active) {
            this.debugFolder?.add(directionalLight, 'intensity').min(0).max(10).step(0.001).name('lightIntensity')
            //xyz
            this.debugFolder?.add(directionalLight.position, 'x').min(- 5).max(5).step(0.001).name('lightX')
            this.debugFolder?.add(directionalLight.position, 'y').min(- 5).max(5).step(0.001).name('lightY')
            this.debugFolder?.add(directionalLight.position, 'z').min(- 5).max(5).step(0.001).name('lightZ')
        }
    }

    updateMaterial() {
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                child.material.envMapIntensity = this.environmentMap!.intensity
                child.material.envMap = this.environmentMap!.texture
                child.castShadow = true
                child.receiveShadow = true
                child.material.needsUpdate = true
            }
        })
    }
}