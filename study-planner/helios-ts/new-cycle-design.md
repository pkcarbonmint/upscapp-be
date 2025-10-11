We should redesign the cycles the following ways:

We will have the following cycle types:
"C1"|"C2"|"C3"|"C4"|"C5"|"C6"|"C7"|"C8"


Cycle descriptions:
    C1 = NCERT Foundation Cycle
    C2 = Comprehensive Foundation Cycle
    C3 = Mains Pre-Foundation Cycle
    C4 = Prelims Revision Cycle
    C5 = Prelims Rapid Revision Cycle
    C6 = Mains Revision Cycle
    C7 = Mains Rapid Revision Cycle
    C8 = Mains Foundation Cycle

Rules for scheduling cycles based on time to prelims exam date. Let's call this totalTimeAvailable in months:

1. (Scenario S1) If totalTimeAvailable >= 20 months, we will have the following cycles:
    C1: 3 months
    C2: 10 months
    C3: 2 months (should end Dec 31 the year before target year) - extend if there's extra time
    C4: Jan 1 to March 31 of target year
    C5: April 1 to till prelims exam date
    C6: May 21 till July 31 of target year
    C7: Aug 1 till mains exam date

2. (S2) If totalTimeAvailable is between 18 and 20 months:
    C1: 3 months
    C2: 10 months
    C3: 2 months (should end Dec 31 the year before target year) - extend if there's extra time
    C4: Jan 1 to March 31 of target year
    C5: April 1 to till prelims exam date
    C6: May 21 till July 31 of target year
    C7: Aug 1 till mains exam date

3. (S3) If totalTimeAvailable is between 15 and 18 months:
    C1: 3 months
    C2: shrink from 10 months of S2 to available time until Dec 31 of the year before target year. C2 should have a minimum of 7 months
    C3: No C3
    C4: Jan 1 to March 31 of target year
    C5: April 1 to till prelims exam date
    C6: May 21 till July 31 of target year
    C7: Aug 1 till mains exam date

4. (S4) If totalTimeAvailable is between 12 and 15 months:
    C1: No C1
    C2: shrink to available time until Dec 31 of the year before target year (minimum 7 months)
    C3: No C3
    C4: Jan 1 to March 31 of target year
    C5: April 1 to till prelims exam date
    C6: May 21 till July 31 of target year
    C7: Aug 1 till mains exam date

5. (S5) If you have > 15 days in the year before target year, then:
    C1: No C1
    C2: No C2
    C3: No C3
    C8: start date until Dec 31 of the year before target year
    C4: Jan 1 to March 31 of target year
    C5: April 1 to till prelims exam date
    C6: May 21 till July 31 of target year
    C7: Aug 1 till mains exam date

6. (S6) Start date of Dec 16 of the year before target year until Jan 15 of the target year:
    C1: No C1
    C2: No C2
    C3: No C3
    C8: No C8
    C4: Start date till March 31 of target year
    C5: April 1 to till prelims exam date
    C6: May 21 till July 31 of target year
    C7: Aug 1 till mains exam date

7. (S7) Start date of March 1 of the target year until April 15 of target year:
    C1: No C1
    C2: No C2
    C3: No C3
    C8: No C8
    C4: No C4
    C5: Start date till Prelims exam date
    C6: May 21 till July 31 of target year
    C7: Aug 1 till mains exam date

8. (S8) Start date of April 16 of the target year until May 15 of target year:
    - Suggest next year as target year (reject)