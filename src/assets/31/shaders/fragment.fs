precision mediump float;

varying float vRandom;
varying vec2 vUv;

uniform vec3 uColor;
uniform sampler2D uTexture;

void main(){
    vec4 textureColor = texture2D(uTexture, vUv);
    gl_FragColor = textureColor;
}