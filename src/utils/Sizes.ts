import EventEmitter from './EventEmitter.js';
import * as THREE from 'three'

export default class Sizes extends EventEmitter{
    width: number | undefined
    height: number | undefined
    pixelRatio: number

    constructor(width?: number, height?: number);
    constructor(width: number, height: number) {
        super()
        this.height = height ?? window.innerHeight;
        this.width = width ?? window.innerWidth;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2);

        window.addEventListener('resize', () => {
            this.height = window.innerHeight;
            this.width = window.innerWidth;
            this.pixelRatio = Math.min(window.devicePixelRatio, 2);
            this.trigger('resize')
        })
    }
}