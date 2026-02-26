// Hair Vertex Shader with Morph Target Support
// Implements anisotropic hair shader with Kajiya-Kay lighting model
// Supports morph target preservation for facial expressions

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;
varying vec3 vTangent;
varying vec2 vUv;

// Morph target attributes (Three.js provides these automatically)
#ifdef USE_MORPHTARGETS
  attribute vec3 morphTarget0;
  attribute vec3 morphTarget1;
  attribute vec3 morphTarget2;
  attribute vec3 morphTarget3;
  
  #ifdef USE_MORPHNORMALS
    attribute vec3 morphNormal0;
    attribute vec3 morphNormal1;
    attribute vec3 morphNormal2;
    attribute vec3 morphNormal3;
  #endif
  
  uniform float morphTargetInfluences[4];
#endif

// Tangent attribute for anisotropic lighting
attribute vec4 tangent;

void main() {
  vec3 transformedPosition = position;
  vec3 transformedNormal = normal;
  
  // Apply morph targets to position and normal
  #ifdef USE_MORPHTARGETS
    transformedPosition += morphTarget0 * morphTargetInfluences[0];
    transformedPosition += morphTarget1 * morphTargetInfluences[1];
    transformedPosition += morphTarget2 * morphTargetInfluences[2];
    transformedPosition += morphTarget3 * morphTargetInfluences[3];
    
    #ifdef USE_MORPHNORMALS
      transformedNormal += morphNormal0 * morphTargetInfluences[0];
      transformedNormal += morphNormal1 * morphTargetInfluences[1];
      transformedNormal += morphNormal2 * morphTargetInfluences[2];
      transformedNormal += morphNormal3 * morphTargetInfluences[3];
    #endif
  #endif
  
  // Transform normal to view space
  vNormal = normalize(normalMatrix * transformedNormal);
  
  // Transform normal to world space for lighting calculations
  vWorldNormal = normalize(mat3(modelMatrix) * transformedNormal);
  
  // Calculate tangent for anisotropic highlights
  // Tangent represents hair strand direction
  vec3 objectTangent = vec3(tangent.xyz);
  vTangent = normalize(normalMatrix * objectTangent);
  
  // Calculate view space position
  vec4 mvPosition = modelViewMatrix * vec4(transformedPosition, 1.0);
  vViewPosition = mvPosition.xyz;
  
  // Pass UV coordinates
  vUv = uv;
  
  gl_Position = projectionMatrix * mvPosition;
}
