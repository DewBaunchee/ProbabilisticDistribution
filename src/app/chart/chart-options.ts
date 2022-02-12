import {BaseType, Line, Selection} from "d3";
import {Scales} from "./scales";
import {Axes} from "./axes";
import {BehaviorSubject} from "rxjs";
import {blankObject} from "./util";
import {Rectangle} from "./Rectangle";
import {Bounds} from "./bounds";

export class ChartOptions {

    public line: BehaviorSubject<Line<[number, number]>> = new BehaviorSubject<Line<[number, number]>>(undefined);

    public svg: Selection<SVGSVGElement, unknown, BaseType, unknown>;

    public chartsGroup: Selection<SVGGElement, unknown, BaseType, unknown>;

    public svgSize: BehaviorSubject<Rectangle> = new BehaviorSubject<Rectangle>(blankObject());

    public bounds: BehaviorSubject<Bounds> = new BehaviorSubject<Bounds>(undefined);

    public scales: BehaviorSubject<Scales> = new BehaviorSubject<Scales>(blankObject());

    public axes: BehaviorSubject<Axes> = new BehaviorSubject<Axes>(blankObject());

    public xAxis: Selection<SVGGElement, unknown, BaseType, unknown>;

    public yAxis: Selection<SVGGElement, unknown, BaseType, unknown>;
}
