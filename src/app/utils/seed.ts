import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums"
import { prisma } from "../lib/prisma"
import config from "../config";

export const seedSuperAdmin = async() =>{
    try {
        const isSuperAdminExist = await prisma.user.findFirst({
            where : {
                role : Role.SUPER_ADMIN
            }
        });
        if(isSuperAdminExist){
            console.log("Super Admin Already Exists");
            return;
        }
        const name = config.super_admin_name
        const email = config.super_admin_email
        const password = config.super_admin_password

        if(!name || !email || !password){
            throw new Error("Super Admin Name, Email, Password Missing In Env File !!!")                        
        }
        const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds))

        const superAdmin = await prisma.user.create({
            data : {
                name,
                email,
                password : hashedPassword,
                role: Role.SUPER_ADMIN,
                needPasswordChange : false,
                emailVerified : true
            }
        })

        console.log("Super Admin Created : ", superAdmin)

    } catch (error) {
        console.log("Error Seeding Super Admin : ", error)

        if (config.super_admin_email) {
            await prisma.user.deleteMany({
                where : {
                    email : config.super_admin_email
                }
            })
        }
    }
}

//created tester admin

//created tester doctor