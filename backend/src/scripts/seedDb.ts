import fs from 'fs';
import path from 'path';
import { getPool } from '../config/database';

async function seedDatabase() {
  console.log('Iniciando carga de datos de prueba (Seeds) en prevencion_cognitiva_oltp...');
  const seedPath = path.resolve(__dirname, '../../../bd-sql/seed-data.sql');

  if (!fs.existsSync(seedPath)) {
    console.error('No se encontró el archivo seed-data.sql en:', seedPath);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(seedPath, 'utf-8');
  // Dividir por GO en líneas independientes
  const batches = fileContent
    .split(/^\s*GO\s*$/gim)
    .map(b => b.trim())
    .filter(b => b.length > 0 && !b.startsWith('USE '));

  try {
    const pool = await getPool();
    console.log(`Conectado a BD. Ejecutando ${batches.length} bloques SQL...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        await pool.request().batch(batch);
      } catch (err: any) {
        console.warn(`Aviso en bloque ${i + 1}: ${err.message}`);
      }
    }

    console.log('✅ Seeds aplicados exitosamente.');
    await pool.close();
    process.exit(0);
  } catch (err: any) {
    console.error('Error al ejecutar seeds:', err.message);
    process.exit(1);
  }
}

seedDatabase();
