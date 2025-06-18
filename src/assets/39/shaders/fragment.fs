uniform vec3 uColor;

varying vec3 vNormal;
varying vec3 vPosition;

#include ./ambientLight.glsl;
#include ./directionLight.glsl;
#include ./pointLight.glsl;


void main()
{
    vec3 normal = normalize(vNormal);
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 color = uColor;

    //light 
    vec3 light = vec3(0.0);
    // //环境光
    light += ambientLight(vec3(1.0),0.2);
    // //定向光源
    light += directionalLight(
        vec3(1.0),
        1.0,
        normal,
        vec3(0.0,0.0,3.0),
        viewDirection,
        20.0
    );
    // 点光源
    light += pointLight(
        vec3(1.0,1.0,0.0),
        1.0,
        normal,
        vec3(0.0,2.5,0.0),
        viewDirection,
        20.0,
        vPosition,
        0.25
    );
    color *= light;

    // Final color
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}