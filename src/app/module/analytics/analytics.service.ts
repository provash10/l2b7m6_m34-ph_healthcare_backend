import {
  AppointmentStatus,
  DoctorVerificationStatus,
  PaymentStatus,
  ScheduleStatus,
} from "../../../generated/prisma/enums";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";

const getAdminAnalytics = async () => {
  //total Doctors
  const totalDoctors = await prisma.doctor.count({
    where: {
      isDeleted: false,
    },
  });

  const totalPendingDoctorApplications = await prisma.doctor.count({
    where: {
      isDeleted: false,
      verificationStatus: DoctorVerificationStatus.PENDING,
    },
  });

  const totalApproveDoctors = await prisma.doctor.count({
    where: {
      isDeleted: false,
      verificationStatus: DoctorVerificationStatus.APPROVED,
    },
  });

  const totalRejectedDoctors = await prisma.doctor.count({
    where: {
      isDeleted: false,
      verificationStatus: DoctorVerificationStatus.REJECTED,
    },
  });

  //total Patients
  const totalPatients = await prisma.patient.count({
    where: {
      isDeleted: false,
    },
  });

  const totalAppointments = await prisma.appointment.count();

  const totalCompletedAppointments = await prisma.appointment.count({
    where: { status: AppointmentStatus.COMPLETED },
  });

  const totalCancelledAppointments = await prisma.appointment.count({
    where: { status: AppointmentStatus.CANCELLED },
  });

  const totalRevenueResult = await prisma.payment.aggregate({
    where: { status: PaymentStatus.PAID },
    _sum: { amount: true },
  });
  const totalRevenue = totalRevenueResult._sum.amount
    ? Number(totalRevenueResult._sum.amount)
    : 0;

  return {
    totalDoctors,
    totalPendingDoctorApplications,
    totalApproveDoctors,
    totalRejectedDoctors,
    totalPatients,
    totalAppointments,
    totalCompletedAppointments,
    totalCancelledAppointments,
    totalRevenue,
  };
};

const getPatientAnalytics = async (user: RequestUser) => {
  const patient = await prisma.patient.findUnique({
    where: { userId: user.userId },
  });

  if (!patient) {
    throw new AppError(httpStatus.NOT_FOUND, "Patient Profile Not Found");
  }

  const totalAppointments = await prisma.appointment.count({
    where: { patientId: patient.id },
  });

  const upcomingAppointments = await prisma.appointment.count({
    where: { patientId: patient.id, status: AppointmentStatus.CONFIRMED },
  });

  const completedAppointments = await prisma.appointment.count({
    where: { patientId: patient.id, status: AppointmentStatus.COMPLETED },
  });

  const cancelledAppointments = await prisma.appointment.count({
    where: { patientId: patient.id, status: AppointmentStatus.CANCELLED },
  });

  return {
    totalAppointments,
    upcomingAppointments,
    completedAppointments,
    cancelledAppointments,
  };
};

const getDoctorAnalytics = async (user: RequestUser) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: user.userId },
  });

  if (!doctor) {
    throw new AppError(httpStatus.NOT_FOUND, "Doctor Profile Not Found");
  }

  const totalSchedules = await prisma.schedule.count({
    where: { doctorId: doctor.id, isDeleted: false },
  });

  const publishedSchedules = await prisma.schedule.count({
    where: {
      doctorId: doctor.id,
      isDeleted: false,
      status: ScheduleStatus.PUBLISHED,
    },
  });

  const totalAppointments = await prisma.appointment.count({
    where: { doctorId: doctor.id },
  });

  const upcomingAppointments = await prisma.appointment.count({
    where: { doctorId: doctor.id, status: AppointmentStatus.CONFIRMED },
  });

  const ongoingAppointments = await prisma.appointment.count({
    where: { doctorId: doctor.id, status: AppointmentStatus.ONGOING },
  });

  const completedAppointments = await prisma.appointment.count({
    where: { doctorId: doctor.id, status: AppointmentStatus.COMPLETED },
  });

  const cancelledAppointments = await prisma.appointment.count({
    where: { doctorId: doctor.id, status: AppointmentStatus.CANCELLED },
  });

  return {
    totalSchedules,
    publishedSchedules,
    totalAppointments,
    upcomingAppointments,
    ongoingAppointments,
    completedAppointments,
    cancelledAppointments,
  };
};

export const AnalyticsServices = {
  getAdminAnalytics,
  getPatientAnalytics,
  getDoctorAnalytics,
};