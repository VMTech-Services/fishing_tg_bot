@echo off

echo Attempt to update fishBot...
git pull

echo Checking libraries...
call npm install || pause

echo Starting service...
node bot.js

pause