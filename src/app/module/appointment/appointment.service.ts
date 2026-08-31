import { AppointmentStatus } from "../../../generated/prisma/enums"
import config from "../../config"
import { getBkashIdToken } from "../../lib/bkash"
import { prisma } from "../../lib/prisma"
import { RequestUser } from "../../middleware/checkAuth"

const bookAppointment = async (payload : any, user : RequestUser) => {
    const transactionResult = await prisma.$transaction(async(tx)=>{
        //business logic
        const appointment = await tx.appointment.create({
            data : {
                status : AppointmentStatus.PENDING
            }
        })
    const bkashIdToken = await getBkashIdToken();
    if(!bkashIdToken){
        throw new Error("No Bkash Access Token Found")
    }

    console.log({bkashIdToken});

    const bkashCreatePaymentResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/create`,{
        method : "POST",
        headers: {
                    "Content-Type" : "application/json",
                    Accept : "application/json",
                    Authorization : bkashIdToken,
                    "X-App-Key" : config.bkash_app_key
                },
                body: JSON.stringify({
                    // agreementID: 'TokenizedMerchant01L3IKB6H1565072174986', // appointment id
                    // mode: "0001", //not support
                    mode: "0011",    //0011 support
                    // payerReference: "01723888888", //user email or phone number
                    payerReference: user.email, //user email or phone number
                    callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
                    // merchantAssociationInfo: "MI05MID54RF091234560ne", //optional
                    amount: "1200",
                    currency: "BDT",
                    intent: "sale",
                    // merchantInvoiceNumber: "Inv3" //appointment id
                    merchantInvoiceNumber: appointment.id
                })
    });

    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();
    
    //payment model create
     await tx.payment.create({
        data:{
            merchanInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
            appointmentId : appointment.id,
            amount : "1200",
            gatewayResponse : bkashCreatePaymentResult,
            bkashPaymentId : bkashCreatePaymentResult.paymentID,
            payerReference : user.email,
        }
    })

    console.log({bkashCreatePaymentResult})

    // return bkashCreatePaymentResult;
    return bkashCreatePaymentResult.bkashURL;
    })

    return transactionResult
}

const bookAppointmentCallback = async(query : Record<string,any>) => {
    const paymentId = query.paymentID
    if(!paymentId){
        throw new Error("Payment Id is Missing")
    }

    const status = query.status
    if(!status){
        throw new Error("Payment Status is Missing")
    }

    const bkashIdToken = await getBkashIdToken();
    if(!bkashIdToken){
        throw new Error("No Bkash Access Token Found")
    }

    const executedPaymentResponse = await fetch(`${config.bkash_base_url}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: bkashIdToken,
        "X-App-Key": config.bkash_app_key
    },
    body : JSON.stringify({
        paymentID : paymentId
    })
})

const exexutedPaymentResult = await executedPaymentResponse.json();
console.log({executedPaymentResponse})

if(status === "success"){
    return {
        exexutedPaymentResult,
        // transactionId : exexutedPaymentResult.trxID,
        redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=success`
    }
}

if(status === "failure"){
    return {
        exexutedPaymentResult,
        // transactionId : exexutedPaymentResult.trxID,
        redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=failure`
    }
}

if(status === "cancel"){
    return {
        exexutedPaymentResult,
        // transactionId : exexutedPaymentResult.trxID,
        redirectUrl : `${config.frontend_url}/dashboard/my-appointments?status=cancel`
    }
}

return {
    exexutedPaymentResult,
        // transactionId : exexutedPaymentResult.trxID,
        redirectUrl : `${config.frontend_url}/dashboard/my-appointments`
}

// return exexutedPaymentResult;

    // return {
    //     success : true
    // }
}

export const AppointmentServices = {
    bookAppointment,
    bookAppointmentCallback
}