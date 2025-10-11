import hashlib
import random
import string
from typing import Optional


def generate_student_id(user_id: int) -> str:
    """
    Generate a 6-character hex student ID from user ID.
    
    Args:
        user_id: The user's database ID
        
    Returns:
        6-character hex string (e.g., 'A1B2C3')
    """
    # Use user_id as seed for consistent generation
    random.seed(user_id)
    
    # Generate 6-character hex string
    # Use uppercase letters and numbers, avoiding confusing characters
    chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"  # Removed I, O for clarity
    student_id = ''.join(random.choices(chars, k=6))
    
    # Reset random seed
    random.seed()
    
    return student_id


def validate_student_id(student_id: str) -> bool:
    """
    Validate student ID format.
    
    Args:
        student_id: The student ID to validate
        
    Returns:
        True if valid format, False otherwise
    """
    if not student_id or len(student_id) != 6:
        return False
    
    # Check if all characters are valid hex characters
    valid_chars = set("0123456789ABCDEFGHJKLMNPQRSTUVWXYZ")
    return all(char in valid_chars for char in student_id.upper())


def generate_referral_code(student_id: str) -> str:
    """
    Generate a referral code based on student ID.
    
    Args:
        student_id: The student's ID
        
    Returns:
        Referral code (same as student_id for simplicity)
    """
    return student_id


def validate_referral_code(referral_code: str) -> bool:
    """
    Validate referral code format.
    
    Args:
        referral_code: The referral code to validate
        
    Returns:
        True if valid format, False otherwise
    """
    return validate_student_id(referral_code)
