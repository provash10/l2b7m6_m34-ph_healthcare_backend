import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AppointmentServices } from "./appointment.service";

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
    const paylaod = req.body;
    const user = req.user!

    const result = await AppointmentServices.bookAppointment(paylaod, user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Appointment Payment Initiated Successfully",
        data: result,
    });
});

//payAppointment
const payAppointment = catchAsync(async (req: Request, res: Response) => {
    const paylaod = req.body;
    const user = req.user!

    const result = await AppointmentServices.payAppointment(paylaod, user);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Appointment Payment Initiated Successfully",
        data: result,
    });
});

const bookAppointmentCallback = catchAsync(async (req: Request, res: Response) => {
    console.log(req.query, "req.query");
    // const result = await  AppointmentServices.bookAppointmentCallback(req.query);
    const {redirectUrl} = await  AppointmentServices.bookAppointmentCallback(req.query);
    // console.log({exexutedPaymentResult}, "callback controller");
    
    res.redirect(redirectUrl);

    // sendResponse(res, {
    //     statusCode: httpStatus.OK,
    //     success: true,
    //     message: "User profile fetched successfully",
    //     data: result,
    // });
});

export const AppointmentController={
    bookAppointment,
    payAppointment,
    bookAppointmentCallback
}