# Persistent Memory & Instructions

## 1. SMS Verification Workflow (Pending Review)
When a student registers, their status is set to `pending_review`. The system DOES NOT use WhatsApp. Instead:
1. The backend (Node.js/Supabase) handles the review.
2. Upon approval by the admin (Teacher/Assistant), a secure, random verification code is generated.
3. The system integrates with an SMS gateway (like Odoo, Twilio, or Gateway.sa) to send this verification code directly to the student's phone via SMS.
4. The student enters this code on the platform to finalize their registration and activate their account.
This workflow MUST be respected whenever we implement the actual backend logic for student approvals.

## 2. Teacher Credentials (Super Admin)
The teacher logs in via the normal login page.
- **Email:** `mr-mohamedrdwan-eng-langue-99@gmail.mnsa.nour.com`
- **Password:** `hfhrefjker4390430458&-cmdsfo3-@iofm3omfoew`
- The system recognizes this email as the Super Admin (Teacher) and redirects them to the Teacher Dashboard (`/teacher`).

## 3. General Design & UX Directives
- **Theme:** All pages must support Light and Dark modes.
- **Footer:** Every page must include the signature: "Built With Developer & Designer NOUR M. EL-SAIED 💚 💚" at the bottom.
- **Design Quality:** Futuristic 2030 Design. Highly professional, responsive (Mobile-first), well-structured, neat, and utilizing smooth animations without compromising performance.
- **Platform Ownership:** The platform belongs exclusively to Mr. Mohamed Radwan.
