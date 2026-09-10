const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const m = await p.$queryRawUnsafe('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at');
  console.log('MIGRATIONS:');
  m.forEach(x => console.log(' -', x.migration_name, '|', x.finished_at ? 'DONE' : 'PENDING'));
  const t = await p.$queryRawUnsafe("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('TABLES:', t.map(x => x.table_name).join(', '));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });