import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "./auth.interface";
import { AuthService } from "./auth.service";
import z from "zod";
import { PatientValidation } from "./auth.validation";
import AppError from "../../errors/AppError";

// const PatientRegistrationZodSchema = z.object({
// 	name: z
// 		.string("Not A String!!!!!!")
// 		.min(3, "Name must atleast 3 char long!!!")
// 		.max(10),
// 	email: z.email("Not email!!"),
// 	password: z
// 		.string()
// 		.min(8, "Password Must Be 8 Characters")
// 		.regex(/[A-Z]/, "Must atleast 1 Uppercase Letter")
// 		.regex(/[a-z]/,"Must atleast 1 Lowercase Letter")
// 		.regex(/[0-9]/,"Must atleast 1 number")
// 		.regex(/[^A-Za-z0-9]/,"Must atleast 1 Special Character"),
// 	patient: z
// 		.object({
// 			contactNumber: z.string().optional(),
// 		})
// 		.optional(),
// });

const registerPatient = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	await AuthService.registerPatient(payload);

	// const { accessToken, refreshToken, user, patient } = result;

	// res.cookie("accessToken", accessToken, {
	// 	httpOnly: true,
	// 	secure: false,
	// 	sameSite: "none",
	// 	maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	// });
	// res.cookie("refreshToken", refreshToken, {
	// 	httpOnly: true,
	// 	secure: false,
	// 	sameSite: "none",
	// 	maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	// });

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Verification OTP Sent",
		data: null
	});
});

const verifyPatientEmail = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await AuthService.verifyPatientEmail(payload);

	const { accessToken, refreshToken, user, patient } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		// message: "Verification OTP Sent",
		message: "Email Verified Successfully",
		data: {
			accessToken,
			refreshToken,
			user,
			patient
		}
	});
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const result = await AuthService.loginUser(payload);
	const { accessToken, refreshToken } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User logged in successfully",
		data: {
			accessToken,
			refreshToken,
		},
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;

	if (!user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "User information is missing in the request");
	}

	const result = await AuthService.getMe(user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile fetched successfully",
		data: result,
	});
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
	if (!req.cookies.refreshToken) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is missing");
	}
	const result = await AuthService.refreshToken(req.cookies.refreshToken);
	const { accessToken, refreshToken: newRefreshToken } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", newRefreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "New tokens generated successfully",
		data: {
			accessToken,
			refreshToken: newRefreshToken,
		},
	});
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
	
	const payload = req.body;
	const result = await AuthService.googleLogin(payload)

	const { accessToken, refreshToken } = result;

	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24, // 24 hour or 1 day
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true,
		secure: false,
		sameSite: "none",
		maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
	});

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "New tokens generated successfully",
		data: {
			accessToken,
			refreshToken,
		},
	});
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
	
	const payload = req.body;
	// const result = await AuthService.forgotPassword(payload)
	await AuthService.forgotPassword(payload)

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `OTP sent to Email : ${payload.email}`,
		data: null,
	});
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
	
	const payload = req.body;
	// const result = await AuthService.resetPassword(payload);
	await AuthService.resetPassword(payload);

	

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password Changed Successfully",
		data: null
	});
});



export const AuthController = {
	registerPatient,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
	verifyPatientEmail
};
