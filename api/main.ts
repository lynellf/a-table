import { z } from "zod";
import { Application, Router } from "@oak/oak";
import { oakCors } from "@tajpouria/cors";
import { generateMock } from "@anatine/zod-mock";
import sift from "npm:sift";

const router = new Router();

const PlayerSchema = z.object({
	name: z.string(),
	team: z.union([
		z.literal("ATL"),
		z.literal("BKN"),
		z.literal("BOS"),
		z.literal("CHA"),
		z.literal("CHI"),
		z.literal("CLE"),
		z.literal("DAL"),
		z.literal("DEN"),
		z.literal("DET"),
		z.literal("GSW"),
		z.literal("HOU"),
		z.literal("IND"),
		z.literal("LAC"),
		z.literal("LAL"),
		z.literal("MEM"),
		z.literal("MIA"),
		z.literal("MIL"),
		z.literal("MIN"),
		z.literal("NOP"),
		z.literal("NYK"),
		z.literal("OKC"),
		z.literal("ORL"),
		z.literal("PHI"),
		z.literal("PHO"),
		z.literal("POR"),
		z.literal("SAC"),
		z.literal("SAS"),
		z.literal("TOR"),
		z.literal("UTH"),
		z.literal("WAS"),
	]),
	number: z.number().int().max(99),
	position: z.union([
		z.literal("PG"),
		z.literal("SG"),
		z.literal("SF"),
		z.literal("PF"),
		z.literal("C"),
	]),
	country: z.string(),
	minorLeague: z.string(),
	height: z.number().max(2.2606).min(1.7272),
	weight: z.number().max(181.437).min(68.0389),
	mpg: z.number().max(45),
	ppg: z.number().max(40),
	rpg: z.number().max(15),
	apg: z.number().max(13),
	spg: z.number().max(3),
	bpg: z.number().max(3),
	topg: z.number().max(6),
	usage: z.number().max(1),
	fgpct: z.number().max(0.8),
	"3fgpct": z.number().max(0.6),
	tspct: z.number().max(0.8),
	effrtg: z.number().max(1),
});

const QuerySchema = z.object({
	count: z.number().int().optional(),
	start: z.number().int().optional(),
	filter: z.record(z.string(), z.unknown()).optional(),
});

const database = Array.from({ length: 5_000 }).map(() =>
	generateMock(PlayerSchema),
);

router.get("/api/all", (context) => {
	context.response.body = {
		total_count: database.length,
		data: database,
	};
});

router.post("/api/search", async (context) => {
	try {
		const rawPayload = await context.request.body.json();
		const { start, count, filter } = QuerySchema.parse(rawPayload);

		if (!filter) {
			const startFrom = start ?? 0;
			const endAt = startFrom + (count ?? database.length);
			context.response.body = {
				data: database.slice(startFrom, endAt),
				total_count: database.length,
			};
			return;
		}

		const queryResp = database
			// @ts-expect-error sift doesn't have types? Doesn't sound right.
			.filter(sift(filter))
			.slice(start ?? 0, count ?? database.length);
		context.response.body = {
			data: queryResp,
			total_count: queryResp.length,
		};
	} catch (error) {
		context.response.status = 400;

		if (error instanceof z.ZodError) {
			context.response.body = "Invalid request arguments";
		} else {
			context.response.body = (error as Error).message;
		}
	}
});

const app = new Application();

app.use(oakCors());
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });
