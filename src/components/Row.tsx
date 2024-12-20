// @deno-types="@types/react"
import type { HTMLProps } from "react";

type Props = {
	children?: React.ReactNode;
} & HTMLProps<HTMLTableRowElement>;

export default function Row(props: Props) {
	return <tr {...props} />;
}
