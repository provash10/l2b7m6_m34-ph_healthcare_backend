import config from "../../config"
import { getBkashIdToken } from "../../lib/bkash"

const bookAppointment = async () =>{
    //business logic
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
                    mode: "0001",
                    payerReference: "01723888888", //user email or phone number
                    callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
                    // merchantAssociationInfo: "MI05MID54RF091234560ne", //optional
                    amount: "1200",
                    currency: "BDT",
                    intent: "sale",
                    merchantInvoiceNumber: "Inv0124" //appointment id
                })
    });

    const bkashCreatePaymentResult = await bkashCreatePaymentResponse.json();
    console.log({bkashCreatePaymentResult})

    return bkashCreatePaymentResult;
}

export const AppointmentServices = {
    bookAppointment
}