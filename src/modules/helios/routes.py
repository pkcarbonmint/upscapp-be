from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
import logging

from src.base.schemas import ResponseSchema
from src.users.deps import CheckV2UserAccess
from src.users.schemas import USER_ROLE, USER_TYPE
from src.constants import APP

from .schemas import GeneratePlanRequest, GeneratePlanResponse, RebalanceRequest, ChangeSummary, GeneratePlanFromWizardRequest, HealthCheckResponse, StudyPlanSchema
from .service import HeliosIntegrationService
from .adaptive_client import get_helios_adaptive_client


router = APIRouter(prefix="/helios", tags=["Helios"])
service = HeliosIntegrationService()


@router.post("/plan/generate", response_model=ResponseSchema[GeneratePlanResponse])
async def generate_plan(
	req: GeneratePlanRequest,
):
	"""Generate a new Helios plan and persist it as StudyPlan/PlanTask."""
	sp_id = await service.generate_plan(
		user_id=req.user_id,
		product_id=req.product_id,
		offering_id=req.offering_id,
		created_by_id=req.created_by_id,
		created_by_name=req.created_by_name,
		intake=req.intake,
	)
	return ResponseSchema(data=GeneratePlanResponse(studyplan_id=sp_id), success=True)


@router.post("/plan/generate-from-wizard", response_model=ResponseSchema[GeneratePlanResponse])
async def generate_plan_from_wizard(
	req: GeneratePlanFromWizardRequest,
):
	"""Generate a plan directly from the wizard payload (backend adapts it)."""
	sp_id = await service.generate_plan_from_wizard(req)
	return ResponseSchema(data=GeneratePlanResponse(studyplan_id=sp_id), success=True)


@router.get("/health", response_model=ResponseSchema[HealthCheckResponse])
async def health_check():
	"""Check if the Haskell Helios server is available."""
	is_healthy = await service.health_check()
	return ResponseSchema(
		data=HealthCheckResponse(
			haskell_server_available=is_healthy,
			status="healthy" if is_healthy else "unhealthy"
		), 
		success=True
	)


@router.post("/plan/{studyplan_id}/rebalance", response_model=ResponseSchema[ChangeSummary])
async def rebalance_plan(
	studyplan_id: int,
	req: RebalanceRequest,
	user = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.teacher], apps=[APP.admin_app])),
):
	"""Placeholder for rebalancing endpoint (to be wired to persistence)."""
	summary = ChangeSummary()
	return ResponseSchema(data=summary, success=True)


@router.get("/plan/{studyplan_id}/export/docx")
async def export_plan_docx(
	studyplan_id: int,
	user = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.teacher], apps=[APP.admin_app])),
):
	"""Export study plan as DOCX document using helios-server."""
	logger = logging.getLogger(__name__)
	
	try:
		logger.info(f"Starting DOCX export for study plan {studyplan_id}")
		
		# Get study plan data and intake data from service
		study_plan_data, intake_data = await service.get_study_plan_for_export(studyplan_id)
		
		if not study_plan_data:
			logger.error(f"Study plan {studyplan_id} not found")
			raise HTTPException(status_code=404, detail="Study plan not found")
		
		if not intake_data:
			logger.error(f"Intake data not found for study plan {studyplan_id}")
			raise HTTPException(status_code=404, detail="Intake data not found. Cannot generate document without student information.")
		
		logger.info(f"Retrieved study plan data: {study_plan_data.title}")
		
		# Convert schema to dict
		study_plan_dict = study_plan_data.model_dump()
		
		# Call helios-server to generate DOCX with intake data
		client = await get_helios_adaptive_client()
		docx_content = await client.export_docx(study_plan_dict, intake_data)
		
		logger.info(f"Successfully generated DOCX from helios-server")
		
		# Return file response
		filename = f"study_plan_{studyplan_id}.docx"
		return Response(
			content=docx_content,
			media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			headers={"Content-Disposition": f'attachment; filename="{filename}"'}
		)
		
	except Exception as e:
		logger.error(f"Error generating DOCX for plan {studyplan_id}: {str(e)}", exc_info=True)
		raise HTTPException(status_code=500, detail=f"Error generating DOCX: {str(e)}")


@router.get("/plan/{studyplan_id}/export/pdf")
async def export_plan_pdf(
	studyplan_id: int,
	user = Depends(CheckV2UserAccess(user_types=[USER_TYPE.workforce], roles=[USER_ROLE.org_admin, USER_ROLE.branch_admin, USER_ROLE.teacher], apps=[APP.admin_app])),
):
	"""Export study plan as PDF document using helios-server."""
	logger = logging.getLogger(__name__)
	
	try:
		logger.info(f"Starting PDF export for study plan {studyplan_id}")
		
		# Get study plan data and intake data from service
		study_plan_data, intake_data = await service.get_study_plan_for_export(studyplan_id)
		
		if not study_plan_data:
			logger.error(f"Study plan {studyplan_id} not found")
			raise HTTPException(status_code=404, detail="Study plan not found")
		
		if not intake_data:
			logger.error(f"Intake data not found for study plan {studyplan_id}")
			raise HTTPException(status_code=404, detail="Intake data not found. Cannot generate document without student information.")
		
		logger.info(f"Retrieved study plan data: {study_plan_data.title}")
		
		# Convert schema to dict
		study_plan_dict = study_plan_data.model_dump()
		
		# Call helios-server to generate PDF with intake data
		client = await get_helios_adaptive_client()
		pdf_content = await client.export_pdf(study_plan_dict, intake_data)
		
		logger.info(f"Successfully generated PDF from helios-server")
		
		# Return file response
		filename = f"study_plan_{studyplan_id}.pdf"
		return Response(
			content=pdf_content,
			media_type="application/pdf",
			headers={"Content-Disposition": f'attachment; filename="{filename}"'}
		)
		
	except Exception as e:
		logger.error(f"Error generating PDF for plan {studyplan_id}: {str(e)}", exc_info=True)
		raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")


