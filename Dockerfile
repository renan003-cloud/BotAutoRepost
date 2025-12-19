# Dockerfile para Vertra
FROM node:20-alpine

WORKDIR /app

# Copia todos os arquivos necessários
COPY package.json package-lock.json ./
COPY *.js ./

# Script de inicialização com logs detalhados e verificações
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "=== Verificando arquivos ==="' >> /app/start.sh && \
    echo 'ls -la' >> /app/start.sh && \
    echo 'echo "=== Instalando dependências ==="' >> /app/start.sh && \
    echo 'npm install --no-audit --no-fund --production || npm install --no-audit --no-fund' >> /app/start.sh && \
    echo 'echo "=== Verificando instalação ==="' >> /app/start.sh && \
    echo 'ls -la node_modules/ | head -10' >> /app/start.sh && \
    echo 'if [ ! -d "node_modules/telegram" ]; then' >> /app/start.sh && \
    echo '  echo "ERRO: node_modules/telegram não existe!"' >> /app/start.sh && \
    echo '  ls -la node_modules/ || echo "node_modules não existe!"' >> /app/start.sh && \
    echo '  exit 1' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'echo "=== Testando módulo telegram ==="' >> /app/start.sh && \
    echo 'node -e "require(\"telegram\"); console.log(\"✓ telegram OK\")" || exit 1' >> /app/start.sh && \
    echo 'echo "=== Iniciando aplicação ==="' >> /app/start.sh && \
    echo 'node index.js' >> /app/start.sh && \
    chmod +x /app/start.sh

CMD ["/app/start.sh"]
