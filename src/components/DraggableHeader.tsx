// @deno-types="@types/react"
import type { CSSProperties, HTMLProps } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Header, flexRender } from "@tanstack/react-table";
import ColumnHeader from "./ColumnHeader.tsx";

type Props<T> = {
	header: Header<T, unknown>;
} & HTMLProps<HTMLTableCellElement>;

// https://tanstack.com/table/latest/docs/framework/react/examples/column-dnd
export default function DraggableHeader<T>(props: Props<T>) {
	const { header } = props;
	const { attributes, isDragging, listeners, setNodeRef, transform } =
		useSortable({
			id: header.column.id,
		});

	const style: CSSProperties = {
		opacity: isDragging ? 0.8 : 1,
		position: "relative",
		transform: CSS.Translate.toString(transform), // translate instead of transform to avoid squishing
		transition: "width transform 0.2s ease-in-out",
		whiteSpace: "nowrap",
		width: header.column.getSize(),
		zIndex: isDragging ? 1 : 0,
		minWidth: `calc(var(--header-${header?.id}-size) * 1px)`,
		maxWidth: `calc(var(--col-${header.id}-size) * 1px)`,
	};
	const mergedStyle = !props.style ? style : { ...props.style, ...style };

	return (
		<ColumnHeader
			{...props}
			colSpan={header.colSpan}
			ref={setNodeRef}
			style={mergedStyle}
		>
			<div className="header-content">
				<span {...attributes} {...listeners} className="drag-handle" />
				<div className="content-area">
					{flexRender(header.column.columnDef.header, header.getContext())}
				</div>
			</div>
			<div
				className={`column-resize-handle ${header.column.getIsResizing() ? "is-resizing" : ""}`}
				onDoubleClick={() => header.column.resetSize()}
				onMouseDown={header.getResizeHandler()}
			/>
		</ColumnHeader>
	);
}
