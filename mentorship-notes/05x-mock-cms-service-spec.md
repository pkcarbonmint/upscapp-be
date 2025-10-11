# Mock CMS Service Specification for Helios Engine Testing

This document specifies the mock CMS service that provides test data for the Helios Engine test scenarios. The mock service implements the interface expected by the Helios Engine while providing consistent, predictable data for testing.

## Overview

The mock CMS service replaces the real CMS service during testing to provide:
1. **Consistent test data** that matches the expected outputs in test specifications
2. **Predictable subject metadata** for reliable test assertions
3. **Isolated testing** without external dependencies
4. **Scenario-specific data** that validates the engine's logic

## Interface Requirements

The mock service must implement the following interface methods that the Helios Engine expects:

```python
class MockCMSService:
    async def get_list_of_subjects(self) -> List[str]
    async def get_metadata_for_subject(self, subject_name: str) -> SubjectMetadata | None
    async def get_mains_papers(self) -> Dict[str, List[Dict[str, Any]]]
    async def get_mains_subjects(self, paper_ids: List[int]) -> List[Dict[str, Any]]
    async def get_topics_ids(self, subject_id: int) -> List[int]
```

## Test Data Specification

### 1. Subject List

The mock service should return the following subjects that match the test scenarios:

```python
SUBJECTS = [
    "Polity", "Economy", "History", "Environment", "Ethics", "Essay",
    "Geography", "Science & Tech", "CSAT", "Current Affairs", 
    "International Relations", "Disaster Management", "Internal Security",
    "Agriculture", "Optional"
]
```

### 2. Subject Metadata

Each subject should have consistent metadata that matches the calculations in the test specifications:

```python
SUBJECT_METADATA = {
    "Polity": SubjectMetadata(
        subject="Polity",
        baseline_hours=100,
        resources=["Laxmikanth Polity", "NCERT Polity", "PYQs (Polity)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Constitution", "Parliament", "Judiciary"],
            medium=["Federalism", "Local Government"],
            peripheral=["Miscellaneous Bodies"],
        ),
    ),
    "Economy": SubjectMetadata(
        subject="Economy",
        baseline_hours=110,
        resources=["Sriram Economy Notes", "NCERT Economy", "PYQs (Economy)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Macroeconomics", "Fiscal Policy", "Monetary Policy"],
            medium=["Banking", "Insurance", "Taxation"],
            peripheral=["Economic Survey", "Budget Analysis"],
        ),
    ),
    "History": SubjectMetadata(
        subject="History",
        baseline_hours=120,
        resources=["Tamil Nadu History", "Spectrum", "PYQs (History)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Modern History", "Freedom Movement", "Post-Independence"],
            medium=["Ancient History", "Medieval History"],
            peripheral=["World History", "Art & Culture"],
        ),
    ),
    "Environment": SubjectMetadata(
        subject="Environment",
        baseline_hours=90,
        resources=["Shankar IAS Environment", "PYQs (Environment)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Ecology", "Biodiversity", "Climate Change"],
            medium=["Environmental Laws", "Conservation"],
            peripheral=["International Conventions"],
        ),
    ),
    "Ethics": SubjectMetadata(
        subject="Ethics",
        baseline_hours=80,
        resources=["Lexicon Ethics", "Case Studies", "PYKs (Ethics)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Ethics & Human Interface", "Attitude", "Aptitude"],
            medium=["Emotional Intelligence", "Moral Thinkers"],
            peripheral=["Case Studies", "Applied Ethics"],
        ),
    ),
    "Essay": SubjectMetadata(
        subject="Essay",
        baseline_hours=60,
        resources=["Essay topics compendium", "Model essays"],
        priority_ladder=SubjectPriorityLadder(
            core=["Essay Structure", "Current Affairs Integration"],
            medium=["Practice Essays", "Topic Analysis"],
            peripheral=["Advanced Techniques"],
        ),
    ),
    "Geography": SubjectMetadata(
        subject="Geography",
        baseline_hours=95,
        resources=["NCERT Geography", "G.C. Leong", "PYQs (Geography)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Physical Geography", "Indian Geography"],
            medium=["World Geography", "Economic Geography"],
            peripheral=["Geopolitics"],
        ),
    ),
    "Science & Tech": SubjectMetadata(
        subject="Science & Tech",
        baseline_hours=85,
        resources=["Science Reporter", "PYQs (Science)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Physics", "Chemistry", "Biology"],
            medium=["Space Technology", "IT & Computers"],
            peripheral=["Nanotechnology", "Biotechnology"],
        ),
    ),
    "CSAT": SubjectMetadata(
        subject="CSAT",
        baseline_hours=70,
        resources=["CSAT Manual", "Practice Tests"],
        priority_ladder=SubjectPriorityLadder(
            core=["Comprehension", "Logical Reasoning"],
            medium=["Decision Making", "Interpersonal Skills"],
            peripheral=["Basic Numeracy"],
        ),
    ),
    "Current Affairs": SubjectMetadata(
        subject="Current Affairs",
        baseline_hours=75,
        resources=["Newspapers", "Monthly Magazines"],
        priority_ladder=SubjectPriorityLadder(
            core=["National Events", "International Relations"],
            medium=["Economic Developments", "Social Issues"],
            peripheral=["Sports", "Awards"],
        ),
    ),
    "International Relations": SubjectMetadata(
        subject="International Relations",
        baseline_hours=65,
        resources=["International Relations", "PYQs (IR)"],
        priority_ladder=SubjectPriorityLadder(
            core=["India's Foreign Policy", "Bilateral Relations"],
            medium=["Multilateral Organizations", "Regional Groups"],
            peripheral=["Global Issues"],
        ),
    ),
    "Disaster Management": SubjectMetadata(
        subject="Disaster Management",
        baseline_hours=55,
        resources=["Disaster Management", "PYQs (DM)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Disaster Types", "Response Mechanisms"],
            medium=["Prevention", "Mitigation"],
            peripheral=["International Cooperation"],
        ),
    ),
    "Internal Security": SubjectMetadata(
        subject="Internal Security",
        baseline_hours=60,
        resources=["Internal Security", "PYQs (IS)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Security Challenges", "Counter-terrorism"],
            medium=["Cyber Security", "Border Security"],
            peripheral=["Intelligence Agencies"],
        ),
    ),
    "Agriculture": SubjectMetadata(
        subject="Agriculture",
        baseline_hours=70,
        resources=["Agriculture", "PYQs (Agriculture)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Agricultural Systems", "Food Security"],
            medium=["Agricultural Reforms", "Technology"],
            peripheral=["International Trade"],
        ),
    ),
    "Optional": SubjectMetadata(
        subject="Optional",
        baseline_hours=200,
        resources=["Optional Subject Books", "PYQs (Optional)"],
        priority_ladder=SubjectPriorityLadder(
            core=["Paper 1 Core Topics", "Paper 2 Core Topics"],
            medium=["Advanced Topics", "Current Developments"],
            peripheral=["Research Papers"],
        ),
    ),
}
```

### 3. Mains Papers Data

```python
MAINS_PAPERS = {
    "ids": [
        {"id": 1, "name": "GS Paper 1"},
        {"id": 2, "name": "GS Paper 2"},
        {"id": 3, "name": "GS Paper 3"},
        {"id": 4, "name": "GS Paper 4"},
        {"id": 5, "name": "Essay Paper"},
        {"id": 6, "name": "Optional Paper 1"},
        {"id": 7, "name": "Optional Paper 2"},
    ],
    "names": [
        {"id": 1, "name": "GS Paper 1"},
        {"id": 2, "name": "GS Paper 2"},
        {"id": 3, "name": "GS Paper 3"},
        {"id": 4, "name": "GS Paper 4"},
        {"id": 5, "name": "Essay Paper"},
        {"id": 6, "name": "Optional Paper 1"},
        {"id": 7, "name": "Optional Paper 2"},
    ]
}
```

### 4. Mains Subjects Data

```python
MAINS_SUBJECTS = [
    {"id": 1, "name": "History"},
    {"id": 2, "name": "Geography"},
    {"id": 3, "name": "Polity"},
    {"id": 4, "name": "Economy"},
    {"id": 5, "name": "Environment"},
    {"id": 6, "name": "Science & Tech"},
    {"id": 7, "name": "Ethics"},
    {"id": 8, "name": "Essay"},
    {"id": 9, "name": "International Relations"},
    {"id": 10, "name": "Disaster Management"},
    {"id": 11, "name": "Internal Security"},
    {"id": 12, "name": "Agriculture"},
    {"id": 13, "name": "Optional"},
]
```

### 5. Topics Data

```python
TOPICS_BY_SUBJECT = {
    1: [101, 102, 103, 104, 105],  # History topics
    2: [201, 202, 203, 204, 205],  # Geography topics
    3: [301, 302, 303, 304, 305],  # Polity topics
    4: [401, 402, 403, 404, 405],  # Economy topics
    5: [501, 502, 503, 504, 505],  # Environment topics
    6: [601, 602, 603, 604, 605],  # Science & Tech topics
    7: [701, 702, 703, 704, 705],  # Ethics topics
    8: [801, 802, 803, 804, 805],  # Essay topics
    9: [901, 902, 903, 904, 905],  # International Relations topics
    10: [1001, 1002, 1003, 1004, 1005],  # Disaster Management topics
    11: [1101, 1102, 1103, 1104, 1105],  # Internal Security topics
    12: [1201, 1202, 1203, 1204, 1205],  # Agriculture topics
    13: [1301, 1302, 1303, 1304, 1305],  # Optional topics
}
```

## Implementation Specification

### Mock Service Class

```python
from typing import List, Dict, Any, Optional
from src.helios.models import SubjectMetadata, SubjectPriorityLadder

class MockCMSService:
    """Mock CMS service for Helios Engine testing."""
    
    def __init__(self):
        # Initialize with test data
        self.subjects = SUBJECTS
        self.subject_metadata = SUBJECT_METADATA
        self.mains_papers = MAINS_PAPERS
        self.mains_subjects = MAINS_SUBJECTS
        self.topics_by_subject = TOPICS_BY_SUBJECT
    
    async def get_list_of_subjects(self) -> List[str]:
        """Return the list of all available subjects."""
        return self.subjects.copy()
    
    async def get_metadata_for_subject(self, subject_name: str) -> Optional[SubjectMetadata]:
        """Return metadata for a specific subject."""
        return self.subject_metadata.get(subject_name)
    
    async def get_mains_papers(self) -> Dict[str, List[Dict[str, Any]]]:
        """Return mains papers data."""
        return self.mains_papers.copy()
    
    async def get_mains_subjects(self, paper_ids: List[int]) -> List[Dict[str, Any]]:
        """Return subjects for given paper IDs."""
        # In mock, return all subjects regardless of paper_ids for simplicity
        return self.mains_subjects.copy()
    
    async def get_topics_ids(self, subject_id: int) -> List[int]:
        """Return topic IDs for a given subject ID."""
        return self.topics_by_subject.get(subject_id, [])
```

## Test Integration

### 1. Test Setup

The mock service should be injected into the Helios Engine during test setup:

```python
import pytest
from src.helios.engine import HeliosEngine
from .mock_cms_service import MockCMSService

@pytest.fixture
def mock_cms_service():
    return MockCMSService()

@pytest.fixture
def helios_engine(mock_cms_service):
    return HeliosEngine(cms_service=mock_cms_service)
```

### 2. Test Data Validation

The mock service ensures that test assertions match the expected outputs:

**For Priya's Test (05c-scenario-priya-test-spec.md):**
- First block should contain "Ethics" and "Economy" (her weakest subjects)
- Ethics baseline: 80 hours * 1.25 (very weak adjustment) = 100 hours
- Economy baseline: 110 hours * 1.25 (very weak adjustment) = 137.5 hours
- Total: 237.5 hours / 55 hours/week = 4.31 weeks → 5 weeks (ceiling)
- Daily task durations: 55 hours/week * 60% study / 7 days = 282 minutes study
- Daily task durations: 55 hours/week * 20% revision / 7 days = 94 minutes revision
- Daily task durations: 55 hours/week * 20% practice / 7 days = 94 minutes practice

**For Ananth's Test (05d-scenario-ananth-test-spec.md):**
- First block should contain "History" (his strongest subject)
- History baseline: 120 hours (no adjustment for "Strong") = 120 hours
- Total: 120 hours / 22 hours/week = 5.45 weeks → 6 weeks (ceiling)
- Daily task durations: 22 hours/week * 60% study / 7 days = 113 minutes study
- Daily task durations: 22 hours/week * 20% revision / 7 days = 37 minutes revision
- Daily task durations: 22 hours/week * 20% practice / 7 days = 37 minutes practice

## Benefits

1. **Deterministic Testing**: All test runs produce identical results
2. **Fast Execution**: No external API calls or network dependencies
3. **Scenario Coverage**: Data matches all test personas and edge cases
4. **Maintainable**: Centralized test data that's easy to update
5. **Isolated**: Tests don't depend on external CMS state or availability

## Usage in Test Files

The mock service should be used in all Helios Engine tests:

```python
# In test files
from .mock_cms_service import MockCMSService

def test_generate_plan_for_priya():
    cms_service = MockCMSService()
    engine = HeliosEngine(cms_service=cms_service)
    
    # Test logic using consistent mock data
    plan = engine.generate_initial_plan_from_wizard(user_id="priya-123", wizard=priya_wizard)
    
    # Assertions that match the expected outputs in 05c-scenario-priya-test-spec.md
    assert plan.blocks[0].subjects == ["Ethics", "Economy"]
    assert plan.blocks[0].duration_weeks == 5
    # ... more assertions
```

This mock service specification ensures that the Helios Engine tests are reliable, fast, and maintainable while providing comprehensive coverage of the test scenarios.
