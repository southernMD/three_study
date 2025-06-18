uniform vec3 uColor;
uniform vec2 uResolution;
uniform vec3 uShadowColor;
uniform float uShadowRepetitions;
uniform vec3 uLightColor;
uniform float uLightRepetitions;



varying vec3 vNormal;
varying vec3 vPosition;

#include ../includes/ambientLight.glsl;
#include ../includes/directionalLight.glsl;

vec3 halftone(
    vec3 color,
    float repetitions,
    vec3 direction,
    float low,
    float high,
    vec3 pointColor,
    vec3 normal
){
    float intensity = dot(normal,direction);
    intensity = smoothstep(low,high , intensity);

    //halftone
    vec2 uv = gl_FragCoord.xy / min(uResolution.x,uResolution.y);
    uv *= repetitions;
    uv = mod(uv,1.0);

    float point = distance(uv,vec2(0.5) );
    point = 1.0 - step(0.5 * intensity,point);

    return mix(color,pointColor,point);
}


void main()
{
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    vec3 color = uColor;

    //light
    vec3 light = vec3(0.0);

    light +=ambientLight(
        uLightColor,
        1.0
    );

    light +=directionalLight(
        vec3(1.0),
        1.0,
        normal,
        vec3(1.0,1.0 ,1.0 ),
        viewDirection,
        1.0
    );
    color *= light;

    // float repetitions = 50.0;
    vec3 direction = vec3(0.0,-1.0 ,0.0 );
    float low = -0.8;
    float high = 1.5;
    // vec3 pointColor = vec3(1.0,0.0 ,0.0 );

    color = halftone(
        color,
        uShadowRepetitions,
        direction,
        low,
        high,
        uShadowColor,
        normal
    );

    color = halftone(
        color,
        uLightRepetitions,
        vec3(1.0,1.0,0.0),
        0.5,
        1.5,
        uLightColor,
        normal
    );
    

    // Final color
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}