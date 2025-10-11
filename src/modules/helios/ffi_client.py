"""
FFI client for communicating with the Haskell Helios engine via shared library.

This module provides a direct FFI interface to the Haskell engine, eliminating
HTTP overhead and providing better performance.
"""

import ctypes
import json
import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class HeliosFFIError(Exception):
    """Exception raised when the Helios FFI encounters an error."""
    pass


class HeliosFFIClient:
    """FFI client for the Haskell Helios engine."""
    
    def __init__(self, library_path: Optional[str] = None):
        """
        Initialize the FFI client.
        
        Args:
            library_path: Path to the Helios shared library. If None, will search
                         in common locations.
        """
        self.library_path = library_path or self._find_library_path()
        self.lib = None
        self._initialize_library()
    
    def _find_library_path(self) -> str:
        """Find the Helios shared library."""
        # Check environment variable first
        env_path = os.getenv("HELIOS_FFI_LIBRARY_PATH")
        if env_path and os.path.exists(env_path):
            return env_path
        
        # Common library names
        lib_names = [
            "libhelios-ffi.so",      # Linux
            "libhelios-ffi.dylib",   # macOS
            "helios-ffi.dll",        # Windows
            "libhelios-ffi.dll",     # Windows alternative
        ]
        
        # Get current working directory
        cwd = os.getcwd()
        
        # Search paths relative to current directory
        search_paths = [
            # Current directory and subdirectories
            cwd,
            os.path.join(cwd, "lib"),
            os.path.join(cwd, "helios-hs", "lib"),
            os.path.join(cwd, "helios-hs"),
        ]
        
        # Search in helios-hs directory recursively for dist-newstyle
        helios_dir = os.path.join(cwd, "helios-hs")
        if os.path.exists(helios_dir):
            for root, dirs, files in os.walk(helios_dir):
                for lib_name in lib_names:
                    if lib_name in files:
                        candidate = os.path.join(root, lib_name)
                        if os.path.exists(candidate) and os.access(candidate, os.R_OK):
                            return candidate
        
        # Search in standard paths
        for search_path in search_paths:
            if os.path.exists(search_path):
                for lib_name in lib_names:
                    candidate = os.path.join(search_path, lib_name)
                    if os.path.exists(candidate) and os.access(candidate, os.R_OK):
                        return candidate
        
        # Try to find using find command if available
        try:
            import subprocess
            result = subprocess.run(
                ["find", helios_dir, "-name", "libhelios-ffi.*", "-type", "f"],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0 and result.stdout.strip():
                candidates = result.stdout.strip().split('\n')
                for candidate in candidates:
                    if os.access(candidate, os.R_OK):
                        return candidate
        except:
            pass
        
        raise HeliosFFIError(f"Could not find Helios shared library. Searched in: {search_paths}")
    
    def _initialize_library(self):
        """Load and initialize the shared library."""
        try:
            # Load the shared library
            self.lib = ctypes.CDLL(self.library_path)
            
            # First, we need to initialize the Haskell runtime
            # Look for the runtime initialization functions from the C stub
            try:
                # Try to get HsStart function from C stub
                self.lib.HsStart.restype = None
                self.lib.HsStart.argtypes = []
                self.lib.HsStart()
            except AttributeError:
                # If HsStart is not available, try direct hs_init
                try:
                    self.lib.hs_init.restype = None
                    self.lib.hs_init.argtypes = [ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_char_p)]
                    
                    # Initialize with dummy arguments
                    argc = ctypes.c_int(1)
                    argv = (ctypes.c_char_p * 2)(b"helios", None)
                    argv_ptr = ctypes.cast(argv, ctypes.POINTER(ctypes.c_char_p))
                    self.lib.hs_init(ctypes.byref(argc), ctypes.byref(argv_ptr))
                except AttributeError:
                    # Runtime might already be initialized or not needed
                    pass
            
            # Define function signatures
            
            # helios_init() -> int
            self.lib.helios_init.restype = ctypes.c_int
            self.lib.helios_init.argtypes = []
            
            # helios_health_check() -> int
            self.lib.helios_health_check.restype = ctypes.c_int
            self.lib.helios_health_check.argtypes = []
            
            # helios_generate_plan(char*) -> char*
            self.lib.helios_generate_plan.restype = ctypes.c_char_p
            self.lib.helios_generate_plan.argtypes = [ctypes.c_char_p]
            
            # helios_review_plan(char*) -> char*
            self.lib.helios_review_plan.restype = ctypes.c_char_p
            self.lib.helios_review_plan.argtypes = [ctypes.c_char_p]
            
            # helios_free_string(char*) -> void
            self.lib.helios_free_string.restype = None
            self.lib.helios_free_string.argtypes = [ctypes.c_char_p]
            
            # helios_version() -> char*
            self.lib.helios_version.restype = ctypes.c_char_p
            self.lib.helios_version.argtypes = []
            
            # Initialize the engine
            result = self.lib.helios_init()
            if result != 0:
                raise HeliosFFIError(f"Failed to initialize Helios engine: {result}")
                
        except OSError as e:
            raise HeliosFFIError(f"Failed to load shared library {self.library_path}: {e}")
        except Exception as e:
            raise HeliosFFIError(f"Failed to initialize FFI library: {e}")
    
    def health_check(self) -> bool:
        """Check if the Haskell engine is healthy."""
        try:
            result = self.lib.helios_health_check()
            return result == 0
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def get_version(self) -> str:
        """Get the version of the Haskell engine."""
        try:
            version_ptr = self.lib.helios_version()
            if version_ptr:
                version = ctypes.string_at(version_ptr).decode('utf-8')
                self.lib.helios_free_string(version_ptr)
                return version
            else:
                return "Unknown"
        except Exception as e:
            logger.error(f"Failed to get version: {e}")
            return "Error"
    
    def generate_plan(self, wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a study plan using the Haskell engine.
        
        Args:
            wizard_data: UI wizard data in the format expected by the Haskell engine
            
        Returns:
            Study plan data from the Haskell engine
            
        Raises:
            HeliosFFIError: If the request fails or returns an error
        """
        try:
            # Convert wizard data to JSON string
            json_input = json.dumps(wizard_data)
            input_bytes = json_input.encode('utf-8')
            
            logger.info("Sending plan generation request to Haskell engine via FFI")
            
            # Call the Haskell function
            result_ptr = self.lib.helios_generate_plan(input_bytes)
            
            if not result_ptr:
                raise HeliosFFIError("Haskell engine returned NULL (plan generation failed)")
            
            # Convert result to Python string
            result_json = ctypes.string_at(result_ptr).decode('utf-8')
            
            # Free the allocated memory
            self.lib.helios_free_string(result_ptr)
            
            # Parse JSON result
            plan_data = json.loads(result_json)
            
            logger.info("Successfully received plan from Haskell engine via FFI")
            return plan_data
            
        except json.JSONDecodeError as e:
            raise HeliosFFIError(f"Invalid JSON response from Haskell engine: {e}")
        except Exception as e:
            raise HeliosFFIError(f"Failed to generate plan via FFI: {e}")
    
    def review_plan(self, plan_data: Dict[str, Any], student_intake: Dict[str, Any]) -> Dict[str, Any]:
        """
        Review a study plan using the Haskell engine.
        
        Args:
            plan_data: Study plan to review
            student_intake: Student intake data
            
        Returns:
            Plan review result from the Haskell engine
            
        Raises:
            HeliosFFIError: If the request fails or returns an error
        """
        try:
            # Create review request
            review_request = {
                "plan": plan_data,
                "intake": student_intake
            }
            
            # Convert to JSON string
            json_input = json.dumps(review_request)
            input_bytes = json_input.encode('utf-8')
            
            logger.info("Sending plan review request to Haskell engine via FFI")
            
            # Call the Haskell function
            result_ptr = self.lib.helios_review_plan(input_bytes)
            
            if not result_ptr:
                raise HeliosFFIError("Haskell engine returned NULL (plan review failed)")
            
            # Convert result to Python string
            result_json = ctypes.string_at(result_ptr).decode('utf-8')
            
            # Free the allocated memory
            self.lib.helios_free_string(result_ptr)
            
            # Parse JSON result
            review_result = json.loads(result_json)
            
            logger.info("Successfully received plan review from Haskell engine via FFI")
            return review_result
            
        except json.JSONDecodeError as e:
            raise HeliosFFIError(f"Invalid JSON response from Haskell engine: {e}")
        except Exception as e:
            raise HeliosFFIError(f"Failed to review plan via FFI: {e}")
    
    def __del__(self):
        """Cleanup when the client is destroyed."""
        # Note: We don't call hs_exit() here as it might be called from other threads
        # The Haskell runtime cleanup should be handled by the application lifecycle
        pass


# Singleton client instance for reuse
_ffi_client_instance: Optional[HeliosFFIClient] = None


def get_helios_ffi_client() -> HeliosFFIClient:
    """Get a shared Helios FFI client instance."""
    global _ffi_client_instance
    if _ffi_client_instance is None:
        _ffi_client_instance = HeliosFFIClient()
    return _ffi_client_instance


def close_helios_ffi_client():
    """Close the shared Helios FFI client instance."""
    global _ffi_client_instance
    if _ffi_client_instance is not None:
        _ffi_client_instance = None
