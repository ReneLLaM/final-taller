#!/bin/bash

# Script para probar el sistema de autenticación

echo "🧪 Probando el sistema de autenticación..."
echo ""

BASE_URL="http://localhost:3000/api"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Registrar usuario
echo "📝 Test 1: Registrar usuario..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/register \
  -H "Content-Type: application/json" \
  -d '{
    "nombre_completo": "Test User",
    "carrera": "Ingeniería de Sistemas",
    "cu": "99-9999",
    "correo": "test@test.com",
    "contrasenia": "password123"
  }' \
  -c cookies.txt)

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n 1)
RESPONSE=$(echo "$REGISTER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 400 ]; then
  echo -e "${GREEN}✓${NC} Registro: $HTTP_CODE"
else
  echo -e "${RED}✗${NC} Registro falló: $HTTP_CODE"
fi

# Test 2: Login
echo ""
echo "🔐 Test 2: Login..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "test@test.com",
    "contrasenia": "password123"
  }' \
  -b cookies.txt \
  -c cookies.txt)

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)
RESPONSE=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓${NC} Login exitoso: $HTTP_CODE"
else
  echo -e "${RED}✗${NC} Login falló: $HTTP_CODE"
fi

# Test 3: Ruta protegida
echo ""
echo "🔒 Test 3: Acceder a ruta protegida..."
PROTECTED_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET $BASE_URL/protected \
  -b cookies.txt)

HTTP_CODE=$(echo "$PROTECTED_RESPONSE" | tail -n 1)
RESPONSE=$(echo "$PROTECTED_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓${NC} Ruta protegida accesible: $HTTP_CODE"
  echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
  echo -e "${RED}✗${NC} Ruta protegida inaccesible: $HTTP_CODE"
fi

# Test 4: Logout
echo ""
echo "🚪 Test 4: Logout..."
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/logout \
  -b cookies.txt)

HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓${NC} Logout exitoso: $HTTP_CODE"
else
  echo -e "${RED}✗${NC} Logout falló: $HTTP_CODE"
fi

# Test 5: Intentar acceder a protegida sin token
echo ""
echo "🚫 Test 5: Intentar acceder sin token..."
NO_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET $BASE_URL/protected)

HTTP_CODE=$(echo "$NO_TOKEN_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" -eq 401 ]; then
  echo -e "${GREEN}✓${NC} Protección funciona: $HTTP_CODE"
else
  echo -e "${RED}✗${NC} Protección falló: $HTTP_CODE"
fi

echo ""
echo "✅ Tests completados"
rm -f cookies.txt

