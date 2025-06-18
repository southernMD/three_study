import EventEmitter from '@/utils/EventEmitter.js'
import * as THREE from 'three'
import Environment from './Environment';
import Resources from '@/utils/Resources';
import Floor from './Floor';
import Fox from './Fox';
import Time from '@/utils/Time';
export default class World extends EventEmitter {
    scene: THREE.Scene;
    environment: Environment | null
    resources:Resources
    floor: Floor | null
    fox:Fox | null
    constructor(scene: THREE.Scene,_resources:Resources) {
        super()
        this.scene = scene
        this.resources = _resources
        this.environment = null
        this.floor = null
        this.fox = null

        this.resources.on('loaded', () => {
            this.environment = new Environment(scene,_resources)
            this.floor = new Floor(scene,_resources)
            this.fox = new Fox(scene,_resources)
        })
    }
    update(time:Time){
        if(this.fox){
            this.fox.update(time)
        }
    }
}