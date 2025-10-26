"""
HTTP client for communicating with the Haskell Helios engine.

This module provides a client interface to interact with the Haskell HTTP server
that runs the Helios planning engine.
"""

import httpx
import json
from typing import Dict, Any, Optional
from pydantic import BaseModel
from src.modules.helios.config import HELIOS_SERVER_CONFIG
import logging

logger = logging.getLogger(__name__)


class HeliosHTTPClient:
    """HTTP client for the Haskell Helios engine."""
    
    def __init__(self, base_url: str = None, timeout: float = 30.0):
        self.base_url = base_url or HELIOS_SERVER_CONFIG.base_url
        self.timeout = timeout
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers={"Content-Type": "application/json"}
        )
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    async def health_check(self) -> bool:
        """Check if the Haskell Helios server is running."""
        try:
            response = await self.client.get("/health")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def generate_plan(self, wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a study plan using the Haskell engine.
        
        Args:
            wizard_data: UI wizard data in the format expected by the Haskell engine
            
        Returns:
            Study plan data from the Haskell engine
            
        Raises:
            HeliosClientError: If the request fails or returns an error
        """
        try:
            logger.info(f"Sending plan generation request to Haskell engine at {self.base_url}")
            response = await self.client.post(
                "/plan/generate",
                json=wizard_data
            )
            
            if response.status_code != 200:
                error_msg = f"Haskell engine returned status {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise HeliosClientError(error_msg)
            
            plan_data = response.json()
            logger.info("Successfully received plan from Haskell engine")
            return plan_data
            
        except httpx.RequestError as e:
            error_msg = f"Failed to connect to Haskell engine: {e}"
            logger.error(error_msg)
            raise HeliosClientError(error_msg)
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON response from Haskell engine: {e}"
            logger.error(error_msg)
            raise HeliosClientError(error_msg)
    
    async def review_plan(self, plan_data: Dict[str, Any], student_intake: Dict[str, Any]) -> Dict[str, Any]:
        """
        Review a study plan using the Haskell engine.
        
        Args:
            plan_data: Study plan to review
            student_intake: Student intake data
            
        Returns:
            Plan review result from the Haskell engine
            
        Raises:
            HeliosClientError: If the request fails or returns an error
        """
        try:
            review_request = {
                "plan": plan_data,
                "student_intake": student_intake
            }
            
            logger.info("Sending plan review request to Haskell engine")
            
            response = await self.client.post(
                "/plan/review",
                json=review_request
            )
            
            if response.status_code != 200:
                error_msg = f"Haskell engine returned status {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise HeliosClientError(error_msg)
            
            review_result = response.json()
            logger.info("Successfully received plan review from Haskell engine")
            return review_result
            
        except httpx.RequestError as e:
            error_msg = f"Failed to connect to Haskell engine: {e}"
            logger.error(error_msg)
            raise HeliosClientError(error_msg)
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON response from Haskell engine: {e}"
            logger.error(error_msg)
            raise HeliosClientError(error_msg)
    
    async def export_docx(self, study_plan: Dict[str, Any], wizard_data: Dict[str, Any]) -> bytes:
        """
        Export study plan as DOCX document using the helios-server.
        
        Args:
            study_plan: Study plan data to export
            wizard_data: Wizard/intake data from the database. Will be transformed to StudentIntake.
            
        Returns:
            Binary content of the DOCX file
            
        Raises:
            HeliosClientError: If the request fails or returns an error
        """
        try:
            logger.info("Sending DOCX export request to helios-server")
            
            # Prepare request body with wizard data
            request_body = {
                "studyPlan": study_plan,
                "wizardData": wizard_data
            }
            
            response = await self.client.post(
                "/plan/export/docx",
                json=request_body,
                timeout=60.0  # Longer timeout for document generation
            )
            
            if response.status_code != 200:
                error_msg = f"Helios-server returned status {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise HeliosClientError(error_msg)
            
            logger.info("Successfully received DOCX from helios-server")
            return response.content
            
        except httpx.RequestError as e:
            error_msg = f"Failed to connect to helios-server: {e}"
            logger.error(error_msg)
            raise HeliosClientError(error_msg)
        except Exception as e:
            error_msg = f"Error exporting DOCX: {e}"
            logger.error(error_msg)
            raise HeliosClientError(error_msg)
    
    async def export_pdf(self, study_plan: Dict[str, Any], wizard_data: Dict[str, Any]) -> bytes:
        """
        Export study plan as PDF document using the helios-server.
        
        Args:
            study_plan: Study plan data to export
            wizard_data: Wizard/intake data from the database. Will be transformed to StudentIntake.
            
        Returns:
            Binary content of the PDF file
            
        Raises:
            HeliosClientError: If the request fails or returns an error
        """
        try:
            logger.info("Sending PDF export request to helios-server")
            
            # Prepare request body with wizard data
            request_body = {
                "studyPlan": study_plan,
                "wizardData": wizard_data
            }
            
            response = await self.client.post(
                "/plan/export/pdf",
                json=request_body,
                timeout=90.0  # Longer timeout for PDF generation
            )
            
            if response.status_code != 200:
                error_msg = f"Helios-server returned status {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise HeliosClientError(error_msg)
            
            logger.info("Successfully received PDF from helios-server")
            return response.content
            
        except httpx.RequestError as e:
            error_msg = f"Failed to connect to helios-server: {e}"
            logger.error(error_msg)
            raise HeliosClientError(error_msg)
        except Exception as e:
            error_msg = f"Error exporting PDF: {e}"
            logger.error(error_msg)
            raise HeliosClientError(error_msg)


class HeliosClientError(Exception):
    """Exception raised when the Helios HTTP client encounters an error."""
    pass


# Singleton client instance for reuse
_client_instance: Optional[HeliosHTTPClient] = None


async def get_helios_client() -> HeliosHTTPClient:
    """Get a shared Helios HTTP client instance."""
    global _client_instance
    if _client_instance is None:
        _client_instance = HeliosHTTPClient()
    return _client_instance


async def close_helios_client():
    """Close the shared Helios HTTP client instance."""
    global _client_instance
    if _client_instance is not None:
        await _client_instance.client.aclose()
        _client_instance = None
