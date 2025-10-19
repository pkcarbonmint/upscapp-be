"""
FastAPI application for PDF generation service.
This service mimics the CalendarDoxService interface but generates PDFs using ReportLab.
"""

import io
import os
import time
import tempfile
from typing import Optional
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse, StreamingResponse
import uvicorn

from models import PDFGenerationRequest, PDFGenerationResponse, StudyPlan, StudentIntake
from pdf_generator import PDFGenerator


app = FastAPI(
    title="PDF Generation Service",
    description="Elegant PDF generation service for study plans using FastAPI and ReportLab",
    version="1.0.0"
)

pdf_generator = PDFGenerator()


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "PDF Generation Service is running",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service": "pdf-generation-service",
        "dependencies": {
            "reportlab": "✓ Available",
            "fastapi": "✓ Available"
        }
    }


@app.post("/generate-pdf", response_model=PDFGenerationResponse)
async def generate_pdf(request: PDFGenerationRequest):
    """
    Generate a PDF document from study plan and student intake data.
    This endpoint mirrors the CalendarDoxService.generateStudyPlanPDF interface.
    """
    try:
        start_time = time.time()
        
        # Generate PDF
        pdf_bytes = pdf_generator.generate_pdf(
            request.study_plan,
            request.student_intake
        )
        
        generation_time = time.time() - start_time
        
        # Create filename if not provided
        filename = request.filename or f"study-plan-{request.study_plan.study_plan_id}.pdf"
        if not filename.endswith('.pdf'):
            filename += '.pdf'
        
        # Save to temporary file for download
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, filename)
        
        with open(file_path, 'wb') as f:
            f.write(pdf_bytes)
        
        return PDFGenerationResponse(
            success=True,
            message="PDF generated successfully",
            filename=filename,
            file_size=len(pdf_bytes),
            generation_time=round(generation_time, 2)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {str(e)}"
        )


@app.post("/generate-pdf-download")
async def generate_pdf_download(request: PDFGenerationRequest):
    """
    Generate and download a PDF document directly.
    This endpoint provides immediate file download.
    """
    try:
        # Generate PDF
        pdf_bytes = pdf_generator.generate_pdf(
            request.study_plan,
            request.student_intake
        )
        
        # Create filename
        filename = request.filename or f"study-plan-{request.study_plan.study_plan_id}.pdf"
        if not filename.endswith('.pdf'):
            filename += '.pdf'
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {str(e)}"
        )


@app.post("/generate-pdf-stream")
async def generate_pdf_stream(request: PDFGenerationRequest):
    """
    Generate and stream a PDF document.
    This endpoint mirrors the CalendarDoxService.generateStudyPlanPDFToStream interface.
    """
    try:
        # Generate PDF
        pdf_bytes = pdf_generator.generate_pdf(
            request.study_plan,
            request.student_intake
        )
        
        # Create filename
        filename = request.filename or f"study-plan-{request.study_plan.study_plan_id}.pdf"
        if not filename.endswith('.pdf'):
            filename += '.pdf'
        
        # Stream the PDF
        def generate():
            yield pdf_bytes
        
        return StreamingResponse(
            generate(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF streaming failed: {str(e)}"
        )


@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download a previously generated PDF file."""
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf"
    )


# Sample data endpoints for testing
@app.get("/sample-data/study-plan")
async def get_sample_study_plan():
    """Get sample study plan data for testing."""
    from datetime import datetime, timedelta
    
    return {
        "targeted_year": 2026,
        "start_date": "2024-01-01",
        "study_plan_id": "sample-plan-001",
        "user_id": "sample-user-001",
        "plan_title": "UPSC 2026 Comprehensive Study Plan",
        "curated_resources": {
            "essential_resources": [],
            "recommended_timeline": None,
            "budget_summary": None,
            "alternative_options": []
        },
        "cycles": [
            {
                "cycleId": "cycle-001",
                "cycleType": "C1",
                "cycleIntensity": "Foundation",
                "cycleDuration": 12,
                "cycleOrder": 1,
                "cycleName": "NCERT Foundation Cycle",
                "cycleBlocks": [
                    {
                        "block_id": "block-001",
                        "block_title": "History Foundation",
                        "subjects": ["History", "Ancient History", "Medieval History"],
                        "duration_weeks": 4,
                        "weekly_plan": [],
                        "block_resources": {
                            "primary_books": [],
                            "supplementary_materials": [],
                            "practice_resources": [],
                            "video_content": [],
                            "current_affairs_sources": [],
                            "revision_materials": [],
                            "expert_recommendations": []
                        },
                        "block_start_date": "2024-01-01",
                        "block_end_date": "2024-01-28"
                    }
                ],
                "cycleDescription": "Foundation building with NCERT books",
                "cycleStartDate": "2024-01-01",
                "cycleEndDate": "2024-03-31"
            },
            {
                "cycleId": "cycle-002",
                "cycleType": "C2",
                "cycleIntensity": "Foundation",
                "cycleDuration": 16,
                "cycleOrder": 2,
                "cycleName": "Comprehensive Foundation Cycle",
                "cycleBlocks": [
                    {
                        "block_id": "block-002",
                        "block_title": "Geography Foundation",
                        "subjects": ["Geography", "Physical Geography", "Human Geography"],
                        "duration_weeks": 4,
                        "weekly_plan": [],
                        "block_resources": {
                            "primary_books": [],
                            "supplementary_materials": [],
                            "practice_resources": [],
                            "video_content": [],
                            "current_affairs_sources": [],
                            "revision_materials": [],
                            "expert_recommendations": []
                        },
                        "block_start_date": "2024-04-01",
                        "block_end_date": "2024-04-28"
                    }
                ],
                "cycleDescription": "Comprehensive foundation with standard books",
                "cycleStartDate": "2024-04-01",
                "cycleEndDate": "2024-07-31"
            }
        ]
    }


@app.get("/sample-data/student-intake")
async def get_sample_student_intake():
    """Get sample student intake data for testing."""
    return {
        "subject_confidence": {
            "History": "Moderate",
            "Geography": "Strong",
            "Polity": "Weak",
            "Economics": "Moderate"
        },
        "study_strategy": {
            "study_focus_combo": "OneGSPlusOptional",
            "weekly_study_hours": "50-60",
            "time_distribution": "Balanced",
            "study_approach": "WeakFirst",
            "revision_strategy": "Regular",
            "test_frequency": "Weekly",
            "seasonal_windows": ["Morning", "Evening"],
            "catch_up_day_preference": "Sunday",
            "optional_first_preference": False,
            "upsc_optional_subject": "Public Administration",
            "weekly_test_day_preference": "Sunday"
        },
        "target_year": "2026",
        "start_date": "2024-01-01",
        "personal_details": {
            "full_name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "phone_number": "+91-9876543210",
            "present_location": "New Delhi",
            "student_archetype": "Dedicated Full-Timer",
            "graduation_stream": "Political Science",
            "college_university": "Delhi University",
            "year_of_passing": 2023
        },
        "preparation_background": {
            "preparing_since": "6 months",
            "number_of_attempts": "0",
            "highest_stage_per_attempt": "N/A"
        },
        "optional_subject": {
            "optional_subject_name": "Public Administration",
            "optional_status": "Decided",
            "optional_taken_from": "Graduation"
        }
    }


@app.post("/test-generate")
async def test_generate():
    """Test endpoint to generate a PDF with sample data."""
    try:
        # Get sample data
        study_plan_data = await get_sample_study_plan()
        student_intake_data = await get_sample_student_intake()
        
        # Create request
        request = PDFGenerationRequest(
            study_plan=StudyPlan(**study_plan_data),
            student_intake=StudentIntake(**student_intake_data),
            filename="test-study-plan.pdf"
        )
        
        # Generate PDF
        return await generate_pdf_download(request)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Test generation failed: {str(e)}"
        )


if __name__ == "__main__":
    import io
    
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )