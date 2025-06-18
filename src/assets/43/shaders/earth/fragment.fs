uniform sampler2D uDayTexture;
uniform sampler2D uNightTexture;
uniform sampler2D uSpecularCloudsTexture;
uniform vec3 uSunDirection;
uniform vec3 uAtmosphereDayColor;
uniform vec3 uAtmosphereTwilightColor;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main()
{
    vec3 viewDirection = normalize(vPosition - cameraPosition);
    vec3 normal = normalize(vNormal);
    vec3 color = vec3(0.0);

    //fresnel
    float fresnel = dot(viewDirection,normal) + 1.0;
    fresnel = pow(fresnel,2.0);

    //sun
    float sunOrientation = dot(normal,uSunDirection);

    float dayMix = smoothstep(-0.1,0.5 ,sunOrientation );
    vec3 dayColor = texture2D(uDayTexture, vUv).rgb;
    vec3 nightColor = texture2D(uNightTexture, vUv).rgb;
    color = mix(nightColor,dayColor,dayMix);

    //clouds
    vec2 specularCloudsColor = texture2D(uSpecularCloudsTexture, vUv).rg;
    float cloudsMix = specularCloudsColor.g;
    cloudsMix = smoothstep(0.4,1.0 ,cloudsMix);
    cloudsMix*= dayMix;
    color = mix(color,vec3(1.0),cloudsMix);

    //atmosphere
    float atmosphereDayMix = smoothstep(-0.5,1.0 ,sunOrientation );
    vec3 atmosphereColor = mix(uAtmosphereTwilightColor,uAtmosphereDayColor,atmosphereDayMix);
    color = mix(color,atmosphereColor,fresnel * atmosphereDayMix);

    //speculare
    vec3 reflection = reflect(- uSunDirection, normal);
    float specular = pow(max(- dot(reflection,viewDirection),0.0),32.0);
    vec3 specularColor = mix(vec3(1.0),atmosphereColor,fresnel);
    specularColor = specularColor * specularCloudsColor.r;
    color += specular * specularColor;


    // Final color
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}