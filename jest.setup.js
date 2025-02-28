// Aumentar o timeout para testes
jest.setTimeout(30000);

// Mock global.console
global.console = {
  ...console,
  // Desativar logs durante os testes para manter a saída limpa
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Manter erros e avisos visíveis para depuração
  warn: console.warn,
  error: console.error,
}; 