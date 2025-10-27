from __future__ import annotations
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from . import schemas as S
from .service import (
    create_student, 
    update_student_target, 
    update_student_commitment, 
    update_student_confidence,
    get_student_data,
    student_exists,
    set_final_submitted,
    update_section
)
from .helios_mapper import map_student_to_helios
import httpx
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["studyplanner-onboarding"])


# Removed complex conversion functions - UI will handle raw Haskell data directly


@router.post("/students", response_model=S.CreateStudentResponse)
async def create_student_endpoint(payload: S.BackgroundInput) -> S.CreateStudentResponse:
    student_id = await create_student(payload.dict())
    return S.CreateStudentResponse(student_id=student_id, created=True)


@router.patch("/students/{student_id}/target", response_model=S.UpdateAck)
async def update_target(student_id: str, payload: S.TargetInput) -> S.UpdateAck:
    await update_student_target(student_id, payload.dict())
    return S.UpdateAck(student_id=student_id, updated=True)


@router.patch("/students/{student_id}/commitment", response_model=S.UpdateAck)
async def update_commitment(student_id: str, payload: S.CommitmentInput) -> S.UpdateAck:
    await update_student_commitment(student_id, payload.dict())
    return S.UpdateAck(student_id=student_id, updated=True)


@router.patch("/students/{student_id}/confidence", response_model=S.UpdateAck)
async def update_confidence(student_id: str, payload: S.ConfidenceInput) -> S.UpdateAck:
    await update_student_confidence(student_id, payload.dict())
    return S.UpdateAck(student_id=student_id, updated=True)


@router.get("/students/{student_id}/preview", response_model=S.PreviewResponse)
async def get_preview(student_id: str) -> S.PreviewResponse:
    await student_exists(student_id)
    
    try:
        # Get student data for Helios integration
        student_data = await get_student_data(student_id)
        
        # Call Helios engine for study plan generation
        helios_url = os.getenv("HELIOS_SERVER_URL", "http://helios:8080")
        
        # Map onboarding data to Helios UIWizardData format
        helios_payload = map_student_to_helios(student_data)
        
        # Log the payload being sent to Helios
        import json
        # print("=== HELIOS PAYLOAD ===")
        # print(json.dumps(helios_payload, indent=2))
        # print("=== END PAYLOAD ===")
        logger.info(f"Sending payload to Helios with target_year: {helios_payload.get('preparation_background', {}).get('target_year')}")
        
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{helios_url.rstrip('/')}/plan/generate",
                json=helios_payload
            )
            
        # Log Helios response
        logger.info(f"Helios response status: {response.status_code}")
        logger.info(f"Helios response body: {response.text}")
            
        if response.status_code == 200:
            helios_plan = response.json()
            logger.debug("Helios response received successfully")
            # Uncomment for detailed debugging: print(json.dumps(helios_plan, indent=2))
            preview = convert_helios_to_preview(helios_plan, student_id)
        else:
            logger.error(f"Helios returned {response.status_code}: {response.text}")
            raise HTTPException(status_code=500, detail=f"Helios server error: {response.status_code}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calling Helios: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")
    
    return S.PreviewResponse(student_id=student_id, preview=preview)



def convert_helios_to_preview(helios_plan, student_id):
    """
    Convert Helios plan response to preview format.
    Normalizes camelCase field names to snake_case for frontend compatibility.
    """
    logger.info(f"=== HELIOS PROCESSING WITH FIELD NAME NORMALIZATION ===")
    logger.info(f"Top-level keys: {list(helios_plan.keys())}")
    
    # Extract the generated plan
    generated_plan = helios_plan.get("generatedPlan", helios_plan)
    logger.info(f"Generated plan keys: {list(generated_plan.keys())}")
    
    # Basic validation - ensure we have cycles with blocks
    raw_cycles = generated_plan.get("cycles", [])
    if not raw_cycles:
        raise ValueError(
            f"No 'cycles' found in Helios response. "
            f"Available keys: {list(generated_plan.keys())}. "
            f"Helios service returned invalid data structure."
        )
    
    # Normalize field names: convert camelCase to snake_case for frontend
    normalized_cycles = []
    total_blocks = 0
    
    for raw_cycle in raw_cycles:
        if isinstance(raw_cycle, dict):
            # Convert cycle field names from camelCase to snake_case
            normalized_cycle = {
                "cycle_id": raw_cycle.get("cycleId", "unknown"),
                "cycle_name": raw_cycle.get("cycleName", "Unknown Cycle"),
                "cycle_type": raw_cycle.get("cycleType", "General"),
                "cycle_order": raw_cycle.get("cycleOrder", 999),
                "cycleBlocks": raw_cycle.get("cycleBlocks", [])
            }
            
            # Count blocks for validation
            cycle_blocks = normalized_cycle.get("cycleBlocks", [])
            if isinstance(cycle_blocks, list):
                total_blocks += len(cycle_blocks)
            
            normalized_cycles.append(normalized_cycle)
    
    logger.info(f"Normalized {len(normalized_cycles)} cycles with {total_blocks} total blocks")
    
    if total_blocks == 0:
        raise ValueError(
            f"Found {len(raw_cycles)} cycles but no blocks in cycleBlocks. "
            f"Helios returned empty cycle data."
        )
    
    # Create normalized plan with snake_case field names
    normalized_plan = generated_plan.copy()
    normalized_plan["cycles"] = normalized_cycles
    
    logger.info(f"✅ Helios field normalization completed")
    
    # Extract milestones
    milestones = generated_plan.get("milestones", {})
    
    # Return normalized data for UI to process
    return S.IWFPreview(
        raw_helios_data=normalized_plan,  # Normalized StudyPlan with snake_case fields
        milestones=S.MajorMilestones(
            foundationToPrelimsDate=milestones.get("foundationToPrelimsDate"),
            prelimsToMainsDate=milestones.get("prelimsToMainsDate"),
        ),
        studyPlanId=f"onboarding-{student_id}"  # Generate consistent study plan ID
    )


@router.post("/students/{student_id}/payment", response_model=S.PaymentResponse)
async def create_payment(student_id: str, payload: S.PaymentInput) -> S.PaymentResponse:
    await update_section(student_id, "payment", payload.dict())
    reference = f"PMT-REF-{len(student_id)}-4242"
    return S.PaymentResponse(student_id=student_id, payment_status="accepted", reference=reference)


@router.post("/students/{student_id}/submit", response_model=S.SubmitResponse)
async def submit(student_id: str) -> S.SubmitResponse:
    message = (
        "Your application has been submitted. You will receive your plan within 48 hours."
    )
    return S.SubmitResponse(student_id=student_id, submitted=True, message=message)


@router.get("/students/{student_id}/download/docx")
async def download_student_plan_docx(student_id: str):
    """Download study plan as DOCX for onboarding users (no authentication required)."""
    from fastapi.responses import FileResponse
    from fastapi import HTTPException
    import tempfile
    
    try:
        await student_exists(student_id)
        
        # Get student data and generate preview (same as preview endpoint)
        student_data = await get_student_data(student_id)
        helios_url = os.getenv("HELIOS_SERVER_URL", "http://helios:8080")
        helios_payload = map_student_to_helios(student_data)
        
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{helios_url.rstrip('/')}/plan/generate",
                json=helios_payload
            )
            
        if response.status_code == 200:
            helios_plan = response.json()
            preview = convert_helios_to_preview(helios_plan, student_id)
            
            # Convert preview to document-friendly format
            from src.modules.helios.schemas import StudyPlanSchema, BlockSchema
            
            blocks = []
            for block_data in preview.blocks:
                # Fix resources structure for BlockSchema validation
                resources_dict = {
                    "books": [block_data.resources.oneLine] if block_data.resources.oneLine else ["Study materials"],
                    "online": [block_data.resources.extraLine] if block_data.resources.extraLine else ["Online resources"],
                    "practice": ["Mock tests", "Previous year papers"]
                }
                
                # Extract detailed weekly plan from the block data
                weekly_plan = {"summary": "Weekly study schedule"}
                if hasattr(block_data, 'weekly_schedules') and block_data.weekly_schedules:
                    weekly_plan = {
                        "total_weeks": len(block_data.weekly_schedules),
                        "weekly_schedules": block_data.weekly_schedules,
                        "summary": f"Detailed {len(block_data.weekly_schedules)}-week study schedule"
                    }
                
                block_schema = BlockSchema(
                    block_id=block_data.blockId,
                    title=block_data.title,
                    cycle_id=block_data.cycle_id,
                    cycle_type=block_data.cycle_type,
                    cycle_order=block_data.cycle_order,
                    cycle_name=block_data.cycle_name,
                    subjects=block_data.subjects,
                    duration_weeks=block_data.durationWeeks,
                    weekly_plan=weekly_plan,
                    resources=resources_dict
                )
                blocks.append(block_schema)
            
            study_plan_schema = StudyPlanSchema(
                study_plan_id=f"onboarding-{student_id}",
                user_id=student_id,
                title=f"Study Plan for {student_data.get('name', 'Student')}",
                blocks=blocks,
                curated_resources={"generated": "via onboarding wizard"},
                effective_season_context="Onboarding Generated",
                created_for_target_year=str(student_data.get('target', {}).get('target_year', 2025))
            )
            
            # Generate DOCX document
            from src.modules.helios.document_service import DocumentGenerationService
            doc_service = DocumentGenerationService()
            docx_path = doc_service.generate_docx(study_plan_schema)
            
            # Return file response
            filename = f"study_plan_{student_id}.docx"
            return FileResponse(
                path=docx_path,
                filename=filename,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to generate study plan")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating document: {str(e)}")


@router.post("/helios/plan/export/docx")
async def forward_docx_export(request: Request):
    """Forward DOCX export request to helios-server."""
    try:
        helios_url = os.getenv("HELIOS_SERVER_URL", "http://helios:8080")
        
        # Get the request body
        request_body = await request.json()
        
        logger.info(f"Forwarding DOCX export request to helios-server at {helios_url}")
        
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{helios_url}/plan/export/docx",
                json=request_body
            )
        
        if response.status_code == 200:
            # Return the DOCX file with proper headers
            return Response(
                content=response.content,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": "attachment; filename=study-plan.docx",
                    "Content-Length": str(len(response.content))
                }
            )
        else:
            logger.error(f"Helios-server returned error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=response.status_code, 
                detail=f"Failed to generate DOCX: {response.text}"
            )
            
    except httpx.TimeoutException:
        logger.error("Timeout while forwarding DOCX export request to helios-server")
        raise HTTPException(status_code=504, detail="Request timeout - helios-server not responding")
    except httpx.ConnectError:
        logger.error("Connection error while forwarding DOCX export request to helios-server")
        raise HTTPException(status_code=503, detail="Helios-server unavailable")
    except Exception as e:
        logger.error(f"Error forwarding DOCX export request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating DOCX: {str(e)}")
