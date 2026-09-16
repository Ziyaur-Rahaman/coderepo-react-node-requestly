import { z } from "zod";
import { authService } from "./auth.service.js";

const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(120),
    email: z.string().email("Please provide a valid email address.").max(254).transform((value) => value.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters long.").max(200),
}).strict();
const loginSchema = z.object({ email: z.string().email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(1).max(200) }).strict();
const switchSchema = z.object({ profileId: z.string().regex(/^[a-f\d]{24}$/i, "Select a valid profile.") }).strict();

export async function register(request, response, next) {
    try {
        const { name, email, password } = registerSchema.parse(request.body);
        const result = await authService.register({ name, email, password });
        response.status(201).json({ data: result });
    } catch (error) {
        next(error);
    }
}

export async function login(request, response, next) {
    try { const { email, password } = loginSchema.parse(request.body); response.json({ data: await authService.login(email, password) }); } catch (error) { next(error); }
}

export function session(request, response, next) {
    try { response.json({ data: authService.session(request.account) }); } catch (error) { next(error); }
}

export async function switchProfile(request, response, next) {
    try { const { profileId } = switchSchema.parse(request.body); response.json({ data: await authService.switchProfile(request.account, profileId) }); } catch (error) { next(error); }
}

export function logout(request, response) { response.status(204).end(); }
