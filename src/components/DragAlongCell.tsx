import type { CSSProperties, HTMLProps } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Cell, flexRender } from "@tanstack/react-table";
import GridCell from "./GridCell.tsx";

type Props<T> = {
	cell: Cell<T, unknown>;
} & HTMLProps<HTMLTableCellElement>;

// https://tanstack.com/table/latest/docs/framework/react/examples/column-dnd
export default function DragAlongCell<T>(props: Props<T>) {
	const { cell } = props;
	const { isDragging, setNodeRef, transform } = useSortable({
		id: cell.column.id,
	});

	const style: CSSProperties = {
		opacity: isDragging ? 0.8 : 1,
		position: "relative",
		transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
		transition: "width transform 0.2s ease-in-out",
		width: cell.column.getSize(),
		zIndex: isDragging ? 1 : 0,
		minWidth: `calc(var(--col-${cell.column.id}-size) * 1px)`,
		maxWidth: `calc(var(--col-${cell.column.id}-size) * 1px)`,
	};

	return (
		<GridCell style={style} ref={setNodeRef}>
			{flexRender(cell.column.columnDef.cell, cell.getContext())}
		</GridCell>
	);
}
