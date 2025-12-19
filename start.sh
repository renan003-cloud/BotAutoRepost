#!/bin/sh
set -e

echo "=== Verificando dependências ==="
if [ ! -d "node_modules/telegram" ]; then
    echo "Dependências não encontradas. Instalando..."
    npm install --no-audit --no-fund --production
    echo "Dependências instaladas!"
else
    echo "Dependências já instaladas."
fi

echo "=== Verificando módulo telegram ==="
node -e "require('telegram'); console.log('✓ Módulo telegram disponível')" || {
    echo "ERRO: Módulo telegram não encontrado mesmo após instalação!"
    exit 1
}

echo "=== Iniciando aplicação ==="
node index.js

