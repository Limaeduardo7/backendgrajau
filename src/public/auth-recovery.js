/**
 * Script de recuperação de autenticação - v1.0.0
 * Detecta e corrige problemas com tokens de autenticação no frontend
 */

(function() {
  // Constantes
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : 'https://api.anunciargrajaueregiao.com/api';
  
  const PROBLEMATIC_TOKEN = '2tzoIYjxqtSE6LbFHL9mecf9JKM';
  const AUTH_RECOVERY_ENDPOINT = `${API_URL}/auth/check-auth`;
  
  // Função para verificar se há token problemático no localStorage
  function checkForProblematicToken() {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    
    if (token === PROBLEMATIC_TOKEN) {
      console.warn('Token problemático detectado no localStorage. Tentando recuperação automática...');
      attemptTokenRecovery(token);
      return true;
    }
    
    return false;
  }
  
  // Função para tentar recuperar o token
  async function attemptTokenRecovery(token) {
    try {
      const response = await fetch(AUTH_RECOVERY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenToCheck: token })
      });
      
      const data = await response.json();
      
      if (data.status === 'success' && data.temporaryToken) {
        console.info('Token de recuperação recebido com sucesso!');
        
        // Substituir token problemático pelo token de recuperação
        localStorage.setItem('authToken', data.temporaryToken);
        localStorage.setItem('token', data.temporaryToken);
        
        // Opcionalmente, recarregar a página para aplicar o novo token
        window.location.reload();
        
        return true;
      } else {
        console.error('Não foi possível obter token de recuperação:', data.message);
        return false;
      }
    } catch (error) {
      console.error('Erro ao tentar recuperar token:', error);
      return false;
    }
  }
  
  // Função principal
  function init() {
    // Verificar se há token problemático no carregamento da página
    checkForProblematicToken();
    
    // Monitorar erros de API para detectar problemas de autenticação
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
      const response = await originalFetch(url, options);
      
      // Verificar se é uma resposta de erro de autenticação (401)
      if (response.status === 401) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        
        if (token) {
          // Verificar se o token é problemático ou inválido
          const checkResult = await fetch(AUTH_RECOVERY_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tokenToCheck: token })
          }).then(res => res.json()).catch(() => null);
          
          if (checkResult && checkResult.status === 'success' && checkResult.temporaryToken) {
            // Substituir token problemático pelo token de recuperação
            localStorage.setItem('authToken', checkResult.temporaryToken);
            localStorage.setItem('token', checkResult.temporaryToken);
            
            // Alertar o usuário
            console.info('Problema de autenticação detectado e corrigido. Recarregando...');
            
            // Recarregar a página após um breve atraso
            setTimeout(() => window.location.reload(), 1000);
          }
        }
      }
      
      return response;
    };
    
    console.info('Sistema de recuperação de autenticação inicializado');
  }
  
  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})(); 