import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const app = require('./server.cjs');

export default function handler(req, res) {
  return app(req, res);
}
