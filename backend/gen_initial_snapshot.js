import SnapshotService from './src/services/SnapshotService.js';

async function run() {
  console.log('🏗️ Gerando Snapshot Inicial...');
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = now.toISOString();

    const snapshot = await SnapshotService.generateSnapshot(start, end);
    console.log('✅ Snapshot Draft gerado:', snapshot.id);

    // Auto-publicação para visualização imediata no Dashboard
    await SnapshotService.publishSnapshot(snapshot.id, 'Sistema (Setup)');
    console.log('✅ Snapshot PUBLICADO. Dashboard pronto para uso.');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao gerar snapshot:', err.message);
    process.exit(1);
  }
}

run();
