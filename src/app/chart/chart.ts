import {BehaviorSubject, Observable} from "rxjs";
import {Coordinates} from "./point";

export class Chart {

    private readonly _points: BehaviorSubject<Coordinates[]> = new BehaviorSubject<Coordinates[]>([]);

    constructor(public readonly id: number, public readonly color: string) {
    }

    public changePoints(points: Coordinates[]) {
        this._points.next(points);
    }

    public getPoints(): Coordinates[] {
        return this._points.getValue();
    }

    public points(): Observable<Coordinates[]> {
        return this._points.asObservable();
    }
}
