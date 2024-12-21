import { z } from "zod";
import { PlayerSchema } from "./schemas.ts";

const ResponsePayloadSchema = z.object({
	data: z.array(PlayerSchema),
	total_count: z.number().int(),
});

const RequestPayloadSchema = z.object({
	count: z.number().optional().default(200),
	start: z.number().optional().default(0),
	filters: z.record(z.string(), z.unknown()).optional(),
});

export type RequestArgs = z.infer<typeof RequestPayloadSchema>;
export type Success = {
	data: z.infer<typeof ResponsePayloadSchema>;
	error: null;
};
type Fail = { data: null; error: Error };
type Result = Success | Fail;

export async function getPlayers(args: RequestArgs): Promise<Result> {
	try {
		const requestPayload = RequestPayloadSchema.parse(args);
		const response = await fetch("/api/search", {
			method: "POST",
			body: JSON.stringify(requestPayload),
		});
		const rawPayload = await response.json();
		const data = ResponsePayloadSchema.parse(rawPayload);

		return { data, error: null };
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.warn(error);
			return {
				data: null,
				error: new Error("Validation error. Check console for details."),
			};
		}
		return { data: null, error: error as Error };
	}
}
