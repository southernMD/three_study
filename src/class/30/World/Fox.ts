import Debug from '@/utils/Debug';
import Resources from '@/utils/Resources';
import Time from '@/utils/Time';
import * as THREE from 'three'
import { GLTF } from 'three/examples/jsm/Addons.js';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

export default class Fox {
    resources: Resources
    scene: THREE.Scene;
    foxModel: GLTF
    model: THREE.Group | null
    animations: THREE.AnimationClip[] | null
    mixer: THREE.AnimationMixer | null
    actions: THREE.AnimationAction[] | null
    debug: typeof Debug
    debugFolder: GUI | undefined
    currentAction: string | undefined
    // state: string
    // currentAction: THREE.AnimationAction
    constructor(scene: THREE.Scene, resources: Resources) {
        this.resources = resources
        this.scene = scene
        this.foxModel = this.resources.items.foxModel
        this.model = null
        this.animations = null
        this.mixer = null
        this.actions = null
        this.debug = Debug
        this.currentAction = "Survey"
        if(this.debug.active){
            this.debugFolder = this.debug.gui?.addFolder('fox')
        }
        this.setModel()
        this.setAnimation()
    }
    setModel(){
        this.model = this.foxModel.scene
        this.model.scale.set(0.025, 0.025, 0.025)
        this.scene.add(this.model)
        this.model.traverse((child) => {
            if(child instanceof THREE.Mesh){
                child.castShadow = true
            }
        })
    }

    setAnimation(){
        this.mixer = new THREE.AnimationMixer(this.model!)
        this.actions = this.foxModel.animations.map(animation=>this.mixer!.clipAction(animation)) 
        this.actions[0].play()
        this.debugFolder?.add(this, 'currentAction',
            this.foxModel.animations.
            map((action=>action.name)
        )).onChange((action)=>{
            const newActionIndex = this.foxModel.animations.findIndex((it=>it.name===action))
            const oldActionIndex = this.actions?.map(it=>it.isRunning()).findIndex((it=>it === true))
            this.actions?.forEach(it=>it.stop())
            this.actions![newActionIndex].reset()
            this.actions![newActionIndex].play()
            this.actions![newActionIndex].crossFadeFrom(this.actions![oldActionIndex ?? 0],1,false)
        })
    }
    update(time:Time){
        // console.log(time);
        this.mixer?.update(time.delta * 0.001)
    }
}