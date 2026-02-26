// Eye Fragment Shader
// Placeholder for cornea refraction eye shader
// Will be implemented in Task 3

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

uniform vec3 irisColor;
uniform vec3 lightDirection;
uniform vec3 lightColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(lightDirection);
  
  // Simple diffuse lighting (placeholder)
  float diffuse = max(dot(normal, lightDir), 0.0);
  vec3 finalColor = irisColor * lightColor * (0.3 + 0.7 * diffuse);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
