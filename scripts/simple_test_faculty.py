"""
Simple script to add test faculty users
Run with: python scripts/simple_test_faculty.py
"""
import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.users.models import User
from src.users.service import UserService
from src.users.schemas import USER_TYPE, USER_ROLE
from src.auth.security import hash_password
from fastapi_async_sqlalchemy import db


async def create_test_faculty():
    """Create test faculty users"""
    
    print("🚀 Creating test faculty users...")
    
    user_service = UserService(User, db)
    
    # Test users data
    test_users = [
        {
            "email": "faculty888@test.com",
            "phone_number": "8888888888", 
            "full_name": "Test Faculty (All 8s)",
            "password": "test123456",
            "roles": [USER_ROLE.teacher],
            "test_otp": "666666"
        },
        {
            "email": "faculty666@test.com",
            "phone_number": "6666666666",
            "full_name": "Test Faculty (All 6s)", 
            "password": "test123456",
            "roles": [USER_ROLE.mentor],
            "test_otp": "777777"
        }
    ]
    
    for user_data in test_users:
        try:
            # Check if exists
            existing = await user_service.get_by_field(
                field="email", 
                value=user_data["email"],
                db_session=db.session
            )
            
            if existing:
                print(f"⚠️  User {user_data['email']} already exists")
                # Update to faculty
                await user_service.update(
                    obj_current=existing,
                    obj_new={
                        "is_faculty": True,
                        "user_type": USER_TYPE.workforce,
                        "roles": user_data["roles"],
                        "is_active": True
                    },
                    db_session=db.session
                )
                print(f"✅ Updated {user_data['full_name']}")
            else:
                # Create new
                new_user = await user_service.create(
                    obj_in={
                        "email": user_data["email"],
                        "phone_number": user_data["phone_number"],
                        "full_name": user_data["full_name"],
                        "password": hash_password(user_data["password"]),
                        "user_type": USER_TYPE.workforce,
                        "is_faculty": True,
                        "roles": user_data["roles"],
                        "is_active": True,
                        "phone_verified": False
                    },
                    db_session=db.session
                )
                print(f"✅ Created {user_data['full_name']}")
            
            print(f"   📱 Phone: {user_data['phone_number']}")
            print(f"   🔑 Password: {user_data['password']}")
            print(f"   🎯 Test OTP: {user_data['test_otp']}")
            print()
            
        except Exception as e:
            print(f"❌ Error with {user_data['email']}: {e}")
    
    print("🎉 Test faculty users ready!")
    print("\n📝 Testing Instructions:")
    print("1. Use phone numbers: 8888888888 or 6666666666")
    print("2. Use test OTPs: 666666 or 777777 respectively")
    print("3. Or login with email/password")


if __name__ == "__main__":
    asyncio.run(create_test_faculty())



