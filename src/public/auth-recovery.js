/**
 * Sistema Avançado de Recuperação de Autenticação
 * ------------------------------------------------
 * - Detecta e corrige problemas com o token problemático
 * - Implementa recuperação automática de sessão
 */
(function() {
  // Configurações
  const API_URL = window.location.hostname.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : 'https://api.anunciargrajaueregiao.com/api';
  
  const AUTH_CONFIG = {
    problemTokens: ['2tzoIYjxqtSE6LbFHL9mecf9JKM', '2u0AiWfTasYZwnkd4Hunqt0dE9u'],
    storageKeys: ['token', 'authToken', 'clerk-token'],
    endpoints: {
      recovery: `${API_URL}/auth/check-auth`,
      status: `${API_URL}/auth/status`
    },
    redirectUrls: {
      login: '/login',
      dashboard: '/dashboard'
    },
    debug: true
  };
  
  // Funções auxiliares
  function log(...args) {
    if (AUTH_CONFIG.debug) {
      console.log('[Auth Recovery]', ...args);
    }
  }
  
  function warn(...args) {
    console.warn('[Auth Recovery]', ...args);
  }
  
  function getAllStoredTokens() {
    const tokens = {};
    AUTH_CONFIG.storageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) tokens[key] = value;
    });
    return tokens;
  }
  
  function clearAllTokens() {
    AUTH_CONFIG.storageKeys.forEach(key => localStorage.removeItem(key));
    log('Todos os tokens foram removidos');
  }
  
  function setToken(token) {
    // Definir em todas as chaves conhecidas
    AUTH_CONFIG.storageKeys.forEach(key => {
      localStorage.setItem(key, token);
    });
    log('Token recuperado definido em todas as chaves de armazenamento');
  }
  
  // Verificar problemas de token
  async function checkAndFixTokens() {
    const tokens = getAllStoredTokens();
    const tokenValues = Object.values(tokens);
    
    if (tokenValues.length === 0) {
      log('Nenhum token armazenado encontrado');
      return null;
    }
    
    // Verificar tokens problemáticos conhecidos
    for (const key in tokens) {
      if (AUTH_CONFIG.problemTokens.includes(tokens[key])) {
        warn(`Token problemático detectado em ${key}`);
        return await recoverAuthentication(tokens[key]);
      }
    }
    
    // Se chegou aqui, verificar validade do token principal
    const primaryToken = tokens[AUTH_CONFIG.storageKeys[0]];
    return await verifyTokenValidity(primaryToken);
  }
  
  // Verifica se um token é válido
  async function verifyTokenValidity(token) {
    try {
      const response = await fetch(AUTH_CONFIG.endpoints.status, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.authenticated) {
        warn('Token existente é inválido');
        return await recoverAuthentication(token);
      }
      
      log('Token verificado e válido');
      return token;
    } catch (error) {
      warn('Erro ao verificar token:', error);
      return await recoverAuthentication(token);
    }
  }
  
  // Solicita um novo token de recuperação
  async function recoverAuthentication(currentToken) {
    try {
      log('Tentando recuperar autenticação');
      
      const response = await fetch(AUTH_CONFIG.endpoints.recovery, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tokenToCheck: currentToken })
      });
      
      const data = await response.json();
      
      if (data.status === 'success' && data.temporaryToken) {
        log('Recuperação bem-sucedida, aplicando novo token');
        setToken(data.temporaryToken);
        return data.temporaryToken;
      } else {
        warn('Falha na recuperação:', data.message);
        clearAllTokens();
        redirectToLogin();
        return null;
      }
    } catch (error) {
      warn('Erro na recuperação de autenticação:', error);
      clearAllTokens();
      redirectToLogin();
      return null;
    }
  }
  
  // Monitora erros de API e tenta recuperação
  function setupAPIErrorInterceptor() {
    // Patch XMLHttpRequest para capturar erros 401
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._authRecoveryUrl = url;
      return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      const xhr = this;
      const originalOnReadyStateChange = xhr.onreadystatechange;
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 401 && xhr._authRecoveryUrl.includes(API_URL)) {
            // Erro 401 em chamada de API
            warn('Erro 401 detectado em chamada de API:', xhr._authRecoveryUrl);
            
            // Iniciar recuperação
            const tokens = getAllStoredTokens();
            const tokenValue = Object.values(tokens)[0];
            
            if (tokenValue) {
              recoverAuthentication(tokenValue).then(newToken => {
                if (newToken) {
                  // Recarregar a página para aplicar o novo token
                  window.location.reload();
                }
              });
            }
          }
        }
        
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.apply(xhr, arguments);
        }
      };
      
      return originalXHRSend.apply(xhr, args);
    };
    
    // Patch Fetch API para capturar erros 401
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
      const response = await originalFetch(url, options);
      
      if (response.status === 401 && url.toString().includes(API_URL)) {
        warn('Erro 401 detectado em chamada fetch:', url);
        
        // Iniciar recuperação
        const tokens = getAllStoredTokens();
        const tokenValue = Object.values(tokens)[0];
        
        if (tokenValue) {
          const newToken = await recoverAuthentication(tokenValue);
          if (newToken) {
            // Retentar a requisição original com o novo token
            const newOptions = {...options};
            if (!newOptions.headers) newOptions.headers = {};
            newOptions.headers.Authorization = `Bearer ${newToken}`;
            return originalFetch(url, newOptions);
          }
        }
      }
      
      return response;
    };
    
    log('Interceptores de API configurados');
  }
  
  // Redirecionamento
  function redirectToLogin() {
    if (window.location.pathname !== AUTH_CONFIG.redirectUrls.login) {
      log('Redirecionando para login');
      window.location.href = AUTH_CONFIG.redirectUrls.login;
    }
  }
  
  // Inicialização
  function init() {
    log('Sistema de recuperação de autenticação inicializado');
    
    // Verificar e corrigir tokens no carregamento
    checkAndFixTokens();
    
    // Configurar interceptores de API
    setupAPIErrorInterceptor();
    
    // Monitorar mudanças em localStorage
    window.addEventListener('storage', (event) => {
      if (AUTH_CONFIG.storageKeys.includes(event.key)) {
        log('Alteração detectada em token armazenado:', event.key);
        if (AUTH_CONFIG.problemTokens.includes(event.newValue)) {
          warn('Token problemático detectado em alteração de armazenamento');
          recoverAuthentication(event.newValue);
        }
      }
    });
  }
  
  // Iniciar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(); 