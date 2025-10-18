Scheduler library testing:

1. Enough time to allocate for all subjects in all cycles. Verify that all subjects are given a minimum time specified by the subject
2. More time than required. Verify that subjects are given extra time
3. Give just enough time to drop something. Verify that the correct thing is dropped
4. severely compressed timeline. Only essentials are kept, everything else dropped.  Verify dropping is correctly done.
5. Verify GS:Optional ratio in the above scenarios