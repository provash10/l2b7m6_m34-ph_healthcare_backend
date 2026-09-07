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
            experienceYears: z.coerce
                .number()
                .int('Experience years must be an integer')
                .min(0, 'Experience years cannot be negative'),

            consultationFee: z.coerce
                .number()
                .min(0, 'Consultation fee cannot be negative')
                .optional(),

            contactNumber: z.string().trim().optional(),

            bio: z.string().trim().max(1000, 'Bio cannot exceed 1000 characters').optional(),
        }),
});

export const UpdateDoctorProfileValidationZodSchema = z.object({
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters long")
    .optional(),

  bio: z
    .string()
    .trim()
    .max(1000, "Bio cannot exceed 1000 characters")
    .optional(),

  consultationFee: z
    .number()
    .min(0, "Consultation fee cannot be negative")
    .optional(),

  contactNumber: z
    .string()
    .trim()
    .min(5, "Contact number is invalid")
    .optional(),
});

// Shared by the public doctor-discovery listing endpoints (all-doctors & available-today)
// Query params always arrive as strings, so page/limit stay strings here and get
// Number()-converted in the service, same as every other paginated list in this codebase
export const DoctorPublicQueryValidationZodSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  searchTerm: z.string().optional(),
  specialization: z.string().optional(),
});

export const SingleDoctorPublicProfileParamsValidationZodSchema = z.object({
  id: z.string().uuid({ message: "Invalid Doctor ID format" }),
});

export const DoctorValidation = {
  ApplyAsDoctorValidationZodSchema,
  UpdateDoctorProfileValidationZodSchema,
  DoctorPublicQueryValidationZodSchema,
  SingleDoctorPublicProfileParamsValidationZodSchema,
};
