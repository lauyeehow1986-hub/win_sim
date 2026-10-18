"""
server.py - Asynchronous Server for Windows Login Simulation & Dual Benchmark Racing.
"""

import os
import sys
import time
import asyncio
import json
import logging
from aiohttp import web, WSMsgType
from jev_engine import JevCalibratedSolver, SequentialBruteForceSolver, LocalJevModelBridge, HiveSystemsBenchmark

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("WindowsSimServer")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")


class RacerState:
    def __init__(self, name: str, solver_type: str):
        self.name = name
        self.solver_type = solver_type
        self.tries_count = 0
        self.start_time = 0.0
        self.elapsed_seconds = 0.0
        self.last_attempt = ""
        self.last_status = "idle"  # idle, running, failed, cracked
        self.is_cracked = False
        self.cracked_password = None
        self.rate_per_sec = 0.0

    def reset(self):
        self.tries_count = 0
        self.start_time = 0.0
        self.elapsed_seconds = 0.0
        self.last_attempt = ""
        self.last_status = "idle"
        self.is_cracked = False
        self.cracked_password = None
        self.rate_per_sec = 0.0

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "solver_type": self.solver_type,
            "tries_count": self.tries_count,
            "elapsed_seconds": round(self.elapsed_seconds, 3),
            "rate_per_sec": round(self.rate_per_sec, 1),
            "last_attempt": self.last_attempt,
            "last_status": self.last_status,
            "is_cracked": self.is_cracked,
            "cracked_password": self.cracked_password if self.is_cracked else None
        }


class BenchmarkManager:
    def __init__(self):
        # Default secret password (9 digits numbers only)
        self._target_password = "199805121"
        self.is_racing = False
        self.speed_mode = "visual"   # 'visual' (animated UI) or 'turbo' (max speed)
        self.visual_delay_ms = 150  # delay between tries in visual mode
        self.winner = None
        self.view_mode = "dual"      # 'dual' or 'single'

        # Racers
        self.brute_racer = RacerState("Sequential Brute Force", "sequential_brute")
        self.jev_racer = RacerState("Jev Calibrated Model", "jev_calibrated")

        self._race_tasks: list[asyncio.Task] = []
        self._ws_clients = set()

    def set_target_password(self, pwd: str) -> bool:
        if len(pwd) == 9 and pwd.isdigit():
            self._target_password = pwd
            self.reset_all()
            return True
        return False

    def verify_attempt_for_racer(self, racer: RacerState, attempt: str) -> bool:
        """Isolated verification without leaking secret."""
        racer.tries_count += 1
        racer.last_attempt = attempt
        if racer.start_time > 0:
            racer.elapsed_seconds = time.perf_counter() - racer.start_time
            if racer.elapsed_seconds > 0:
                racer.rate_per_sec = racer.tries_count / racer.elapsed_seconds

        if attempt == self._target_password:
            racer.is_cracked = True
            racer.cracked_password = attempt
            racer.last_status = "cracked"
            if not self.winner:
                self.winner = racer.solver_type
            return True
        else:
            racer.last_status = "failed"
            return False

    def reset_all(self):
        for task in self._race_tasks:
            if not task.done():
                task.cancel()
        self._race_tasks.clear()
        self.is_racing = False
        self.winner = None
        self.brute_racer.reset()
        self.jev_racer.reset()

    def get_telemetry(self) -> dict:
        return {
            "is_racing": self.is_racing,
            "speed_mode": self.speed_mode,
            "visual_delay_ms": self.visual_delay_ms,
            "view_mode": self.view_mode,
            "winner": self.winner,
            "brute": self.brute_racer.to_dict(),
            "jev": self.jev_racer.to_dict(),
            "hive_benchmark": {
                "search_space": HiveSystemsBenchmark.SEARCH_SPACE,
                "reported_hours": HiveSystemsBenchmark.HIVE_REPORTED_HOURS,
                "reported_seconds": HiveSystemsBenchmark.HIVE_REPORTED_SECONDS,
                "password_length": HiveSystemsBenchmark.PASSWORD_LENGTH,
                "charset": "Numbers only (0-9)"
            }
        }

    async def broadcast_telemetry(self):
        if not self._ws_clients:
            return
        data = json.dumps(self.get_telemetry())
        dead = []
        for ws in self._ws_clients:
            try:
                await ws.send_str(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._ws_clients.discard(ws)

    async def _run_single_solver(self, racer: RacerState, generator):
        racer.start_time = time.perf_counter()
        racer.last_status = "running"

        try:
            for candidate in generator:
                if not self.is_racing or racer.is_cracked:
                    break

                matched = self.verify_attempt_for_racer(racer, candidate)

                if matched:
                    logger.info(f"[{racer.name}] CRACKED '{candidate}' in {racer.tries_count} tries ({racer.elapsed_seconds:.3f}s)")
                    await self.broadcast_telemetry()
                    break

                if self.speed_mode == "visual":
                    await asyncio.sleep(self.visual_delay_ms / 1000.0)
                else:
                    if racer.tries_count % 3000 == 0:
                        await asyncio.sleep(0.001)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in {racer.name}: {e}")

    async def start_dual_race(self):
        self.reset_all()
        self.is_racing = True
        logger.info(f"Starting Dual Benchmark Race: Brute Force vs Jev ({self.speed_mode} mode)")

        # Create solvers
        brute_gen = SequentialBruteForceSolver().generate_candidates()
        jev_gen = JevCalibratedSolver().generate_candidates()

        task_brute = asyncio.create_task(self._run_single_solver(self.brute_racer, brute_gen))
        task_jev = asyncio.create_task(self._run_single_solver(self.jev_racer, jev_gen))
        self._race_tasks = [task_brute, task_jev]

        # Background broadcaster during race
        async def telemetry_ticker():
            while self.is_racing:
                await self.broadcast_telemetry()
                await asyncio.sleep(0.05 if self.speed_mode == "turbo" else 0.1)

        ticker = asyncio.create_task(telemetry_ticker())

        # Wait until at least one finishes or both cancel
        try:
            # Race runs until both are done or stopped
            await asyncio.gather(task_brute, task_jev)
        finally:
            self.is_racing = False
            ticker.cancel()
            await self.broadcast_telemetry()


mgr = BenchmarkManager()

# --- HTTP Request Handlers ---

async def handle_index(request):
    return web.FileResponse(os.path.join(STATIC_DIR, "index.html"))

async def handle_report(request):
    report_path = os.path.join(BASE_DIR, "report.html")
    if os.path.exists(report_path):
        return web.FileResponse(report_path)
    return web.Response(text="Report not found", status=404)

async def handle_admin(request):
    return web.FileResponse(os.path.join(STATIC_DIR, "admin.html"))

async def api_login(request):
    """
    Simulated Windows Login Attempt API.
    Does NOT leak target password. Returns exact Windows fail message.
    """
    try:
        data = await request.json()
        password = str(data.get("password", "")).strip()
    except Exception:
        return web.json_response({"success": False, "message": "Invalid request"}, status=400)

    matched = mgr.verify_attempt_for_racer(mgr.jev_racer, password)
    await mgr.broadcast_telemetry()

    if matched:
        return web.json_response({
            "success": True,
            "message": "Welcome",
            "tries": mgr.jev_racer.tries_count,
            "elapsed_seconds": mgr.jev_racer.elapsed_seconds
        })
    else:
        return web.json_response({
            "success": False,
            "message": "The password is incorrect. Try again.",
            "tries": mgr.jev_racer.tries_count
        })

async def api_admin_set_password(request):
    """
    Endpoint to set the 9-digit numeric secret password.
    """
    try:
        data = await request.json()
        password = str(data.get("password", "")).strip()
    except Exception:
        return web.json_response({"success": False, "error": "Invalid request body"}, status=400)

    if len(password) != 9 or not password.isdigit():
        return web.json_response({
            "success": False,
            "error": "Password must be exactly 9 numeric digits (0-9)."
        }, status=400)

    success = mgr.set_target_password(password)
    await mgr.broadcast_telemetry()
    return web.json_response({
        "success": success,
        "message": "Secret password securely updated in server memory. Race reset to 0."
    })

async def api_get_status(request):
    return web.json_response(mgr.get_telemetry())

async def api_race_start(request):
    try:
        data = await request.json()
    except Exception:
        data = {}

    if "speed_mode" in data:
        mgr.speed_mode = data["speed_mode"]
    if "visual_delay_ms" in data:
        mgr.visual_delay_ms = max(10, int(data["visual_delay_ms"]))
    if "view_mode" in data:
        mgr.view_mode = data["view_mode"]

    if mgr.is_racing:
        mgr.reset_all()

    asyncio.create_task(mgr.start_dual_race())
    return web.json_response({"success": True, "message": "Dual Benchmark Race started."})

async def api_race_stop(request):
    mgr.reset_all()
    await mgr.broadcast_telemetry()
    return web.json_response({"success": True, "message": "Benchmark race stopped."})

async def api_race_reset(request):
    mgr.reset_all()
    await mgr.broadcast_telemetry()
    return web.json_response({"success": True, "message": "Race reset."})

async def websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    mgr._ws_clients.add(ws)
    await ws.send_str(json.dumps(mgr.get_telemetry()))

    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                try:
                    payload = json.loads(msg.data)
                    action = payload.get("action")
                    if action == "start":
                        mgr.speed_mode = payload.get("speed_mode", mgr.speed_mode)
                        if "visual_delay_ms" in payload:
                            mgr.visual_delay_ms = max(10, int(payload["visual_delay_ms"]))
                        if "view_mode" in payload:
                            mgr.view_mode = payload["view_mode"]
                        asyncio.create_task(mgr.start_dual_race())
                    elif action == "stop":
                        mgr.reset_all()
                    elif action == "reset":
                        mgr.reset_all()
                    elif action == "set_password":
                        pwd = str(payload.get("password", "")).strip()
                        if len(pwd) == 9 and pwd.isdigit():
                            mgr.set_target_password(pwd)
                    await mgr.broadcast_telemetry()
                except Exception as ex:
                    logger.warning(f"WS error: {ex}")
            elif msg.type == WSMsgType.ERROR:
                logger.warning(f"WS exception: {ws.exception()}")
    finally:
        mgr._ws_clients.discard(ws)
    return ws


def create_app():
    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_get("/report", handle_report)
    app.router.add_get("/admin", handle_admin)
    app.router.add_post("/api/login", api_login)
    app.router.add_post("/api/admin/set-password", api_admin_set_password)
    app.router.add_get("/api/status", api_get_status)
    app.router.add_post("/api/benchmark/start", api_race_start)
    app.router.add_post("/api/benchmark/stop", api_race_stop)
    app.router.add_post("/api/benchmark/reset", api_race_reset)
    app.router.add_get("/ws/telemetry", websocket_handler)
    app.router.add_static("/static/", path=STATIC_DIR, name="static")
    return app


if __name__ == "__main__":
    port = 8000
    print(f"============================================================")
    print(f" Windows Login Simulation & Dual Benchmark Racing")
    print(f" Brute Force vs Jev Model")
    print(f"============================================================")
    print(f" Main App UI         : http://localhost:{port}/")
    print(f" Separate Admin UI   : http://localhost:{port}/admin")
    print(f" Benchmark Target    : 9 characters (numbers only: 0-9)")
    print(f" Hive Systems Table  : 2 Hours baseline (1,000,000,000 search space)")
    print(f"============================================================")
    app = create_app()
    web.run_app(app, host="0.0.0.0", port=port)
