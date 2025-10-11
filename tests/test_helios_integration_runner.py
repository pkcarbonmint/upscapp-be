#!/usr/bin/env python3
"""
Integration test runner for Helios engine.

This script provides a convenient way to run Helios integration tests
with proper setup and reporting.
"""

import subprocess
import sys
import time
import requests
from typing import Optional


def check_helios_engine(url: str = "http://localhost:8080", timeout: int = 5) -> bool:
    """Check if Helios engine is running and accessible."""
    try:
        response = requests.get(f"{url}/health", timeout=timeout)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False


def wait_for_helios_engine(url: str = "http://localhost:8080", max_wait: int = 30) -> bool:
    """Wait for Helios engine to become available."""
    print(f"Waiting for Helios engine at {url}...")
    
    for i in range(max_wait):
        if check_helios_engine(url):
            print(f"✅ Helios engine is ready!")
            return True
        
        print(f"⏳ Waiting... ({i+1}/{max_wait})")
        time.sleep(1)
    
    return False


def run_integration_tests(test_file: str = "test_helios_integration.py") -> int:
    """Run the integration tests."""
    print(f"\n🧪 Running integration tests: {test_file}")
    print("=" * 60)
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            f"tests/{test_file}",
            "-v", 
            "--tb=short",
            "--color=yes"
        ], check=False)
        
        return result.returncode
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return 1


def main():
    """Main test runner."""
    print("🎯 HELIOS ENGINE INTEGRATION TEST RUNNER")
    print("=" * 60)
    
    # Check if Helios engine is running
    if not check_helios_engine():
        print("❌ Helios engine is not running at http://localhost:8080")
        print("\n📋 To start Helios engine:")
        print("   cd helios-hs")
        print("   stack run")
        print("   # or your preferred method")
        print("\n🔄 Waiting for engine to start...")
        
        if not wait_for_helios_engine():
            print("❌ Helios engine did not start within 30 seconds")
            print("Please start the Helios engine manually and try again.")
            return 1
    else:
        print("✅ Helios engine is running")
    
    # Run the tests
    exit_code = run_integration_tests()
    
    if exit_code == 0:
        print("\n🎉 All integration tests passed!")
    else:
        print(f"\n❌ Integration tests failed with exit code: {exit_code}")
    
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
