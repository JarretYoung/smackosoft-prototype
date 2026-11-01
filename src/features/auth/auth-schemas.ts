import { z } from "zod";
import { emailProblem, passwordProblem } from "@/src/features/auth/auth-errors";
import { fromProblem } from "@/src/lib/form-errors";

const email = fromProblem(emailProblem);
const newPassword = fromProblem(passwordProblem);

export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password") });
export const signUpSchema = z.object({ email, password: newPassword });
export const forgotPasswordSchema = z.object({ email });
export const updatePasswordSchema = z.object({ password: newPassword });
