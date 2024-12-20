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
import Datagrid from "./components/Datagrid.tsx";
import GridCell from "./components/GridCell.tsx";
import RowGroup from "./components/RowGroup.tsx";
import Row from "./components/Row.tsx";
import ColumnHeader from "./components/ColumnHeader.tsx";

/**
 * Represents the state of the buffer and visible windows for virtual scrolling.
 */
type WindowState = {
	/**
	 * The buffer window represents the range of data currently fetched and stored locally.
	 */
	bufferWindow: {
		start: number;
		end: number;
	};
	/**
	 * The visible window represents the range of data currently visible to the user.
	 * Includes previous start/end positions for comparison.
	 */
	visibleWindow: {
		start: number;
		end: number;
		prevStart: number;
		prevEnd: number;
	};
};

const columnHelper = createColumnHelper<Player>();

const visibleAreaHeight = globalThis.innerHeight;
const chunkSize = 200;
const visibleAreaSize = Math.floor(visibleAreaHeight / 20);
const rowHeight = 28;
const bufferRowsAboveAndBelow = Math.floor((chunkSize - visibleAreaSize) / 2);
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
	const containerRef = useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count: total,
		getScrollElement: () => containerRef.current,
		estimateSize: () => rowHeight,
		overscan: 0,
	});

	/**
	 * Handles the scroll event for the table body.
	 * Calculates the need for updating buffer and visible windows based on scroll position.
	 * Debounced to prevent excessive updates during rapid scrolling.
	 *
	 * @param scrollPos - The current vertical scroll position (in pixels).
	 */
	const handleScroll = useCallback(
		debounce((scrollPos: number) => {
			const isScrollingDown = scrollPos > prevScrollPos.current;
			const isScrollingUp = scrollPos < prevScrollPos.current;
			const visibleAreaWindowStart = Math.floor(scrollPos / rowHeight);
			const visibleAreaWindowEnd = visibleAreaWindowStart + visibleAreaSize;
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
	 * Effect hook to update the total number of items in the dataset.
	 * Sets the total count from the data fetched on the first load.
	 *
	 * Dependency array: [data]
	 */
	useEffect(() => {
		if (data?.data?.total_count && isFirstLoad.current) {
			isFirstLoad.current = false;
			setTotal(data.data.total_count);
		}
	}, [data]);

	/**
	 * The buffer window requires synchronization once the incoming dataset arrives. Otherwise, there will be a noticable flicker
	 * on-screen. I disabled React's strict mode, so this issue is unrelated to additional re-renders. It seems as if an additional
	 * scroll callback is fired unintentially after the initial update to the buffer window's dataset, so we need to do it again here.
	 * I don't get it.
	 * Dependency array: [data, windowState]
	 */
	useEffect(() => {
		if (data?.data?.data.length) {
			const offset = bufferRowsAboveAndBelow;
			const incomingRowsAbove = data.data.data.slice(0, offset);
			const visibleAreaWindowEnd = offset + visibleAreaSize;
			const incomingRowsVisible = data.data.data.slice(
				offset,
				visibleAreaWindowEnd,
			);
			const incomingRowsBelow = data.data.data.slice(visibleAreaWindowEnd);
			bufferWindowShadow = [
				...incomingRowsAbove,
				...incomingRowsVisible,
				...incomingRowsBelow,
			];
			// bufferWindowShadow = data.data.data;
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
		<div
			style={{ overflow: "auto", height: "90vh", width: "100vw" }}
			ref={containerRef}
			onScroll={(event) => handleScroll(event.currentTarget.scrollTop)}
		>
			<Datagrid>
				<RowGroup aria-label="datagrid header" element="thead">
					{table.getHeaderGroups().map((headerGroup) => (
						<Row
							style={{
								height: `${rowHeight}px`,
							}}
							key={headerGroup.id}
						>
							{headerGroup.headers.map((header) => {
								return (
									<ColumnHeader key={header.id}>
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
									</ColumnHeader>
								);
							})}
						</Row>
					))}
				</RowGroup>
				<RowGroup
					style={{ height: `${virtualizer.getTotalSize()}px` }}
					element="tbody"
					aria-label="datagrid body"
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
								<Row
									style={{ height: `${rowHeight}px` }}
									data-virtual-index={virtualRow.index}
									key={virtualRow.key}
								/>
							);
						}

						return (
							<Row
								data-row-index={virtualRow.index}
								key={virtualRow.key}
								style={{
									height: `${virtualRow.size}px`,
									transform: `translateY(${
										virtualRow.start - _index * virtualRow.size
									}px)`,
								}}
							>
								{virtualizer.getVirtualItems().length &&
									row.getVisibleCells().map((cell) => {
										return (
											<GridCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</GridCell>
										);
									})}
							</Row>
						);
					})}
				</RowGroup>
			</Datagrid>
		</div>
	);
}
