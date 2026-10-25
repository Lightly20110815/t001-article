import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('./', import.meta.url));
const articleFile = path.join(root, '杂谈 #T001.md');
const articleModule = '\0virtual:article';

export default defineConfig({
  // Read the original filename directly: its # is otherwise a URL fragment.
  plugins: [{
    name: 'single-article-markdown',
    resolveId(id) {
      if (id === 'virtual:article') return articleModule;
    },
    load(id) {
      if (id !== articleModule) return;
      this.addWatchFile(articleFile);
      return `export default ${JSON.stringify(readFileSync(articleFile, 'utf8'))};`;
    },
    handleHotUpdate(context) {
      if (context.file === articleFile) {
        context.server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  }],
});
