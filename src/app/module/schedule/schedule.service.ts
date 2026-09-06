import { addDays, differenceInMinutes, startOfDay } from "date-fns";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma"
import { RequestUser } from "../../middleware/checkAuth"
import { ICreateSchedulePayload } from "./schedule.interface"
import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";

const createSchedule = async(payload:ICreateSchedulePayload, user : RequestUser) => {
    const doctor = await prisma.doctor.findUnique({
        where: {
            userId : user.userId
        }
    });
    if(!doctor){
        throw new AppError(httpStatus.NOT_FOUND, "Doctor Profile Not Found")
    }

   //startDateTime = 2026-08-25T13:30:00.436Z => 1:30 PM
    const startOfTheDay = startOfDay(payload.startDateTime) // 25 August => 12:00 AM => 2026-08-25T00:00:00.436Z
    const startOfNextDay = addDays(startOfTheDay, 1) // 26 August => 12:00 AM => 2026-08-26T00:00:00.436Z

    const existingScheduleOnThisDate = await Prisma.ScheduleScalarFieldEnum.findFirst({
        where : {
            doctorId : doctor.id,
            isDeleted : false,
            startDateTime : {
                gte : startOfTheDay,
                lt : startOfNextDay
            }
        }
    })

    if(existingScheduleOnThisDate){
        throw new AppError(
            httpStatus.CONFLICT,
            "You Already Have A Schedule For This Date"
        );
    }

    const durationInMinutes = differenceInMinutes(
        payload.startDateTime,
        payload.endDateTime
    )

    const MINUTES_ALLOCATED_PER_SLOT = 20
    const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT)

    const schedule = await prisma.schedule.create({
        data : {
            startDateTime : payload.startDateTime,
            endDateTime : payload.endDateTime,
            meetingLink : payload.meetingLink,
            totalSlots,
            availableSlots : totalSlots,
            doctorId : doctor.id
        },
        include : {
            doctor : {
                select : {
                    name : true,
                    email : true,
                    contactNumber : true
                }
            }
        }
    });

    return schedule;

}

export const ScheduleService = {
    createSchedule,
}