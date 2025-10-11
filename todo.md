1. DualSubject, TripleSubject support - need to take from StudentIntake and use it in the plan generation code.
3. subtopics need to be added
4. Download needs to be fixed adn verified
5. catchup day
6. editor

OLD stuff:
1. The generated blocks are going beyond end dates - for example, prelims rapid revision cycle should end on May 20, but some blocks are going beyond that. We need to drop subtopics from the blocks to fit in the end date. When that is not enough, we need to proportionately reduce the hours of the subjects.
2. resources need to be added to config files

3. ensure that the confidence step uses the same subject data structure from helios-ts library. REmove any subject related data structures from @onboarding-ui/ 

Integrate resource JSON files with docker build system

Add a way to generate a word document of a plan.  First create a script to create word documents for the scenarios in Oct2t_*test.ts files.
Then integrate the word document generation with onboarding-ui and the python code. Some code already exists, ensure that the python code and frontend code are consistent with the latest plan generation code.




1. Make student IDs small with 6-8 digit hex - usable while sending referral links to others.
2. Save incoming referrals in a separate table with student ID and referral code.
3. Create a plan editor - a simple but easy to understand, no-frills plan editor that uses the cycle-block-week-task structure
4. When student goes to the final step, save the plan in the DB, in 'review' state.
5. Create study planner faculty app - they should be able to see plans in 'review' state, edit and then approve the plan. Then the plan will change state to 'approved' and send a link to the plan to the student, by email.
6. For returning users, provide a way to login using their phone number and OTP, and show their approved plan if it's there, or ask them to wait for an email.
7. referral codes
8. check that all data is captured
9. Show name of the user once it's given to us
10. Verify that the student is recognized when he comes back (by phone number?)
11. Ask for telegram ID - auth would be better
12. Get firebase creds files (dev) or are they existing somewhere already
13. Deploy - ui
14. Deploy docker-compose
15. Review python code
16. Google analytics integration
13. Google calendar integration (and google auth)
14. Add copyright message
15. Logo

DONE

2. QR/link for sharing
12. Confidence screen - Star buttons are not clickable
16. Confidence screen - add a note about what we're asking
