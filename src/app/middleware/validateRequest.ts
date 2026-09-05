import z from "zod";
import { catchAsync } from "../utils/catchAsync";
import { NextFunction, Request, Response } from "express";
import AppError from "../errors/AppError";
import httpStatus from "http-status";

export const validateRequest = (zodSchema : z.ZodObject) => {
	return catchAsync(
		(req: Request, res: Response, next: NextFunction) => {
		
			// const payload = req.body ? req.body : {}
			const payload = req.body ?? {}

			// const result = PatientValidation.PatientRegistrationZodSchema.safeParse(payload);
			const result = zodSchema.safeParse(payload);

			if (!result.success) {
				console.log(result.error);
				console.log(result.error.issues);

				throw new AppError(httpStatus.BAD_REQUEST, result.error.issues[0].message)
			}

			req.body = result.data

			next()
		
	}
	)
}