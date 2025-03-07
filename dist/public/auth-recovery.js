// Lista de tokens problemáticos conhecidos
const PROBLEM_TOKENS = [
  '2tzoIYjxqtSE6LbFHL9mecf9JKM',
  '2u0AiWfTasYZwnkd4Hunqt0dE9u'
];

// Função para verificar se um token é problemático
function isTokenProblematic(token) {
  return PROBLEM_TOKENS.includes(token);
}

// Função para recuperar a autenticação
async function recoverAuthentication(token) {
  try {
    const response = await fetch('/api/auth/check-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokenToCheck: token })
    });

    const data = await response.json();

    if (data.status === 'success' && data.temporaryToken) {
      // Armazenar o novo token
      localStorage.setItem('auth_token', data.temporaryToken);
      
      // Atualizar o token no Clerk (se necessário)
      if (window.Clerk) {
        try {
          await window.Clerk.session.replace({ token: data.temporaryToken });
        } catch (error) {
          console.warn('Erro ao atualizar sessão do Clerk:', error);
        }
      }

      return {
        success: true,
        message: 'Token recuperado com sucesso',
        user: data.user
      };
    }

    return {
      success: false,
      message: data.message || 'Não foi possível recuperar a autenticação'
    };
  } catch (error) {
    console.error('Erro ao recuperar autenticação:', error);
    return {
      success: false,
      message: 'Erro ao tentar recuperar a autenticação'
    };
  }
}

// Função para verificar e corrigir problemas de autenticação
async function checkAndFixAuthProblems() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return { success: false, message: 'Nenhum token encontrado' };
  }

  if (isTokenProblematic(token)) {
    console.warn('Token problemático detectado, tentando recuperar...');
    return await recoverAuthentication(token);
  }

  return { success: true, message: 'Token válido' };
}

// Exportar funções
window.authRecovery = {
  isTokenProblematic,
  recoverAuthentication,
  checkAndFixAuthProblems
}; 