"""
HTTP client wrapper for communicating with the Helios server.

This module provides a unified interface for interacting with the Helios server
via HTTP, simplifying the integration with the backend.
"""

import logging
from typing import Dict, Any, Optional
from .client import get_helios_client, HeliosClientError

logger = logging.getLogger(__name__)


class HeliosAdaptiveClient:
    """HTTP client for communicating with the Helios server."""
    
    def __init__(self):
        self._http_client = None
        logger.info("Initialized Helios HTTP client")
    
    async def _get_client(self):
        """Get the HTTP client."""
        if self._http_client is None:
            self._http_client = await get_helios_client()
            logger.info("Using HTTP client for Helios integration")
        
        return self._http_client
    
    async def health_check(self) -> bool:
        """Check if the Helios server is available."""
        try:
            client = await self._get_client()
            return await client.health_check()
                
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def generate_plan(self, wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a study plan using the Helios server."""
        try:
            client = await self._get_client()
            return await client.generate_plan(wizard_data)
                
        except HeliosClientError as e:
            raise Exception(f"Plan generation failed: {e}")
    
    async def review_plan(self, plan_data: Dict[str, Any], student_intake: Dict[str, Any]) -> Dict[str, Any]:
        """Review a study plan using the Helios server."""
        try:
            client = await self._get_client()
            return await client.review_plan(plan_data, student_intake)
                
        except HeliosClientError as e:
            raise Exception(f"Plan review failed: {e}")
    
    async def export_docx(self, study_plan: Dict[str, Any], wizard_data: Dict[str, Any]) -> bytes:
        """
        Export study plan as DOCX document using helios-server.
        """
        try:
            client = await self._get_client()
            return await client.export_docx(study_plan, wizard_data)
                
        except HeliosClientError as e:
            raise Exception(f"DOCX export failed: {e}")
    
    async def export_pdf(self, study_plan: Dict[str, Any], wizard_data: Dict[str, Any]) -> bytes:
        """
        Export study plan as PDF document using helios-server.
        """
        try:
            client = await self._get_client()
            return await client.export_pdf(study_plan, wizard_data)
                
        except HeliosClientError as e:
            raise Exception(f"PDF export failed: {e}")


# Singleton instance
_adaptive_client_instance: Optional[HeliosAdaptiveClient] = None


async def get_helios_adaptive_client() -> HeliosAdaptiveClient:
    """Get the shared Helios client instance."""
    global _adaptive_client_instance
    if _adaptive_client_instance is None:
        _adaptive_client_instance = HeliosAdaptiveClient()
    return _adaptive_client_instance
