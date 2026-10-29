import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
function versionServiceWorker() {
  return { name:'version-service-worker', writeBundle() {
    const dir=resolve('site');
    const fingerprint=createHash('sha256').update(readFileSync(resolve(dir,'assets/app.js'))).update(readFileSync(resolve(dir,'assets/style.css'))).digest('hex').slice(0,12);
    const file=resolve(dir,'sw.js');
    writeFileSync(file,readFileSync(file,'utf8').replace('darzi-dukaan-shell-v1',`darzi-dukaan-shell-${fingerprint}`));
  }};
}
export default defineConfig({
  plugins: [versionServiceWorker()],
  server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:4174' } },
  build: { outDir: 'site', emptyOutDir: true, cssCodeSplit: false,
    rollupOptions: { output: { entryFileNames: 'assets/app.js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name][extname]' } } }
});
