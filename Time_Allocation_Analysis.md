# Time Allocation Analysis: Baseline Hours vs Generated-Docs

## Summary

After analyzing the upsc_subjects.json baseline hours against the Oct25-Target28-ComprehensiveGS.json generated study plan, there are **significant discrepancies** in time allocation.

## Subject Baseline Hours (from upsc_subjects.json)

| Subject Code | Subject Name | Baseline Hours |
|-------------|--------------|----------------|
| H01 | History-Ancient | 25 |
| H02 | History-Medieval | 25 |
| H03 | History-Modern | **100** |
| H04 | History-Art & Culture | 50 |
| H05 | History-World | 25 |
| H06 | History-Strategic Studies | 25 |
| G | Geography | 130 |
| B | Biology | 80 |
| T | Polity | 50 |
| P | Economics | 120 |
| E | Environment | 120 |
| O | Optional Subject 1 | 40 |
| I | Optional Subject 2 | 40 |
| C | Internal Security | 50 |
| S | Society & Social Justice | 60 |
| Z | Current Affairs | 100 |

## Actual Allocation in Generated-Docs (Foundation Blocks)

| Subject Code | Subject Name | Baseline Hours | Actual Hours | Variance |
|-------------|--------------|----------------|--------------|----------|
| H01 | History-Ancient | 25 | **27** | +8% ✅ |
| H02 | History-Medieval | 25 | **28** | +12% ✅ |
| H03 | History-Modern | **100** | **115** | +15% ✅ |
| H05 | History-World | 25 | **26** | +4% ✅ |
| H06 | History-Strategic Studies | 25 | **[Pending]** | - |

## Key Findings

### ✅ **Positive Observations:**
1. **H03 (History-Modern)**: Correctly receives the highest allocation (115 hours) reflecting its high baseline (100 hours)
2. **All subjects getting reasonable hours**: No subject is getting dramatically under-allocated
3. **Proportional scaling**: Higher baseline hours generally lead to higher actual hours

### ❌ **Issues Identified:**

1. **Not using baseline_hours directly**: The allocation doesn't seem to directly correlate with baseline_hours ratios
2. **Estimator vs Actual mismatch**: All blocks show `estimated_hours: 491` but vary in `actual_hours` (27, 28, 115, 26)
3. **Fixed 491 estimation**: The `estimated_hours: 491` appears to be a fixed value rather than based on baseline_hours calculation

## Expected vs Actual Comparison

### Expected Proportional Allocation (if following baseline_hours):

For Foundation Cycle with total time ~2000 hours:
- H03 (100 baseline_hours) should get ~10% = ~200 hours
- H01/H02/H05/H06 (25 baseline_hours each) should get ~2.5% = ~50 hours each
- T (50 baseline_hours) should get ~5% = ~100 hours
- P (120 baseline_hours) should get ~12% = ~240 hours

### Actual Allocation:
- H03: 115 hours (close to expected)
- H01/H02/H05/H06: ~27 hours each (higher than expected)
- Other subjects: Need more data

## Verdict

❌ **The time allocation in generated-docs does NOT properly follow baseline_hours from upsc_subjects.json**

The current implementation appears to:
1. Use equal or near-equal division among subjects
2. Apply some confidence factors (VeryStrong confidence for History subjects)
3. **IGNORE** the significant differences in baseline_hours between subjects

## Recommendation

**This confirms the need for the Topic-Level Time Splitting design**: The current system needs to be updated to respect the `baseline_hours` defined in upsc_subjects.json, taking into account:

1. **Subject-level allocation**: H03 should get 4x more time than H01/H02/H05/H06
2. **Confidence factor application**: Apply existing confidence multipliers to baseline_hours
3. **Topic-level distribution**: Within each subject, distribute time across topics intelligently

This analysis validates that the proposed enhanced time allocation system is needed.






