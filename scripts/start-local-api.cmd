@echo off
cd /d C:\projects\Asset-Manager
"C:\projects\Asset-Manager\.local\node20\node.exe" "C:\projects\Asset-Manager\node_modules\.pnpm\tsx@4.21.0\node_modules\tsx\dist\cli.mjs" "C:\projects\Asset-Manager\artifacts\api-server\src\index.ts" > api-server.log 2> api-server.err.log
