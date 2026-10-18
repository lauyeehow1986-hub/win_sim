@echo off
title Windows Login Simulation & Jev Benchmark
echo ======================================================================
echo  Windows Login Simulation & Jev Benchmark Server
echo ======================================================================
echo  Target: 9-character numeric password (0-9)
echo  Reference: Hive Systems "Are Your Passwords in the Green?" (2 Hours)
echo ======================================================================
echo.
echo Starting server on http://localhost:8000 ...
start http://localhost:8000
python server.py
pause
