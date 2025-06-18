import Sizes from '@/utils/Sizes';
import * as THREE from 'three'

export default class Renderer {
    instance: THREE.WebGLRenderer | undefined;
    
    constructor(canvas: HTMLCanvasElement,size:Sizes){
        this.instance = new THREE.WebGLRenderer({
            canvas,
            antialias: true
        })
        this.instance.toneMapping = THREE.CineonToneMapping
        this.instance.toneMappingExposure = 1.75
        this.instance.shadowMap.enabled = true
        this.instance.shadowMap.type = THREE.PCFSoftShadowMap
        this.instance.setClearColor('#211d20')
        this.instance.setSize(size.width!, size.height!)
        this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    resize(size:Sizes){
        this.instance!.setSize(size.width!, size.height!)
        this.instance!.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    update(scene: THREE.Scene,camera: THREE.Camera){
        this.instance!.render(scene, camera)
    }
}