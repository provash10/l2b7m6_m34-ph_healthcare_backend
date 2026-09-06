import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ScheduleService } from "./schedule.service";

const createSchedule = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await ScheduleService.createSchedule(req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Schedule Created Successfully",
		data: result,
	});
});

const getMySchedules = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const { data, meta } = await ScheduleService.getMySchedules(req.query, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My Schedules Fetched Successfully",
		data: data,
		meta: meta,
	});
});

const getAllSchedules = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await ScheduleService.getAllSchedules(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All Schedules Fetched Successfully",
		data: data,
		meta: meta,
	});
});

const getScheduleById = catchAsync(async (req: Request, res: Response) => {
	const { scheduleId } = req.params;
	const result = await ScheduleService.getScheduleById(scheduleId as string);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Schedule Fetched Successfully",
		data: result,
	});
});

const updateSchedule = catchAsync(async (req: Request, res: Response) => {
	const { scheduleId } = req.params;
	const user = req.user as RequestUser;
	const result = await ScheduleService.updateSchedule(scheduleId as string, req.body, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Schedule Updated Successfully",
		data: result,
	});
});

const publishSchedule = catchAsync(async (req: Request, res: Response) => {
	const { scheduleId } = req.params;
	const user = req.user as RequestUser;
	const result = await ScheduleService.publishSchedule(scheduleId as string, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Schedule Published Successfully",
		data: result,
	});
});

const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
	const { scheduleId } = req.params;
	const user = req.user as RequestUser;
	const result = await ScheduleService.deleteSchedule(scheduleId as string, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Schedule Deleted Successfully",
		data: result,
	});
});

export const ScheduleController = {
	createSchedule,
	getMySchedules,
	getAllSchedules,
	getScheduleById,
	updateSchedule,
	publishSchedule,
	deleteSchedule,
};
