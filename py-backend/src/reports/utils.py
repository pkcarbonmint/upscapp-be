import datetime

def format_date(date_str):
   
    date_obj = datetime.datetime.fromisoformat(date_str.split('.')[0])
    formatted_date = date_obj.strftime("%b %d, %Y - %I:%M %p")
    return formatted_date


current_time = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))

today_date = current_time.strftime("%a,%b %d, %Y").upper()

def format_seconds(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = int(seconds % 60)
    return f'{hours:02}:{minutes:02}:{seconds:02}'

def format_test_duration(minutes):
    mins = int(minutes)
    secs = int((minutes - mins) * 60)
    formatted_time = f'00:{mins:02d}:{secs:02d}'
    return formatted_time


def get_tests_taken(tests_taken, test_type):
    for item in tests_taken:
        if item['test_type'] == test_type:
            return item['tests_taken']
    return 0 

def get_qb_tests_taken(tests_taken, ta_mode):
    for item in tests_taken:
        if item['ta_mode'] == ta_mode:
            return item['tests_taken']
    return 0             