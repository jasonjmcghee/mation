import './style.css'
import { Mation } from "./index.ts";
import { FirstScene } from "./scenes/firstScene.ts";

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.querySelector("#preview");
  if (!app) return;

  const canvas = document.createElement("canvas");
  app.append(canvas);
  
  // Create scene and Mation instance
  const mation = new Mation();

  // Requires a scene
  const scene = new FirstScene({ width: 1920, height: 1080, canvas });
  mation.setScene(scene);

  // Initialize Mation (this will create canvas, UI controls, and start the animation)
  await mation.initialize(app);
});
