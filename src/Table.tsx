// @deno-types="@types/lodash"
import { debounce } from "lodash";
import type { Virtualizer } from "@tanstack/virtual-core";
import {
	useReactTable,
	createColumnHelper,
	getCoreRowModel,
	flexRender,
	type Row as TRow,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
// @deno-types="@types/react"
import { useMemo, useRef, useCallback, memo } from "react";
import useSWRInfinite from "swr/infinite";
import type { Player } from "./schemas.ts";
import { getPlayers } from "./getPlayers.ts";
import Datagrid from "./components/Datagrid.tsx";
import GridCell from "./components/GridCell.tsx";
import RowGroup from "./components/RowGroup.tsx";
import Row from "./components/Row.tsx";
import ColumnHeader from "./components/ColumnHeader.tsx";

const PAGE_SIZE = 200;
const ROW_HEIGHT = 28;

const columnHelper = createColumnHelper<Player>();

const fetchData = async (indexStr: string) => {
	const { data, error } = await getPlayers({
		start: Number.parseInt(indexStr) + 1 * PAGE_SIZE,
		count: PAGE_SIZE,
	});
	if (error) {
		throw error;
	}
	return data;
};

/**
 * Memoizing the table body gives us a pathway for
 * smooth column re-sizing.
 */
const MemoedTableBody = memo(
	TableBody,
	(prev, next) => prev.rows === next.rows,
);

export default function Table() {
	const containerRef = useRef<HTMLDivElement>(null);
	const prevScrollPos = useRef(0);
	const { data, size, setSize, isLoading, error } = useSWRInfinite(
		(index: number) => index.toString(),
		fetchData,
	);
	const players = data ? data.flatMap((chunk) => chunk.data) : [];
	const totalCount = data?.[0].total_count ?? 0;
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
	const table = useReactTable({
		columns,
		data: players,
		defaultColumn: {
			minSize: 60,
			maxSize: 800,
		},
		columnResizeMode: "onChange",
		getCoreRowModel: getCoreRowModel(),
		autoResetExpanded: false,
		autoResetAll: false,
		autoResetPageIndex: false,
	});
	const rows = table.getCoreRowModel().rows;
	const isFirstLoad = useRef(true);
	const virtualizer = useVirtualizer({
		count: totalCount,
		getScrollElement: () => containerRef.current,
		estimateSize: () => ROW_HEIGHT,
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
		debounce(
			(scrollHeight: number, scrollTop: number, clientHeight: number) => {
				const isScrollingDown = scrollHeight > prevScrollPos.current;
				const remainingHeight = scrollHeight - scrollTop - clientHeight;
				const scrollProgress =
					Math.round(remainingHeight / ROW_HEIGHT / PAGE_SIZE) + 1;

				if (scrollProgress > size && isScrollingDown) {
					setSize(scrollProgress);
				}
				prevScrollPos.current = scrollHeight;
			},
			100,
		),
		[size, setSize],
	);

	/**
	 * Instead of calling `column.getSize()` on every render for every header
	 * and especially every data cell (very expensive),
	 * we will calculate all column sizes at once at the root table level in a useMemo
	 * and pass the column sizes down as CSS variables to the <table> element.
	 */
	const columnSizeVars = useMemo(() => {
		const headers = table.getFlatHeaders();
		const colSizes: Record<string, number> = {};
		for (let i = 0; i < headers.length; i++) {
			const header = headers[i];
			colSizes[`--header-${header.id}-size`] = header.getSize();
			colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
		}
		return colSizes;
	}, [
		table.getState().columnSizingInfo,
		table.getState().columnSizing,
		table.getFlatHeaders(),
	]);

	if (error) {
		return (
			<div>
				<h2>Failed to Load Data</h2>
				<p>{error?.message}</p>
			</div>
		);
	}

	if (isLoading && isFirstLoad.current) {
		return <h2>Loading...</h2>;
	}

	return (
		<div style={{ height: "100vh", width: "100vw", position: "relative" }}>
			<div
				style={{
					overflow: "auto",
					position: "absolute",
					height: "100%",
					width: "100%",
					top: "0",
					left: "0",
				}}
				ref={containerRef}
				onScroll={(event) =>
					handleScroll(
						event.currentTarget.scrollTop,
						event.currentTarget.offsetTop,
						event.currentTarget.clientHeight,
					)
				}
			>
				<Datagrid style={{ ...columnSizeVars }}>
					<RowGroup aria-label="datagrid header" element="thead">
						{table.getHeaderGroups().map((headerGroup) => (
							<Row
								style={{
									height: `${ROW_HEIGHT}px`,
								}}
								key={headerGroup.id}
							>
								{headerGroup.headers.map((header) => {
									return (
										<ColumnHeader
											style={{
												minWidth: `calc(var(--header-${header?.id}-size) * 1px)`,
												maxWidth: `calc(var(--col-${header.id}-size) * 1px)`,
											}}
											key={header.id}
										>
											<div>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</div>
											<div
												className={`column-resize-handle ${header.column.getIsResizing() ? "is-resizing" : ""}`}
												onDoubleClick={() => header.column.resetSize()}
												onMouseDown={header.getResizeHandler()}
											/>
										</ColumnHeader>
									);
								})}
							</Row>
						))}
					</RowGroup>
					{/* {newFunction(virtualizer, rows)} */}
					{table.getState().columnSizingInfo.isResizingColumn ? (
						<MemoedTableBody virtualizer={virtualizer} rows={rows} />
					) : (
						<TableBody virtualizer={virtualizer} rows={rows} />
					)}
				</Datagrid>
			</div>
		</div>
	);
}

type TableBodyProps = {
	virtualizer: Virtualizer<HTMLDivElement, Element>;
	rows: TRow<unknown>[];
};

function TableBody(props: TableBodyProps) {
	const { virtualizer, rows } = props;
	return (
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
				const index = virtualRow.index;
				const row = rows[index];

				if (!row) {
					return (
						<Row
							style={{
								height: `${ROW_HEIGHT}px`,
							}}
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
							/**
							 * transform: translateY is required for a smooth scrolling experience.
							 * Witout this property value, the browser has to perform a significant number of
							 * layout calculations. With the property value, we can reduce the number of calculations.
							 * To learn more, see:
							 * https://chatgpt.com/c/6766ea32-cd88-800b-85bd-d31e32419d5b
							 */
							transform: `translateY(${virtualRow.start - _index * virtualRow.size}px)`,
						}}
					>
						{virtualizer.getVirtualItems().length &&
							row.getVisibleCells().map((cell) => {
								return (
									<GridCell
										style={{
											borderBottom: "1px solid",
											minWidth: `calc(var(--col-${cell.column.id}-size) * 1px)`,
											maxWidth: `calc(var(--col-${cell.column.id}-size) * 1px)`,
										}}
										key={cell.id}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</GridCell>
								);
							})}
					</Row>
				);
			})}
		</RowGroup>
	);
}
