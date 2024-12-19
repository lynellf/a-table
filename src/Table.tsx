// @deno-types="@types/lodash"
import { debounce } from "lodash";
import useSWR from "swr";
import {
	useReactTable,
	createColumnHelper,
	getCoreRowModel,
	flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
// @deno-types="@types/react"
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { Player } from "./schemas.ts";
import { getPlayers } from "./getPlayers.ts";

type WindowState = {
	bufferWindow: {
		start: number;
		end: number;
	};
	visibleWindow: {
		start: number;
		end: number;
		prevStart: number;
		prevEnd: number;
	};
};

const columnHelper = createColumnHelper<Player>();

const chunkSize = 200;
const visibleAreaSize = Math.floor(500 / 20);
const rowHeight = 20;
let bufferWindowShadow: Player[] = [];

export default function Table() {
	const prevScrollPos = useRef(0);
	const [windowState, setWindowState] = useState<WindowState>({
		bufferWindow: { start: 0, end: chunkSize - 1 },
		visibleWindow: {
			start: 0,
			end: visibleAreaSize - 1,
			prevStart: 0,
			prevEnd: visibleAreaSize - 1,
		},
	});

	/**
	 * For ensuring the user sees actual data on-screen
	 */
	const { data, isLoading, error } = useSWR(
		{ start: windowState.bufferWindow.start },
		() =>
			getPlayers({ start: windowState.bufferWindow.start, count: chunkSize }),
		{
			revalidateOnFocus: false,
			revalidateIfStale: true,
			revalidateOnReconnect: false,
		},
	);
	const columns = useMemo(
		() => [
			columnHelper.accessor("name", {
				header: "Name",
				id: "name",
			}),
			columnHelper.accessor("team", {
				header: "Team",
				id: "team",
			}),
			columnHelper.accessor("number", {
				header: "Number",
				id: "number",
			}),
			columnHelper.accessor("position", {
				header: "Position",
				id: "position",
			}),
			columnHelper.accessor("country", {
				header: "Country",
				id: "country",
			}),
			columnHelper.accessor("minorLeague", {
				header: "School/Team",
				id: "minorLeague",
			}),
			columnHelper.accessor("height", {
				header: "Height (meters)",
				id: "height",
			}),
			columnHelper.accessor("weight", {
				header: "Weight (kilograms)",
				id: "weight",
			}),
			columnHelper.accessor("mpg", {
				header: "MPG",
				id: "mpg",
			}),
			columnHelper.accessor("ppg", {
				header: "PPG",
				id: "ppg",
			}),
			columnHelper.accessor("rpg", {
				header: "RPG",
				id: "rpg",
			}),
			columnHelper.accessor("apg", {
				header: "APG",
				id: "apg",
			}),
			columnHelper.accessor("spg", {
				header: "SPG",
				id: "spg",
			}),
			columnHelper.accessor("bpg", {
				header: "BPG",
				id: "bpg",
			}),
			columnHelper.accessor("topg", {
				header: "TOPG",
				id: "topg",
			}),
			columnHelper.accessor("usage", {
				header: "USG",
				id: "usg",
			}),
			columnHelper.accessor("fgpct", {
				header: "FG %",
				id: "fgpct",
			}),
			columnHelper.accessor("3fgpct", {
				header: "3PT %",
				id: "3ptpct",
			}),
			columnHelper.accessor("tspct", {
				header: "TS%",
				id: "tspct",
			}),
			columnHelper.accessor("effrtg", {
				header: "EFFRTG",
				id: "effrtg",
			}),
		],
		[],
	);
	const [total, setTotal] = useState(0);
	const table = useReactTable({
		columns,
		data: data?.data?.data ?? bufferWindowShadow,
		getCoreRowModel: getCoreRowModel(),
		autoResetExpanded: false,
		autoResetAll: false,
		autoResetPageIndex: false,
	});
	const rows = table.getCoreRowModel().rows;
	const isFirstLoad = useRef(true);
	const tableBodyRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: total,
		getScrollElement: () => tableBodyRef.current,
		estimateSize: () => rowHeight,
		overscan: 0,
	});

	const handleScroll = useCallback(
		debounce((scrollPos: number) => {
			const isScrollingDown = scrollPos > prevScrollPos.current;
			const isScrollingUp = scrollPos < prevScrollPos.current;
			const visibleAreaWindowStart = Math.floor(scrollPos / rowHeight);
			const visibleAreaWindowEnd = visibleAreaWindowStart + visibleAreaSize;
			const bufferRowsAboveAndBelow = Math.floor(
				(chunkSize - visibleAreaSize) / 2,
			);
			let updatedBufferStart = visibleAreaWindowStart - bufferRowsAboveAndBelow;

			if (updatedBufferStart < 0) {
				updatedBufferStart = 0;
			}

			const updatedBufferEnd = updatedBufferStart + chunkSize;
			const nearBufferWindowEnd = Math.floor(
				windowState.bufferWindow.end * 0.8,
			);
			const nearBufferWindowStart = Math.floor(
				windowState.bufferWindow.start * 1.95,
			);

			/**
			 * If the top visible area window approaches the halfway point of the buffer window,
			 * go ahead and request a new chunk (Scrolling Down)
			 */
			if (visibleAreaWindowStart >= nearBufferWindowEnd && isScrollingDown) {
				setWindowState((current) => {
					const start =
						updatedBufferStart -
						current.bufferWindow.start +
						bufferRowsAboveAndBelow;

					const index = bufferRowsAboveAndBelow;
					let counter = 0;
					for (let i = 0; i < chunkSize; i++) {
						const isWithinWindow = i >= bufferRowsAboveAndBelow;
						if (isWithinWindow) {
							bufferWindowShadow[index + counter] =
								bufferWindowShadow[start + counter];
							counter++;
						}
					}
					return {
						visibleWindow: {
							start:
								updatedBufferStart -
								current.bufferWindow.start +
								bufferRowsAboveAndBelow,
							end:
								updatedBufferStart -
								current.bufferWindow.start +
								bufferRowsAboveAndBelow +
								visibleAreaSize,
							prevStart: current.visibleWindow.start,
							prevEnd: current.visibleWindow.end,
						},
						bufferWindow: {
							start: updatedBufferStart,
							end: updatedBufferEnd,
						},
					};
				});
			}

			/**
			 * We'll do the opposite for scrolling up.
			 */
			if (visibleAreaWindowEnd <= nearBufferWindowStart && isScrollingUp) {
				setWindowState((current) => {
					const start =
						updatedBufferStart -
						current.bufferWindow.start +
						bufferRowsAboveAndBelow;

					const index = bufferRowsAboveAndBelow;
					let counter = 0;
					for (let i = 0; i < chunkSize; i++) {
						const isWithinWindow = i >= bufferRowsAboveAndBelow;
						if (isWithinWindow) {
							bufferWindowShadow[index + counter] =
								bufferWindowShadow[start + counter];
							counter++;
						}
					}
					return {
						visibleWindow: {
							start: visibleAreaWindowStart,
							end: visibleAreaWindowEnd,
							prevStart: current.visibleWindow.start,
							prevEnd: current.visibleWindow.end,
						},
						bufferWindow: {
							start: updatedBufferStart,
							end: updatedBufferEnd,
						},
					};
				});
			}

			prevScrollPos.current = scrollPos;
		}, 100),
		[windowState],
	);

	/**
	 * Ensure we don't see a view-blocking spinner more than once.
	 */
	useEffect(() => {
		if (data?.data?.total_count && isFirstLoad.current) {
			isFirstLoad.current = false;
			setTotal(data.data.total_count);
		}
	}, [data]);

	/**
	 * Is the flash related to no data existing?
	 */
	useEffect(() => {
		if (data?.data?.data.length) {
			const incomingRowsAbove = data.data.data.slice(0, 87);
			const visibleAreaWindowEnd = 87 + visibleAreaSize;
			const incomingRowsVisible = data.data.data.slice(
				87,
				visibleAreaWindowEnd,
			);
			const incomingRowsBelow = data.data.data.slice(visibleAreaWindowEnd);
			bufferWindowShadow = [
				...incomingRowsAbove,
				...incomingRowsVisible,
				...incomingRowsBelow,
			];
		}
	}, [data, windowState]);

	if (error || data?.error) {
		return (
			<div>
				<h2>Failed to Load Data</h2>
				<p>{(error || data?.error)?.message}</p>
			</div>
		);
	}

	if (isLoading && isFirstLoad.current) {
		return <h2>Loading...</h2>;
	}

	return (
		<div>
			<div style={{ display: "block" }}>
				<div>
					{table.getHeaderGroups().map((headerGroup) => (
						<div
							style={{ display: "flex", width: "100%" }}
							key={headerGroup.id}
						>
							{headerGroup.headers.map((header) => {
								return (
									<div
										key={header.id}
										style={{
											flex: "1",
											maxWidth: "100px",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
									</div>
								);
							})}
						</div>
					))}
				</div>
				<div
					style={{
						height: "500px",
						overflow: "auto",
						width: "100%",
					}}
					onScroll={(event) => handleScroll(event.currentTarget.scrollTop)}
				>
					<div
						style={{
							width: "100%",
							height: `${virtualizer.getTotalSize()}px`,
						}}
						ref={tableBodyRef}
					>
						{virtualizer.getVirtualItems().map((virtualRow, _index) => {
							/**
							 * The data returned from the server is a "window"
							 * into the total population, so we'll need to calculate
							 * the offset between the window and the population.
							 */
							const index = virtualRow.index - windowState.bufferWindow.start;
							const row = rows[index];

							if (!row || !row?.original) {
								return (
									<div
										style={{ height: `${rowHeight}px` }}
										data-virtual-index={virtualRow.index}
										key={virtualRow.key}
									/>
								);
							}

							return (
								<div
									data-row-index={virtualRow.index}
									key={virtualRow.key}
									style={{
										width: "100%",
										display: "flex",
										height: `${virtualRow.size}px`,
										transform: `translateY(${
											virtualRow.start - _index * virtualRow.size
										}px)`,
									}}
								>
									{virtualizer.getVirtualItems().length &&
										row.getVisibleCells().map((cell) => {
											return (
												<div
													style={{
														flex: "1",
														maxWidth: "100px",
														overflow: "hidden",
														textOverflow: "ellipsis",
													}}
													key={cell.id}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</div>
											);
										})}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
