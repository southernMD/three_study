vec3 pointLight(vec3 lightColor,float lightIntensity,vec3 normal,vec3 lightPosition,vec3 viewDirection,float specularPower,vec3 position,float lightDecay){
    vec3 lightDelta = lightPosition - position;
    vec3 lightDirection = normalize(lightPosition);
    vec3 reflectedLight = reflect(-lightDirection, normal);

    float shading = dot(normal,lightDirection);
    shading = max(0.0,shading);

    float specular = -dot(reflectedLight, viewDirection);
    specular = max(0.0,specular);
    specular = pow(specular,specularPower);

    float decay = 1.0 - length(lightDelta) * lightDecay;
    decay = max(0.0,decay);

    return lightColor * lightIntensity * decay * (shading + specular);
}