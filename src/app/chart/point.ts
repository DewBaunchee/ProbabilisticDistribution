import {BehaviorSubject, Observable} from "rxjs";
import {blankObject} from "./util";

export interface Coordinates {
    readonly x: number;
    readonly y: number;
}

export class Point {

    private readonly _coordinates: BehaviorSubject<Coordinates> = new BehaviorSubject<Coordinates>(blankObject());

    constructor(public readonly color: string, public readonly radius: number) {
    }

    public changeCoordinates(coordinates: Coordinates) {
        this._coordinates.next(coordinates);
    }

    public getCoordinates(): Coordinates {
        return this._coordinates.getValue();
    }

    public coordinates(): Observable<Coordinates> {
        return this._coordinates.asObservable();
    }
}
