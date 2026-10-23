import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/resource/js/mixer/rollupBundle/codeMirrorManager.js',
  output: {
    dir: './rollupBundle',
    format: 'es'
  },
  plugins: [nodeResolve()]
};

// rollup --config rollup.config.js