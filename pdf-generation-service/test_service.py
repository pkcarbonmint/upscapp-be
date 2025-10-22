#!/usr/bin/env python3
"""
Test script for the PDF generation service.
This script tests various endpoints and functionality.
"""

import requests
import json
import time
import os
from typing import Dict, Any


class PDFServiceTester:
    """Test class for PDF generation service."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, message: str = "", duration: float = 0):
        """Log test results."""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name} ({duration:.2f}s)")
        if message:
            print(f"    {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "duration": duration
        })
    
    def test_health_check(self):
        """Test health check endpoint."""
        start_time = time.time()
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, "Service is healthy", duration)
                else:
                    self.log_test("Health Check", False, f"Unhealthy status: {data}", duration)
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", duration)
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("Health Check", False, f"Exception: {str(e)}", duration)
    
    def test_sample_data_endpoints(self):
        """Test sample data endpoints."""
        endpoints = [
            "/sample-data/study-plan",
            "/sample-data/student-intake"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                duration = time.time() - start_time
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        self.log_test(f"Sample Data {endpoint}", True, f"Returned {len(data)} fields", duration)
                    else:
                        self.log_test(f"Sample Data {endpoint}", False, "Empty response", duration)
                else:
                    self.log_test(f"Sample Data {endpoint}", False, f"HTTP {response.status_code}", duration)
            
            except Exception as e:
                duration = time.time() - start_time
                self.log_test(f"Sample Data {endpoint}", False, f"Exception: {str(e)}", duration)
    
    def test_pdf_generation(self):
        """Test PDF generation with sample data."""
        start_time = time.time()
        try:
            # Get sample data
            study_plan_response = requests.get(f"{self.base_url}/sample-data/study-plan")
            student_intake_response = requests.get(f"{self.base_url}/sample-data/student-intake")
            
            if study_plan_response.status_code != 200 or student_intake_response.status_code != 200:
                self.log_test("PDF Generation", False, "Failed to get sample data")
                return
            
            # Create request payload
            request_data = {
                "study_plan": study_plan_response.json(),
                "student_intake": student_intake_response.json(),
                "filename": "test-study-plan.pdf"
            }
            
            # Test PDF generation endpoint
            response = requests.post(
                f"{self.base_url}/generate-pdf",
                json=request_data,
                timeout=60
            )
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    file_size = data.get("file_size", 0)
                    gen_time = data.get("generation_time", 0)
                    self.log_test("PDF Generation", True, 
                                f"Generated {file_size} bytes in {gen_time}s", duration)
                else:
                    self.log_test("PDF Generation", False, f"Generation failed: {data.get('message')}", duration)
            else:
                self.log_test("PDF Generation", False, f"HTTP {response.status_code}: {response.text}", duration)
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("PDF Generation", False, f"Exception: {str(e)}", duration)
    
    def test_pdf_download(self):
        """Test PDF download endpoint."""
        start_time = time.time()
        try:
            # Get sample data
            study_plan_response = requests.get(f"{self.base_url}/sample-data/study-plan")
            student_intake_response = requests.get(f"{self.base_url}/sample-data/student-intake")
            
            if study_plan_response.status_code != 200 or student_intake_response.status_code != 200:
                self.log_test("PDF Download", False, "Failed to get sample data")
                return
            
            # Create request payload
            request_data = {
                "study_plan": study_plan_response.json(),
                "student_intake": student_intake_response.json(),
                "filename": "download-test.pdf"
            }
            
            # Test PDF download endpoint
            response = requests.post(
                f"{self.base_url}/generate-pdf-download",
                json=request_data,
                timeout=60
            )
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                if 'application/pdf' in content_type and content_length > 1000:
                    # Save test file
                    with open('test_download.pdf', 'wb') as f:
                        f.write(response.content)
                    
                    self.log_test("PDF Download", True, 
                                f"Downloaded {content_length} bytes PDF", duration)
                else:
                    self.log_test("PDF Download", False, 
                                f"Invalid response: {content_type}, {content_length} bytes", duration)
            else:
                self.log_test("PDF Download", False, f"HTTP {response.status_code}", duration)
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("PDF Download", False, f"Exception: {str(e)}", duration)
    
    def test_quick_generate(self):
        """Test the quick test endpoint."""
        start_time = time.time()
        try:
            response = requests.post(f"{self.base_url}/test-generate", timeout=60)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                if 'application/pdf' in content_type and content_length > 1000:
                    # Save test file
                    with open('quick_test.pdf', 'wb') as f:
                        f.write(response.content)
                    
                    self.log_test("Quick Generate", True, 
                                f"Generated {content_length} bytes PDF", duration)
                else:
                    self.log_test("Quick Generate", False, 
                                f"Invalid response: {content_type}, {content_length} bytes", duration)
            else:
                self.log_test("Quick Generate", False, f"HTTP {response.status_code}", duration)
        
        except Exception as e:
            duration = time.time() - start_time
            self.log_test("Quick Generate", False, f"Exception: {str(e)}", duration)
    
    def run_all_tests(self):
        """Run all tests."""
        print("🚀 Starting PDF Generation Service Tests")
        print("=" * 50)
        
        # Run tests
        self.test_health_check()
        self.test_sample_data_endpoints()
        self.test_pdf_generation()
        self.test_pdf_download()
        self.test_quick_generate()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 Test Summary")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        # Clean up test files
        test_files = ['test_download.pdf', 'quick_test.pdf']
        for file in test_files:
            if os.path.exists(file):
                print(f"\n📁 Generated test file: {file}")
        
        return passed_tests == total_tests


def main():
    """Main test function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test PDF Generation Service")
    parser.add_argument("--url", default="http://localhost:8000", 
                       help="Base URL of the service (default: http://localhost:8000)")
    parser.add_argument("--quick", action="store_true", 
                       help="Run only quick tests")
    
    args = parser.parse_args()
    
    tester = PDFServiceTester(args.url)
    
    if args.quick:
        print("🏃 Running quick tests only...")
        tester.test_health_check()
        tester.test_quick_generate()
    else:
        success = tester.run_all_tests()
        
        if success:
            print("\n🎉 All tests passed!")
            exit(0)
        else:
            print("\n💥 Some tests failed!")
            exit(1)


if __name__ == "__main__":
    main()