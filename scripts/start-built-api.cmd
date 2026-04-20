@echo off
cd /d C:\projects\Asset-Manager
"C:\Program Files\nodejs\node.exe" "C:\projects\Asset-Manager\artifacts\api-server\dist\index.js" > api-server.log 2> api-server.err.log
