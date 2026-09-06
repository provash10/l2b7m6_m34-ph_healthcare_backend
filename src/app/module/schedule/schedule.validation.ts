import { z } from "zod";

export const CreateScheduleValidationZodSchema = z.object({
	startDateTime: z.coerce.date({
		required_error: "Start date time is required",
	}),
	endDateTime: z.coerce.date({
		required_error: "End date time is required",
	}),
	meetingLink: z.string({
		required_error: "Meeting link is required",
	}),
});

export const UpdateScheduleValidationZodSchema = z.object({
	startDateTime: z.coerce.date().optional(),
	endDateTime: z.coerce.date().optional(),
	meetingLink: z.string().optional(),
});

export const ScheduleValidation = {
	CreateScheduleValidationZodSchema,
	UpdateScheduleValidationZodSchema,
};