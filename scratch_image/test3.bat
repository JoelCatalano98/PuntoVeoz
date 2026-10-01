@echo off
setlocal enabledelayedexpansion
echo Fluxer2026!!> input.txt
set /p MYSQL_PASS= < input.txt
echo with percent: %MYSQL_PASS%
echo with excl: !MYSQL_PASS!
