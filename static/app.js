/**
 * app.js - Dual Window Controller: Brute Force vs Jev Model
 */
document.addEventListener("DOMContentLoaded", () => {
    // --- Elements: Password Controller ---
    const targetPwdInput = document.getElementById("target-pwd-input");
    const targetCharCounter = document.getElementById("target-char-counter");
    const btnApplyPwd = document.getElementById("btn-apply-pwd");
    const presetRandom = document.getElementById("preset-random");
    const presetDate = document.getElementById("preset-date");
    const presetSeq = document.getElementById("preset-seq");
    const presetNumpad = document.getElementById("preset-numpad");

    // --- Elements: Global Race Controls ---
    const speedVisual = document.getElementById("speed-visual");
    const speedTurbo = document.getElementById("speed-turbo");
    const btnRaceStart = document.getElementById("btn-race-start");
    const btnRaceStop = document.getElementById("btn-race-stop");
    const btnRaceReset = document.getElementById("btn-race-reset");

    // --- Elements: Brute Force Monitor Frame ---
    const frameBrute = document.getElementById("frame-brute");
    const statusBrute = document.getElementById("status-brute");
    const inputBrute = document.getElementById("input-brute");
    const dialogBrute = document.getElementById("dialog-brute");
    const winnerBrute = document.getElementById("winner-brute");
    const triesBrute = document.getElementById("tries-brute");
    const timeBrute = document.getElementById("time-brute");
    const rateBrute = document.getElementById("rate-brute");

    // --- Elements: Jev Model Monitor Frame ---
    const frameJev = document.getElementById("frame-jev");
    const statusJev = document.getElementById("status-jev");
    const inputJev = document.getElementById("input-jev");
    const dialogJev = document.getElementById("dialog-jev");
    const winnerJev = document.getElementById("winner-jev");
    const triesJev = document.getElementById("tries-jev");
    const timeJev = document.getElementById("time-jev");
    const rateJev = document.getElementById("rate-jev");

    // --- Elements: Modal ---
    const raceWinnerModal = document.getElementById("race-winner-modal");
    const modalWinnerTitle = document.getElementById("modal-winner-title");
    const modalWinnerSub = document.getElementById("modal-winner-sub");
    const tableStatusBrute = document.getElementById("table-status-brute");
    const tableStatusJev = document.getElementById("table-status-jev");
    const tableTriesBrute = document.getElementById("table-tries-brute");
    const tableTriesJev = document.getElementById("table-tries-jev");
    const tableTimeBrute = document.getElementById("table-time-brute");
    const tableTimeJev = document.getElementById("table-time-jev");
    const tableRateBrute = document.getElementById("table-rate-brute");
    const tableRateJev = document.getElementById("table-rate-jev");
    const modalCloseBtn = document.getElementById("modal-close-btn");

    // Internal State
    let currentSpeedMode = "visual";
    let ws = null;
    let hasAlertedWinner = false;

    // --- Custom Password Input Logic ---
    function updateCharCounter() {
        targetPwdInput.value = targetPwdInput.value.replace(/\D/g, "").slice(0, 9);
        const len = targetPwdInput.value.length;
        targetCharCounter.textContent = `${len}/9`;
        targetCharCounter.style.color = len === 9 ? "#74f59c" : "#8ae8ff";
    }

    targetPwdInput.addEventListener("input", updateCharCounter);

    async function applyPassword(pwd) {
        if (pwd.length !== 9 || !/^\d{9}$/.test(pwd)) {
            alert("Password must be exactly 9 numeric digits (0-9).");
            return;
        }

        try {
            const resp = await fetch("/api/admin/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: pwd })
            });
            const data = await resp.json();
            if (data.success) {
                resetVisuals();
                btnApplyPwd.textContent = "✓ Saved!";
                btnApplyPwd.style.background = "#107c41";
                setTimeout(() => {
                    btnApplyPwd.textContent = "✓ Set PIN";
                    btnApplyPwd.style.background = "#0078d4";
                }, 1500);
            }
        } catch (err) {
            alert("Error setting password: " + err.message);
        }
    }

    btnApplyPwd.addEventListener("click", () => {
        applyPassword(targetPwdInput.value.trim());
    });

    targetPwdInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            applyPassword(targetPwdInput.value.trim());
        }
    });

    // Preset Handlers
    presetRandom.addEventListener("click", () => {
        let p = "";
        for (let i = 0; i < 9; i++) p += Math.floor(Math.random() * 10);
        targetPwdInput.value = p;
        updateCharCounter();
        applyPassword(p);
    });

    presetDate.addEventListener("click", () => {
        targetPwdInput.value = "199805121";
        updateCharCounter();
        applyPassword("199805121");
    });

    presetSeq.addEventListener("click", () => {
        targetPwdInput.value = "123456789";
        updateCharCounter();
        applyPassword("123456789");
    });

    presetNumpad.addEventListener("click", () => {
        targetPwdInput.value = "147258369";
        updateCharCounter();
        applyPassword("147258369");
    });

    // --- Speed Mode Controls ---
    speedVisual.addEventListener("click", () => {
        currentSpeedMode = "visual";
        speedVisual.classList.add("active");
        speedTurbo.classList.remove("active");
    });

    speedTurbo.addEventListener("click", () => {
        currentSpeedMode = "turbo";
        speedTurbo.classList.add("active");
        speedVisual.classList.remove("active");
    });

    // --- Global Race Actions ---
    btnRaceStart.addEventListener("click", () => {
        resetVisuals();
        hasAlertedWinner = false;
        sendWsAction("start", {
            speed_mode: currentSpeedMode,
            visual_delay_ms: 120
        });
    });

    btnRaceStop.addEventListener("click", () => {
        sendWsAction("stop", {});
    });

    btnRaceReset.addEventListener("click", () => {
        sendWsAction("reset", {});
        resetVisuals();
    });

    modalCloseBtn.addEventListener("click", () => {
        raceWinnerModal.classList.remove("active");
    });

    function resetVisuals() {
        frameBrute.classList.remove("winner", "loser");
        frameJev.classList.remove("winner", "loser");
        dialogBrute.classList.remove("active");
        dialogJev.classList.remove("active");
        winnerBrute.classList.remove("active");
        winnerJev.classList.remove("active");
        statusBrute.textContent = "Ready (000000000 →)";
        statusBrute.className = "monitor-status-pill";
        statusJev.textContent = "Ready (Priors + Stratified)";
        statusJev.className = "monitor-status-pill";
        inputBrute.value = "";
        inputJev.value = "";
        triesBrute.textContent = "0";
        triesJev.textContent = "0";
        timeBrute.textContent = "00:00:00.0";
        timeJev.textContent = "00:00:00.0";
        rateBrute.textContent = "0 /s";
        rateJev.textContent = "0 /s";
        raceWinnerModal.classList.remove("active");
    }

    // --- WebSocket Telemetry & Sync ---
    function initWebSocket() {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${proto}//${window.location.host}/ws/telemetry`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("Dual race telemetry connected.");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                renderDualTelemetry(data);
            } catch (err) {
                console.error("Parse error:", err);
            }
        };

        ws.onclose = () => {
            setTimeout(initWebSocket, 1500);
        };
    }

    function sendWsAction(action, payload) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action, ...payload }));
        } else {
            fetch(`/api/benchmark/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }
    }

    function formatTime(sec) {
        const mins = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 10);
        return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ms}`;
    }

    function renderDualTelemetry(data) {
        const brute = data.brute;
        const jev = data.jev;

        // Render Brute Force
        triesBrute.textContent = brute.tries_count.toLocaleString();
        timeBrute.textContent = formatTime(brute.elapsed_seconds);
        rateBrute.textContent = `${Math.round(brute.rate_per_sec).toLocaleString()} /s`;
        if (brute.last_attempt) {
            inputBrute.value = brute.last_attempt;
        }

        // Render Jev
        triesJev.textContent = jev.tries_count.toLocaleString();
        timeJev.textContent = formatTime(jev.elapsed_seconds);
        rateJev.textContent = `${Math.round(jev.rate_per_sec).toLocaleString()} /s`;
        if (jev.last_attempt) {
            inputJev.value = jev.last_attempt;
        }

        // Visual mode failure screen handling
        if (data.is_racing && data.speed_mode === "visual") {
            if (brute.last_status === "failed") {
                dialogBrute.classList.add("active");
                setTimeout(() => dialogBrute.classList.remove("active"), 80);
            }
            if (jev.last_status === "failed") {
                dialogJev.classList.add("active");
                setTimeout(() => dialogJev.classList.remove("active"), 80);
            }
        }

        // Winner handling
        if (data.winner && !hasAlertedWinner) {
            hasAlertedWinner = true;
            if (window.winAudio) window.winAudio.playSuccessChime();

            if (data.winner === "jev_calibrated") {
                frameJev.classList.add("winner");
                frameBrute.classList.add("loser");
                winnerJev.classList.add("active");
                statusJev.textContent = "🏆 WINNER (Cracked!)";
                statusJev.classList.add("cracked");
                statusBrute.textContent = "Second Place";
                showWinnerModal("Jev Calibrated Model", brute, jev);
            } else {
                frameBrute.classList.add("winner");
                frameJev.classList.add("loser");
                winnerBrute.classList.add("active");
                statusBrute.textContent = "🏆 WINNER (Cracked!)";
                statusBrute.classList.add("cracked");
                statusJev.textContent = "Second Place";
                showWinnerModal("Sequential Brute Force", brute, jev);
            }
        }
    }

    function showWinnerModal(winnerName, brute, jev) {
        modalWinnerTitle.textContent = `🏁 ${winnerName} WON!`;
        if (winnerName.includes("Jev")) {
            const speedup = brute.tries_count > 0 ? (brute.tries_count / Math.max(jev.tries_count, 1)).toFixed(1) : "Huge";
            modalWinnerSub.textContent = `Jev Calibrated Model solved the PIN in ${jev.elapsed_seconds.toFixed(2)}s (${jev.tries_count.toLocaleString()} tries), beating standard sequential brute force!`;
        } else {
            modalWinnerSub.textContent = `Sequential Brute Force hit the target first.`;
        }

        tableStatusBrute.textContent = brute.is_cracked ? "Cracked ✓" : "Stopped";
        tableStatusJev.textContent = jev.is_cracked ? "Cracked ✓" : "Stopped";
        tableTriesBrute.textContent = brute.tries_count.toLocaleString();
        tableTriesJev.textContent = jev.tries_count.toLocaleString();
        tableTimeBrute.textContent = `${brute.elapsed_seconds.toFixed(2)}s`;
        tableTimeJev.textContent = `${jev.elapsed_seconds.toFixed(2)}s`;
        tableRateBrute.textContent = `${Math.round(brute.rate_per_sec).toLocaleString()} /s`;
        tableRateJev.textContent = `${Math.round(jev.rate_per_sec).toLocaleString()} /s`;

        raceWinnerModal.classList.add("active");
    }

    updateCharCounter();
    initWebSocket();
});
