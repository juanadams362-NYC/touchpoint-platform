Milestone 2 focused on completing a functional, full-stack version of the Class Attendance module. The system now includes authentication, role-based access control, database integration, instructor workflows, and hardware API integration.



The goal was to move beyond UI prototype into a working application architecture.



---



\## ✅ Completed Features



\### 1. Authentication (JWT)

\- User registration with password hashing (bcrypt)

\- Secure login issuing JWT tokens

\- Protected routes using `requireAuth` middleware

\- Role-based route protection (Student / Instructor / Admin)



\### 2. Database Integration (SQLite)

\- Users table

\- Classes table

\- Enrollments table

\- Attendance requests table

\- Tap events table

\- Devices table



All core attendance logic persists to SQLite.



\### 3. Role-Based UI + Workflows



\#### Student Flow

\- Dashboard

\- Class enrollment

\- Request Check-In (if no NFC UID linked)

\- Settings page to link NFC UID

\- Restricted from instructor/admin-only routes



\#### Instructor Flow

\- Class Monitor dashboard

\- View roster

\- View pending check-in requests

\- Approve / Reject attendance requests

\- Manual attendance override (“Mark Present”)



\#### Admin Flow

\- Extended system visibility

\- Device list view

\- Backend health status



\### 4. ESP32 Hardware Integration



\- ESP32 connects to WiFi

\- Sends POST to `/api/tap`

\- Backend receives tap

\- Event inserted into database

\- Device mode sync works

\- Confirmed HTTP 200 responses



Example Serial Output:

Tag UID: F1F4BA01

HTTP code: 200

Response: {"ok":true,"eventId":2,...}





This confirms working hardware-to-backend integration.



---



\## Intentionally Deferred to Milestone 3



\- Live tap visualization in UI

\- Automatic mapping of NFC UID → student → attendance record

\- Device key authentication layer

\- Org invite code system

\- Admin management dashboard expansion

\- Event Check-In module

\- Access Control module

\- Smart Automation module

\- Branding polish + logo system

\- PWA install + production deployment setup



These features are scaffolded in the UI but intentionally locked to maintain milestone scope control.



---



\## What Went Right



\- Clear separation of backend and frontend responsibilities

\- JWT authentication working consistently

\- Role-based access logic cleanly enforced

\- Instructor workflow (approve + manual override) functional

\- Hardware communication confirmed with live API responses



---



\## What Was Challenging



\- School Wi-Fi environment affecting hardware testing

\- Token-protected endpoints during development testing

\- UI polish deferred to prioritize functional stability



---



\## Next Steps (Milestone 3)



\- Improve UI/UX to production quality

\- Implement real-time tap-to-attendance mapping

\- Add device activation + security key system

\- Complete org membership + invite codes

\- Finalize attendance module logic

\- Add polished branding and installable PWA support

\- Deploy backend for external access testing



---



\## Architecture Summary



ESP32 → Express Backend → SQLite Database  

React Frontend → Protected API Routes → JWT Auth  



The platform is now a functional, role-based attendance system with working hardware integration.



---



Milestone 2 Status: FUNCTIONALLY COMPLETE



