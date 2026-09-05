import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync"
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { UserServices } from "./user.service";
import AppError from "../../errors/AppError";


const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
        throw new AppError(httpStatus.BAD_REQUEST, "No File Provided.");
    }

    const userId = req.user?.userId;

    if (!userId) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized access. User ID missing.");
    }

    const result = await UserServices.uploadProfileImage(req.file.buffer, userId);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Profile image uploaded successfully",
        data: result
    });
});

export const UserController = {
    uploadProfileImage
}