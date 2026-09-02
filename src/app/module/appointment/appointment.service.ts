import {
  AppointmentStatus,
  PaymentStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../middleware/checkAuth";

const bookAppointment = async (payload: any, user: RequestUser) => {
  const transactionResult = await prisma.$transaction(async (tx) => {
    //business logic
    const appointment = await tx.appointment.create({
      data: {
        status: AppointmentStatus.PENDING,
      },
    });

    const bkashIdToken = await getBkashIdToken();
    if (!bkashIdToken) {
      throw new Error("No Bkash Access Token Found");
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
          amount: "1200",
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
        amount: "1200",
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
    throw new Error("Appointment ID is required in payload");
  }

  const existingAppointment = await prisma.appointment.findUnique({
    where: {
      id: appointmentId,
    },
  });
  if (!existingAppointment) {
    throw new Error("Appointment Does Not Exists");
  }

  if (existingAppointment.status !== "PENDING") {
    throw new Error("Appointment Is Not Pending");
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

  const bkashIdToken = await getBkashIdToken();
  if (!bkashIdToken) {
    throw new Error("No Bkash Access Token Found");
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
        amount: "1200",
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
      throw new Error("Payment Id is Missing");
    }

    const status = query.status;
    if (!status) {
      throw new Error("Payment Status is Missing");
    }

    const bkashIdToken = await getBkashIdToken();
    if (!bkashIdToken) {
      throw new Error("No Bkash Access Token Found");
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

    if (status === "success") {
      await tx.appointment.update({
        where: {
          id: executedPaymentResult.merchantInvoiceNumber,
        },
        data: {
          status: AppointmentStatus.CONFIRMED,
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
const cancelAppointment = async (payload: any) => {
 const transactionResult = await prisma.$transaction(async(tx)=>{
   const appointmentId = payload.appointmentId;

  const existingAppointment = await tx.appointment.findUnique({
    where: {
      id: appointmentId,
    },
    include : {
      payment : true
    }
  });
  if (!existingAppointment) {
    throw new Error("Appointment Does Not Exists");
  }

  if (
    existingAppointment.status === "ONGOING" ||
    existingAppointment.status === "COMPLETED"
  ) {
    throw new Error("Appointment Ongoning or Completed");
  }

  if (existingAppointment.status === "CANCELLED") {
    throw new Error("Appointment Already Cancelled");
  }

  const updateAppointment = await tx.appointment.update({
    where: {
      id: existingAppointment.id,
    },
    data: {
      status: "CANCELLED",
    },
  });

  const bkashIdToken = await getBkashIdToken();
  if (!bkashIdToken) {
    throw new Error("No Bkash Access Token Found");
  }

  const bkashRefundPaymentResponse = await fetch(
    `${config.bkash_base_url}/v2/tokenized-checkout/refund/payment/transaction`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken,
        "X-App-Key": config.bkash_app_key,
      },
      body: JSON.stringify({
        paymentId: existingAppointment.payment?.bkashPaymentId,
        trxId: existingAppointment.payment?.bkashTrxId,
        refundAmount: existingAppointment.payment?.amount,
        // sku: "test",
        reason: "Patient Cancel the Appointment",
      }),
    }
  );

  const bkashRefundPaymentResult = await bkashRefundPaymentResponse.json();

  const updatedPayment = await tx.payment.update({
    where : {
      appointmentId : existingAppointment.id
    },
    data : {
      refundTrxId : bkashRefundPaymentResult.refundTrxId,
      refundedAt : bkashRefundPaymentResult.CompletedTime,
      refundAmount : bkashRefundPaymentResult.refundAmount,
      refundReason : bkashRefundPaymentResult.reason
    }
  })

  return {
    appointment : updateAppointment,
    paymnent : updateAppointment
  }
 })

 return transactionResult;
};

export const AppointmentServices = {
  bookAppointment,
  payAppointment,
  bookAppointmentCallback,
  cancelAppointment
};
