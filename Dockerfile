# Usa a imagem oficial do Node.js (versão LTS)
FROM node:20-alpine

# Garante que estamos usando a versão correta
RUN node --version && npm --version

# Define a pasta de trabalho dentro do contêiner
WORKDIR /app

# Configura o npm para reduzir requisições
RUN npm config set fetch-retries 1 && \
    npm config set fetch-retry-mintimeout 30000 && \
    npm config set fetch-retry-maxtimeout 180000 && \
    npm config set fetch-timeout 90000 && \
    npm config set progress false && \
    npm config set audit false && \
    npm config set fund false && \
    npm config set update-notifier false

# Copia os arquivos de configuração do seu projeto
COPY package.json package-lock.json ./
COPY .npmrc ./

# Instala as dependências de produção
RUN echo "=== Instalando dependências ===" && \
    if [ -f package-lock.json ]; then \
        echo "Tentando npm ci..." && \
        npm ci --no-audit --no-fund --production || \
        (echo "npm ci falhou, tentando npm install..." && npm install --no-audit --no-fund --production); \
    else \
        echo "package-lock.json não encontrado, usando npm install..." && \
        npm install --no-audit --no-fund --production; \
    fi && \
    echo "=== Verificando node_modules ===" && \
    ls -la node_modules/ | head -10 && \
    echo "=== Verificando módulo telegram ===" && \
    if [ -d "node_modules/telegram" ]; then \
        echo "✓ Diretório telegram existe"; \
        ls -la node_modules/telegram/ | head -5; \
    else \
        echo "✗ ERRO: Diretório telegram NÃO existe!"; \
        exit 1; \
    fi && \
    echo "=== Testando módulo telegram ===" && \
    node -e "const tg = require('telegram'); console.log('✓ telegram carregado com sucesso!')" && \
    echo "=== Dependências OK ==="

# Copia o restante do código da sua aplicação
# IMPORTANTE: node_modules já está instalado, não copiar novamente
COPY index.js repost.js generate_session.js ./

# Verificação final antes de iniciar
RUN echo "=== Verificação final ===" && \
    node -e "require('telegram'); console.log('✓ Módulo telegram disponível!')" && \
    echo "=== Pronto para iniciar ==="

# Inicia a aplicação
CMD ["node", "index.js"]