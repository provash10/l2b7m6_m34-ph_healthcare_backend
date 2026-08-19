import z from "zod";

const PatientRegistrationZodSchema = z.object({
	name: z
		.string("Not A String!!!!!!")
		.min(3, "Name must atleast 3 char long!!!")
		.max(10),
	email: z.email("Not email!!"),
	password: z
		.string()
		.min(8, "Password Must Be 8 Characters")
		.regex(/[A-Z]/, "Must atleast 1 Uppercase Letter")
		.regex(/[a-z]/,"Must atleast 1 Lowercase Letter")
		.regex(/[0-9]/,"Must atleast 1 number")
		.regex(/[^A-Za-z0-9]/,"Must atleast 1 Special Character"),
	patient: z
		.object({
			contactNumber: z.string().optional(),
		})
		.optional(),
});

const LoginZodSchema = z.object({
	email: z.email(),
	password: z.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")
		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),
})

const ForgotPasswordZodSchema = z.object({
	email: z.email(),
	
})

const ResetPasswordZodSchema = z.object({
	email: z.email(),
	newPassword: z.string()
		.min(8, "Password Must Minimum 8 Characters Long.")
		.regex(/[a-z]/, "Password must contain atleast 1 Lowercase Letter")
		.regex(/[A-Z]/, "Password must contain atleast 1 Uppercase Letter")
		.regex(/[0-9]/, "Password must contain atleast 1 Number")
		.regex(/[^A-Za-z0-9]/, "Password must contain atleast 1 Special Character"),

		otp : z.string().length(6)
})

export const UserValidation = {
	PatientRegistrationZodSchema,
	LoginZodSchema,
	ForgotPasswordZodSchema,
	ResetPasswordZodSchema
}