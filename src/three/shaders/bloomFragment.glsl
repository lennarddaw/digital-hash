varying vec3 vPosition;
uniform vec3 glowColor;

void main() {
  float intensity = 1.0 - length(vPosition) * 0.1;
  gl_FragColor = vec4(glowColor, intensity);
}