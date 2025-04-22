import { z } from "zod";
import {
	type Regions,
	type RegionsQuery,
	RegionsSchema,
	RegionsQuerySchema,
} from "./schemas.ts";

export async function getRegions(props: RegionsQuery): Promise<Regions> {
	try {
		const requestPayload = RegionsQuerySchema.parse(props);
		const response = await fetch("/api/regions", {
			method: "POST",
			body: JSON.stringify(requestPayload),
		});
		const rawResponsePayload = await response.json();
		const regions = RegionsSchema.parse(rawResponsePayload);
		return regions;
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error(error);
		}

		throw new Error(`Failed to fetch regions: ${(error as Error).message}`);
	}
}
