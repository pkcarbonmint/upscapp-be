"""
Adaptive client that can use either HTTP or FFI integration with the Haskell Helios engine.

This module provides a unified interface that automatically selects the best available
integration method based on configuration and availability.
"""

import logging
from typing import Dict, Any, Optional
from .config import HELIOS_INTEGRATION_MODE, HeliosIntegrationMode
from .client import get_helios_client, HeliosClientError
from .ffi_client import get_helios_ffi_client, HeliosFFIError

logger = logging.getLogger(__name__)


class HeliosAdaptiveClient:
    """Adaptive client that uses either HTTP or FFI based on configuration."""
    
    def __init__(self):
        self.mode = HELIOS_INTEGRATION_MODE
        self._http_client = None
        self._ffi_client = None
        logger.info(f"Initialized Helios adaptive client in {self.mode} mode")
    
    async def _get_client(self):
        """Get the appropriate client based on mode."""
        if self.mode == HeliosIntegrationMode.FFI:
            if self._ffi_client is None:
                try:
                    self._ffi_client = get_helios_ffi_client()
                    logger.info("Using FFI client for Helios integration")
                except HeliosFFIError as e:
                    logger.warning(f"FFI client failed, falling back to HTTP: {e}")
                    self.mode = HeliosIntegrationMode.HTTP
            
            if self._ffi_client:
                return self._ffi_client
        
        # Fall back to HTTP or use HTTP if configured
        if self._http_client is None:
            self._http_client = await get_helios_client()
            logger.info("Using HTTP client for Helios integration")
        
        return self._http_client
    
    async def health_check(self) -> bool:
        """Check if the Haskell engine is available."""
        try:
            client = await self._get_client()
            
            if self.mode == HeliosIntegrationMode.FFI:
                return client.health_check()
            else:
                return await client.health_check()
                
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def generate_plan(self, wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a study plan using the available engine."""
        try:
            client = await self._get_client()
            
            if self.mode == HeliosIntegrationMode.FFI:
                return client.generate_plan(wizard_data)
            else:
                return await client.generate_plan(wizard_data)
                
        except (HeliosFFIError, HeliosClientError) as e:
            raise Exception(f"Plan generation failed: {e}")
    
    async def review_plan(self, plan_data: Dict[str, Any], student_intake: Dict[str, Any]) -> Dict[str, Any]:
        """Review a study plan using the available engine."""
        try:
            client = await self._get_client()
            
            if self.mode == HeliosIntegrationMode.FFI:
                return client.review_plan(plan_data, student_intake)
            else:
                return await client.review_plan(plan_data, student_intake)
                
        except (HeliosFFIError, HeliosClientError) as e:
            raise Exception(f"Plan review failed: {e}")


# Singleton instance
_adaptive_client_instance: Optional[HeliosAdaptiveClient] = None


async def get_helios_adaptive_client() -> HeliosAdaptiveClient:
    """Get the shared adaptive client instance."""
    global _adaptive_client_instance
    if _adaptive_client_instance is None:
        _adaptive_client_instance = HeliosAdaptiveClient()
    return _adaptive_client_instance
