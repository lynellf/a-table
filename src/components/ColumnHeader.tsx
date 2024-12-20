// @deno-types="@types/react"
import type { HTMLProps } from "react";

type Props = {
	children: React.ReactNode;
} & HTMLProps<HTMLTableCellElement>;

export default function ColumnHeader(props: Props) {
	return <th {...props} />;
}
