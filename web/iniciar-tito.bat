@echo off
chcp 65001 >nul
title TITO METRALLETA
set "APPDIR=C:\Users\18327\Downloads\Agente Tito Metralleta\Agente Tito Metralleta\web"
cd /d "%APPDIR%"

echo ============================================
echo    TITO METRALLETA - Agente de Opciones
echo ============================================
echo.

rem  ¿Ya hay un servidor escuchando en el puerto 3000?
powershell -NoProfile -Command "$c=New-Object Net.Sockets.TcpClient; try{$c.Connect('localhost',3000);$c.Close();exit 0}catch{exit 1}"
if %errorlevel%==0 (
  echo El servidor ya esta corriendo. Abriendo el navegador...
) else (
  echo Iniciando el servidor... ^(deja abierta la ventana del servidor^)
  start "TITO METRALLETA - servidor" cmd /k "cd /d ""%APPDIR%"" ^&^& npm run dev"
  echo Esperando a que el servidor arranque...
  powershell -NoProfile -Command "for($i=0;$i -lt 60;$i++){$c=New-Object Net.Sockets.TcpClient; try{$c.Connect('localhost',3000);$c.Close();exit 0}catch{Start-Sleep -Milliseconds 500}}; exit 1"
)

start "" http://localhost:3000
exit
