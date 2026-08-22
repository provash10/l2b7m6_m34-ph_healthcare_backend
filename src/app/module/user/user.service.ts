import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";

const uploadProfileImage = async (buffer: Buffer, userId?: string) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "auto" },
            async (error, result) => {
                if (error) {
                    console.log(error);
                    return reject(error);
                }
                console.log(result, "result");

                try {
                    const updateUser = await prisma.user.update({
                        where: {
                            id: userId,
                        },
                        data: {
                            imageUrl: result?.secure_url as string,
                            imagePublicId: result?.public_id as string,
                        },
                    });

                    resolve(updateUser);
                } catch (err) {
                    reject(err);
                }
            }
        );
        stream.end(buffer);
    });
};

export const UserServices = {
    uploadProfileImage,
};
