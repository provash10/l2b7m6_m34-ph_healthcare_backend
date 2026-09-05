import { UploadApiResponse } from "cloudinary";
import { prisma } from "../../lib/prisma";
import { cloudinary } from "../../lib/cloudinary";
import bcrypt from "bcryptjs";
import config from "../../config";
import {
  Role,
  DoctorVerificationStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import path from "path";
import { transporter } from "../../lib/nodemailer";
import ejs from "ejs";
import {
  IApplyAsDoctorPayload,
  IApproveDoctorPayload,
  IVerifyDoctorEmailPayload,
} from "./doctor.interface";
import { IRequestUser } from "../auth/auth.interface";
import { IQuery } from "../../interfaces";
import { DoctorWhereInput } from "../../../generated/prisma/models";

const applyAsDoctor = async (
  payload: IApplyAsDoctorPayload,
  resume: Express.Multer.File | null,
  additionalFiles: Express.Multer.File[]
) => {
  // Extract user info (supports nested payload.user OR top-level payload)
  const userObj = {
    name: payload.user?.name || payload.name,
    email: payload.user?.email || payload.email,
  };

  if (!userObj.name) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Field 'name' is required (in 'user' object or top level)"
    );
  }
  if (!userObj.email) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Field 'email' is required (in 'user' object or top level)"
    );
  }

  const isUserExists = await prisma.user.findUnique({
    where: {
      email: userObj.email,
    },
  });

  if (isUserExists) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "User already exists with this email"
    );
  }

  // Extract doctor info (supports nested payload.doctor OR top-level payload)
  const doctorObj = payload.doctor || payload;
  const specialization =
    doctorObj.specialization || doctorObj.specialities || doctorObj.speciality;
  const licenseNumber = doctorObj.licenseNumber || doctorObj.registrationNumber;
  const qualifications = doctorObj.qualifications || doctorObj.qualification;

  if (!specialization) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Field 'specialization' is required in doctor data"
    );
  }
  if (!licenseNumber) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Field 'licenseNumber' is required in doctor data"
    );
  }
  if (!qualifications) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Field 'qualifications' is required in doctor data"
    );
  }

  let resumeUploadResult: UploadApiResponse | null = null;

  if (resume) {
    resumeUploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
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
          )
          .end(resume.buffer);
      }
    );
  }

  console.log({ resumeUploadResult });

  let additionalFilesUploadResults: UploadApiResponse[] = [];

  if (additionalFiles && additionalFiles.length > 0) {
    additionalFilesUploadResults = await Promise.all(
      additionalFiles.map((file) => {
        return new Promise<UploadApiResponse>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                resource_type: "auto",
              },
              (error, result) => {
                if (error) {
                  return reject(error);
                }

                if (!result) {
                  return reject(
                    new Error("No result returned from Cloudinary")
                  );
                }

                resolve(result);
              }
            )
            .end(file.buffer);
        });
      })
    );
  }

  console.log({ additionalFilesUploadResults });

  const randomDoctorPassword = Math.random().toString(36).slice(-8);
  const hashedPassed = await bcrypt.hash(
    randomDoctorPassword,
    Number(config.bcrypt_salt_rounds)
  );

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
          consultationFee: doctorObj.consultationFee
            ? Number(doctorObj.consultationFee)
            : null,
          contactNumber: doctorObj.contactNumber,
          resume: resumeUploadResult?.secure_url,
          additionalFiles: additionalFilesUploadResults.map(
            (file) => file.secure_url
          ),
        },
      },
    },
    include: {
      doctor: true,
    },
  });

  const expirationSeconds = 60 * 60;
  const otpKey = `doctor-application-otp:${payload.user.email}`;
  const otpValue = crypto.randomInt(100000, 1000000).toString();

  await redisClient.set(otpKey, otpValue, {
    expiration: {
      type: "EX",
      value: expirationSeconds,
    },
  });

  const tempatePath = path.join(
    process.cwd(),
    "src/app/templates/registration-user-otp.ejs"
  );

  const templateData = {
    name: payload.user.name,
    email: payload.user.email,
    otp: otpValue,
    expirationMinutes: expirationSeconds / 60,
  };
  const html = await ejs.renderFile(templatePath, templateData);

  //nodemailer
  await transporter.sendMail({
    from: config.email_sender,
    to: payload.user.email,
    subject: "Email Verification",
    html,
  });

  return doctorApplication.doctor;
};

const verifyDoctorEmail = async (payload: IVerifyDoctorEmailPayload) => {
  const otp = payload.otp;
  const email = payload.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email, role: Role.DOCTOR },
  });

  if (!existingUser) {
    throw new AppError(httpStatus.NOT_FOUND, "Doctor Application Not Found. Please Apply Again.");
  }

  if (existingUser.emailVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email Already Verified");
  }

  const otpKey = `doctor-application-otp:${email}`;

  const redisOtp = await redisClient.get(otpKey);
  if (!redisOtp) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "OTP Expired. Your Application Window Has Closed, Please Apply Again"
    );
  }
  if (redisOtp !== otp) {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP Does Not Match");
  }

  await redisClient.del(otpKey);

  const verifiedUser = await prisma.user.update({
    where: { id: existingUser.id },
    data: { emailVerified: true },
    omit: { password: true },
    include: { doctor: true },
  });

  return verifiedUser;
};

const approveDoctor = async (
  payload: IApproveDoctorPayload,
  reviewer: IRequestUser
) => {
  const { doctorId, verificationStatus, rejectionReason } = payload;

  const existingDoctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });

  if (!existingDoctor) {
    throw new AppError(httpStatus.NOT_FOUND, "Doctor Application Not Found");
  }

  if (existingDoctor.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Doctor Application Has Been Deleted");
  }

  if (!existingDoctor.user.emailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Doctor Has Not Verified Their Email Yet. Application Cannot Be Reviewed."
    );
  }

  if (existingDoctor.verificationStatus !== DoctorVerificationStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Doctor Application Has Already Been ${existingDoctor.verificationStatus.toLowerCase()}`
    );
  }

  //use zod
  if (
    verificationStatus === DoctorVerificationStatus.REJECTED &&
    !rejectionReason
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Rejection Reason Is Required When Rejecting A Doctor Application"
    );
  }

  const updateDoctor = await prisma.doctor.update({
    where: { id: doctorId },
    data: {
      verificationStatus,
      rejectionReason:
        verificationStatus === DoctorVerificationStatus.REJECTED
          ? rejectionReason
          : null,
      reviewedBy: reviewer.userId,
      reviewedAt: new Date(),
    },
    include: { user: true },
  });

  const isApproved = verificationStatus === DoctorVerificationStatus.APPROVED;

  const templatePath = path.join(
    process.cwd(),
    `src/app/templates/${
      isApproved
        ? "doctor-application-approved.ejs"
        : "doctor-application-rejected.ejs"
    }`
  );

  const templateData = {
    name: updatedDoctor.name,
    reason: updatedDoctor.rejectionReason,
  };

  const html = await ejs.renderFile(templatePath, templateData);

  await transporter.sendMail({
    from: config.email_sender,
    to: updatedDoctor.email,
    subject: isApproved
      ? "Your Doctor Application Has Been Approved"
      : "Your Doctor Application Has Been Rejected",
    html,
  });

  return updateDoctor;
};

const getAllDoctors = async (query: IQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: DoctorWhereInput[] = [];
  //searching
  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm, mode: "insensitive" } },
        { email: { contains: query.searchTerm, mode: "insensitive" } },
        {
          specialization: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
        {
          licenseNumber: {
            contains: query.searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  //filtering
  if (query.specialization) {
    andConditions.push({
      specialization: { equals: query.specialization, mode: "insensitive" },
    });
  }

  if (query.email) {
    andConditions.push({
      email: { contains: query.email, mode: "insensitive" },
    });
  }
  if (query.licenseNumber) {
    andConditions.push({
      licenseNumber: { equals: query.licenseNumber, mode: "insensitive" },
    });
  }

  if (query.verificationStatus) {
    andConditions.push({
      verificationStatus: query.verificationStatus as DoctorVerificationStatus,
    });
  }

  andConditions.push({isDeleted : false})

  //search, filter, sorting, pagination
  const allDoctors = await prisma.doctor.findMany({
    where : {
      AND : andConditions.length > 0 ? andConditions : undefined
    },
    take : limit,
    skip : skip,

    orderBy : {
      //sortBy : sortOrder
      [sortBy] : sortOrder
    },

    include : {
      user: {
        omit : {
          password : true
        }
      },
      //scheduls : true,
      //appointments : true,
      //prescriptions : true
    }
  });

  const totalDoctorCount = await prisma.doctor.count({
        where : {
            AND : andConditions
        }
    })

  // return allDoctors;
  return {
        data : allDoctors,
        meta : {
            page : page,
            limit : limit,
            total : totalDoctorCount,
            totalPages : Math.ceil(totalDoctorCount / limit)
        }
    }
};

export const DoctorServices = {
  applyAsDoctor,
  verifyDoctorEmail,
  approveDoctor,
  getAllDoctors,
};
