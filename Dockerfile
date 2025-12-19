# Usa a imagem oficial do Node.js
FROM node:20-alpine

# Define a pasta de trabalho dentro do contêiner
WORKDIR /app

# Configura o npm para reduzir requisições ao máximo
# Reduz retries, aumenta timeouts, desabilita verificações desnecessárias
RUN npm config set fetch-retries 1 && \
    npm config set fetch-retry-mintimeout 30000 && \
    npm config set fetch-retry-maxtimeout 180000 && \
    npm config set fetch-timeout 90000 && \
    npm config set progress false && \
    npm config set loglevel error && \
    npm config set audit false && \
    npm config set fund false && \
    npm config set update-notifier false

# Copia os arquivos de configuração do seu projeto
COPY package*.json ./
COPY .npmrc ./

# Instala as dependências com configurações otimizadas
# --prefer-offline: tenta usar cache primeiro
# --no-audit: não faz verificação de segurança (reduz requisições)
# --no-fund: não mostra mensagens de financiamento (reduz requisições)
# --production: instala apenas dependências de produção
# --loglevel=error: reduz output e possivelmente requisições
RUN npm ci --prefer-offline --no-audit --no-fund --production --loglevel=error || \
    npm install --prefer-offline --no-audit --no-fund --production --loglevel=error

# Copia o restante do código da sua aplicação
COPY . .

# Inicia a aplicação
CMD ["node", "index.js"]