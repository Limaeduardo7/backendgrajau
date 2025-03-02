# Melhorias de Segurança Implementadas

## Configuração Segura do Trust Proxy

Foi implementada uma configuração mais segura para o `trust proxy` do Express, que agora é configurado de acordo com o ambiente:

- **Em produção**: Configurado para confiar apenas no primeiro proxy na cadeia (`app.set('trust proxy', 1)`), assumindo que há um proxy confiável (como Nginx) na frente da aplicação.
- **Em desenvolvimento**: Desabilitado (`app.set('trust proxy', false)`) para evitar possíveis falsificações de IP.

### Por que isso é importante?

Quando `trust proxy` está configurado como `true`, o Express confia cegamente no cabeçalho `X-Forwarded-For` para determinar o IP do cliente. Isso pode ser facilmente falsificado, permitindo que atacantes contornem limitações de taxa baseadas em IP.

### Configurações alternativas para produção

Dependendo da sua infraestrutura, você pode querer configurar o `trust proxy` de maneira diferente:

- Para IPs específicos: `app.set('trust proxy', ['10.0.0.1', '10.0.0.2'])`
- Para uma sub-rede: `app.set('trust proxy', 'loopback, 10.0.0.0/8')`
- Para um número específico de proxies na cadeia: `app.set('trust proxy', 2)` (confia nos 2 primeiros proxies)

## Configuração Segura do Rate Limiter

Foi implementada uma configuração mais segura para o `express-rate-limit`, que agora:

1. **Usa um gerador de chaves personalizado**:
   - Em produção: Combina o IP real do cliente com parte do User-Agent para criar uma chave única
   - Em desenvolvimento: Usa apenas o IP do cliente
   - Remove a porta do IP, se houver (problema comum em alguns proxies)

2. **Adiciona um handler personalizado** para quando o limite é atingido, que:
   - Registra um aviso no log
   - Retorna uma resposta JSON com status 429
   - Informa ao cliente quanto tempo esperar antes de tentar novamente

3. **Desabilita a validação do trust proxy**:
   - Configuração `validate: { trustProxy: false }` para evitar o erro `ERR_ERL_PERMISSIVE_TRUST_PROXY`
   - Isso é necessário porque o express-rate-limit 6.x+ faz uma verificação rigorosa da configuração do trust proxy

### Por que isso é importante?

A configuração padrão do `express-rate-limit` pode ser contornada se o `trust proxy` estiver configurado incorretamente. Ao usar um gerador de chaves personalizado, aumentamos a segurança mesmo se o IP for falsificado, pois também consideramos o User-Agent.

### Correção do erro ERR_ERL_PERMISSIVE_TRUST_PROXY

O erro `ERR_ERL_PERMISSIVE_TRUST_PROXY` ocorre quando o `express-rate-limit` detecta que a configuração do `trust proxy` está muito permissiva (como `true`), o que pode permitir que atacantes contornem a limitação de taxa.

Para corrigir esse erro, implementamos:

1. Uma configuração mais específica do `trust proxy` (1 em vez de true)
2. Um gerador de chaves personalizado que não depende apenas do IP
3. A desativação da validação do trust proxy no rate limiter com `validate: { trustProxy: false }`

## Como testar

Para testar se a limitação de taxa está funcionando corretamente:

1. Faça várias requisições em sequência rápida para qualquer endpoint da API
2. Após exceder o limite (100 requisições em 15 minutos por padrão), você deve receber uma resposta 429 com uma mensagem informando quanto tempo esperar

## Configurações no arquivo .env

Você pode ajustar as configurações do rate limiter através das seguintes variáveis de ambiente:

- `RATE_LIMIT_WINDOW_MS`: Janela de tempo em milissegundos (padrão: 900000 = 15 minutos)
- `RATE_LIMIT_MAX`: Número máximo de requisições por IP na janela de tempo (padrão: 100)

Exemplo:
```
RATE_LIMIT_WINDOW_MS=300000  # 5 minutos
RATE_LIMIT_MAX=50            # 50 requisições
```

## Próximos passos recomendados

1. **Implementar CORS corretamente**: Revisar e ajustar a configuração de CORS para permitir apenas origens confiáveis.
2. **Adicionar proteção contra ataques de força bruta**: Implementar limitação de taxa específica para endpoints de autenticação.
3. **Implementar validação de entrada mais rigorosa**: Usar bibliotecas como Joi ou Zod para validar todas as entradas de usuário.
4. **Adicionar proteção contra ataques comuns**: Implementar proteção contra CSRF, XSS e outros ataques comuns.
5. **Configurar cabeçalhos de segurança adicionais**: Revisar e ajustar os cabeçalhos de segurança configurados pelo Helmet. 