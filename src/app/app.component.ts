import {Component, ElementRef, OnInit} from "@angular/core";
import {ChartControl} from "./chart/control";
import {Distribution} from "./distribution/distribution";
import {Chart} from "./chart/chart";
import {randomNormal} from "d3";
import {Coordinates, Point} from "./chart/point";
import {Probability} from "./distribution/probability";
import {blankObject} from "./chart/util";

function equals(previousDomRect: DOMRect, domRect: DOMRect) {
    if (!previousDomRect) return false;
    return previousDomRect.width === domRect.width && previousDomRect.height === domRect.height;
}

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.css"]
})
export class AppComponent implements OnInit {

    public maxY: number = 2000;

    public readonly firstDistribution: Distribution = {mu: 0.2, sigma: 0.2, count: 10000};

    public readonly secondDistribution: Distribution = {mu: 0.7, sigma: 0.1, count: 10000};

    public readonly firstProbability: Probability = blankObject();

    public readonly secondProbability: Probability = blankObject();

    public probabilityOfFirst: number = 0;

    public probabilityOfSecond: number = 0;

    private readonly element: Element;

    private readonly chartControl: ChartControl = new ChartControl();

    private readonly firstChart: Chart = new Chart(1, "#000000");

    private readonly secondChart: Chart = new Chart(2, "#0000FF");

    private readonly firstPoint: Point = new Point("#000000", 3);

    private readonly secondPoint: Point = new Point("#0000FF", 3);

    private previousDomRect: DOMRect;

    constructor(private elementRef: ElementRef) {
        this.element = elementRef.nativeElement;
        this.chartControl.draw(this.firstChart);
        this.chartControl.draw(this.secondChart);
        this.chartControl.drawPoint(this.firstPoint);
        this.chartControl.drawPoint(this.secondPoint);

        this.chartControl.onMouseOver()
            .subscribe((event) => {
                const firstPoint: Coordinates = getApproximatedByX(event.x, this.firstChart.getPoints());
                this.firstPoint.changeCoordinates(firstPoint);
                const secondPoint: Coordinates = getApproximatedByX(event.x, this.secondChart.getPoints());
                this.secondPoint.changeCoordinates(secondPoint);

                this.probabilityOfFirst = firstPoint.y / (firstPoint.y + secondPoint.y);
                this.probabilityOfSecond = secondPoint.y / (firstPoint.y + secondPoint.y);
            })
    }

    public ngOnInit() {
        this.recalculate();
        const timeout = () => setTimeout(() => {
            checker = timeout();
            const domRect: DOMRect = this.element.getBoundingClientRect();
            if (domRect.width === 0 || domRect.height === 0 || equals(this.previousDomRect, domRect)) return;
            this.previousDomRect = domRect;
            this.chartControl.resize(this.element);
            this.changeY();
        }, 100);
        let checker: number = timeout();
    }

    public changeY() {
        this.chartControl.setMaxY(this.maxY);
    }

    public recalculate() {
        this.firstChart.changePoints(AppComponent.calculateDistribution(this.firstDistribution));
        this.secondChart.changePoints(AppComponent.calculateDistribution(this.secondDistribution));

        const firstPoints: Coordinates[] = this.firstChart.getPoints();
        const secondPoints: Coordinates[] = this.secondChart.getPoints();
        const cross: Coordinates = crossCoordinates(firstPoints, secondPoints);
        if (cross === null) {
            this.firstProbability.falseAlarm = 0;
            this.firstProbability.detectionSkip = 0;
            this.secondProbability.falseAlarm = 0;
            this.secondProbability.detectionSkip = 0;
            return;
        }

        let firstFalseAlarmZone: number;
        let firstDetectionSkipZone: number;
        const firstWholeZone: number = areaUnder(firstPoints);
        const secondWholeZone: number = areaUnder(secondPoints);
        if (firstPoints[0] > secondPoints[0]) {
            firstFalseAlarmZone = truncatedAreaUnder(secondPoints, cross, true);
            firstDetectionSkipZone = truncatedAreaUnder(firstPoints, cross, false);
        } else {
            firstFalseAlarmZone = truncatedAreaUnder(firstPoints, cross, false);
            firstDetectionSkipZone = truncatedAreaUnder(secondPoints, cross, true);
        }
        this.firstProbability.falseAlarm = firstFalseAlarmZone / firstWholeZone;
        this.firstProbability.detectionSkip = firstDetectionSkipZone / firstWholeZone;
        this.secondProbability.falseAlarm = firstDetectionSkipZone / secondWholeZone;
        this.secondProbability.detectionSkip = firstFalseAlarmZone / secondWholeZone;
    }

    private static calculateDistribution(settings: Distribution): Coordinates[] {
        let data: number[] = [];
        const generator: () => number = randomNormal(settings.mu, settings.sigma);
        for (let i = 0; i < settings.count; i++) {
            data.push(Number.parseFloat(generator().toFixed(2)));
        }
        data = data.sort((a, b) => a - b);

        const distribution: Map<number, number> = new Map<number, number>();
        data.forEach((value: number) => {
            if (distribution.has(value)) {
                const count: number = distribution.get(value);
                distribution.set(value, count + 1);
                return;
            }
            distribution.set(value, 1);
        })
        return Array.from(distribution.entries()).map(point => ({x: point[0], y: point[1]}));
    }
}

function getApproximatedByX(x: number, data: Coordinates[]): Coordinates {
    if (data.length === 0) return {x: 0, y: 0};
    if (x < data[0].x) return data[0];
    for (let i = 1; i < data.length; i++) {
        if (x < data[i].x) {
            const previous: Coordinates = data[i - 1];
            const current: Coordinates = data[i];
            return {
                x, y: previous.y + (current.y - previous.y) * ((x - previous.x) / (current.x - previous.x))
            };
        }
    }
    return data[data.length - 1];
}

function crossCoordinates(first: Coordinates[], second: Coordinates[]): Coordinates {
    if (first.length === 0 || second.length === 0) return null;

    const firstBigger: boolean = first[0].x < second[0].x;
    for (let i = 1; i < first.length; i++) {
        const secondIndex: number = second.findIndex(point => point.x === first[i].x);
        if (secondIndex === -1) continue;

        const firstFrom: Coordinates = first[i - 1];
        const firstTo: Coordinates = first[i];
        if (firstBigger !== firstTo.y > second[secondIndex].y) {
            const secondFrom: Coordinates = second[secondIndex - 1];
            const secondTo: Coordinates = second[secondIndex];
            if (!secondFrom) continue;
            return intersect(firstFrom, firstTo, secondFrom, secondTo);
        }
    }
    return null;
}

function intersect(firstFrom: Coordinates, firstTo: Coordinates, secondFrom: Coordinates, secondTo: Coordinates): Coordinates {
    if ((firstFrom.x === firstTo.x && firstFrom.y === firstTo.y) ||
        (secondFrom.x === secondTo.x && secondFrom.y === secondTo.y)) {
        return null;
    }
    const denominator: number = (
        (secondTo.y - secondFrom.y) * (firstTo.x - firstFrom.x) -
        (secondTo.x - secondFrom.x) * (firstTo.y - firstFrom.y)
    );
    if (denominator === 0) return null
    let ua: number = ((secondTo.x - secondFrom.x) * (firstFrom.y - secondFrom.y) - (secondTo.y - secondFrom.y) * (firstFrom.x - secondFrom.x)) / denominator
    let ub: number = ((firstTo.x - firstFrom.x) * (firstFrom.y - secondFrom.y) - (firstTo.y - firstFrom.y) * (firstFrom.x - secondFrom.x)) / denominator

    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
        return null;
    }

    let x = firstFrom.x + ua * (firstTo.x - firstFrom.x)
    let y = firstFrom.y + ua * (firstTo.y - firstFrom.y)

    return {x, y}
}

function truncatedAreaUnder(points: Coordinates[], cross: Coordinates, toLeft: boolean): number {
    let area: number = 0;
    if (toLeft) {
        const lastIndex: number = points.findIndex(point => point.x > cross.x) - 1;
        area += trapezoidArea(cross.y, points[lastIndex].y, cross.x - points[lastIndex].x);
        for (let i = 0; i < lastIndex; i++) {
            area += trapezoidArea(points[i].y, points[i + 1].y, points[i].x - points[i + 1].x);
        }
    } else {
        const firstIndex: number = points.findIndex(point => point.x > cross.x);
        area += trapezoidArea(cross.y, points[firstIndex].y, points[firstIndex].x - cross.x);
        for (let i = firstIndex; i < points.length - 1; i++) {
            area += trapezoidArea(points[i].y, points[i + 1].y, points[i].x - points[i + 1].x);
        }
    }
    return area;
}

function areaUnder(points: Coordinates[]): number {
    let area: number = 0;
    for (let i = 0; i < points.length - 1; i++) {
        area += trapezoidArea(points[i].y, points[i + 1].y, points[i].x - points[i + 1].x);
    }
    return area;
}

function trapezoidArea(a: number, b: number, h: number) {
    return 0.5 * h * (a + b);
}
