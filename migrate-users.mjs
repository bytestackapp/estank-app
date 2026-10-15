// migrate-users.mjs
// Run this ONCE to import your existing users into Supabase
// Command: node migrate-users.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://akyerfmefdnzxgqqxjwq.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFreWVyZm1lZmRuenhncXF4andxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA0NDM5MSwiZXhwIjoyMDkxNjIwMzkxfQ.geU8hdNT7jyx0wbFLdWZzB4bADbmdEaviUJHjN0EhnM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const users = [
  {
    username: 'admin',
    first_name: 'System',
    last_name: 'Administrator',
    email: 'marvingonda@gmail.com',
    password: '$2b$10$PQRNdL4agH53igiWT3l59uPuZpr.rttSK3DPk5lty4A9o0Fmsadse',
    role: 'admin',
  },
  {
    username: 'marvin.gonda',
    first_name: 'Marvin',
    last_name: 'Gonda',
    email: 'marvin.gonda@agpglobal.com',
    password: '$2b$10$pcTiKUdMW5rfRP1W4xF6EOvxni1M67fNbcWc8Ox6taE05rR4eKJ92',
    role: 'user',
  },
  {
    username: 'jbriones0101',
    first_name: 'Pat',
    last_name: 'Briones',
    email: 'john.briones@agpglobal.com',
    password: '$2b$10$pc2Jsa3nrY0t5dKsHfmrR.2Blxp0JYNKeNYY/NWCDYNm5jhyxP7dW',
    role: 'user',
  },
];

async function migrate() {
  console.log('Starting migration...\n');

  for (const user of users) {
    const { error } = await supabase.from('users').insert(user);
    if (error) {
      console.error(`❌ Failed to insert ${user.username}:`, error.message);
    } else {
      console.log(`✅ Inserted: ${user.username} (${user.role})`);
    }
  }

  console.log('\nMigration complete!');
}

migrate();
