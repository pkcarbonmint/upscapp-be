from datetime import timedelta, datetime
from dateutil.relativedelta import relativedelta
import pytz

subs = {
    "currentExpiryAt": "2025-06-21T07:05:00.987817Z",
    "paymentStatus": "COMPLETED",
    "subscriptionStatus": "ACTIVE",
    "pgRefId": "OM2406211235011075519778",
    "pgData": {
      "subscriptionId": "OM2406211235011075519778",
      "state": "CREATED",
      "validUpto": 1719126301107,
      
    },
    "id": 407,
    "plan": {
      "id": 13,
      "name": "Prelims New Plan",
      "description": "It is prelims plan",
      "features": [
        {
          "name": "UPSC Prelims Package",
          
        
          "description": "Prelims plan",
          "subFeatures": [
            "Access to a pool of 10k+ question bank",
            "Practice Prelims question anytime from anywhere",
            "Attempt exam seamlessly and get report",
            ".."
          ]
        }
      ],
      "rate": 12000,
      "currency": "INR",
      "billingFrequency": 12,
    
      "tenantId": 1
    },
    "planId": 13,
    "userId": 99,
   
    "adjustmentAmount": 0,
    "subscriptionAmount": 144000,
    "currency": "INR",
   
    "recurringCount": 30,
    "startAt": "2024-01-31T07:05:00.987817Z",
    "current_date": "2025-03-28T07:05:00.987817Z",
    "authReqId": "n6u7JQus8S7BNj4EYMtN1718953507",
   
  }

# Convert startAt to datetime object
start_at = datetime.strptime(subs["startAt"], "%Y-%m-%dT%H:%M:%S.%fZ")
start_at = start_at.replace(tzinfo=pytz.UTC)
# current_date = datetime.now(pytz.UTC)
current_date = datetime.strptime(subs["current_date"], "%Y-%m-%dT%H:%M:%S.%fZ")
current_date = current_date.replace(tzinfo=pytz.UTC)
# print("current date", current_date)

# Calculate the number of months since the subscription started
months_since_start = (current_date.year - start_at.year) * 12 + (current_date.month - start_at.month)

# Calculate the current monthly expiry date
current_monthly_expiry_date = start_at + relativedelta(months=months_since_start)
if current_monthly_expiry_date > current_date:
    current_monthly_expiry_date = start_at + relativedelta(months=months_since_start - 1)

# print("Current monthly expiry date:", current_monthly_expiry_date)


current_date = datetime(2024,8,19)
current_expiry_at = datetime(2025,8,13)
current_monthly_expiry_at = current_date + relativedelta(day=current_expiry_at.day)
prev = current_monthly_expiry_at + relativedelta(months=-1, day=current_expiry_at.day) if current_monthly_expiry_at > current_date else current_monthly_expiry_at
next = prev + relativedelta(months=+1) 

print(f'current_expiry_at: {current_expiry_at} \ncurrent_monthly_expiry_at: {current_monthly_expiry_at} \ntoday: {current_date} \nprev: {prev} \nnext: {next} \n')

