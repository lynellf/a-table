export const aggregatedData = [
	// Global total (no region, country or category)
	{ Region: "", Country: "", Category: "", totalCount: 3000 },

	// Region-level totals
	{ Region: "North America", Country: "", Category: "", totalCount: 1200 },
	{ Region: "Europe", Country: "", Category: "", totalCount: 1000 },
	{ Region: "Asia", Country: "", Category: "", totalCount: 800 },

	// Country-level totals
	{ Region: "North America", Country: "USA", Category: "", totalCount: 700 },
	{ Region: "North America", Country: "Canada", Category: "", totalCount: 500 },
	{ Region: "Europe", Country: "Germany", Category: "", totalCount: 600 },
	{ Region: "Europe", Country: "France", Category: "", totalCount: 400 },
	{ Region: "Asia", Country: "Japan", Category: "", totalCount: 500 },
	{ Region: "Asia", Country: "India", Category: "", totalCount: 300 },

	// Product category-level totals
	{
		Region: "North America",
		Country: "USA",
		Category: "Electronics",
		totalCount: 400,
	},
	{
		Region: "North America",
		Country: "USA",
		Category: "Furniture",
		totalCount: 300,
	},
	{
		Region: "North America",
		Country: "Canada",
		Category: "Electronics",
		totalCount: 200,
	},
	{
		Region: "North America",
		Country: "Canada",
		Category: "Furniture",
		totalCount: 300,
	},
	{
		Region: "Europe",
		Country: "Germany",
		Category: "Electronics",
		totalCount: 350,
	},
	{
		Region: "Europe",
		Country: "Germany",
		Category: "Furniture",
		totalCount: 250,
	},
	{
		Region: "Europe",
		Country: "France",
		Category: "Electronics",
		totalCount: 150,
	},
	{
		Region: "Europe",
		Country: "France",
		Category: "Furniture",
		totalCount: 250,
	},
	{
		Region: "Asia",
		Country: "Japan",
		Category: "Electronics",
		totalCount: 300,
	},
	{ Region: "Asia", Country: "Japan", Category: "Furniture", totalCount: 200 },
	{
		Region: "Asia",
		Country: "India",
		Category: "Electronics",
		totalCount: 100,
	},
	{ Region: "Asia", Country: "India", Category: "Furniture", totalCount: 200 },
];
