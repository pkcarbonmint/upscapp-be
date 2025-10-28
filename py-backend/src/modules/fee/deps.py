from datetime import datetime, timedelta, timezone


async def ist_range_to_utc(from_date, till_date):
        # from_date 00:00 IST → UTC
        start_ist = datetime.combine(from_date, datetime.min.time())
        end_ist = datetime.combine(till_date, datetime.max.time())
        
        # shift IST → UTC by subtracting 5h30m
        start_utc = (start_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        end_utc = (end_ist - timedelta(hours=5, minutes=30)).replace(tzinfo=timezone.utc)
        return start_utc, end_utc

