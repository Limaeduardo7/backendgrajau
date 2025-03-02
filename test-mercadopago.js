// Script para testar a integração com o Mercado Pago
require('dotenv').config();
const mercadopago = require('mercadopago');

// Verificar se o token está disponível
console.log('MERCADO_PAGO_ACCESS_TOKEN:', process.env.MERCADO_PAGO_ACCESS_TOKEN ? 'Configurado' : 'Não configurado');

// Configurar o Mercado Pago com o token de acesso
mercadopago.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

// Função para testar a conexão com o Mercado Pago
async function testMercadoPagoConnection() {
    try {
        // Tentar obter informações sobre pagamentos (apenas para testar a conexão)
        const response = await mercadopago.payment.search({
            qs: {
                limit: 1
            }
        });
        
        console.log('Conexão com Mercado Pago estabelecida com sucesso!');
        console.log('Resposta:', JSON.stringify(response, null, 2));
        return true;
    } catch (error) {
        console.error('Erro ao conectar com o Mercado Pago:');
        console.error(error.message);
        if (error.cause) {
            console.error('Causa:', error.cause);
        }
        return false;
    }
}

// Executar o teste
testMercadoPagoConnection()
    .then(success => {
        console.log('Teste concluído:', success ? 'Sucesso' : 'Falha');
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Erro inesperado:', err);
        process.exit(1);
    }); 