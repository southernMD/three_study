import Resources from "@/utils/Resources";
import Experience from "../Experience";
import * as THREE from 'three'

export default class Floor {
    resources:Resources
    scene: THREE.Scene;
    geometry: THREE.CircleGeometry | null;
    texture:{
        map: THREE.Texture| null
        normal: THREE.Texture| null
    } 
    material: THREE.MeshStandardMaterial | null;
    mesh: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial> | null;
    constructor(scene: THREE.Scene,_resources:Resources) {
        this.resources = _resources
        this.scene = scene
        this.geometry = null
        this.texture = {
            map: null,
            normal: null
        }
        this.mesh = null
        this.material = null
        this.setGeometry()
        this.setTextures()
        this.setMaterial()
        this.setMesh()
    }

    setGeometry() {
        this.geometry = new THREE.CircleGeometry(5, 64)
    }
    setMaterial() {
        this.material = new THREE.MeshStandardMaterial({
            map: this.resources.items.grassColorTexture,
            normalMap: this.resources.items.grassNormalTexture,
        })
    }
    setMesh() {
        this.mesh = new THREE.Mesh(this.geometry!, this.material!)
        this.mesh.rotation.x = -Math.PI / 2
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }
    setTextures() {
        this.texture.map = this.resources.items.grassColorTexture
        this.texture.map!.colorSpace = THREE.SRGBColorSpace
        this.texture.map!.repeat.set(1.5,1.5)
        this.texture.map!.wrapS = THREE.RepeatWrapping
        this.texture.map!.wrapT = THREE.RepeatWrapping

        this.texture.normal = this.resources.items.grassNormalTexture
        this.texture.normal!.repeat.set(1.5,1.5)
        this.texture.normal!.wrapS = THREE.RepeatWrapping
        this.texture.normal!.wrapT = THREE.RepeatWrapping

    }
}