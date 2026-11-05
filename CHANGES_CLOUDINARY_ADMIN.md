# City Hospital admin updates

## Environment
Copy `.env.example` to `.env`, fill the existing MongoDB/JWT/Aadhaar/frontend values, and add the three Cloudinary credentials. Cloudinary variables are required at startup.

## Cloudinary upload
Super Admin image uploads use `POST /api/uploads/image` with multipart fields `folder` (`doctors` or `staff`) and `image`. Images are limited to 5 MB and JPG/PNG/WEBP/AVIF. The API returns a secure Cloudinary URL; only that URL is stored in MongoDB.

## Admin APIs added/extended
- `PATCH /api/admin/doctors/:id` updates doctor profile and linked login email/name.
- `PATCH /api/admin/staff/:id` updates receptionist name/profile image.
- `GET /api/admin/patients`, `/api/admin/doctors`, `/api/admin/users` accept optional `from` and `to` date query parameters (YYYY-MM-DD), filtering by record creation date.
- `GET /api/admin/appointments/today` accepts optional `from` and `to`, filtering by appointment date. Without them it retains today's appointments behavior.
- Patient details now include consultation diagnosis, tests, medicines, examination, advice and follow-up data linked to appointments.
