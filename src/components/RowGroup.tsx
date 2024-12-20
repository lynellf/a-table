// @deno-types="@types/react"
import type { HTMLProps } from "react";

type Props = {
	element: "thead" | "tbody" | "tfoot";
	children: React.ReactNode;
} & HTMLProps<HTMLTableSectionElement>;

export default function RowGroup(props: Props) {
	switch (props.element) {
		case "tbody":
			return <tbody {...props} />;
		case "tfoot":
			return <tfoot {...props} />;
		case "thead":
			return <thead {...props} />;

		default:
			throw new Error(
				`Unexpected element type of ${props.element}. Expected 'tbody', 'tfoot', or 'thead'.`,
			);
	}
}
