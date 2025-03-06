// Script para testar diretamente a conexão com o Supabase
const { Client } = require('pg');

async function testConnection() {
  console.log('Tentando conectar diretamente ao Supabase usando pg...');
  
  const client = new Client({
    host: 'db.fqueaxdcuyrattmadkxx.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '#Anunciar123',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conexão bem-sucedida ao Supabase!');
    
    const result = await client.query('SELECT NOW()');
    console.log('Consulta executada com sucesso:', result.rows[0]);
    
    await client.end();
    console.log('Conexão encerrada.');
  } catch (error) {
    console.error('Erro ao conectar diretamente ao Supabase:', error);
  }
}

testConnection().catch(console.error); 