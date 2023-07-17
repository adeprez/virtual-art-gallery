'use strict';

module.exports = function(config) {
	var useReflexion = true;

	// Handle different screen ratios
	const mapVal = (value, min1, max1, min2, max2) => min2 + (value - min1) * (max2 - min2) / (max1 - min1);
	var fovX = () => mapVal(window.innerWidth / window.innerHeight, 16/9, 9/16, 1.7, Math.PI / 3);

	if (navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i)) {
		useReflexion = false;
		// Account for the searchbar
		fovX = () => mapVal(window.innerWidth / window.innerHeight, 16/9, 9/16, 1.5, Math.PI / 3);
	}
	var fovY = () => 2 * Math.atan(Math.tan(fovX() * 0.5) * window.innerHeight / window.innerWidth);

	let regl, map, drawMap, placement, drawPainting, fps;

	regl = require('regl')({
		extensions: [
			'OES_element_index_uint',
			'OES_standard_derivatives'
		],
		optionalExtensions: [
			'EXT_texture_filter_anisotropic'
		],
		attributes: { alpha : false }
	});

	map = require('./render/map')(config.map);
	const mesh = require('./render/mesh');
	drawMap = mesh(regl, map, useReflexion, config.resources, config.map);
	placement = require('./render/placement')(config, regl, map);
	drawPainting = require('./render/painting')(regl);
	fps = require('./render/fps')(map, fovY);

	const context = regl({
		cull: {
			enable: true,
			face: 'back'
		},
		uniforms: {
			view: fps.view,
			proj: fps.proj,
			yScale: 1.0
		}
	});

	const reflexion = regl({
		cull: {
			enable: true,
			face: 'front'
		},
		uniforms: {
			yScale: -1.0
		}
	});

	regl.frame(({
		time
	}) => {
		fps.tick({
			time
		});
		placement.update(fps.pos, fps.fmouse[1], fovX());
		regl.clear({
			color: [0, 0, 0, 1],
			depth: 1
		});
		context(() => {
			if(useReflexion) {
				reflexion(() => {
					drawMap();
					drawPainting(placement.batch());
				});
			}
			drawMap();
			drawPainting(placement.batch());
		});
	});

};