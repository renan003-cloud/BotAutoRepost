# Usa a imagem oficial do Node.js
FROM node:20-alpine

# Define a pasta de trabalho
WORKDIR /app

# Configura npm para reduzir requisições
RUN npm config set fetch-retries 1 && \
    npm config set fetch-retry-mintimeout 30000 && \
    npm config set fetch-retry-maxtimeout 180000 && \
    npm config set fetch-timeout 90000 && \
    npm config set progress false && \
    npm config set audit false && \
    npm config set fund false

# Copia arquivos de dependências
COPY package.json package-lock.json .npmrc ./

# Instala dependências
RUN npm install --no-audit --no-fund --production

# Verifica instalação
RUN ls -la node_modules/telegram && \
    node -e "require('telegram'); console.log('Telegram module OK')"

# Copia código da aplicação
COPY *.js ./

# Verificação final
RUN node -e "require('telegram'); console.log('Final check OK')"

# Comando para iniciar
CMD ["node", "index.js"]
