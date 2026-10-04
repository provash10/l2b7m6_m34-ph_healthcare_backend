import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { UserController } from "./user.controller";
import { upload } from "../../lib/multer";

const router = Router();

router.patch(
    "/profile-image",
    auth(Role.SUPER_ADMIN, Role.ADMIN, Role.DOCTOR, Role.PATIENT),
    upload.single("profileImage"),
    UserController.uploadProfileImage
);

export const UserRoutes = router;
