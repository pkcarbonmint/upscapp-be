# 4-Sprint Development Plan

---

### **Sprint 1: Architecture, User Flow & Onboarding**

**Goal:** Define the complete system architecture, user experience, and API contracts, and build the initial student onboarding flow.

-   **System & Service Architecture**
    -   **Service Responsibilities**: Finalize the division of responsibilities for the four backend services: `User`, `Planning`, `Mentorship`, and `Notification`.
    -   **API Contracts (gRPC/Protobuf)**: Create the initial `.proto` files for each service, defining all RPC methods and message structures.
    -   **Project Scaffolding**: Set up the repository structure, build environment, and basic CI/CD for the services.
-   **User Experience & Navigation Design**
    -   **User Navigation Flow**: Document the screen-by-screen navigation journey for both Student and Mentor roles.
    -   **Interaction Mapping**: Document all API calls between the GUI/Chatbot and the backend services.
-   **V1 Implementation**
    -   **UserService**: Implement core user registration and login.
    -   **Intake Form UI**: Build and connect the student intake wizard to the backend.

---

### **Sprint 2: The Helios Planning Engine**

**Goal:** Automatically generate personalized study plans for students.

-   **Initial Plan Generation**: Implement the Helios Engine logic to process a student's intake form and generate a complete, personalized study plan.
-   **Plan Components**: Build the Subject Sequencer, Block Planner, and Weekly Scheduler modules.
-   **Plan Display**: Create the UI for students to view their high-level study timeline and the detailed weekly plan for their current block.
-   **Resource Lists**: Implement the logic to generate curated resource lists for each study block.

---

### **Sprint 3: Mentorship, Accountability & Communication**

**Goal:** Enable the core interaction and feedback loop between mentors and students.

-   **Dashboards**: Develop the initial version of the student and mentor dashboards.
-   **Task Tracking**: Implement the system for students to perform daily check-ins and mark study tasks as complete.
-   **Scheduling V1**: Build the first version of the session scheduling system (mentor availability, student booking).
-   **Feedback V1**: Create the basic mechanism for mentors to leave feedback after a session.
-   **Notifications V1**: Set up initial Telegram/email notifications for key events like session bookings and reminders.

---

### **Sprint 4: Rebalancing, Reporting & Polish**

**Goal:** Introduce dynamic plan adjustments, provide administrative oversight, and refine existing features.

-   **Dynamic Rebalancing**: Implement the second phase of the Helios Engine, allowing plans to be automatically rebalanced based on student progress.
-   **Task Injection**: Allow mentors to add ad-hoc tasks directly into a student's plan.
-   **Admin Reporting**: Build the daily and weekly management reports to track key metrics.
-   **Quality Assurance**: Conduct thorough end-to-end testing of the entire workflow and refine the UI/UX based on feedback.