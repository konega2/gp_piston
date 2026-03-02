import { sql } from '@vercel/postgres';

type TableRow = {
  table_name: string;
};

async function main() {
  try {
    const { rows } = await sql<TableRow>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    const tableNames = rows.map((row) => row.table_name);

    console.log('Tablas en public:');
    if (tableNames.length === 0) {
      console.log('- (sin tablas)');
    } else {
      for (const tableName of tableNames) {
        console.log(`- ${tableName}`);
      }
    }

    if (!tableNames.includes('events')) {
      console.log('Schema no aplicado en esta base');
      process.exitCode = 1;
      return;
    }

    console.log('Schema detectado correctamente (tabla events presente).');
  } catch (error) {
    console.error('Error verificando base de datos:', error);
    process.exitCode = 1;
  }
}

void main();
