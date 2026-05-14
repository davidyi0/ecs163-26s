class BarChart {
    constructor(selector) {
        // define margins
        this.margin = { top: 40, right: 20, bottom: 60, left: 180 };
        this.width = document.querySelector(selector).clientWidth - this.margin.left - this.margin.right;
        this.height = document.querySelector(selector).clientHeight - this.margin.top - this.margin.bottom;

        // main svg element, scaling to height and width of bottom-left div
        this.svg = d3.select(selector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
            // append 'g' to group and offset chart
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // define scale for x and y axes, x for linear scale for salary, y for band scale for categorical job titles
        this.x = d3.scaleLinear().range([0, this.width]);
        this.y = d3.scaleBand().range([0, this.height]).padding(0.1);

        // group and position x-axis at bottom
        this.xAxis = this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`);

        // group and position/offset y-axis at left side
        this.yAxis = this.svg.append("g");

        // x-axis label
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height + 45)
            .style("text-anchor", "middle")
            .text("Median Salary (USD)");

        // chart title
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Median Salary by Top 10 Job Titles");

        // uses html tooltip div
        this.tooltip = d3.select("#hover-tooltip");
    }

    update(data) {
        // handles 0 matching selection
        if (data.length === 0) {
            this.svg.selectAll(".bar").remove();
            return;
        }

        // groups data by job title and calculate the median salary for each group
        let nested = d3.nest()
            .key(d => d.job_title)
            .rollup(leaves => {
                let sorted = leaves.map(d => d.salary_in_usd).sort(d3.ascending);
                return d3.median(sorted);
            })
            .entries(data);

        // sorts descending order of median salary
        nested.sort((a, b) => b.value - a.value);
        // limits to top 10 job titles
        let topData = nested.slice(0, 10);

        // update the scale domain based on the new top 10 data
        this.x.domain([0, d3.max(topData, d => d.value)]);
        this.y.domain(topData.map(d => d.key));

        // redraws axes with a smooth transition
        this.xAxis.transition().duration(500).call(d3.axisBottom(this.x).ticks(5).tickFormat(d3.format("~s")));
        this.yAxis.transition().duration(500).call(d3.axisLeft(this.y));

        // binds new data to the existing '.bar' elements
        let bars = this.svg.selectAll(".bar")
            .data(topData, d => d.key);

        // appends new 'rect' elements for incoming data
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => this.y(d.key))
            .attr("height", this.y.bandwidth())
            // starts at 0 width for animation
            .attr("x", 0)
            .attr("width", 0)
            // orange if currently selected filter, otherwise blue
            .attr("fill", d => globalFilter.jobTitle === d.key ? "#ff7f0e" : "#1f77b4")
            // mouseover event to fade in and position tooltip
            .on("mouseover", (d) => {
                this.tooltip.transition().duration(200).style("opacity", .9);
                this.tooltip.html(`<b>${d.key}</b><br/>Median: $${d3.format(",.0f")(d.value)}`)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            // mouseout event to fade out tooltip
            .on("mouseout", () => {
                this.tooltip.transition().duration(500).style("opacity", 0);
            })
            // click event to toggle filtering by job title
            .on("click", (d) => {
                if (globalFilter.jobTitle === d.key) {
                    globalFilter.jobTitle = null; // turn off filter if clicking the same bar
                } else {
                    globalFilter.jobTitle = d.key; // turn on filter
                }
                this.svg.selectAll(".bar")
                    .transition().duration(200)
                    .attr("fill", barData => globalFilter.jobTitle === barData.key ? "#ff7f0e" : "#1f77b4");

                updateViews("bar"); // trigger global update
            })
            // merge enter and update selection
            .merge(bars)
            // animate changes in width and color with a 500ms transition
            .transition()
            .duration(500)
            .attr("y", d => this.y(d.key))
            .attr("height", this.y.bandwidth())
            .attr("width", d => this.x(d.value))
            .attr("fill", d => globalFilter.jobTitle === d.key ? "#ff7f0e" : "#1f77b4");

        // remove rect elements that no longer have corresponding data
        bars.exit()
            .transition()
            .duration(500)
            .attr("width", 0) // shrink before removing
            .remove();
    }
}
