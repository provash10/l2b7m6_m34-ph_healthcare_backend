import { UploadApiErrorResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";

const uploadProfileImage = async (buffer: Buffer, userId: string) => {
    // const stream = cloudinary.uploader.upload_stream(
    //     { resource_type: "auto" },
    //     async (error, result) => {
    //         if (error) {
    //             console.log(error);
    //             return reject(error);
    //         }
    //         console.log(result, "result");

    //         try {
    //             const updatedUser = await prisma.user.update({
    //                 where: {
    //                     id: userId,
    //                 },
    //                 data: {
    //                     imageUrl: result?.secure_url as string,
    //                     imagePublicId: result?.public_id as string,
    //                 },
    //             });

    //             console.log(updatedUser)

    //             resolve(updatedUser);
    //         } catch (err) {
    //             reject(err);
    //         }
    //     }
    // );
    // stream.end(buffer);

    const cloudinaryResult = await new Promise<UploadApiErrorResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                resource_type: "auto",
            },
            async (error, result) => {
                if (error) {
                    return reject(error);
                }
                if(!result){
                    return reject(new Error("No result returned from Cloudinary"))
                }
                resolve(result);
            }
        ).end(buffer);
    });

    const updatedUser = await prisma.user.update({
        where : {
            id : userId
        },
        data : {
            imageUrl : cloudinaryResult.secure_url,
            imagePublicId : cloudinaryResult.public_id
        },

        omit : {
            password : true
        }


    })

    console.log(updatedUser)

    return updatedUser;
};

export const UserServices = {
    uploadProfileImage,
};
