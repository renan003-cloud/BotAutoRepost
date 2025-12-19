# Usa a imagem oficial do Node.js
FROM node:20-alpine

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
    (npm ci --no-audit --no-fund --production || npm install --no-audit --no-fund --production) && \
    echo "=== Verificando node_modules ===" && \
    ls -la node_modules/ && \
    echo "=== Verificando módulo telegram ===" && \
    (test -d node_modules/telegram && echo "✓ Diretório telegram existe" || echo "✗ Diretório telegram NÃO existe") && \
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