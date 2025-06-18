import GUI from "three/examples/jsm/libs/lil-gui.module.min.js"

class Debug {
    active: boolean
    gui:  GUI | undefined
    constructor() {
        this.active = window.location.hash === '#debug'
        if (this.active) {
            // Dat gui
            this.gui = new GUI()
        }
    }
}
export default new Debug()