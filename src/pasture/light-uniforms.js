import {uniform} from 'three/tsl';
import {Color} from 'three/webgpu';
// Unlit whitewater and caustics must follow the same illumination as the scene.
export const lightUniforms={sky:uniform(new Color()),surface:uniform(1)};
