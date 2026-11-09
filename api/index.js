// Polyfills para compatibilidade de canvas/PDF em ambiente Vercel Serverless / AWS Lambda
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix { constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; } };
}
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {};
}

module.exports = async (req, res) => {
  const handler = (await import('../frontend/api/index.js')).default;
  return handler(req, res);
};
