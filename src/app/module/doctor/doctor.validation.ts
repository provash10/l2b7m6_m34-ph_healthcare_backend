import { z } from 'zod';

export const ApplyAsDoctorValidationZodSchema = z.object({
    user: z.object({
            name: z.string().trim().min(2, 'Name must be at least 2 characters long'),

            email: z.string().email('Invalid email address').trim().toLowerCase(),
        }),

        doctor: z.object({
            address: z.string().trim().min(5, 'Address must be at least 5 characters long').optional(),

            specialization: z.string().trim().min(2, 'Specialization is required'),

            licenseNumber: z.string().trim().min(3, 'License number is required'),

            qualifications: z.string().trim().min(2, 'Qualifications are required'),

            // Handles converting incoming FormData strings like "12" into an integer number
            experienceYears: z.number().int('Experience years must be an integer').min(0, 'Experience years cannot be negative').optional(),

            consultationFee: z.number().min(0, 'Consultation fee cannot be negative').optional(),

            contactNumber: z.string().optional(),

            bio: z.string().optional(),
        }),
});

export const DoctorValidation = {
    ApplyAsDoctorValidationZodSchema,
};
