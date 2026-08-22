import { NextFunction, Request, Response, Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AuthController } from "./auth.controller";
import { UserValidation } from "./auth.validation";
import { catchAsync } from "../../utils/catchAsync";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { upload } from "../../lib/multer";

const router = Router();


router.patch("/profile-image",
    auth(Role.SUPER_ADMIN,Role.ADMIN,Role.DOCTOR,Role.PATIENT),
    upload.single("profileImage"),
     UserController.uploadProfileImage);

export const UserRoutes = router;
