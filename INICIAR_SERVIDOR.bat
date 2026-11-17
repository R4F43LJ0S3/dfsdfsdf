@echo off
cd /d "%~dp0"
echo Iniciando servidor de desarrollo de ALZA (SIFTC)...
echo Deja esta ventana abierta mientras se toman las evidencias.
call npm run dev
pause
