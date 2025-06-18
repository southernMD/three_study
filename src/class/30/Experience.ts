import Sizes from "@/utils/Sizes";
import Time from "@/utils/Time";
import Camera from "@/class/30/Camera";
import * as THREE from 'three'
import Renderer from "./Renderer";
import World from "./World/World";
import Resources from "@/utils/Resources";
import sources from './sources'
import Debug from "@/utils/Debug";

export default class Experience {
    canvas: HTMLCanvasElement;
    scene: THREE.Scene;
    size: Sizes;
    time: Time;
    camera: Camera;
    renderer:Renderer;
    world:World;
    resources: Resources;
    debug: typeof Debug;
    constructor(canvas: HTMLCanvasElement) {
        this.scene = new THREE.Scene();
        this.canvas = canvas;
        this.size = new Sizes();
        this.time = new Time()
        this.camera = new Camera(75, this.size.width! / this.size.height!, 0.1, 1000)
        this.camera.setOrbitControls(this.canvas)
        this.scene.add(this.camera.instance)
        this.renderer = new Renderer(this.canvas,this.size)
        this.resources = new Resources(sources as any)
        this.world = new World(this.scene,this.resources)
        this.debug = Debug
        this.size.on('resize', () => this.resize())
        this.time.on('tick', () => this.update())
    }
    resize(){
        this.camera.resize(this.size)
        this.renderer.resize(this.size)
    }
    update(){
        this.camera.update()
        this.world.update(this.time)
        this.renderer.update(this.scene,this.camera.instance)
    }
    destroy(){
        this.size.off('resize')
        this.time.off('tick')
        this.scene.traverse((child)=>{
            if(child instanceof THREE.Mesh){
                child.geometry.dispose()
                for(const key in child.material){
                    const value = child.material[key]
                    if(value && typeof value.dispose === 'function'){
                        value.dispose()
                    }
                }
            }
        })
       this.camera.controls?.dispose()
       this.renderer.instance?.dispose()
       if(this.debug.active){
           this.debug.ui?.destroy()
       }
    }
}