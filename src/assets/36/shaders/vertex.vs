uniform float uTime;
uniform sampler2D uPerlinTexture;

varying vec2 vUv;


mat2 rotate(float angle){
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}


void main(){

    vec3 pos = position;

    float twistPerlin = texture(uPerlinTexture, vec2(0.5,uv.y * 0.2 - uTime  * 0.005)).r;
    float angle = twistPerlin * 10.0;
    pos.xz *= rotate(angle);

    vec2 windOffset = vec2(
        texture(uPerlinTexture, vec2(0.25, uTime * 0.01)).r - 0.5,
        texture(uPerlinTexture, vec2(0.75, uTime * 0.01)).r - 0.5
    );
    windOffset*= 10.0 * pow(uv.y, 2.0);
    pos.xz += windOffset;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vUv = uv;
}