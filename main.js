const margin = { top: 50, right: 30, bottom: 60, left: 70 },
      width = 750 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

const svgLine = d3.select("#lineChart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("nobel_laureates.csv").then(data => {
    const stemCategories = ["chemistry", "physics", "medicine"];
    data.forEach(d => {
        d.year = +d.year;
        d.name = d.fullname;
        d.categoryGroup = stemCategories.includes(d.category.toLowerCase()) ? "STEM" : "Non-STEM";
    });

    const categories = d3.rollup(data,
        v => d3.rollup(v, v2 => v2.length, d => d.year),
        d => d.categoryGroup
    );

    const flattenedData = [];
    categories.forEach((yearMap, category) => {
        yearMap.forEach((count, year) => {
            flattenedData.push({ year, count, category });
        });
    });

    const xScale = d3.scaleLinear()
        .domain(d3.extent(flattenedData, d => d.year))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(flattenedData, d => d.count) + 1])
        .range([height, 0]);

    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.count));

    function linearRegression(data) {
        const n = data.length;
        const sumX = d3.sum(data, d => d.year);
        const sumY = d3.sum(data, d => d.count);
        const sumXY = d3.sum(data, d => d.year * d.count);
        const sumX2 = d3.sum(data, d => d.year * d.year);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const [xMin, xMax] = d3.extent(data, d => d.year);
        return [
            { year: xMin, count: slope * xMin + intercept },
            { year: xMax, count: slope * xMax + intercept }
        ];
    }

    function drawTrendline(category) {
        const filtered = flattenedData.filter(d => d.category === category);
        const trend = linearRegression(filtered);

        svgLine.append("path")
            .datum(trend)
            .attr("class", "trendline")
            .attr("d", d3.line()
                .x(d => xScale(d.year))
                .y(d => yScale(d.count)))
            .style("stroke", "gray")
            .style("stroke-dasharray", "4 2")
            .style("fill", "none")
            .style("stroke-width", 2);
    }

    function updateChart(category) {
        const filtered = flattenedData.filter(d => d.category === category);

        svgLine.selectAll("path.data-line").remove();
        svgLine.selectAll(".trendline").remove();

        svgLine.selectAll("path.data-line")
            .data([filtered])
            .enter()
            .append("path")
            .attr("class", "data-line")
            .attr("d", line)
            .style("stroke", category === "STEM" ? "#007BFF" : "#F39C12")
            .style("fill", "none")
            .style("stroke-width", 2);

        if (d3.select("#trendline-toggle").property("checked")) {
            drawTrendline(category);
        }
    }

    svgLine.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    svgLine.append("g").call(d3.axisLeft(yScale));

    svgLine.append("text")
        .attr("class", "title")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .text("Nobel Laureates Trends");

    svgLine.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .text("Year");

    svgLine.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Number of Laureates");

    updateChart("STEM");

    d3.select("#categorySelect").on("change", function () {
        const selected = d3.select(this).property("value");
        updateChart(selected);
    });

    d3.select("#trendline-toggle").on("change", function () {
        const selected = d3.select("#categorySelect").property("value");
        updateChart(selected);
    });
});
