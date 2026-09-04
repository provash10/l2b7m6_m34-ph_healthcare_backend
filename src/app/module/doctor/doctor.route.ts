import { Router } from "express";
import { DoctorController } from "./doctor.controller";
import { upload } from "../../lib/multer";



const router = Router();


router.post("/apply-as-doctor",
    // validateRequest(UserValidation.ResetPasswordZodSchema),
    // upload.single("resume"),
    // upload.array("additionalFiles"),
    upload.fields([
        {
            name : "resume",
            maxCount : 1
        },
        {
            name : "additionalFiles",
            maxCount : 10
        }
    ]),

    DoctorController.applyAsDoctor);

export const DoctorRoutes = router;
