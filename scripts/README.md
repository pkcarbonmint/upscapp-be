# Test Faculty Users Setup

This directory contains scripts to create test faculty users for development and testing.

## Quick Setup

### Option 1: Shell Script (Recommended)
```bash
./scripts/create_test_faculty.sh
```

### Option 2: Python Script
```bash
python scripts/simple_test_faculty.py
```

### Option 3: Advanced Script
```bash
python scripts/create_test_faculty.py --action create
```

## Test Faculty Users Created

| Phone Number | Email | Password | Test OTP | Roles |
|--------------|-------|----------|----------|-------|
| 8888888888 | faculty888@test.com | test123456 | 666666 | Teacher |
| 6666666666 | faculty666@test.com | test123456 | 777777 | Mentor |

## Testing Instructions

### 1. OTP Login (Recommended)
1. Go to faculty login page
2. Select "Phone" login mode
3. Enter phone number: `8888888888` or `6666666666`
4. Click "Send Verification Code"
5. Enter the corresponding test OTP:
   - `8888888888` → `666666`
   - `6666666666` → `777777`
6. Click "Verify Code"
7. You'll be automatically logged in and redirected to dashboard

### 2. Email/Password Login
1. Go to faculty login page
2. Select "Email" login mode
3. Enter email: `faculty888@test.com` or `faculty666@test.com`
4. Enter password: `test123456`
5. Click "Sign in"

## Additional Commands

### List All Faculty Users
```bash
python scripts/create_test_faculty.py --action list
```

### Clean Up Test Users
```bash
python scripts/create_test_faculty.py --action cleanup
```

## OTP Service Integration

The OTP service has been configured to automatically return the correct test OTPs:

- Phone `8888888888` always gets OTP `666666`
- Phone `6666666666` always gets OTP `777777`
- Other phone numbers get random OTPs

This ensures consistent testing without needing real SMS.

## Faculty Validation

All test users are created with:
- ✅ `user_type = USER_TYPE.workforce`
- ✅ `is_faculty = True`
- ✅ Appropriate roles (teacher, mentor, etc.)
- ✅ `is_active = True`
- ✅ `phone_verified = False` (will be set to True after OTP verification)

## Troubleshooting

### User Already Exists
If you see "User already exists" messages, the script will update the existing user to have faculty access.

### Database Connection Issues
Make sure your database is running and the connection is configured properly.

### Permission Issues
Make sure the script has proper database access permissions.

## Security Note

These test users are for development only. Do not use these credentials in production!