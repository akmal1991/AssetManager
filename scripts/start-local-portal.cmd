@echo off
cd /d C:\projects\Asset-Manager
corepack pnpm --filter @workspace/portal run dev > portal.log 2> portal.err.log
