import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import express, {
	NextFunction,
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { z } from "zod";
import { redisClient } from "./app/lib/redis";
import { UserRoutes } from "./app/module/user/user.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);

// app.get("/zod", async (req: Request, res: Response, next:NextFunction) => {
	
// try {
// 		const userZodSchema = z.object({
// 			name: z.string(),
// 			email: z.string().email(),
// 			age: z.number().optional(),
// 			isVerified: z.boolean().optional(),
// 			books: z.array(z.string()).optional(),
// 		});
// 	const payload = req.body;

// 	const result = userZodSchema.parse(payload);
// 	 console.log(result);
	 
// 	res.status(httpStatus.OK).json({
// 		success: true,
// 		message: "Welcome to PH Healthcare System Backend",
// 		data : result
// 	});
// } catch (error) {
// 	console.log(error)
// 	next(error)
// }

// });

// Basic route
app.get("/test", async (req: Request, res: Response, next:NextFunction) => {
	
try {
	const otp = crypto.randomInt(100000, 1000000).toString();
	
		// await redisClient.set("forgot-password-otp:patient1@gmail.com", "123456", {
		// 	EX: 60
		// })
	 
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
		data: otp,
	});
} catch (error) {
	console.log(error)
	next(error)
}

});

app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
