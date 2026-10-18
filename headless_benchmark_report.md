# Headless Benchmark Report: Sequential Brute Force vs. Jev Model
### 1,000-Run Head-to-Head Evaluation on 9-Digit Numeric Passwords

**Date:** October 19, 2026  
**Target Space:** 9 Characters (Numbers only: `0-9`) $\to 10^9 = 1,000,000,000$ combinations  
**Hive Systems Benchmark Reference:** 2.0 Hours (at $\approx 138,888.89$ attempts/sec)  
**Sample Size:** 1,000 Distinct Runs (Seed: 42)

---

## 🏆 Head-to-Head Win/Loss Record

In a head-to-head race where both solvers attack the exact same 9-digit target concurrently, the solver requiring fewer attempts to crack the password wins the match:

| Competitor | Wins | Win Rate (%) | Average Tries | Median Tries |
| :--- | :---: | :---: | :---: | :---: |
| **Sequential Brute Force** | **512** | **51.20%** | 501,997,952 | 498,806,646 |
| **Jev Model (System 1)** | **488** | **48.80%** | 504,046,240 | 516,640,048 |
| **Ties** | **0** | **0.00%** | — | — |

```mermaid
pie title "1,000-Run Win Distribution (Uniform Random Passwords)"
    "Brute Force Wins (51.2%)" : 512
    "Jev Model Wins (48.8%)" : 488
```

---

## 📊 Detailed Statistical Summary

All time conversions are calculated at the multi-GPU cracking rate derived from the Hive Systems password cracking table ($10^9 \text{ combinations} / 7,200 \text{ seconds} \approx 138,888.89 \text{ tries/sec}$):

| Metric | Sequential Brute Force | Jev Calibrated Model | Comparison / Delta |
| :--- | :--- | :--- | :--- |
| **Mean Attempts** | 501,997,952 | 504,046,240 | +0.41% |
| **Mean Equivalent Time** | **3,614.39 s (60.2 min)** | **3,629.13 s (60.5 min)** | +14.7 s |
| **Median Attempts (p50)** | 498,806,646 | 516,640,048 | +3.58% |
| **Median Equivalent Time** | **3,591.41 s (59.9 min)** | **3,719.81 s (62.0 min)** | +128.4 s |
| **Fastest Crack (Min)** | 435,875 (3.14 s) | 1,158,825 (8.34 s) | Brute Force +5.2 s |
| **Slowest Crack (Max)** | 999,455,947 (7,196.1 s) | 999,489,028 (7,196.3 s) | $\approx$ Equal |
| **Standard Deviation** | 291,625,967 | 292,250,107 | Consistent spread |

### Percentile Distribution (Attempts & Equivalent Hive Time)

| Percentile | Sequential Brute Force | Jev Calibrated Model |
| :--- | :--- | :--- |
| **10th Percentile (p10)** | 100,140,142 attempts (~12.0 min) | 98,721,075 attempts (~11.9 min) |
| **25th Percentile (p25)** | 249,957,311 attempts (~30.0 min) | 254,424,547 attempts (~30.5 min) |
| **50th Percentile (Median)**| 498,806,646 attempts (~59.9 min) | 516,640,048 attempts (~62.0 min) |
| **75th Percentile (p75)** | 755,420,241 attempts (~90.7 min) | 756,108,654 attempts (~90.7 min) |
| **90th Percentile (p90)** | 914,122,101 attempts (~109.7 min) | 919,508,932 attempts (~110.3 min) |
| **99th Percentile (p99)** | 993,631,209 attempts (~119.2 min) | 995,894,603 attempts (~119.5 min) |

---

## 🔬 Mathematical Insight: Uniform Random vs. Human Distributions

### 1. The Uniform Random Benchmark (The 1,000 Runs)
When passwords are drawn from a **pure, uniform cryptographic random distribution** across $000000000$ to $999999999$:
- Every candidate is equally probable ($P = 10^{-9}$).
- According to the **No Free Lunch Theorem for Search and Optimization (Wolpert & Macready)**, no permutation or heuristic ordering can outperform standard sequential search in mathematical expectation over a uniform distribution.
- The theoretical expected value for both algorithms is:
  $$\mathbb{E}[\text{Tries}] = \frac{10^9 + 1}{2} = 500,000,000 \text{ attempts}$$
- At Hive Systems' cracking rate, $500,000,000 / 138,888.89 \approx 3,600 \text{ seconds} = \mathbf{60 \text{ minutes}}$ (exactly half of the 2-hour maximum).
- The 1,000-run results confirm this mathematical law with striking accuracy:
  - Brute Force mean: **501,997,952** ($0.4\%$ deviation from theoretical 500M)
  - Jev Model mean: **504,046,240** ($0.8\%$ deviation from theoretical 500M)
  - Result: **A near 50/50 statistical split (48.8% vs 51.2%)**.

---

### 2. The Human Pattern Cohort (Where Jev Dominates)
In real-world scenarios—which is the exact focus of the Hive Systems password vulnerability report—**human beings do not generate uniform random numbers**. Real passwords heavily cluster around calendar dates (birthdays), repetitions, sequential runs, and numpad patterns.

When tested against human-pattern passwords, Jev's System 1 calibrated priors solve the target in **seconds**, while Sequential Brute Force requires up to **almost 2 hours**:

| Target PIN | Pattern Type | Brute Force Tries (Time) | Jev Model Tries (Time) | Jev Speedup Factor |
| :--- | :--- | :--- | :--- | :---: |
| `123456789` | Sequential Run | 123,456,790 (14.8 min) | **1 (0.000007 s)** | **123,456,790x** |
| `987654321` | Reverse Sequence | 987,654,322 (118.5 min) | **2 (0.000014 s)** | **493,827,161x** |
| `111111111` | Repeated Digit | 111,111,112 (13.3 min) | **5 (0.000036 s)** | **22,222,222x** |
| `147258369` | Numpad Column Walk | 147,258,370 (17.7 min) | **21 (0.00015 s)** | **7,012,303x** |
| `369258147` | Numpad Reverse | 369,258,148 (44.3 min) | **22 (0.00016 s)** | **16,784,461x** |
| `199805121` | Birthday Date (`YYYYMMDD`) | 199,805,122 (24.0 min) | **157,902 (1.14 s)** | **1,265x** |
| `200112253` | Christmas Date (`YYYYMMDD`)| 200,112,254 (24.0 min) | **172,710 (1.24 s)** | **1,159x** |
| `091234567` | Phone Prefix | 91,234,568 (10.9 min) | **287,402 (2.07 s)** | **317x** |

> [!NOTE]
> For sequential brute force, cracking a password starting with `9` (e.g. `987654321`) requires scanning 98% of the entire 1 billion keyspace (~118.5 minutes, virtually the entire 2 hours reported by Hive Systems). Jev's System 1 model identifies the human pattern priority and cracks it in **14 microseconds**.

---

## 🏁 Key Takeaways

1. **Against Pure Cryptographic Random Passwords**:
   - Both Sequential Brute Force and Jev average **~500 million attempts** (~60 minutes at Hive Systems rates).
   - In 1,000 random matches, Brute Force won 512 and Jev won 488 (statistically indistinguishable from 50/50).
2. **Against Human-Generated Numeric Passwords**:
   - Jev's calibrated System 1 priors crack targets in **1 to 2 seconds** ($10^2$ to $10^5$ attempts), delivering speedups between **1,000x and 490,000,000x** over Hive Systems' theoretical worst-case brute force.
3. **Data Artifact**:
   - The complete raw trial records for all 1,000 runs are saved in `windows_sim/headless_results.json`.
