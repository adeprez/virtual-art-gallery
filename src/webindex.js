'use strict';

require('./index')({
  frame: window,
  container: document.body,
  resources: {
    wallTexture: 'res/wall.jpg',
    floorTexture: 'res/floor.jpg',
    roofTexture: 'res/wall.jpg',
  },
  map: {
    gridSize: 6, // Log2 of the grid size (keep the value between [1, 6])
    roomSize: 9,
    roomLight: 0.55,
    floorReflexion: 0.98,
    floorLight: 0.6,
    floorIntensity: 0.15,
    floorTextureSize: 8,
    wallHeight: 8,
    wallThickness: 0.25,
    wallRemoval: 0.5, // Random wall removal proportion
    wallTextureSize: 1,
    roofLight: .05,
    roofIntensity: 0.65,
    roofTextureSize: 4,
  },
  loader: require('./loader/artic'),
  loadCount: 10,
});