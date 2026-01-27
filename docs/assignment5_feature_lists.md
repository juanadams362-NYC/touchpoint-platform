\# Assignment 5 — Feature Lists (TouchPoint Platform)

TouchPoint is a task-based NFC interaction platform designed to log intentional physical interactions (tap events) as real-world actions. Class Attendance is the active example scenario, but the platform is designed to support other tasks like Event Check-In and Access Control.

\# Assignment 5 — Feature Lists (TouchPoint Platform)

TouchPoint is a task-based NFC interaction platform designed to log intentional physical interactions (tap events) as real-world actions. Class Attendance is the active example scenario, but the platform is designed to support other tasks like Event Check-In and Access Control.



---



\## 1) PP4 Feature List (Final Project Feature Set)

These are the planned features for the full Project \& Portfolio IV version (scoped as a student portfolio project with a clear “future expansion” plan).



\### Core Platform (Task-Based)

1\. \*\*Task System (Configurable “Active Task”)\*\*

&nbsp;  - Admin selects an Active Task (ex: Class Attendance)

&nbsp;  - Task determines what happens when a tag is tapped (rules + output)

2\. \*\*Task Templates (Future-Visible)\*\*

&nbsp;  - Show additional task types as future capabilities:

&nbsp;    - Event Check-In

&nbsp;    - Access Control

&nbsp;    - Automation / Shortcuts

3\. \*\*Task Rules / Behavior Settings\*\*

&nbsp;  - Configure task behavior such as:

&nbsp;    - time window (start/end)

&nbsp;    - cooldown (anti-spam)

&nbsp;    - allowed tag types

&nbsp;    - location / device association (optional)

4\. \*\*Device Registration\*\*

&nbsp;  - Register an ESP32+reader as a “scanner device”

&nbsp;  - Assign it to a room or location label (ex: “Lab 3”)



\### Attendance Scenario (Active Example Task)

5\. \*\*Roster Support\*\*

&nbsp;  - Instructor can view roster for a class session

6\. \*\*Tap-to-Check-In\*\*

&nbsp;  - Student taps NFC card/tag

&nbsp;  - System logs a check-in with timestamp + device/session

7\. \*\*Live Session View\*\*

&nbsp;  - Instructor sees check-ins update in real-time (or refresh)

8\. \*\*Student Detail Hover/Tap\*\*

&nbsp;  - Hover (web) or tap (mobile) shows student info card

9\. \*\*Exceptions Handling\*\*

&nbsp;  - Highlight unknown/unregistered tags

&nbsp;  - Highlight late check-ins (based on session rules)



\### Accounts / Roles (Lightweight)

10\. \*\*Instructor Role View\*\*

&nbsp;  - Instructor can start/stop a session and view results

11\. \*\*Student Identity Mapping\*\*

&nbsp;  - Map NFC tag UID → student profile (admin/instructor action)



\### Data / Reporting

12\. \*\*Attendance History\*\*

&nbsp;  - View past sessions + exports (CSV export optional)

13\. \*\*Audit Log\*\*

&nbsp;  - Tap events logged with device + timestamp + result (accepted/rejected)



\### Future Expansion (Not required for prototype, but designed for)

14\. \*\*Event Check-In Mode\*\*

15\. \*\*Access Control Mode\*\*

16\. \*\*Automation Mode (trigger actions after tap)\*\*

17\. \*\*Multi-device deployments across rooms\*\*

18\. \*\*Advanced security (encryption, signed tokens)\*\*



---



\## 2) R\&D Feature List (Proof the Tech Stack Works Together)

These are the minimum meaningful features that prove the full technology chain works interdependently for the project: UI → API → Database and (attempted) Hardware integration.



\### UI (React Native Web-ready)

1\. \*\*Active Task Display (Attendance as example)\*\*

&nbsp;  - UI clearly shows Active Task: “Class Attendance”

2\. \*\*Session Screen (Instructor view)\*\*

&nbsp;  - Start session (creates a session record)

&nbsp;  - End session (closes session record)

3\. \*\*Live Attendance List\*\*

&nbsp;  - Pull check-ins for the active session from API

&nbsp;  - Display students checked in + timestamp

4\. \*\*Student Detail Interaction\*\*

&nbsp;  - Hover/tap to reveal student detail card



\### Backend API (Node.js or ASP.NET Core)

5\. \*\*Create Session Endpoint\*\*

&nbsp;  - POST /sessions (creates active attendance session)

6\. \*\*Log Tap / Check-In Endpoint\*\*

&nbsp;  - POST /checkins (accepts tag UID + sessionId + deviceId)

7\. \*\*Query Session Results Endpoint\*\*

&nbsp;  - GET /sessions/{id}/checkins (returns list for UI)

8\. \*\*Basic Validation\*\*

&nbsp;  - Reject unknown UIDs (or mark as “unmapped”)

&nbsp;  - Apply cooldown rule (optional basic)



\### Database (Persistent Storage)

9\. \*\*Tables to Prove Persistence\*\*

&nbsp;  - Students (or Users)

&nbsp;  - Tags (UID mapping)

&nbsp;  - Devices

&nbsp;  - Sessions

&nbsp;  - CheckIns (tap logs)

10\. \*\*End-to-End Persistence\*\*

&nbsp;  - UI triggers session creation → stored in DB

&nbsp;  - Check-in created via API → stored in DB

&nbsp;  - UI queries results → reads from DB



\### Hardware (ESP32 + PN532)

11\. \*\*ESP32 Firmware Upload Proof\*\*

&nbsp;  - Serial heartbeat confirms firmware execution

12\. \*\*PN532 Integration Attempt\*\*

&nbsp;  - PN532 I2C attempt logged with “not detected” output

&nbsp;  - Constraint identified (board variant / IRQ-RESET wiring / connector availability)

13\. \*\*Planned Hardware-to-API Bridge (Next Iteration)\*\*

&nbsp;  - Once UID read works, ESP32 will send UID to backend endpoint over Wi-Fi



---



\## Notes on Scope (One-Month Student Project)

\- The R\&D list is intentionally small: it proves the chain works without building every “app feature.”

\- The PP4 list includes future-visible capabilities, but only Attendance is required for the active example scenario.

\- Hardware limitations discovered during R\&D are documented and used to guide next iteration.



---



\## 1) PP4 Feature List (Final Project Feature Set)

These are the planned features for the full Project \& Portfolio IV version (scoped as a student portfolio project with a clear “future expansion” plan).



\### Core Platform (Task-Based)

1\. \*\*Task System (Configurable “Active Task”)\*\*

&nbsp;  - Admin selects an Active Task (ex: Class Attendance)

&nbsp;  - Task determines what happens when a tag is tapped (rules + output)

2\. \*\*Task Templates (Future-Visible)\*\*

&nbsp;  - Show additional task types as future capabilities:

&nbsp;    - Event Check-In

&nbsp;    - Access Control

&nbsp;    - Automation / Shortcuts

3\. \*\*Task Rules / Behavior Settings\*\*

&nbsp;  - Configure task behavior such as:

&nbsp;    - time window (start/end)

&nbsp;    - cooldown (anti-spam)

&nbsp;    - allowed tag types

&nbsp;    - location / device association (optional)

4\. \*\*Device Registration\*\*

&nbsp;  - Register an ESP32+reader as a “scanner device”

&nbsp;  - Assign it to a room or location label (ex: “Lab 3”)



\### Attendance Scenario (Active Example Task)

5\. \*\*Roster Support\*\*

&nbsp;  - Instructor can view roster for a class session

6\. \*\*Tap-to-Check-In\*\*

&nbsp;  - Student taps NFC card/tag

&nbsp;  - System logs a check-in with timestamp + device/session

7\. \*\*Live Session View\*\*

&nbsp;  - Instructor sees check-ins update in real-time (or refresh)

8\. \*\*Student Detail Hover/Tap\*\*

&nbsp;  - Hover (web) or tap (mobile) shows student info card

9\. \*\*Exceptions Handling\*\*

&nbsp;  - Highlight unknown/unregistered tags

&nbsp;  - Highlight late check-ins (based on session rules)



\### Accounts / Roles (Lightweight)

10\. \*\*Instructor Role View\*\*

&nbsp;  - Instructor can start/stop a session and view results

11\. \*\*Student Identity Mapping\*\*

&nbsp;  - Map NFC tag UID → student profile (admin/instructor action)



\### Data / Reporting

12\. \*\*Attendance History\*\*

&nbsp;  - View past sessions + exports (CSV export optional)

13\. \*\*Audit Log\*\*

&nbsp;  - Tap events logged with device + timestamp + result (accepted/rejected)



\### Future Expansion (Not required for prototype, but designed for)

14\. \*\*Event Check-In Mode\*\*

15\. \*\*Access Control Mode\*\*

16\. \*\*Automation Mode (trigger actions after tap)\*\*

17\. \*\*Multi-device deployments across rooms\*\*

18\. \*\*Advanced security (encryption, signed tokens)\*\*



---



\## 2) R\&D Feature List (Proof the Tech Stack Works Together)

These are the minimum meaningful features that prove the full technology chain works interdependently for the project: UI → API → Database and (attempted) Hardware integration.



\### UI (React Native Web-ready)

1\. \*\*Active Task Display (Attendance as example)\*\*

&nbsp;  - UI clearly shows Active Task: “Class Attendance”

2\. \*\*Session Screen (Instructor view)\*\*

&nbsp;  - Start session (creates a session record)

&nbsp;  - End session (closes session record)

3\. \*\*Live Attendance List\*\*

&nbsp;  - Pull check-ins for the active session from API

&nbsp;  - Display students checked in + timestamp

4\. \*\*Student Detail Interaction\*\*

&nbsp;  - Hover/tap to reveal student detail card



\### Backend API (Node.js or ASP.NET Core)

5\. \*\*Create Session Endpoint\*\*

&nbsp;  - POST /sessions (creates active attendance session)

6\. \*\*Log Tap / Check-In Endpoint\*\*

&nbsp;  - POST /checkins (accepts tag UID + sessionId + deviceId)

7\. \*\*Query Session Results Endpoint\*\*

&nbsp;  - GET /sessions/{id}/checkins (returns list for UI)

8\. \*\*Basic Validation\*\*

&nbsp;  - Reject unknown UIDs (or mark as “unmapped”)

&nbsp;  - Apply cooldown rule (optional basic)



\### Database (Persistent Storage)

9\. \*\*Tables to Prove Persistence\*\*

&nbsp;  - Students (or Users)

&nbsp;  - Tags (UID mapping)

&nbsp;  - Devices

&nbsp;  - Sessions

&nbsp;  - CheckIns (tap logs)

10\. \*\*End-to-End Persistence\*\*

&nbsp;  - UI triggers session creation → stored in DB

&nbsp;  - Check-in created via API → stored in DB

&nbsp;  - UI queries results → reads from DB



\### Hardware (ESP32 + PN532)

11\. \*\*ESP32 Firmware Upload Proof\*\*

&nbsp;  - Serial heartbeat confirms firmware execution

12\. \*\*PN532 Integration Attempt\*\*

&nbsp;  - PN532 I2C attempt logged with “not detected” output

&nbsp;  - Constraint identified (board variant / IRQ-RESET wiring / connector availability)

13\. \*\*Planned Hardware-to-API Bridge (Next Iteration)\*\*

&nbsp;  - Once UID read works, ESP32 will send UID to backend endpoint over Wi-Fi



---



\## Notes on Scope (One-Month Student Project)

\- The R\&D list is intentionally small: it proves the chain works without building every “app feature.”

\- The PP4 list includes future-visible capabilities, but only Attendance is required for the active example scenario.

\- Hardware limitations discovered during R\&D are documented and used to guide next iteration.



