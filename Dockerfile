# Dockerfile para Vertra
FROM node:20-alpine

WORKDIR /app

# Copia todos os arquivos necessários
COPY package.json package-lock.json ./
COPY *.js ./
COPY start.sh ./

# Garante que o script tenha permissão de execução
RUN chmod +x start.sh

# O CMD padrão será sobrescrito pelo npm start, mas mantemos aqui como fallback
CMD ["sh", "start.sh"]
