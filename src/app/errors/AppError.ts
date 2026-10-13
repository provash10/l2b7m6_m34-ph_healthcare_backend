import httpStatus from "http-status";

class AppError extends Error {
	public statusCode: number;
	public data?: any;

	constructor(statusCode: number, message: string, stack = "", data?: any) {
		super(message);
		this.statusCode = statusCode;
		this.data = data;
		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

export { AppError };
export default AppError;
