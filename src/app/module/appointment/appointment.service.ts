import {
  AppointmentStatus,
  PaymentStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { transporter } from "../../lib/nodemailer";
import path from "path";
import ejs from "ejs";
import { RequestUser } from "../../middleware/checkAuth";
import crypto from "crypto";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { IBookAppointmentPayload } from "./appointment.interface";
import { addMinutes, isAfter } from "date-fns";
import PDFDocument from "pdfkit";

const bookAppointment = async (
  payload: IBookAppointmentPayload,
  user: RequestUser
) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    //42-6
    const patient = await prisma.patient.findUnique({
      where: { userId: user.userId },
    });

    if (!patient) {
      throw new AppError(httpStatus.NOT_FOUND, "Patient Profile Not Found");
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: payload.scheduleId },
      include: { doctor: true },
    });

    if (!schedule || schedule.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Schedule Not Found");
    }

    if (schedule.status !== ScheduleStatus.PUBLISHED) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This Schedule Is Not Published Yet"
      );
    }

    const now = new Date();

    if (!isSameDay(now, schedule.startDateTime)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This Schedule Is Not Available Today"
      );
    }

    if (!isBefore(now, schedule.startDateTime)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This Schedule Has Already Started"
      );
    }

    // if(isAfter(now, schedule.startDateTime)){
    //     throw new AppError(
    //         httpStatus.BAD_REQUEST,
    //         "This Schedule Has Already Started",
    //     );
    // }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        scheduleId: schedule.id,
        // status : { not : AppointmentStatus.CANCELLED }
      },
    });

    if (existingAppointment?.status === AppointmentStatus.PENDING) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You Already Have A Pending Appointment. Please Pay For That"
      );
    }
    if (existingAppointment?.status === AppointmentStatus.CONFIRMED) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You Already Have Confirmed Appointment. Please Pay For That"
      );
    }
    if (existingAppointment?.status === AppointmentStatus.ONGOING) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You Already Have A Ongoing Appointment"
      );
    }
    if (existingAppointment?.status === AppointmentStatus.COMPLETED) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You Already Have Completed An Appointment On This Schedule.Please Try Again Another Day"
      );
    }

    if (schedule.availableSlots === 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "This Schedule is Fully Booked"
      );
    }

    if (!schedule.doctor.consultationFee) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Doctor Has Not Set A Consultation Fee Yet"
      );
    }

    const amount = schedule.doctor.consultationFee.toString();

    //business logic
    const appointment = await tx.appointment.create({
      data: {
        status: AppointmentStatus.PENDING,
        patientId: patient.id,
        doctorId: schedule.doctor.id,
        scheduleId: schedule.id,
      },
    });

    const bkashIdToken = await getBkashIdToken();
    if (!bkashIdToken) {
      throw new AppError(httpStatus.BAD_REQUEST, "No Bkash Access Token Found");
    }

    console.log({ bkashIdToken });

    const bkashCreatePaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashIdToken,
          "X-App-Key": config.bkash_app_key,
        },
        body: JSON.stringify({
          // agreementID: 'TokenizedMerchant01L3IKB6H1565072174986', // appointment id
          // mode: "0001", //not support
          mode: "0011", //0011 support
          // payerReference: "01723888888", //user email or phone number
          payerReference: user.email, //user email or phone number
          callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
          // merchantAssociationInfo: "MI05MID54RF091234560ne", //optional
          // amount: "1200",
          amount: amount,
          currency: "BDT",
          intent: "sale",
          // merchantInvoiceNumber: "Inv3" //appointment id
          merchantInvoiceNumber: appointment.id,
        }),
      }
    );

    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

    //payment model create
    await tx.payment.create({
      data: {
        merchanInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
        appointmentId: appointment.id,
        // amount: "1200",
        amount: amount,
        gatewayResponse: bkashCreatePaymentResult,
        bkashPaymentId: bkashCreatePaymentResult.paymentID,
        payerReference: user.email,
      },
    });

    console.log({ bkashCreatePaymentResult });

    // return bkashCreatePaymentResult;
    // return bkashCreatePaymentResult.bkashURL;
    return {
      paymentUrl: bkashCreatePaymentResult.bkashURL,
    };
  });

  return transactionResult;
};

//failed to Confirmed payment if not any problem
const payAppointment = async (payload: any, user: RequestUser) => {
  const appointmentId = payload?.appointmentId;

  if (!appointmentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Appointment ID is required in payload"
    );
  }

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include: {
      schedule: {
        include: {
          doctor: true,
        },
      },
    },
  });
  if (!existingAppointment) {
    throw new AppError(httpStatus.NOT_FOUND, "Appointment Does Not Exists");
  }

  if (existingAppointment.status !== "PENDING") {
    throw new AppError(httpStatus.BAD_REQUEST, "Appointment Is Not Pending");
  }

  //   if (existingAppointment.status === "CONFIRMED") {
  //     throw new Error("Appointment Already Paid and Confirmed");
  //   }

  //   if (
  //     existingAppointment.status === "CANCELLED" ||
  //     existingAppointment.status === "ONGOING" ||
  //     existingAppointment.status === "COMPLETED"
  //   ) {
  //     const appointmentStatus = existingAppointment.status;
  //     throw new Error(
  //       `Appointment is already ${appointmentStatus.toLowerCase()}`
  //     );
  //   }

  if (!existingAppointment.schedule.doctor.consultationFee) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Doctor Has Not Set A Consultation Fee Yet"
    );
  }
  const amount = existingAppointment.schedule.doctor.consultationFee.toString();

  const bkashIdToken = await getBkashIdToken();
  if (!bkashIdToken) {
    throw new AppError(httpStatus.BAD_REQUEST, "No Bkash Access Token Found");
  }

  console.log({ bkashIdToken });

  const bkashCreatePaymentResponse = await fetch(
    `${config.bkash_base_url}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        // agreementID: 'TokenizedMerchant01L3IKB6H1565072174986', // appointment id
        // mode: "0001", //not support
        mode: "0011", //0011 support
        // payerReference: "01723888888", //user email or phone number
        payerReference: user.email, //user email or phone number
        callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
        // merchantAssociationInfo: "MI05MID54RF091234560ne", //optional
        // amount: "1200",
        amount: amount,
        currency: "BDT",
        intent: "sale",
        // merchantInvoiceNumber: "Inv3" //appointment id
        merchantInvoiceNumber: existingAppointment.id,
      }),
    }
  );

  const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();

  await prisma.payment.update({
    where: {
      // bkashPaymentId: bkashCreatePaymentResult.paymentID
      appointmentId: existingAppointment.id,
    },
    data: {
      merchanInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
      // amount: "1200",  // no need
      gatewayResponse: bkashCreatePaymentResult,
      bkashPaymentId: bkashCreatePaymentResult.paymentID,
      // payerReference: user.email  //no need
    },
  });
  return {
    paymentUrl: bkashCreatePaymentResult.bkashURL,
  };
};

const bookAppointmentCallback = async (query: Record<string, any>) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const paymentId = query.paymentID;
    if (!paymentId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Payment Id is Missing");
    }

    const status = query.status;
    if (!status) {
      throw new AppError(httpStatus.BAD_REQUEST, "Payment Status is Missing");
    }

    const existingPayment = await tx.payment.findUnique({
      where: {
        bkashPaymentId: paymentId,
      },
    });

    if (!existingPayment) {
      throw new AppError(httpStatus.NOT_FOUND, "Payment Record Not Found");
    }

    const bkashIdToken = await getBkashIdToken();
    if (!bkashIdToken) {
      throw new AppError(httpStatus.BAD_REQUEST, "No Bkash Access Token Found");
    }

    const executedPaymentResponse = await fetch(
      `${config.bkash_base_url}/tokenized/checkout/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: bkashIdToken,
          "X-App-Key": config.bkash_app_key,
        },
        body: JSON.stringify({
          paymentID: paymentId,
        }),
      }
    );

    const executedPaymentResult = await executedPaymentResponse.json();
    console.log({ executedPaymentResult });

    const targetAppointmentId =
      executedPaymentResult?.merchantInvoiceNumber ||
      existingPayment.appointmentId;

    if (status === "success") {
      const appointment = await prisma.appointment.findUnique({
        where: {
          id: targetAppointmentId,
        },
        include: {
          schedule: true,
          patient: true,
          doctor: true,
        },
      });
      if (!appointment) {
        throw new AppError(httpStatus.NOT_FOUND, "Appointment Not Found !");
      }

      // const newAvailableSlots = appointment.schedule.availableSlots - 1;

      // total slot = 3 , available slot = 2
      // (total - available) + 1

      const alreadyBookedSlots =
        appointment.schedule.totalSlots - appointment.schedule.availableSlots;

      const serialNumber = alreadyBookedSlots + 1;

      // 25 August => 3:00 PM - 4:00 PM
      // 1st person joining time => startDateTime = 2026-08-25T15:00:00.436Z => 3:00 PM
      // serial number (1) - 1 * 20 => 0 minues

      // 2nd person joining time => startDateTime = 2026-08-25T15:20:00.436Z => 3:00 PM
      // serial number (2) - 1 * 20 => 20 minutes

      // 3nd person joining time => startDateTime = 2026-08-25T15:40:00.436Z => 3:00 PM
      // serial number (3) - 1 * 20 => 40 mintes

      const joiningTime = addMinutes(
        appointment.schedule.startDateTime,
        (serialNumber - 1) * 20
      );

      await tx.appointment.update({
        where: {
          id: targetAppointmentId,
        },
        data: {
          status: AppointmentStatus.CONFIRMED,
          joiningTime,
          serialNumber,
        },
      });

      const newAvailableSlots = appointment.schedule.availableSlots - 1;

      await prisma.schedule.update({
        where: {
          id: appointment.schedule.id,
        },
        data: {
          availableSlots: newAvailableSlots,
        },
      });

      // 2nd part
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentId,
        },
        data: {
          status: PaymentStatus.PAID,
          bkashTrxId: executedPaymentResult.trxID,
          paidAt: executedPaymentResult.paymentExecuteTime,
          gatewayResponse: executedPaymentResult,
        },
      });

      //PDFKit
      const pdfDocument = new PDFDocument({ margin: 50 });

      const pdfChunks: Buffer[] = [];

      pdfDocument.on("data", (chunk: Buffer) => {
        pdfChunks.push(chunk);
      });

      const pdfReadyPromise = new Promise<Buffer>((resolve) => {
        pdfDocument.on("end", () => {
          resolve(Buffer.concat(pdfChunks));
        });
      });

      pdfDocument
        .fontSize(20)
        .text("PH Healthcare System", { align: "center" });
      pdfDocument.fontSize(14).text("Appointment Invoice", { align: "center" });
      pdfDocument.moveDown(2);

      pdfDocument
        .fontSize(12)
        .text(`Patient Name: ${appointment.patient?.name}`);
      pdfDocument.text(`Patient Email: ${appointment.patient?.email}`);
      pdfDocument.moveDown();

      pdfDocument.text(`Doctor Name: ${appointment.doctor?.name}`);
      pdfDocument.text(
        `Specialization:  ${appointment.doctor?.specialization}`
      );
      pdfDocument.moveDown();

      pdfDocument.text(
        `Appointment Date: ${appointment.schedule.startDateTime.toDateString()}`
      );
      pdfDocument.text(`Your Joining Time: ${joiningTime.toString()}`);
      pdfDocument.text(`Your Serial Number: ${serialNumber}`);
      pdfDocument.text(`Meeting Link: ${appointment.schedule.meetingLink}`);
      pdfDocument.moveDown();

      pdfDocument.text(`Amount Paid: ${executedPaymentResult.amount} BDT`);
      pdfDocument.text(`Payment Method: bKash`);
      pdfDocument.text(`Transaction Id: ${executedPaymentResult.trxID}`);
      pdfDocument.text(`Paid At: ${executedPaymentResult.paymentExecuteTime}`);

      pdfDocument.end();

      const pdfBuffer = await pdfReadyPromise;

      // const templatePath = path.join(
      //   process.cwd(),
      //   "src/app/templates/appointment-invoice.ejs"
      // );
      // const templateData = {
      //   name: appointment.patient.name,
      //   appointmentId: appointment.id,
      //   transactionId: executedPaymentResult.trxID,
      // };
      // const html = await ejs.renderFile(templatePath, templateData);

      await transporter.sendMail({
        from: config.email_sender,
        to: appointment.patient.email,
        subject: "Your Appointment Invoice - PH Healthcare System",
        // html,
        text: "Thank you for booking an appointment. Please find your invoice attached.",
        attachments: [
          {
            filename: "invoice.pdf",
            content: pdfBuffer,
          },
        ],
      });

      return {
        // executedPaymentResult,
        // transactionId : executedPaymentResult.trxID,
        redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=success`,
      };
    } else if (status === "failure") {
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentId,
        },
        data: {
          status: PaymentStatus.FAILED,
          gatewayResponse: executedPaymentResult,
        },
      });

      return {
        // executedPaymentResult,
        // transactionId : executedPaymentResult.trxID,
        redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=failure`,
      };
    } else if (status === "cancel") {
      await tx.payment.update({
        where: {
          bkashPaymentId: paymentId,
        },
        data: {
          status: PaymentStatus.CANCELLED,
          gatewayResponse: executedPaymentResult,
        },
      });

      return {
        // executedPaymentResult,
        // transactionId : executedPaymentResult.trxID,
        redirectUrl: `${config.frontend_url}/dashboard/my-appointments?status=cancel`,
      };
    } else {
      return {
        executedPaymentResult,
        // transactionId : executedPaymentResult.trxID,
        // redirectUrl : `${config.frontend_url}/dashboard/my-appointments`
        redirectUrl: `${config.frontend_url}/dashboard/my-appointments?error=payment-failed`,
      };
    }
  });

  return transactionResult;
};

//cancel appointment
const cancelAppointment = async (payload: any, user: RequestUser) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    const appointmentId = payload.appointmentId;

    const existingAppointment = await tx.appointment.findUnique({
      where: {
        id: appointmentId,
        patient: {
          email: user.email,
        },
      },
      include: {
        payment: true,
        schedule: true,
      },
    });
    if (!existingAppointment) {
      throw new AppError(httpStatus.NOT_FOUND, "Appointment Does Not Exists");
    }

    if (
      existingAppointment.status === "ONGOING" ||
      existingAppointment.status === "COMPLETED"
    ) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Appointment Ongoning or Completed"
      );
    }

    if (existingAppointment.status === "CANCELLED") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Appointment Already Cancelled"
      );
    }

    const updateAppointment = await tx.appointment.update({
      where: {
        id: existingAppointment.id,
      },
      data: {
        // status: "CANCELLED",
        status: AppointmentStatus.CANCELLED,
      },
    });

    await prisma.schedule.update({
      where: {
        id: existingAppointment.schedule.id,
      },
      data: {
        availableSlots: { increment: 1 },
      },
    });

    // refund process
    const now = new Date();
    const startDateTime = existingAppointment.schedule.startDateTime; // 25 August : 3:00 PM

    // After 2:00 Pm => no refund
    // must cancel before 2:00 PM
    const refundCutOffTime = subHours(startDateTime, 1);

    // now > refuncCutOff Time => no refund
    // now < refundCutOff Time => refund eligible
    const isEligibleForRefund = isBefore(now, refundCutOffTime);

    if (isEligibleForRefund) {
      const bkashIdToken = await getBkashIdToken();
      if (!bkashIdToken) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "No Bkash Access Token Found"
        );
      }

      // /v2/tokenized-checkout/refund/payment/transaction
      const bkashRefundPaymentResponse = await fetch(
        `${config.bkash_base_url}/tokenized/checkout/payment/refund/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: bkashIdToken,
            // Authorization: bkashSignature,
            "X-App-Key": config.bkash_app_key,
          },

          body: JSON.stringify({
            paymentID: existingAppointment.payment?.bkashPaymentId,
            trxID: existingAppointment.payment?.bkashTrxId,
            amount: existingAppointment.payment?.amount.toString(), //refundAmount
            sku: "Appointment Cancellation",
            reason: "Patient Cancel the Appointment",
          }),
          //  body: bodyString
        }
      );

      const bkashRefundPaymentResult = await bkashRefundPaymentResponse.json();

      console.log({ bkashRefundPaymentResult });
      await tx.payment.update({
        where: {
          appointmentId: existingAppointment.id,
        },
        data: {
          refundTrxId:
            bkashRefundPaymentResult.refundTrxID ||
            bkashRefundPaymentResult.refundTrxId,
          refundedAt:
            bkashRefundPaymentResult.completedTime ||
            bkashRefundPaymentResult.CompletedTime ||
            new Date().toISOString(),
          refundAmount:
            bkashRefundPaymentResult.amount ||
            bkashRefundPaymentResult.refundAmount ||
            existingAppointment.payment?.amount,
          refundReason: "Patient Cancelled The Appointment",
          status: PaymentStatus.REFUNDED,
          gatewayResponse: bkashRefundPaymentResult,
        },
      });
    }

    const newPaymentInfo = await tx.payment.findUnique({
      where: {
        appointmentId: existingAppointment.id,
      },
    });

    return {
      appointment: updateAppointment,
      // payment: updatedPayment,
      payment: newPaymentInfo,
    };
  });

  return transactionResult;
};

export const AppointmentServices = {
  bookAppointment,
  payAppointment,
  bookAppointmentCallback,
  cancelAppointment,
};
