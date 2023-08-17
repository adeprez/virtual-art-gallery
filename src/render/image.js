'strict mode';

const text = require('./text');

const dynamicQualThreshold = 2;
function dynamicQual(quality) {
	if(!navigator.connection || navigator.connection.downlink < dynamicQualThreshold) {
		quality = (quality == 'high') ? 'mid' : 'low';
	}
	return quality;
}

const resizeCanvas = document.createElement('canvas');
resizeCanvas.width = resizeCanvas.height = 2048;
const ctx = resizeCanvas.getContext('2d');
ctx.mozImageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
let aniso = false;

const emptyImage = (regl, unusedTextures) => [
	(unusedTextures.pop() || regl.texture)([[[200, 200, 200]]]),
	_=>(unusedTextures.pop() || regl.texture)([[[0, 0, 0, 0]]]),
	1
];

async function loadImage(loader, regl, p, res, unusedTextures) {
	if (aniso === false) {
		aniso = regl.hasExtension('EXT_texture_filter_anisotropic') ? regl._gl.getParameter(
			regl._gl.getExtension('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT
		) : 0;
	}
	
	let image, title;
	try {
		const data = await loader.fetchImage(p, dynamicQual(res));
		title = data.title;
		// Resize image to a power of 2 to use mipmap (faster than createImageBitmap resizing)
		image = await createImageBitmap(data.image);
		ctx.drawImage(image, 0, 0, resizeCanvas.width, resizeCanvas.height);
	} catch(e) {
		// Try again with a lower resolution, otherwise return an empty image
		console.error(e);
		return res == "high" ? await loadImage(loader, regl, p, "low", unusedTextures) : emptyImage(regl, unusedTextures);
	}

	return [(unusedTextures.pop() || regl.texture)({
			data: resizeCanvas,
			min: 'mipmap',
			mipmap: 'nice',
			aniso,
			flipY: true
		}),
		width=>text.init((unusedTextures.pop() || regl.texture), title, width),
		image.width / image.height
	];
}

module.exports = (config) => {
	const paintingCache = {};
	const unusedTextures = [];

	return {
		fetch: (regl, count = config.loadCount, res = "low", cbOne, cbAll) => {
			const from = Object.keys(paintingCache).length;
			config.loader.fetchList(from, count).then(paintings => {
				count = paintings.length;
				paintings.forEach(p => {
					if (paintingCache[p.image_id]) {
						if (--count === 0)
							cbAll();
						return;
					}
					paintingCache[p.image_id] = p;
					loadImage(config.loader, regl, p, res, unusedTextures).then(([tex, textGen, aspect]) => {
						cbOne({ ...p, tex, textGen, aspect });
						if (--count === 0)
							cbAll();
					});
				})
			});
		},
		load: (regl, p, res = "low") => {
			if (p.tex || p.loading)
				return;
			p.loading = true;
			loadImage(config.loader, regl, p, res).then(([tex, textGen]) => {
				p.loading = false;
				p.tex = tex;
				p.text = textGen(p.width);
			});
		},
		unload: (p) => {
			if (p.tex) {
				unusedTextures.push(p.tex);
				p.tex = undefined;
			}
			if (p.text) {
				unusedTextures.push(p.text);
				p.text = undefined;
			}
		}
	}
}