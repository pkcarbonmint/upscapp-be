"""
Script to add test faculty users to the database
"""
import asyncio
import sys
import os
from pathlib import Path

# Set minimal environment variables to avoid config loading issues
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:password@localhost:5432/upscapp")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379")
os.environ.setdefault("CMS_BASE_URL", "http://localhost:8000")
os.environ.setdefault("CMS_API_KEY", "test")
os.environ.setdefault("PUSH_NOTIFICATIONS_TOPIC", "test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")
os.environ.setdefault("CORS_HEADERS", "*")
os.environ.setdefault("REGION_NAME", "us-east-1")
os.environ.setdefault("AWS_SECRET_ACCESS_ID", "test")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test")
os.environ.setdefault("BUCKET_NAME", "test")
os.environ.setdefault("EMAIL_HOST", "localhost")
os.environ.setdefault("EMAIL_PORT", "587")
os.environ.setdefault("EMAIL_USER", "test")
os.environ.setdefault("EMAIL_PASSWORD", "test")
os.environ.setdefault("EMAIL_FROM", "test@test.com")
os.environ.setdefault("EMAIL_FROM_NAME", "Test")
os.environ.setdefault("MERCHANT_ID", "test")
os.environ.setdefault("SALT_INDEX", "1")
os.environ.setdefault("SALT_KEY", "test")
os.environ.setdefault("PG_BASE_URL", "http://localhost:8000")
os.environ.setdefault("PG_PAY_BASE_URL", "http://localhost:8000")
os.environ.setdefault("API_BASE_URL", "http://localhost:8000")
os.environ.setdefault("PG_PHONEPE_CALLBACK_API_KEY", "test")
os.environ.setdefault("ZOHO_CLIENT_ID", "test")
os.environ.setdefault("ZOHO_CLIENT_SECRET", "test")
os.environ.setdefault("ZOHO_REFRESH_TOKEN", "test")
os.environ.setdefault("ZOOM_ACCOUNT_ID", "test")
os.environ.setdefault("ZOOM_CLIENT_ID", "test")
os.environ.setdefault("ZOOM_CLIENT_SECRET", "test")

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from src.users.models import User
from src.users.service import UserService
from src.users.schemas import USER_TYPE, USER_ROLE, UserCreate
from src.auth.security import hash_password
from src.config import settings


async def create_test_faculty_users():
    """Create test faculty users for testing"""
    
    print("Creating test faculty users...")
    
    # Create database engine and session
    # Create database engine and session
    database_url = str(settings.DATABASE_URL)
    # Convert to asyncpg URL if it's postgresql
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    # Test faculty users data
    test_faculty_users = [
        {
            "email": "faculty.8888888888@test.com",
            "phone_number": "+918888888888",  # Valid phone format
            "full_name": "Test Faculty (All 8s)",
            "roles": [USER_ROLE.teacher, USER_ROLE.mentor],
            "password": "test123456",
            "test_otp": "666666"  # All 6s for testing
        },
        {
            "email": "faculty.6666666666@test.com", 
            "phone_number": "+916666666666",  # Valid phone format
            "full_name": "Test Faculty (All 6s)",
            "roles": [USER_ROLE.evaluator, USER_ROLE.content_author],
            "password": "test123456",
            "test_otp": "777777"  # All 7s for testing
        },
        {
            "email": "admin.faculty@test.com",
            "phone_number": "+919999999999",  # Valid phone format
            "full_name": "Admin Faculty",
            "roles": [USER_ROLE.org_admin, USER_ROLE.branch_admin],
            "password": "admin123456",
            "test_otp": "123456"  # Standard test OTP
        }
    ]
    
    user_service = UserService(User, async_session)
    created_users = []
    
    async with async_session() as session:
        # Get a valid tenant_id from existing users or create a default one
        tenant_result = await session.execute(text("SELECT tenant_id FROM users WHERE tenant_id IS NOT NULL LIMIT 1"))
        tenant_row = tenant_result.fetchone()
        
        if tenant_row:
            default_tenant_id = tenant_row[0]
            print(f"📋 Using existing tenant_id: {default_tenant_id}")
        else:
            # Create a default tenant if none exists
            print("📋 No tenants found, creating a default tenant...")
            tenant_result = await session.execute(text("""
                INSERT INTO tenants (name, domain, created_at, updated_at) 
                VALUES ('Default Tenant', 'default.local', NOW(), NOW()) 
                RETURNING id
            """))
            default_tenant_id = tenant_result.fetchone()[0]
            print(f"✅ Created default tenant with id: {default_tenant_id}")
        for user_data in test_faculty_users:
            try:
                # Check if user already exists
                existing_user = await user_service.get_by_field(
                    field="email",
                    value=user_data["email"],
                    db_session=session
                )
                
                if existing_user:
                    print(f"⚠️  User with email {user_data['email']} already exists")
                    # Update existing user to be faculty
                    await user_service.update(
                        obj_current=existing_user,
                        obj_new={
                            "is_faculty": True,
                            "user_type": USER_TYPE.workforce,
                            "roles": user_data["roles"],
                            "is_active": True
                        },
                        db_session=session
                    )
                    created_users.append({
                        "user": existing_user,
                        "test_otp": user_data["test_otp"],
                        "action": "updated"
                    })
                    print(f"✅ Updated existing user: {user_data['full_name']} ({user_data['phone_number']})")
                else:
                    # Create new faculty user directly with SQLAlchemy
                    new_user = User(
                        email=user_data["email"],
                        phone_number=user_data["phone_number"],
                        full_name=user_data["full_name"],
                        password=hash_password(user_data["password"]),
                        user_type=USER_TYPE.workforce,
                        is_faculty=True,
                        roles=user_data["roles"],
                        is_active=True,
                        phone_verified=False,
                        tenant_id=default_tenant_id
                    )
                    session.add(new_user)
                    await session.flush()  # Flush to get the ID
                    await session.refresh(new_user)
                    
                    created_users.append({
                        "user": new_user,
                        "test_otp": user_data["test_otp"],
                        "action": "created"
                    })
                    print(f"✅ Created new user: {user_data['full_name']} ({user_data['phone_number']})")
                    
            except Exception as e:
                print(f"❌ Error creating user {user_data['email']}: {str(e)}")
        
        await session.commit()
    
    await engine.dispose()
    
    print("\n" + "="*60)
    print("TEST FACULTY USERS SUMMARY")
    print("="*60)
    
    for user_info in created_users:
        user = user_info["user"]
        test_otp = user_info["test_otp"]
        action = user_info["action"]
        
        print(f"\n📱 Phone: {user.phone_number}")
        print(f"📧 Email: {user.email}")
        print(f"👤 Name: {user.full_name}")
        print(f"🔑 Password: {'test123456' if 'test' in user.email else 'admin123456'}")
        print(f"🎯 Test OTP: {test_otp}")
        print(f"👥 Roles: {', '.join(user.roles) if user.roles else 'None'}")
        print(f"🏷️  Faculty: {user.is_faculty}")
        print(f"📊 User Type: {user.user_type}")
        print(f"✅ Status: {action}")
        print("-" * 40)
    
    print(f"\n🎉 Successfully processed {len(created_users)} faculty users!")
    print("\n📝 TESTING INSTRUCTIONS:")
    print("1. Use the phone numbers above for OTP login")
    print("2. Use the corresponding test OTP codes")
    print("3. Or use email/password login")
    print("4. All users have faculty access enabled")
    
    return created_users


async def cleanup_test_faculty_users():
    """Remove test faculty users (optional cleanup)"""
    print("Cleaning up test faculty users...")
    
    # Create database engine and session
    # Create database engine and session
    database_url = str(settings.DATABASE_URL)
    # Convert to asyncpg URL if it's postgresql
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    user_service = UserService(User, async_session)
    test_emails = [
        "faculty.8888888888@test.com",
        "faculty.6666666666@test.com", 
        "admin.faculty@test.com"
    ]
    
    async with async_session() as session:
        for email in test_emails:
            try:
                user = await user_service.get_by_field(
                    field="email",
                    value=email,
                    db_session=session
                )
                if user:
                    await user_service.delete(id=user.id, db_session=session)
                    print(f"🗑️  Deleted test user: {email}")
            except Exception as e:
                print(f"❌ Error deleting user {email}: {str(e)}")
        
        await session.commit()
    
    await engine.dispose()


async def list_faculty_users():
    """List all faculty users in the database"""
    print("Listing all faculty users...")
    
    # Create database engine and session
    database_url = str(settings.DATABASE_URL)
    # Convert to asyncpg URL if it's postgresql
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    user_service = UserService(User, async_session)
    
    try:
        async with async_session() as session:
            # Get all users with is_faculty=True
            faculty_users = await user_service.get_all(
                filters={"is_faculty": True},
                db_session=session
            )
            
            if not faculty_users:
                print("No faculty users found.")
                return
            
            print(f"\nFound {len(faculty_users)} faculty users:")
            print("="*60)
            
            for user in faculty_users:
                print(f"\n📱 Phone: {user.phone_number}")
                print(f"📧 Email: {user.email}")
                print(f"👤 Name: {user.full_name}")
                print(f"👥 Roles: {', '.join(user.roles) if user.roles else 'None'}")
                print(f"🏷️  Faculty: {user.is_faculty}")
                print(f"📊 User Type: {user.user_type}")
                print(f"✅ Active: {user.is_active}")
                print("-" * 40)
        
        await engine.dispose()
                
    except Exception as e:
        print(f"❌ Error listing faculty users: {str(e)}")
        await engine.dispose()


async def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Manage test faculty users")
    parser.add_argument("--action", choices=["create", "list", "cleanup"], 
                       default="create", help="Action to perform")
    
    args = parser.parse_args()
    
    try:
        if args.action == "create":
            await create_test_faculty_users()
        elif args.action == "list":
            await list_faculty_users()
        elif args.action == "cleanup":
            await cleanup_test_faculty_users()
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
