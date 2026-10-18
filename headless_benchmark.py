"""
headless_benchmark.py - Headless 1,000-Run Benchmark: Brute Force vs. Jev Model.
"""

import sys
import time
import json
import random
import math
from typing import Dict, Any, List

MOD = 1_000_000_000
STRIDE = 299999999
INV = 699999999
CURR_0 = 123456789
HIVE_RATE = 1_000_000_000 / 7200.0  # 138,888.888... tries per second


def build_jev_prior_dict() -> Dict[int, int]:
    """
    Builds an exact index mapping for Jev's System 1 prioritized candidates (Tiers 1-4).
    Returns mapping from integer password value to 1-based attempt index.
    """
    priors = {}
    idx = 1
    seen = set()

    def add_cand(cand_str: str):
        nonlocal idx
        if len(cand_str) == 9 and cand_str.isdigit():
            val = int(cand_str)
            if val not in seen:
                seen.add(val)
                priors[val] = idx
                idx += 1

    # Tier 1
    tier1 = [
        "123456789", "987654321", "012345678", "876543210",
        "111111111", "000000000", "222222222", "333333333",
        "444444444", "555555555", "666666666", "777777777",
        "888888888", "999999999", "121212121", "123123123",
        "000000001", "123456780", "999999990", "112233445"
    ]
    for p in tier1:
        add_cand(p)

    # Tier 2
    numpad_shapes = [
        "147258369", "369258147", "789456123", "321654987",
        "159357456", "753159258", "147852369", "963852741"
    ]
    for p in numpad_shapes:
        add_cand(p)

    for i in range(100, 1000):
        add_cand(f"{i:03d}" * 3)

    # Tier 3: Calendar Date / Year Combinations
    for year in range(1960, 2030):
        for month in range(1, 13):
            for day in range(1, 32):
                add_cand(f"0{year}{month:02d}{day:02d}")
                base = f"{year}{month:02d}{day:02d}"
                for last in range(10):
                    add_cand(f"{base}{last}")

    # Tier 4: Common Prefixes
    common_prefixes = ["09", "08", "07", "13", "18", "15", "88", "99", "12"]
    for pfx in common_prefixes:
        for seq in ["1234567", "0000000", "7654321", "1111111", "9876543"]:
            add_cand(pfx + seq)

    return priors


def get_jev_tries(target: int, priors: Dict[int, int], prior_count: int) -> int:
    """Calculates exact attempts needed by Jev model to find target."""
    if target in priors:
        return priors[target]
    
    # In Tier 5: determine position in Weyl coprime traversal
    weyl_pos = ((target - CURR_0) * INV) % MOD
    # The actual attempts is prior_count + weyl_pos
    return prior_count + weyl_pos + 1


def get_brute_tries(target: int) -> int:
    """Sequential brute force: tests 0..target -> target + 1 tries."""
    return target + 1


def run_benchmark(num_runs: int = 1000, seed: int = 42) -> Dict[str, Any]:
    print(f"Building Jev System-1 Calibrated Prior index...")
    t0 = time.perf_counter()
    priors = build_jev_prior_dict()
    prior_count = len(priors)
    t_index = time.perf_counter() - t0
    print(f"Index built with {prior_count:,} high-priority patterns in {t_index:.2f}s.")

    rng = random.Random(seed)
    # Generate 1,000 random 9-digit targets
    targets = [rng.randint(0, MOD - 1) for _ in range(num_runs)]

    results = []
    jev_wins = 0
    brute_wins = 0
    ties = 0

    brute_tries_list = []
    jev_tries_list = []

    print(f"Executing {num_runs} head-to-head matches...")
    t1 = time.perf_counter()

    for idx, target in enumerate(targets):
        b_tries = get_brute_tries(target)
        j_tries = get_jev_tries(target, priors, prior_count)

        brute_tries_list.append(b_tries)
        jev_tries_list.append(j_tries)

        b_time = b_tries / HIVE_RATE
        j_time = j_tries / HIVE_RATE

        if j_tries < b_tries:
            winner = "jev"
            jev_wins += 1
        elif b_tries < j_tries:
            winner = "brute"
            brute_wins += 1
        else:
            winner = "tie"
            ties += 1

        results.append({
            "run_id": idx + 1,
            "target": f"{target:09d}",
            "is_in_prior_tier": target in priors,
            "brute_tries": b_tries,
            "jev_tries": j_tries,
            "brute_time_s": b_time,
            "jev_time_s": j_time,
            "winner": winner,
            "tries_diff": b_tries - j_tries
        })

    total_bench_time = time.perf_counter() - t1

    # Statistical aggregations
    def get_stats(nums: List[int]) -> Dict[str, Any]:
        sorted_nums = sorted(nums)
        n = len(nums)
        mean_val = sum(nums) / n
        median_val = sorted_nums[n // 2]
        min_val = sorted_nums[0]
        max_val = sorted_nums[-1]
        variance = sum((x - mean_val) ** 2 for x in nums) / n
        std_val = math.sqrt(variance)
        return {
            "mean": mean_val,
            "median": median_val,
            "min": min_val,
            "max": max_val,
            "std": std_val,
            "p10": sorted_nums[int(n * 0.10)],
            "p25": sorted_nums[int(n * 0.25)],
            "p50": median_val,
            "p75": sorted_nums[int(n * 0.75)],
            "p90": sorted_nums[int(n * 0.90)],
            "p99": sorted_nums[int(n * 0.99)],
            "mean_time_s": mean_val / HIVE_RATE,
            "median_time_s": median_val / HIVE_RATE,
            "min_time_s": min_val / HIVE_RATE,
            "max_time_s": max_val / HIVE_RATE,
        }

    brute_stats = get_stats(brute_tries_list)
    jev_stats = get_stats(jev_tries_list)

    # Human Pattern Comparison Cohort (dates, sequential, numpad, phone)
    human_sample_passwords = [
        "123456789", "987654321", "111111111", "000000000",
        "147258369", "369258147", "199805121", "200112253",
        "198506140", "197409202", "202410185", "091234567",
        "081111111", "121212121", "456456456", "789789789"
    ]
    human_cohort_results = []
    for hp in human_sample_passwords:
        target_int = int(hp)
        b_t = get_brute_tries(target_int)
        j_t = get_jev_tries(target_int, priors, prior_count)
        human_cohort_results.append({
            "password": hp,
            "brute_tries": b_t,
            "jev_tries": j_t,
            "brute_time_s": b_t / HIVE_RATE,
            "jev_time_s": j_t / HIVE_RATE,
            "speedup_factor": round(b_t / max(j_t, 1), 1)
        })

    summary = {
        "metadata": {
            "total_runs": num_runs,
            "seed": seed,
            "password_length": 9,
            "charset": "Numbers only (0-9)",
            "search_space": MOD,
            "hive_reported_hours": 2.0,
            "hive_reported_rate_tries_per_s": round(HIVE_RATE, 2),
            "benchmark_execution_wall_time_s": round(total_bench_time, 4)
        },
        "head_to_head": {
            "jev_wins": jev_wins,
            "brute_wins": brute_wins,
            "ties": ties,
            "jev_win_rate_percent": round(jev_wins / num_runs * 100, 2),
            "brute_win_rate_percent": round(brute_wins / num_runs * 100, 2)
        },
        "brute_force_stats": brute_stats,
        "jev_model_stats": jev_stats,
        "human_pattern_cohort": human_cohort_results,
        "runs": results
    }

    return summary


if __name__ == "__main__":
    summary = run_benchmark(num_runs=1000, seed=42)
    with open("headless_results.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 60)
    print(" HEAD-TO-HEAD BENCHMARK COMPLETE (1,000 RUNS)")
    print("=" * 60)
    print(f" Jev Model Wins     : {summary['head_to_head']['jev_wins']} ({summary['head_to_head']['jev_win_rate_percent']}%)")
    print(f" Brute Force Wins   : {summary['head_to_head']['brute_wins']} ({summary['head_to_head']['brute_win_rate_percent']}%)")
    print(f" Ties               : {summary['head_to_head']['ties']}")
    print("-" * 60)
    print(f" Mean Tries (Jev)   : {summary['jev_model_stats']['mean']:,.0f} (~{summary['jev_model_stats']['mean_time_s'] / 60:.1f} min)")
    print(f" Mean Tries (Brute) : {summary['brute_force_stats']['mean']:,.0f} (~{summary['brute_force_stats']['mean_time_s'] / 60:.1f} min)")
    print(f" Fastest Jev Crack  : {summary['jev_model_stats']['min']:,} tries ({summary['jev_model_stats']['min_time_s']:.4f}s)")
    print("=" * 60)
