import {AnimationController} from "./animation.ts";
import {Scene} from "./scenes/scene.ts";

export default class Mation {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  controller: AnimationController;

  constructor({canvas, width, height}: {
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  }) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    canvas.width = width;
    canvas.height = height;

    // Create the controller
    this.controller = 
  }
}