# Dockerfile para Vertra
# Instala dependências no início do container para garantir disponibilidade
FROM node:20-alpine

WORKDIR /app

# Configura npm para reduzir requisições
RUN npm config set fetch-retries 1 && \
    npm config set fetch-retry-mintimeout 30000 && \
    npm config set fetch-retry-maxtimeout 180000 && \
    npm config set fetch-timeout 90000 && \
    npm config set progress false && \
    npm config set audit false && \
    npm config set fund false

# Copia todos os arquivos necessários
COPY package.json package-lock.json .npmrc ./
COPY *.js ./

# Instala dependências e inicia em um único comando
# Isso garante que as dependências estejam sempre disponíveis mesmo se a Vertra limpar node_modules
CMD sh -c "echo 'Instalando dependências...' && npm install --no-audit --no-fund --production && echo 'Dependências instaladas! Iniciando aplicação...' && node index.js"
