// @deno-types="@types/react"
import { useState } from "react";
import useSWR from "swr";
import "./App.css";
import Table from "./Table.tsx";
import { TreeTable } from "./components/TreeTable.tsx";
import { getRegions } from "./getRegions.ts";

type State = {
	rows: string[];
	columns: string[];
};

const options = ["Category", "Country", "Region"];

function App() {
	const { data, isLoading, error } = useSWR({}, getRegions);
	const [state, setState] = useState<State>({
		rows: ["Country"],
		columns: ["Category", "Region"],
	});

	const setValues = (key: "rows" | "cols", values: string[]) =>
		setState((current) => {
			if (key === "rows") {
				return {
					columns: current.columns.filter((col) => !values.includes(col)),
					rows: values,
				};
			}

			return {
				columns: values,
				rows: current.rows.filter((row) => !values.includes(row)),
			};
		});

	if (error) {
		return (
			<div>
				<h1>Error:</h1>
				<p>{error.message}</p>
			</div>
		);
	}

	if (isLoading) {
		return <h1>Loading...</h1>;
	}

	if (!data) {
		return (
			<div>
				<h1>Error:</h1>
				<p>No results.</p>
			</div>
		);
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "1rem",
				margin: "1rem",
			}}
		>
			<TreeTable data={data} rows={state.rows} columns={state.columns} />
			<div>
				<div>
					<label htmlFor="rows">Rows</label>
					<select
						id="rows"
						multiple
						value={state.rows}
						onChange={(event) => {
							const values = Array.from(
								event.currentTarget.selectedOptions,
							).map((option) => option.value);
							setValues("rows", values);
						}}
					>
						{options
							.filter((option) => !state.columns.includes(option))
							.map((item) => (
								<option key={item} value={item}>
									{item}
								</option>
							))}
					</select>
				</div>
				<div>
					<label htmlFor="columns">Columns</label>
					<select
						id="columns"
						multiple
						value={state.columns}
						onChange={(event) => {
							const values = Array.from(
								event.currentTarget.selectedOptions,
							).map((option) => option.value);
							setValues("cols", values);
						}}
					>
						{options
							.filter((option) => !state.rows.includes(option))
							.map((item) => (
								<option key={item} value={item}>
									{item}
								</option>
							))}
					</select>
				</div>
			</div>
		</div>
	);
	// return <Table />;
}

export default App;
