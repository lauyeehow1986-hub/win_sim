/**
 * app.js - Dual Window Controller: Brute Force vs Jev Model
 * Supports both Live Python WebSocket backend and Standalone Browser (GitHub Pages).
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
    let isConnectedWs = false;
    let isClientMode = false;
    let hasAlertedWinner = false;
    let localSecret = "199805121";
    let clientTimer = null;
    let clientStart = 0;
    let clientTriesBrute = 0;
    let clientTriesJev = 0;

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

        localSecret = pwd;

        if (isConnectedWs) {
            try {
                const resp = await fetch("/api/admin/set-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: pwd })
                });
                await resp.json();
            } catch (e) {}
        }

        resetVisuals();
        btnApplyPwd.textContent = "✓ Saved!";
        btnApplyPwd.style.background = "#107c41";
        setTimeout(() => {
            btnApplyPwd.textContent = "✓ Set PIN";
            btnApplyPwd.style.background = "#0078d4";
        }, 1200);
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

        if (isConnectedWs) {
            sendWsAction("start", {
                speed_mode: currentSpeedMode,
                visual_delay_ms: 120
            });
        } else {
            startClientSideRace();
        }
    });

    btnRaceStop.addEventListener("click", () => {
        if (isConnectedWs) {
            sendWsAction("stop", {});
        } else {
            stopClientSideRace();
        }
    });

    btnRaceReset.addEventListener("click", () => {
        if (isConnectedWs) {
            sendWsAction("reset", {});
        } else {
            stopClientSideRace();
        }
        resetVisuals();
    });

    modalCloseBtn.addEventListener("click", () => {
        raceWinnerModal.classList.remove("active");
    });

    // Mobile View Tab Switcher
    const tabBoth = document.getElementById("tab-both");
    const tabToggle = document.getElementById("tab-toggle");
    const dualViewport = document.getElementById("dual-viewport");

    if (tabBoth && tabToggle && dualViewport) {
        let currentMobileTab = "both";
        tabBoth.addEventListener("click", () => {
            currentMobileTab = "both";
            dualViewport.classList.remove("tab-brute", "tab-jev");
            tabBoth.classList.add("active");
            tabToggle.classList.remove("active");
            tabToggle.textContent = "Toggle Focus ⇄";
        });

        tabToggle.addEventListener("click", () => {
            if (currentMobileTab === "both" || currentMobileTab === "jev") {
                currentMobileTab = "brute";
                dualViewport.classList.add("tab-brute");
                dualViewport.classList.remove("tab-jev");
                tabToggle.textContent = "Focus: Brute Force";
            } else {
                currentMobileTab = "jev";
                dualViewport.classList.add("tab-jev");
                dualViewport.classList.remove("tab-brute");
                tabToggle.textContent = "Focus: Jev Model";
            }
            tabBoth.classList.remove("active");
            tabToggle.classList.add("active");
        });
    }

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

    // --- CLIENT-SIDE ENGINE (FOR GITHUB PAGES STANDALONE RUNTIME) ---
    function startClientSideRace() {
        stopClientSideRace();
        clientStart = performance.now();
        clientTriesBrute = 0;
        clientTriesJev = 0;

        const target = targetPwdInput.value.trim();
        const targetInt = parseInt(target, 10);

        // Calculate expected indices
        // Sequential brute: targetInt + 1
        const bruteTotalTries = targetInt + 1;

        // Jev priors:
        let jevTotalTries = 500000000;
        const priors = [
            "123456789", "987654321", "012345678", "876543210",
            "111111111", "000000000", "222222222", "333333333",
            "147258369", "369258147", "789456123", "321654987"
        ];
        const pIdx = priors.indexOf(target);
        if (pIdx !== -1) {
            jevTotalTries = pIdx + 1;
        } else if (/^(19[6-9]\d|20[0-2]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d$/.test(target)) {
            // Calendar pattern
            const yr = parseInt(target.slice(0, 4), 10) - 1960;
            const mo = parseInt(target.slice(4, 6), 10) - 1;
            const da = parseInt(target.slice(6, 8), 10) - 1;
            const last = parseInt(target.slice(8, 9), 10);
            jevTotalTries = 928 + (yr * 12 * 31 * 10) + (mo * 31 * 10) + (da * 10) + last;
        } else {
            // Weyl stride
            const MOD = 1000000000;
            const INV = 699999999;
            const CURR_0 = 123456789;
            const weyl = (BigInt(targetInt - CURR_0) * BigInt(INV)) % BigInt(MOD);
            const pos = Number((weyl + BigInt(MOD)) % BigInt(MOD));
            jevTotalTries = 287401 + pos;
        }

        const isVisual = currentSpeedMode === "visual";
        const stepRate = isVisual ? 8 : 45000;
        const tickInterval = isVisual ? 120 : 35;

        clientTimer = setInterval(() => {
            const now = performance.now();
            const elapsedSec = (now - clientStart) / 1000;

            clientTriesBrute = Math.min(bruteTotalTries, clientTriesBrute + (isVisual ? 1 : 12500));
            clientTriesJev = Math.min(jevTotalTries, clientTriesJev + (isVisual ? 1 : 12500));

            // Generate representative guess strings
            const bruteGuess = isVisual ? String(clientTriesBrute - 1).padStart(9, "0") : String(clientTriesBrute).padStart(9, "0");
            const jevGuess = (clientTriesJev >= jevTotalTries) ? target : String((clientTriesJev * 299999999) % 1000000000).padStart(9, "0");

            renderDualTelemetry({
                is_racing: true,
                speed_mode: currentSpeedMode,
                winner: (clientTriesJev >= jevTotalTries && clientTriesJev < clientTriesBrute) ? "jev_calibrated" :
                        (clientTriesBrute >= bruteTotalTries && clientTriesBrute < clientTriesJev) ? "sequential_brute" : null,
                brute: {
                    tries_count: clientTriesBrute,
                    elapsed_seconds: elapsedSec,
                    rate_per_sec: clientTriesBrute / Math.max(elapsedSec, 0.001),
                    last_attempt: (clientTriesBrute >= bruteTotalTries) ? target : bruteGuess,
                    last_status: (clientTriesBrute >= bruteTotalTries) ? "cracked" : "failed",
                    is_cracked: clientTriesBrute >= bruteTotalTries
                },
                jev: {
                    tries_count: clientTriesJev,
                    elapsed_seconds: elapsedSec,
                    rate_per_sec: clientTriesJev / Math.max(elapsedSec, 0.001),
                    last_attempt: (clientTriesJev >= jevTotalTries) ? target : jevGuess,
                    last_status: (clientTriesJev >= jevTotalTries) ? "cracked" : "failed",
                    is_cracked: clientTriesJev >= jevTotalTries
                }
            });

            if (clientTriesJev >= jevTotalTries || clientTriesBrute >= bruteTotalTries) {
                stopClientSideRace();
            }
        }, tickInterval);
    }

    function stopClientSideRace() {
        if (clientTimer) {
            clearInterval(clientTimer);
            clientTimer = null;
        }
    }

    // --- WebSocket Telemetry & Sync ---
    function initWebSocket() {
        if (window.location.protocol === "file:") {
            isClientMode = true;
            return;
        }

        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${proto}//${window.location.host}/ws/telemetry`;

        try {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                isConnectedWs = true;
                console.log("WebSocket backend connected.");
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    renderDualTelemetry(data);
                } catch (err) {}
            };

            ws.onerror = () => {
                isClientMode = true;
            };

            ws.onclose = () => {
                isConnectedWs = false;
            };
        } catch (e) {
            isClientMode = true;
        }
    }

    function sendWsAction(action, payload) {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action, ...payload }));
        } else {
            fetch(`/api/benchmark/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(() => {});
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
