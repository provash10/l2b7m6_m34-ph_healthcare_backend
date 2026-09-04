import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { DoctorServices } from "./doctor.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { ApplyAsDoctorValidationZodSchema } from "./doctor.validation";

const applyAsDoctor = catchAsync(async (req: Request, res: Response) => {

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    console.log({ files });
    const resume = files?.['resume'] ? files['resume'][0] : null;
    const additionalFiles = files?.['additionalFiles'] || [];

    // console.log(JSON.parse(req.body.data));

    const zodValidationResult = ApplyAsDoctorValidationZodSchema.safeParse(JSON.parse(req.body.data));

    if (!zodValidationResult.success) {
        throw new Error(zodValidationResult.error.issues[0].message);
    }

    const payload = zodValidationResult.data;

    console.log({ resume, additionalFiles, data: payload });

    const result = await DoctorServices.applyAsDoctor(payload, resume, additionalFiles);
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Apply as Doctor successfully",
        data: result,
    });
});

export const DoctorController = {
    applyAsDoctor,
};