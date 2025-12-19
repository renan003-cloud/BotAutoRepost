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
RUN npm ci --no-audit --no-fund --production

# Verifica se o módulo telegram foi instalado
RUN node -e "require('telegram'); console.log('✓ Módulo telegram instalado com sucesso!')"

# Copia o restante do código da sua aplicação
COPY . .

# Inicia a aplicação
CMD ["node", "index.js"]