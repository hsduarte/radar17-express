#!/bin/bash

# Verifica se o Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "Docker não está instalado. Por favor, instale o Docker primeiro."
    exit 1
fi

# Verifica se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose não está instalado. Por favor, instale o Docker Compose primeiro."
    exit 1
fi

# Construir e iniciar os containers
echo "Iniciando os serviços do RADAR 17..."
docker-compose up -d

# Aguardar serviços estarem prontos
echo "Aguardando serviços iniciarem..."
sleep 5

# Exibir informações úteis
echo ""
echo "===== RADAR 17 - Informações de Acesso ====="
echo "Aplicação: http://localhost:5001"
echo "Admin: http://localhost:5001/admin"
echo "MongoDB: mongodb://localhost:27017"
echo "MongoDB Admin UI: http://localhost:8081"
echo "  - Usuário: admin"
echo "  - Senha: admin123"
echo "============================================="
echo ""
echo "Para parar os serviços, execute: docker-compose down"
echo "Para ver os logs, execute: docker-compose logs -f"
