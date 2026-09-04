import { UploadApiResponse } from "cloudinary";
import { prisma } from "../../lib/prisma";
import { cloudinary } from "../../lib/cloudinary";
import bcrypt from "bcryptjs";
import config from "../../config";
import { Role } from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";

const applyAsDoctor = async (
    payload: any,
    resume: Express.Multer.File | null,
    additionalFiles: Express.Multer.File[]
) => {
    // Extract user info (supports nested payload.user OR top-level payload)
    const userObj = {
        name: payload.user?.name || payload.name,
        email: payload.user?.email || payload.email,
    };

    if (!userObj.name) {
        throw new AppError(httpStatus.BAD_REQUEST, "Field 'name' is required (in 'user' object or top level)");
    }
    if (!userObj.email) {
        throw new AppError(httpStatus.BAD_REQUEST, "Field 'email' is required (in 'user' object or top level)");
    }

    const isUserExists = await prisma.user.findUnique({
        where: {
            email: userObj.email,
        },
    });

    if (isUserExists) {
        throw new AppError(httpStatus.BAD_REQUEST, "User already exists with this email");
    }

    // Extract doctor info (supports nested payload.doctor OR top-level payload)
    const doctorObj = payload.doctor || payload;
    const specialization = doctorObj.specialization || doctorObj.specialities || doctorObj.speciality;
    const licenseNumber = doctorObj.licenseNumber || doctorObj.registrationNumber;
    const qualifications = doctorObj.qualifications || doctorObj.qualification;

    if (!specialization) {
        throw new AppError(httpStatus.BAD_REQUEST, "Field 'specialization' is required in doctor data");
    }
    if (!licenseNumber) {
        throw new AppError(httpStatus.BAD_REQUEST, "Field 'licenseNumber' is required in doctor data");
    }
    if (!qualifications) {
        throw new AppError(httpStatus.BAD_REQUEST, "Field 'qualifications' is required in doctor data");
    }

    let resumeUploadResult: UploadApiResponse | null = null;

    if (resume) {
        resumeUploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    resource_type: "auto",
                },
                (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    if (!result) {
                        return reject(new Error("No result returned from Cloudinary"));
                    }
                    resolve(result);
                }
            ).end(resume.buffer);
        });
    }

    console.log({resumeUploadResult})

    let additionalFilesUploadResults: UploadApiResponse[] = [];

    if (additionalFiles && additionalFiles.length > 0) {
        additionalFilesUploadResults = await Promise.all(
            additionalFiles.map((file) => {
                return new Promise<UploadApiResponse>((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        {
                            resource_type: "auto",
                        },
                        (error, result) => {
                            if (error) {
                                return reject(error);
                            }

                            if (!result) {
                                return reject(new Error("No result returned from Cloudinary"));
                            }

                            resolve(result);
                        }
                    ).end(file.buffer);
                });
            })
        );
    }

    console.log({additionalFilesUploadResults});

    const randomDoctorPassword = Math.random().toString(36).slice(-8);
    const hashedPassed = await bcrypt.hash(randomDoctorPassword, Number(config.bcrypt_salt_rounds));

    const doctorApplication = await prisma.user.create({
        data: {
            name: userObj.name,
            email: userObj.email,
            password: hashedPassed,
            role: Role.DOCTOR,
            needPasswordChange: true,

            doctor: {
                create: {
                    name: userObj.name,
                    email: userObj.email,
                    specialization,
                    licenseNumber,
                    qualifications,
                    address: doctorObj.address,
                    experienceYears: Number(doctorObj.experienceYears || 0),
                    bio: doctorObj.bio,
                    consultationFee: doctorObj.consultationFee ? Number(doctorObj.consultationFee) : null,
                    contactNumber: doctorObj.contactNumber,
                    resume: resumeUploadResult?.secure_url,
                    additionalFiles: additionalFilesUploadResults.map((file) => file.secure_url),
                },
            },
        },
        include: {
            doctor: true,
        },
    });

    return doctorApplication.doctor;
};

export const DoctorServices = {
    applyAsDoctor,
};