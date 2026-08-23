import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
    
    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "User profile fetched successfully",
        data: {},
    });
});

export const AppointmentController={
    bookAppointment
}