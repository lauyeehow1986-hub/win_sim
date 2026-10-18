/**
 * admin.js - Controller for Isolated Target Password Setup.
 */
document.addEventListener("DOMContentLoaded", () => {
    const passwordInput = document.getElementById("password-input");
    const charCounter = document.getElementById("char-counter");
    const adminForm = document.getElementById("admin-form");
    const statusMsg = document.getElementById("status-msg");
    const presetBtns = document.querySelectorAll(".preset-btn");

    function updateCounter() {
        // Enforce digits only
        passwordInput.value = passwordInput.value.replace(/\D/g, "").slice(0, 9);
        const len = passwordInput.value.length;
        charCounter.textContent = `${len} / 9`;
        charCounter.style.color = len === 9 ? "#74f59c" : "#9aa7b5";
    }

    passwordInput.addEventListener("input", updateCounter);

    // Preset handlers
    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const pinType = btn.getAttribute("data-pin");
            if (pinType === "RANDOM") {
                // Generate secure random 9-digit number
                let randomPin = "";
                for (let i = 0; i < 9; i++) {
                    randomPin += Math.floor(Math.random() * 10).toString();
                }
                passwordInput.value = randomPin;
            } else {
                passwordInput.value = pinType;
            }
            updateCounter();
        });
    });

    // Form submit
    adminForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const pwd = passwordInput.value.trim();
        if (pwd.length !== 9 || !/^\d{9}$/.test(pwd)) {
            showStatus("Error: Target password must be exactly 9 numeric digits (0-9).", false);
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
                showStatus(`✓ Success: Secret password updated in memory. Benchmark reset to 0 tries.`, true);
            } else {
                showStatus(`Error: ${data.error || "Failed to update"}`, false);
            }
        } catch (err) {
            showStatus(`Network Error: ${err.message}`, false);
        }
    });

    function showStatus(text, isSuccess) {
        statusMsg.textContent = text;
        statusMsg.className = `status-msg ${isSuccess ? "success" : "error"}`;
        statusMsg.style.display = "block";
    }

    updateCounter();
});
