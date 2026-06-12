@echo off
setlocal
title SAP Fiori - AgentRetail

set "PROJECT_DIR=C:\Users\AMD\Documents\ProjetosCodex\AgentRetail"
set "NODE_DIR=C:\Program Files\nodejs"

cd /d "%PROJECT_DIR%"
if errorlevel 1 (
  echo Nao consegui acessar a pasta do projeto:
  echo %PROJECT_DIR%
  pause
  exit /b 1
)

if exist "%NODE_DIR%" (
  set "PATH=%NODE_DIR%;%PATH%"
)

set "NODE_OPTIONS=--use-system-ca"

echo.
echo Iniciando SAP Fiori AgentRetail...
echo Pasta: %PROJECT_DIR%
echo.

if not exist "node_modules\.bin\fiori.cmd" (
  echo Dependencias nao encontradas. Instalando com npm...
  echo.
  npm.cmd install --fetch-retries=8 --fetch-retry-mintimeout=30000 --fetch-retry-maxtimeout=180000
  if errorlevel 1 (
    echo.
    echo Falha ao instalar dependencias. Rode este BAT como Administrador ou confira sua conexao.
    pause
    exit /b 1
  )
)

echo Subindo app local. O navegador deve abrir automaticamente.
echo Para parar o servidor, feche esta janela ou pressione Ctrl+C.
echo.
npm.cmd run start-local

echo.
echo Servidor encerrado.
pause
