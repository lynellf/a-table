// @deno-types="@types/react"
import { useMemo, useState } from "react";
// import useSWR from "swr";
import {
	useReactTable,
	createColumnHelper,
	getCoreRowModel,
	getExpandedRowModel,
	flexRender,
	type ExpandedState,
} from "@tanstack/react-table";
import { nanoid } from "nanoid";
import "./treetable.css";

type TAggItem = Record<string, string | number> & { totalCount: number };
type TTreeNode = TAggItem & {
	children?: TTreeNode[];
};

const columnHelper = createColumnHelper<TAggItem>();

type TAccessor = ReturnType<typeof columnHelper.accessor>;
type TGroup = ReturnType<typeof columnHelper.group>;
type TCol = TAccessor | TGroup;

type Props = {
	rows: string[];
	columns: string[];
	data: TAggItem[]; // top level nodes or entire dataset
	isDynamic?: boolean;
	fetcher?: (column: string, value?: string) => Promise<TAggItem[]>;
};

/**
 * Helper: Group an array of items by a specified property.
 */
function groupBy<T>(data: T[], key: keyof T): Record<string, T[]> {
	return data.reduce(
		(groups, item) => {
			const groupKey = String(item[key]);
			if (!groups[groupKey]) {
				groups[groupKey] = [];
			}
			groups[groupKey].push(item);
			return groups;
		},
		{} as Record<string, T[]>,
	);
}

/**
 * Recursively build the tree structure given the data and the hierarchy array.
 * @param data - The flat aggregated data array.
 * @param hierarchy - An array of strings representing the hierarchy of grouping, e.g. ["Category", "Region", "Country"].
 * @param paths
 * @returns An array of tree nodes.
 */
function buildTree(
	data: TAggItem[],
	hierarchy: string[],
	paths: string[],
): TTreeNode[] {
	// Base case: if no hierarchy left, return data as tree nodes.
	if (hierarchy.length === 0) {
		return data as TTreeNode[];
	}

	const [currentKey, ...restHierarchy] = hierarchy;
	const groups = groupBy(data, currentKey);
	const result: TTreeNode[] = [];

	// For each unique value for the current key, build a node.
	for (const value in groups) {
		const groupItems = groups[value];

		// Create a node for this group.
		// Note: if records in groupItems have other relevant keys (e.g. Region, Country),
		// you can incorporate them as well. Here, we focus on the current grouping.
		const node: TTreeNode = {
			// Assign the current grouping value to the key.
			[currentKey]: value,
			// Assume the first record's totalCount is representative of this grouping.
			totalCount: groupItems[0].totalCount,
		};

		/**
		 * Fill out remaining object properties of the tree node
		 */
		for (const [key, val] of Object.entries(groupItems[0])) {
			if (!Array.isArray(val) && key !== "totalCount") {
				node[key] = val;
			}
		}

		node.__name__ = value;

		/**
		 * We don't want the same node represented as a parent and its own child in the dataset.
		 * It's nonsensical to the end-user. (usage of Array.prototype.slice(1))
		 */

		// If there are further levels in the hierarchy, build children.
		if (restHierarchy.length > 0) {
			node.children = buildTree(groupItems.slice(1), restHierarchy, paths);

			node.totalCount = node.children.reduce(
				(acc, child) => acc + child.totalCount,
				0,
			);
		}

		for (const path of paths) {
			node[path] = data
				.filter((row) => checkPath(row, path) && row[currentKey] === value)
				.reduce((acc, curr) => acc + curr.totalCount, 0);
		}

		result.push(node);
	}

	return result;
}

type TColGroupProps = {
	hierarchy: string[];
	data: TAggItem[];
	currentPath?: string;
};

function createColumnHierarchy(props: TColGroupProps): TCol[] {
	const { hierarchy, data, currentPath } = props;
	if (hierarchy.length === 0) {
		// No more columns to build
		return [];
	}

	// The first accessor in the hierarchy for this level
	const [currentAccessor, ...restAccessors] = hierarchy;

	// Get the distinct values for the current accessor
	const distinctValues = Array.from(
		new Set(data.map((item) => item[currentAccessor])),
	).sort((a, b) => String(a).localeCompare(String(b)));

	// If there are still more accessors after this, we build group columns
	if (restAccessors.length > 0) {
		return distinctValues.map((val) => {
			const path = currentPath
				? `${currentPath}-${currentAccessor}-${val}`
				: `${currentAccessor}-${val}`;

			// Filter the data to just rows where currentAccessor === val
			const subData = data.filter((item) => item[currentAccessor] === val);

			return columnHelper.group({
				id: path,
				header: () => val || "Blank",
				columns: createColumnHierarchy({
					hierarchy: restAccessors,
					data: subData,
					currentPath: path,
				}),
			});
		});
	}

	// Otherwise, we're at the last accessor—these become leaf columns
	return distinctValues.map((val) => {
		const path = currentPath
			? `${currentPath}-${currentAccessor}-${val}`
			: `${currentAccessor}-${val}`;
		return columnHelper.accessor(path, {
			id: path,
			header: () => val || "Blank",
		});
	});
}

/**
 * Recursively generate unique hierarchy paths from the dataset.
 * @param accessors The ordered list of fields (e.g. ["Category", "Region", "Country"]).
 * @param data The dataset to process.
 * @param currentPath The current path prefix (should be left blank when you first call it).
 * @returns A list of unique path strings.
 */
function createPathHierarchy(
	accessors: string[],
	data: TAggItem[],
	currentPath = "",
): string[] {
	// If there are no more accessors, there's nothing left to group.
	if (accessors.length === 0) {
		return [];
	}

	// Use the first accessor in this recursion step.
	const [currentAccessor, ...restAccessors] = accessors;

	// Get the distinct values for the current accessor.
	const distinctValues = Array.from(
		new Set(data.map((item) => item[currentAccessor])),
	).sort((a, b) => String(a).localeCompare(String(b)));

	// Initialize an array to hold all paths at this level (and deeper).
	let paths: string[] = [];

	// For each distinct value, compute its path, record it, and continue recursion.
	for (const val of distinctValues) {
		// Build the new path for this distinct value.
		const path = currentPath
			? `${currentPath}-${currentAccessor}-${val}`
			: `${currentAccessor}-${val}`;
		// Add this partial path to our list.
		paths.push(path);

		// Filter the data for rows that match the current value.
		const subData = data.filter((item) => item[currentAccessor] === val);

		// If there are more accessors remaining, recursively build their paths.
		if (restAccessors.length > 0) {
			const childPaths = createPathHierarchy(restAccessors, subData, path);
			// Combine child paths with the paths at the current level.
			paths = paths.concat(childPaths);
		}
	}

	return paths;
}

function checkPath(item: TAggItem, path: string): boolean {
	const segments = path.split("-");

	// There should be an even number of segments to form valid key/value pairs.
	if (segments.length < 2 || segments.length % 2 !== 0) {
		return false;
	}

	// Iterate over the segments in steps of two.
	for (let i = 0; i < segments.length; i += 2) {
		const key = segments[i];
		const value = segments[i + 1];

		// If a key/value pair doesn't match, return false immediately.
		if (item[key] !== value) {
			return false;
		}
	}

	// All pairs matched.
	return true;
}

export function TreeTable(props: Props) {
	const { rows, columns: accessors, data: baseData, fetcher } = props;
	const [expanded, setExpanded] = useState<ExpandedState>({});
	const columns = useMemo(
		() => [
			columnHelper.accessor("__name__", {
				id: "name",
				header: () => (rows[0] === "" ? "Blank" : rows[0]),
				cell: ({ row, getValue }) => {
					const canExpand = row.getCanExpand();
					const rawValue = getValue();
					const value = rawValue === "" ? "Blank" : rawValue;

					return (
						<div>
							{canExpand ? (
								<button onClick={row.getToggleExpandedHandler()} type="button">
									+
								</button>
							) : null}
							{value}
						</div>
					);
				},
			}),
			...createColumnHierarchy({
				hierarchy: accessors,
				data: baseData,
			}),
		],
		[accessors, baseData],
	);
	const data = useMemo(() => {
		const withIds = baseData.map((item) => {
			item.__id__ = nanoid(4);
			return item;
		});

		const paths = createPathHierarchy(accessors, baseData);
		const withChildren = buildTree(withIds, rows, paths);
		return withChildren;
	}, [baseData, rows, accessors]);

	const table = useReactTable({
		data,
		columns,
		getRowCanExpand: (row) => row.original?.children?.length > 0,
		getSubRows: (row) => {
			return row.children;
		},
		getCoreRowModel: getCoreRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		state: {
			expanded,
		},
		onExpandedChange: setExpanded,
	});

	return (
		<table>
			<thead>
				{table.getHeaderGroups().map((headerGroup) => {
					return (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th key={header.id} colSpan={header.colSpan}>
									{flexRender(
										header.column.columnDef.header,
										header.getContext(),
									)}
								</th>
							))}
						</tr>
					);
				})}
			</thead>
			<tbody>
				{table.getRowModel().rows.map((row) => (
					<tr key={row.id}>
						{row.getVisibleCells().map((cell) => (
							<td key={cell.id}>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	);
}
