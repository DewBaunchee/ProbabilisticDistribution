import * as d3 from "d3";
import {BaseType, Line, Selection} from "d3";
import {ChartOptions} from "./chart-options";
import {Bounds} from "./bounds";
import {Scales} from "./scales";
import {Axes} from "./axes";
import {combineLatest, Observable, ReplaySubject, Subject} from "rxjs";
import {Rectangle} from "./Rectangle";
import {Chart} from "./chart";
import {Coordinates, Point} from "./point";

const leftMargin: number = 50;

export class ChartControl {

    private _onMouseOver: Subject<Coordinates> = new Subject<Coordinates>();

    private drawChartRequests: ReplaySubject<Chart> = new ReplaySubject<Chart>();

    private drawPointRequests: ReplaySubject<Point> = new ReplaySubject<Point>();

    private initialized: boolean = false;

    private readonly chartOptions: ChartOptions = new ChartOptions();

    public resize(element: Element) {
        if (!this.initialized) {
            this.initialize(element);
            return;
        }
        this.chartOptions.svgSize.next(this.chartOptions.svg.node().getBoundingClientRect());
    }

    public draw(chart: Chart) {
        this.drawChartRequests.next(chart);
    }

    public drawPoint(point: Point) {
        this.drawPointRequests.next(point);
    }

    public setMaxY(maxY: number) {
        const currentBounds: Bounds = this.chartOptions.bounds.getValue();
        this.chartOptions.bounds.next({
            ...currentBounds,
            y: {
                ...currentBounds.y,
                to: maxY,
            }
        })
    }

    public nextScales(bounds: Bounds) {
        this.chartOptions.bounds.next(bounds);
    }

    public onMouseOver(): Observable<Coordinates> {
        return this._onMouseOver.asObservable();
    }

    private processChartRequest(chart: Chart) {
        let path: Selection<SVGPathElement, unknown, BaseType, unknown>;
        combineLatest([this.chartOptions.line, chart.points()])
            .subscribe(([line, data]: [Line<[number, number]>, Coordinates[]]) => {
                path?.remove();
                path = this.chartOptions.chartsGroup.append("path")
                    .attr("stroke", chart.color)
                    .attr("stroke-width", 1)
                    .attr("fill", "none")
                    .attr("d", line(data.map(point => [point.x, point.y])));
            });
    }

    private processPointRequest(point: Point) {
        const circle: Selection<SVGCircleElement, unknown, BaseType, unknown> = this.chartOptions.chartsGroup.append("circle")
            .style("fill", point.color)
            .attr("r", point.radius)
        combineLatest([this.chartOptions.scales, point.coordinates()])
            .subscribe(([scales, coordinates]: [Scales, Coordinates]) => {
                circle
                    .attr("cx", scales.x(coordinates.x))
                    .attr("cy", scales.y(coordinates.y));
            });
    }

    private initialize(element: Element) {
        this.initialized = true;
        this.chartOptions.svg = d3.select(element.querySelector("#chart"))
            .append("svg")
            .attr("height", "100%")
            .attr("width", "100%");

        this.chartOptions.svg
            .on("mousemove", event => {
                this._onMouseOver.next({
                    x: this.chartOptions.scales.getValue().x.invert(event.x - 40),
                    y: this.chartOptions.scales.getValue().y.invert(event.y),
                })
            })

        this.chartOptions.chartsGroup = this.chartOptions.svg.append("g");

        this.chartOptions.svgSize.next(this.chartOptions.svg.node().getBoundingClientRect());

        this.initializeScales();
        this.initializeAxes();

        this.chartOptions.scales
            .subscribe((scales: Scales) => {
                this.chartOptions.line.next(
                    d3.line()
                        .x(d => scales.x(d[0]))
                        .y(d => scales.y(d[1]))
                );
            });

        this.drawChartRequests.subscribe(chart => this.processChartRequest(chart));
        this.drawPointRequests.subscribe(chart => this.processPointRequest(chart));
    }

    private initializeScales() {
        this.chartOptions.bounds.next({x: {from: 0, to: 1}, y: {from: 0, to: 1}});
        combineLatest([this.chartOptions.svgSize, this.chartOptions.bounds])
            .subscribe(([svgSize, bounds]: [Rectangle, Bounds]) => {
                this.chartOptions.scales.next({
                    x: d3.scaleLinear()
                        .range([leftMargin, svgSize.width - leftMargin])
                        .domain([bounds.x.from, bounds.x.to]),
                    y: d3.scaleLinear()
                        .range([svgSize.height - 20, 10])
                        .domain([bounds.y.from, bounds.y.to])
                });
            })
    }

    private initializeAxes() {
        this.chartOptions.xAxis = this.chartOptions.svg.append("g");
        this.chartOptions.yAxis = this.chartOptions.svg.append("g");
        this.chartOptions.svgSize
            .subscribe((svgSize: Rectangle) => {
                this.chartOptions.xAxis
                    .style("transform", `translate(${0}px, ${svgSize.height - 20}px)`);
                this.chartOptions.yAxis
                    .style("transform", `translate(${leftMargin}px, ${0}px)`);
            })
        this.chartOptions.scales
            .subscribe((scales: Scales) => {
                this.chartOptions.axes.next({
                    x: d3.axisBottom(scales.x),
                    y: d3.axisLeft(scales.y),
                });
            });
        this.chartOptions.axes
            .subscribe((axes: Axes) => {
                this.chartOptions.xAxis.call(axes.x);
                this.chartOptions.yAxis.call(axes.y);
            })
    }
}
