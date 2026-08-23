import { NextFunction, Request, Response, Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";
import { catchAsync } from "../../utils/catchAsync";
import { validateRequest } from "../../middleware/validateRequest";
import { AppointmentController } from "./appointment.controller";

const router = Router();

router.post("/book-appointment", AppointmentController.bookAppointment) 

export const AppointmentRoutes = router;
