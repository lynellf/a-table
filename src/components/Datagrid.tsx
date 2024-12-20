// @deno-types="@types/react"
import type { HTMLProps } from "react";
import "./datagrid.css";

type Props = {
	children: React.ReactNode;
} & HTMLProps<HTMLTableElement>;

export default function Datagrid(props: Props) {
	return <table {...props} />;
}
