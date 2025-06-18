uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform vec2 uFrequency;
uniform float uTime;

attribute vec3 position;
attribute float aRandom;
attribute vec2 uv;

// float loremIpsum(){
//     float a = 1.0;
//     float b = 1.0;

//     return a + b;
// }

varying float vRandom;
varying vec2 vUv;

void main(){
    // int a = 1;
    // float b = 2.0;
    // float c = float(a) * b;
    // bool d = true;
    // vec2 foo = vec2(1.0, 2.0);

    // vec3 t = vec3(1.0,2.0,3.0);
    // vec2 u = t.xy;

    // vec4 v = vec4(1.0,2.0,3.0,4.0);
    // float u2 = v.w;
    // //vec4中你可以使用v.w或v.a去访问第四个量

    // float rs = loremIpsum();

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.z += sin(modelPosition.x * uFrequency.x + uTime) * 0.1; 
    modelPosition.y += sin(modelPosition.x * uFrequency.y + uTime) * 0.1; 
    // modelPosition.z += aRandom  * 0.2;


    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;


    gl_Position = projectedPosition;

    vRandom = aRandom;
    vUv = uv;
}