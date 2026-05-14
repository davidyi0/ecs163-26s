class BarChart {
    constructor(selector) {
        // Define margins for the SVG canvas
        this.margin = {top: 40, right: 20, bottom: 60, left: 180};
        this.width = document.querySelector(selector).clientWidth - this.margin.left - this.margin.right;
        this.height = document.querySelector(selector).clientHeight - this.margin.top - this.margin.bottom;

        // Append the main SVG element to the provided selector div
        this.svg = d3.select(selector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
            // Append a grouping element 'g' to offset the chart by the top/left margins
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Initialize D3 scales for X (linear for salary) and Y (band for categorical job titles)
        this.x = d3.scaleLinear().range([0, this.width]);
        this.y = d3.scaleBand().range([0, this.height]).padding(0.1);

        // Append a grouping element 'g' for the X-axis and position it at the bottom
        this.xAxis = this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`);
        
        // Append a grouping element 'g' for the Y-axis (defaults to left)
        this.yAxis = this.svg.append("g");

        // Append a text element for the X-axis label
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height + 45)
            .style("text-anchor", "middle")
            .text("Median Salary (USD)");

        // Append a text element for the main chart title
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Median Salary by Top 10 Job Titles");
            
        // Select the pre-existing tooltip div from the HTML layout
        // (Note: Updated to '#hover-tooltip' based on your recent index.html changes)
        this.tooltip = d3.select("#hover-tooltip");
    }

    update(data) {
        // If there is no data, remove all existing bar rectangles and exit early
        if (data.length === 0) {
            this.svg.selectAll(".bar").remove();
            return;
        }

        // Use d3.nest to group data by job title and calculate the median salary for each group
        let nested = d3.nest()
            .key(d => d.job_title)
            .rollup(leaves => {
                let sorted = leaves.map(d => d.salary_in_usd).sort(d3.ascending);
                return d3.median(sorted);
            })
            .entries(data);

        // Sort the grouped data in descending order of median salary
        nested.sort((a, b) => b.value - a.value);
        // Slice the array to only keep the top 10 job titles for visualization
        let topData = nested.slice(0, 10);

        // Update the scale domains based on the new top 10 data
        this.x.domain([0, d3.max(topData, d => d.value)]);
        this.y.domain(topData.map(d => d.key));

        // Redraw the axes with a smooth 500ms transition
        this.xAxis.transition().duration(500).call(d3.axisBottom(this.x).ticks(5).tickFormat(d3.format("~s")));
        this.yAxis.transition().duration(500).call(d3.axisLeft(this.y));

        // Bind the new data to the existing '.bar' elements (if any)
        let bars = this.svg.selectAll(".bar")
            .data(topData, d => d.key);

        // Enter phase: Append new 'rect' elements for incoming data
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => this.y(d.key))
            .attr("height", this.y.bandwidth())
            // Start at width 0 for animation purposes
            .attr("x", 0)
            .attr("width", 0) 
            // Color orange if it's the currently selected filter, otherwise standard blue
            .attr("fill", d => globalFilter.jobTitle === d.key ? "#ff7f0e" : "#1f77b4")
            // Add mouseover event to fade in and position the tooltip
            .on("mouseover", (d) => {
                this.tooltip.transition().duration(200).style("opacity", .9);
                this.tooltip.html(`<b>${d.key}</b><br/>Median: $${d3.format(",.0f")(d.value)}`)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            // Add mouseout event to fade out the tooltip
            .on("mouseout", () => {
                this.tooltip.transition().duration(500).style("opacity", 0);
            })
            // Add click event to toggle filtering by job title
            .on("click", (d) => {
                if (globalFilter.jobTitle === d.key) {
                    globalFilter.jobTitle = null; // Turn off filter if clicking the same bar
                } else {
                    globalFilter.jobTitle = d.key; // Turn on filter
                }
                updateViews("bar"); // Trigger global update
            })
            // Merge the enter selection with the update selection
            .merge(bars) 
            // Animate changes in width and color with a 500ms transition
            .transition()
            .duration(500)
            .attr("y", d => this.y(d.key))
            .attr("height", this.y.bandwidth())
            .attr("width", d => this.x(d.value))
            .attr("fill", d => globalFilter.jobTitle === d.key ? "#ff7f0e" : "#1f77b4");

        // Exit phase: Remove 'rect' elements that no longer have corresponding data
        bars.exit()
            .transition()
            .duration(500)
            .attr("width", 0) // Shrink to 0 width before removing
            .remove();
    }
}
