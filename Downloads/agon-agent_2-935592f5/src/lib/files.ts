/**
 * Registry of the real source files shipped in the CargoShare repository.
 * Contents are inlined at build time via Vite's `?raw` imports so the
 * Open Source Hub can show exactly what runs in production.
 */
import dockerCompose from '../../docker-compose.yml?raw';
import envExample from '../../.env.example?raw';
import ciWorkflow from '../../.github/workflows/ci.yml?raw';
import migration from '../../server/sql/migrations/001_init.sql?raw';
import apiIndex from '../../server/src/index.js?raw';
import locks from '../../server/src/services/locks.js?raw';
import bookingsRoute from '../../server/src/routes/bookings.js?raw';
import socketServer from '../../server/src/socket.js?raw';
import k8sApi from '../../k8s/api.yaml?raw';
import readme from '../../README.md?raw';

export interface StackFile {
  path: string;
  content: string;
  lang: string;
  bytes: number;
}

const fmt = (s: string) => s;

export const STACK_FILES: StackFile[] = [
  { path: 'docker-compose.yml', content: fmt(dockerCompose), lang: 'yaml', bytes: dockerCompose.length },
  { path: '.env.example', content: fmt(envExample), lang: 'bash', bytes: envExample.length },
  { path: '.github/workflows/ci.yml', content: fmt(ciWorkflow), lang: 'yaml', bytes: ciWorkflow.length },
  { path: 'server/sql/migrations/001_init.sql', content: fmt(migration), lang: 'sql', bytes: migration.length },
  { path: 'server/src/index.js', content: fmt(apiIndex), lang: 'javascript', bytes: apiIndex.length },
  { path: 'server/src/services/locks.js', content: fmt(locks), lang: 'javascript', bytes: locks.length },
  { path: 'server/src/routes/bookings.js', content: fmt(bookingsRoute), lang: 'javascript', bytes: bookingsRoute.length },
  { path: 'server/src/socket.js', content: fmt(socketServer), lang: 'javascript', bytes: socketServer.length },
  { path: 'k8s/api.yaml', content: fmt(k8sApi), lang: 'yaml', bytes: k8sApi.length },
  { path: 'README.md', content: fmt(readme), lang: 'markdown', bytes: readme.length },
];
