# PDF Generation Service

An elegant Python-based document generation service using FastAPI and ReportLab that mimics the CalendarDoxService functionality. This service generates high-fidelity, minimalistic, and pleasant PDF documents for UPSC study plans.

## Features

- **Elegant Design**: Minimalistic and professional PDF layouts with sophisticated typography
- **High Fidelity Graphics**: Beautiful color schemes, gradients, and visual elements
- **FastAPI Integration**: RESTful API endpoints with automatic documentation
- **ReportLab Power**: Advanced PDF generation with tables, charts, and custom layouts
- **Compatible Interface**: Mirrors the CalendarDoxService API for easy integration
- **Streaming Support**: Memory-efficient PDF streaming for large documents

## API Endpoints

### Core Endpoints

- `POST /generate-pdf` - Generate PDF and return metadata
- `POST /generate-pdf-download` - Generate and download PDF directly
- `POST /generate-pdf-stream` - Stream PDF for memory efficiency
- `GET /download/{filename}` - Download previously generated files

### Utility Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `GET /sample-data/study-plan` - Sample study plan data
- `GET /sample-data/student-intake` - Sample student intake data
- `POST /test-generate` - Test PDF generation with sample data

## Installation

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Service**:
   ```bash
   python main.py
   ```

3. **Access the API**:
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs
   - Alternative docs: http://localhost:8000/redoc

## Usage

### Basic PDF Generation

```python
import requests
import json

# Sample request data
request_data = {
    "study_plan": {
        "targeted_year": 2026,
        "start_date": "2024-01-01",
        "study_plan_id": "plan-001",
        "user_id": "user-001",
        "plan_title": "UPSC 2026 Study Plan",
        "curated_resources": {"essential_resources": []},
        "cycles": [
            {
                "cycleId": "cycle-001",
                "cycleType": "C1",
                "cycleIntensity": "Foundation",
                "cycleDuration": 12,
                "cycleOrder": 1,
                "cycleName": "Foundation Cycle",
                "cycleBlocks": [],
                "cycleDescription": "Foundation building",
                "cycleStartDate": "2024-01-01",
                "cycleEndDate": "2024-03-31"
            }
        ]
    },
    "student_intake": {
        "subject_confidence": {"History": "Moderate"},
        "study_strategy": {
            "weekly_study_hours": "50-60",
            "study_approach": "WeakFirst"
        },
        "target_year": "2026",
        "start_date": "2024-01-01",
        "personal_details": {
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone_number": "+91-1234567890",
            "present_location": "Delhi"
        }
    },
    "filename": "my-study-plan.pdf"
}

# Generate PDF
response = requests.post(
    "http://localhost:8000/generate-pdf-download",
    json=request_data
)

# Save PDF
with open("study-plan.pdf", "wb") as f:
    f.write(response.content)
```

### Quick Test

```bash
# Test with sample data
curl -X POST "http://localhost:8000/test-generate" -o test-plan.pdf
```

## Document Structure

The generated PDF includes:

1. **Cover Page**: Elegant cover with student information and study strategy overview
2. **Birds Eye View**: Yearly calendar showing all study cycles at a glance
3. **Monthly Views**: Detailed monthly calendars with daily subject breakdowns
4. **Resources Table**: Comprehensive resources organized by subject
5. **Legend**: Color coding and phase explanations

## Design Features

### Color Scheme
- **Primary**: Deep blue (#2E5BBA) for headings and accents
- **Secondary**: Medium gray (#666666) for secondary text
- **Accent**: Golden (#D6A50D) for highlights
- **Cycle Colors**: Distinct colors for each study cycle (C1-C8)

### Typography
- **Headings**: Helvetica Bold for strong hierarchy
- **Body**: Helvetica for clean readability
- **Sizes**: Carefully scaled from 8pt to 36pt for optimal hierarchy

### Layout
- **Margins**: Generous white space for elegance
- **Grid System**: Consistent alignment and spacing
- **Card Design**: Modern card-based layouts for information grouping

## API Documentation

The service automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Error Handling

The service provides detailed error messages and appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (invalid input data)
- `404`: File not found
- `500`: Internal server error (PDF generation failed)

## Performance

- **Memory Efficient**: Streaming support for large documents
- **Fast Generation**: Optimized ReportLab usage
- **Concurrent**: FastAPI's async support for multiple requests

## Customization

### Adding New Cycle Types

```python
# In pdf_generator.py, extend ColorScheme.CYCLE_COLORS
CYCLE_COLORS = {
    # ... existing colors ...
    CycleType.C9: colors.Color(0.95, 0.95, 0.85),  # New cycle color
}
```

### Custom Styling

```python
# In pdf_generator.py, modify _create_styles method
styles['CustomStyle'] = ParagraphStyle(
    'CustomStyle',
    fontSize=12,
    textColor=ColorScheme.PRIMARY,
    fontName='Helvetica-Bold'
)
```

## Dependencies

- **FastAPI**: Modern web framework for APIs
- **ReportLab**: Professional PDF generation
- **Pydantic**: Data validation and serialization
- **python-dateutil**: Advanced date parsing
- **Pillow**: Image processing support
- **Uvicorn**: ASGI server for FastAPI

## Comparison with CalendarDoxService

| Feature | CalendarDoxService (TS) | PDF Service (Python) |
|---------|------------------------|----------------------|
| Document Format | DOCX | PDF |
| Styling | Word styles | ReportLab styles |
| Graphics | Limited | Advanced |
| File Size | Larger | Smaller |
| Compatibility | Word required | Universal |
| Print Quality | Good | Excellent |

## License

This project is part of the La Mentora Study Planner ecosystem.

## Support

For issues and questions, please refer to the main project documentation or create an issue in the project repository.