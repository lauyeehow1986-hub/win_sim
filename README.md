# Windows Login Screen Simulation & Dual Benchmark Racing
### Brute Force vs. Jev Model (Side-by-Side Split View)

A real-time, side-by-side Windows 11 simulated login race comparing **Sequential Brute Force** ($000000000 \to 999999999$) against a **Jev Calibrated Model** (System 1 probability-guided search) on 9-digit numeric PINs, benchmarked against the figures reported in [Hive Systems: "Are Your Passwords in the Green?"](https://www.hivesystems.com/blog/are-your-passwords-in-the-green).

---

## ⚡ Key Highlights

1. **Side-by-Side Dual Window Interface**:
   - **Left Screen**: Sequential Brute Force agent starting from $000000000$.
   - **Right Screen**: Jev Model evaluating calibrated human numeric distribution priors (dates, sequences, numpad walks, Markov transitions).
   - Both screens simulate Windows 11 login screens simultaneously, with independent user avatars, candidate inputs, failure dialogs, and live telemetry (attempts, elapsed time, tries/sec).
   - **Zero Lockout**: Both agents can retry continuously without device lockout.

2. **Set Your Own Password (Custom Target)**:
   - Input your own 9-digit PIN directly in the top controller bar or on the isolated `/admin` screen.
   - Quick presets available:
     - 🎲 **Random 9 Digits** (cryptographic pseudo-random)
     - 📅 **Date / Birthday** (e.g. `199805121`)
     - 🔢 **Sequential Human** (e.g. `123456789`)
     - 📱 **Numpad Geometric Walk** (e.g. `147258369`)

3. **Hive Systems Benchmark Baseline**:
   - Target: **9 Characters (Numbers only: `0-9`)** $\to 10^9 = 1,000,000,000$ combinations.
   - Hive Systems Reported Baseline: **2 Hours** (exhaustive brute force on multi-GPU clusters).

4. **Visual UI vs. Turbo Speed Modes**:
   - **Visual Mode**: Paced with realistic typing, submit animations, and Windows "The password is incorrect. Try again." failure dialogs.
   - **Turbo Mode**: Runs both algorithms at full hardware throughput (150,000+ tries/sec) to benchmark millions of combinations in seconds.

## 🌐 GitHub Pages Live Demo & Benchmark Report

- **Live Dual Simulator**: [https://lauyeehow1986-hub.github.io/win_sim/](https://lauyeehow1986-hub.github.io/win_sim/)
- **Interactive 1,000-Run Report**: [https://lauyeehow1986-hub.github.io/win_sim/report.html](https://lauyeehow1986-hub.github.io/win_sim/report.html)
- **Raw Markdown Report**: [`headless_benchmark_report.md`](headless_benchmark_report.md)
- **Target Password Admin Setup**: [https://lauyeehow1986-hub.github.io/win_sim/admin.html](https://lauyeehow1986-hub.github.io/win_sim/admin.html)

---

## 🚀 Quick Start (Local)

1. Ensure Python 3.10+ is installed.
2. Launch the local server:
   ```powershell
   python server.py
   # Or double-click run.bat
   ```
3. Open [`http://localhost:8000/`](http://localhost:8000/) in your browser.
4. Type any custom 9-digit password in the top **Target PIN** box (or click one of the presets) and click **✓ Set PIN**.
5. Select **Visual UI** or **Turbo Speed**, and click **▶ Start Dual Race**!
6. View the benchmark report at [`http://localhost:8000/report`](http://localhost:8000/report).

---

## ⚙️ Enabling GitHub Pages

To activate the GitHub Pages URL on your repository:
1. Go to your repository on GitHub: [https://github.com/lauyeehow1986-hub/win_sim](https://github.com/lauyeehow1986-hub/win_sim)
2. Click **Settings** (gear icon) > **Pages** (under Code and automation in the left sidebar).
3. Under **Build and deployment** > **Source**, select **Deploy from a branch**.
4. Under **Branch**, select `main` and folder `/ (root)`, then click **Save**.
5. Within 1–2 minutes, GitHub will deploy your site to:
   **`https://lauyeehow1986-hub.github.io/win_sim/`**

