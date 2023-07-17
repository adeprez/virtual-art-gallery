'use strict';

const loadTexture = async (texture, url) => {
    const result = await fetch(url);
    const blob = await result.blob();
    const data = await createImageBitmap(blob);
    texture({data,
        wrapS: 'repeat',
        wrapT: 'repeat'
    });
};

module.exports = (regl, data, useReflexion, resources, mapConfig) => {
    const wallTexture = regl.texture();
    const floorTexture = regl.texture();
    const roofTexture = regl.texture();
    const topShadow = Math.min(.9, .7 + 1 / mapConfig.wallHeight / 1.5);
    loadTexture(wallTexture, resources.wallTexture);
    loadTexture(floorTexture, resources.floorTexture);
    loadTexture(roofTexture, resources.roofTexture);
    function v(v) {
        return Number.isInteger(v) ? v + '.' : v;
    }
    return regl({
        frag: `
        precision lowp float;
        varying vec3 v_pos, v_relativepos, v_normal;
        uniform sampler2D wallTexture;
        uniform sampler2D floorTexture;
        uniform sampler2D roofTexture;

        vec3 hue2rgb(float h) {
            vec4 K = vec4(1., 2. / 3., 1. / 3., 3.);
            vec3 p = abs(fract(vec3(h) + K.xyz) * 6.0 - K.www);
            return mix(K.xxx, clamp(p - K.xxx, 0., 1.), .08);
        }

        void main() {
            vec3 totalLight;
            float dist = length(v_relativepos);
            if(v_normal.y > 0.) {
                totalLight = ${v(mapConfig.floorLight)} + ${v(mapConfig.floorIntensity)} * texture2D(floorTexture, v_pos.xz / ${v(mapConfig.floorTextureSize)}).rgb;
            } else if (v_normal.y < 0.) {
                totalLight = ${v(mapConfig.roofLight)} + ${v(mapConfig.roofIntensity)} * texture2D(roofTexture, v_pos.xz / ${v(mapConfig.roofTextureSize)}).rgb;
            } else {
                totalLight = mix(totalLight, vec3(90.,92.,95.) / 255., smoothstep(${v(mapConfig.wallHeight)} - .1, ${v(mapConfig.wallHeight)}, v_pos.y));
                totalLight = texture2D(wallTexture, vec2(v_pos.x + v_pos.z, 7. - v_pos.y) / ${v(mapConfig.wallTextureSize)}).rgb;
                totalLight *= mix(.9, 1.0, smoothstep(.1, .12, v_pos.y));
                totalLight *= mix(1., ${v(topShadow)}, smoothstep(0., ${v(mapConfig.wallHeight)} * .9, v_pos.y));
                totalLight *= abs(v_normal.x) / 64. + 1.;
            }
            totalLight *= (${v(mapConfig.roomLight)} + .5 * hue2rgb(.5 + (v_pos.x + v_pos.z) / 160.));
            float alpha = ${v(mapConfig.floorReflexion)} + smoothstep(150., 0., dist) - v_normal.y;
            gl_FragColor = vec4(totalLight, ${useReflexion ? "alpha" : "1.0"});
        }`,

        vert: `
        precision highp float;
        uniform mat4 proj, view;
        attribute vec3 position, normal;
        varying vec3 v_pos, v_relativepos, v_normal;
        uniform float yScale;
        void main() {
            vec3 pos = position;
            v_pos = pos;
            v_relativepos = (view * vec4(pos, 1)).xyz;
            pos.y *= yScale;
            v_normal = normal;
            gl_Position = proj * view * vec4(pos, 1);
        }`,

        attributes: {
            position: data.position,
            normal: data.normal
        },

        blend: useReflexion ? {
            enable: true,
            func: {
                src: 'src alpha',
                dst: 'one minus src alpha'
            },
        } : {},

        uniforms: {
            wallTexture,
            floorTexture,
            roofTexture,
        },

        elements: new Uint32Array(data.elements)
    });
};