import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { DoctorServices } from "./doctor.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { ApplyAsDoctorValidationZodSchema } from "./doctor.validation";
import { IRequestUser } from "../auth/auth.interface";

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

const verifyDoctorEmail = catchAsync(async (req: Request, res: Response) => {

    const payload = req.body;

    const result = await DoctorServices.verifyDoctorEmail(payload);
    
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Doctor Email Verified successfully",
        data: result,
    });
});

const approveDoctor = catchAsync(async (req: Request, res: Response) => {
    const user = req.user! as IRequestUser;
    const payload = req.body;


    const result = await DoctorServices.approveDoctor(payload, user);
    
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Doctor Status Updated successfully",
        data: result,
    });
});

const getAllDoctors = catchAsync(async (req: Request, res: Response) => {

    const result = await DoctorServices.getAllDoctors();
    
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Doctors Retrieved successfully",
        data: result,
    });
});

export const DoctorController = {
    applyAsDoctor,
    verifyDoctorEmail,
    approveDoctor,
    getAllDoctors
};