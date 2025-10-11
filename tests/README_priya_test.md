# Priya Test Scenario Implementation

This directory contains the test implementation for Priya (The Ambitious Achiever) scenario based on the specification in `05c-scenario-priya-test-spec.md`.

## Files

- **`test_priya_scenario.py`** - Main test implementation with comprehensive assertions
- **`run_priya_test.py`** - Simple test runner script for demonstration
- **`README_priya_test.md`** - This documentation file

## Test Overview

The Priya test scenario verifies that the Helios Engine correctly generates a study plan for Priya (The Ambitious Achiever) with her specific characteristics:

- **Very weak** in Economy and Ethics
- **55 hours per week** study time
- **Weak subjects first** approach
- **One GS + Optional** focus

## Expected Results

Based on the mock CMS service data and Priya's characteristics:

### Study Plan Details
- **First Block**: Ethics + Economy
- **Duration**: 5 weeks
- **Daily Study Time**: 282 minutes
- **Daily Revision Time**: 94 minutes
- **Daily Practice Time**: 94 minutes

### Curated Resources
- **Ethics**: ["Lexicon Ethics", "Case Studies", "PYKs (Ethics)"]
- **Economy**: ["Sriram Economy Notes", "NCERT Economy", "PYQs (Economy)"]

### Calculations
- **Ethics**: 80 hours × 1.25 (very weak adjustment) = 100 hours
- **Economy**: 110 hours × 1.25 (very weak adjustment) = 137.5 hours
- **Total**: 237.5 hours
- **Duration**: 237.5 ÷ 55 hours/week = 4.31 → ceil(4.31) = 5 weeks
- **Daily Study**: 55 hours/week × 60% ÷ 7 days × 60 minutes = 282 minutes

## Running the Tests

### Option 1: Using pytest (Recommended)

```bash
# Run from project root
python -m pytest tests/test_priya_scenario.py -v

# Run specific test method
python -m pytest tests/test_priya_scenario.py::TestPriyaScenario::test_generate_plan_for_priya -v
```

### Option 2: Using the Test Runner Script

```bash
# Run from project root
python tests/run_priya_test.py
```

### Option 3: Running Individual Test Methods

```python
import asyncio
from tests.test_priya_scenario import TestPriyaScenario

# Create test instance
test = TestPriyaScenario()
mock_cms = test.mock_cms_service()
engine = test.helios_engine(mock_cms)
wizard_data = test.priya_wizard_data()

# Run specific test
asyncio.run(test.test_generate_plan_for_priya(engine, wizard_data))
```

## Test Structure

The test implementation includes:

### 1. Main Test Method
- **`test_generate_plan_for_priya`**: Comprehensive test that verifies all aspects of Priya's study plan

### 2. Verification Methods
- **`_verify_top_level_plan_assertions`**: Verifies plan structure and basic properties
- **`_verify_first_block_assertions`**: Verifies first block subjects and duration
- **`_verify_weekly_plan_assertions`**: Verifies weekly plan structure
- **`_verify_daily_plan_and_task_assertions`**: Verifies daily tasks and durations
- **`_verify_curated_resources_assertions`**: Verifies curated resources from mock service

### 3. Additional Test Methods
- **`test_priya_calculations_verification`**: Verifies mathematical calculations
- **`test_priya_mock_service_integration`**: Verifies mock service integration

## Test Assertions

The test verifies all assertions from the specification:

### Top-Level Plan Assertions
- Plan object exists and has correct title
- Curated resources are present for Ethics and Economy
- Plan contains at least one study block

### First Block Assertions
- First block contains Ethics and Economy subjects
- Block duration is exactly 5 weeks
- Block has a detailed weekly plan

### Weekly Plan Assertions
- Plan is for week 1
- Contains exactly 7 daily plans

### Daily Plan and Task Assertions
- Each day has exactly 3 tasks (Study, Revision, Practice)
- Study task: 282 minutes
- Revision task: 94 minutes
- Practice task: 94 minutes

### Curated Resources Assertions
- Ethics resources match mock service data exactly
- Economy resources match mock service data exactly
- Resource counts are correct (3 each)

## Mock Service Integration

The test uses the `MockCMSService` to provide consistent, predictable data:

```python
from src.helios import HeliosEngine, MockCMSService

# Create mock service
mock_cms = MockCMSService()

# Create engine with mock service
engine = HeliosEngine(cms_service=mock_cms)
```

This ensures:
- **Deterministic results** across test runs
- **No external dependencies** on real CMS
- **Consistent test data** that matches specifications
- **Fast execution** without network calls

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Ensure src directory is in Python path
   export PYTHONPATH="${PYTHONPATH}:$(pwd)/src"
   ```

2. **Missing Dependencies**
   ```bash
   # Install required packages
   pip install pytest pydantic
   ```

3. **Async/Await Issues**
   - Ensure using `pytest.mark.asyncio` decorator
   - Use `asyncio.run()` for running async tests

### Debugging

To debug test failures:

```python
# Add debug prints
print(f"Study plan: {study_plan}")
print(f"First block: {first_block}")
print(f"Daily tasks: {daily_plan.tasks}")
```

## Integration with CI/CD

The test can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Priya Test
  run: |
    python -m pytest tests/test_priya_scenario.py -v --tb=short
```

## Contributing

When modifying the test:

1. **Update assertions** if mock service data changes
2. **Verify calculations** match specification exactly
3. **Test with mock service** to ensure consistency
4. **Update documentation** if test structure changes

## Related Files

- **Specification**: `mentorship-notes/05c-scenario-priya-test-spec.md`
- **Mock Service**: `src/helios/mock/mock_cms_service.py`
- **Engine**: `src/helios/engine.py`
- **Models**: `src/helios/models.py`
