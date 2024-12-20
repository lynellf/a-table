// @deno-types="@types/react"
import type { HTMLProps } from "react";

type Props = {
	children: React.ReactNode;
} & HTMLProps<HTMLTableCellElement>;

export default function GridCell(props: Props) {
	return <td {...props} />;
}
