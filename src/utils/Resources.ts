import EventEmitter from './EventEmitter.js'
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import sources from '@/class/30/sources.js'

// 定义枚举类型
enum LoaderType {
    gltf = 'gltf',
    cubeTexture = 'cubeTexture',
    texture = 'texture'
}

// 获取 sources 的类型
type OriginalSource = typeof sources[0];

// 定义新的 Source 类型，覆盖 type 字段
type Source = Omit<OriginalSource, 'type'> & {
    type: LoaderType;
    path: string
};


export default class Resources extends EventEmitter {
    sources:Source[]
    toLoad:number
    loaded:number
    loaders: {
        [key in LoaderType]: THREE.Loader
    }
    items: {
        [key: string]: any
    }
    constructor(_sources: Source[]){
        super()
        this.sources = _sources
        this.toLoad = this.sources.length
        this.loaded = 0
        this.loaders = {
            gltf: new GLTFLoader(),
            texture: new THREE.TextureLoader(),
            cubeTexture : new THREE.CubeTextureLoader() as any
        }
        this.items = {}
        this.startLoading()
    }

    startLoading(){
        for(const source of this.sources){
            this.loaders[source.type].load(source.path ?? source.paths, (model:any)=>{
                this.sourceLoaded(source,model)
            })
        }
    }
    
    sourceLoaded(source: Source,model:any){
        this.items[source.name] = model
        this.loaded++
        if(this.loaded === this.toLoad){
            this.trigger('loaded')
        }
    }
}