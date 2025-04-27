import {Scene, Layer} from "../animation.ts";
import {Path} from "polymorph-js";
import {Easing} from "../easings.ts";
import {buildWebGlPipeline} from "../webgl.ts";
import { curvePath } from "../assets/firstSceneAssets.ts";

let container = {
  sunAngle: 0.0,
};

const polygonLayerShader = {
  fragmentShader: `in vec2 vUv;
out vec4 fragColor;
uniform sampler2D u_texture;
uniform float u_progress;

void main() {
  vec4 color = texture(u_texture, vUv);
  // Add a slight red enhancement
  color.r = min(1.0, color.r * (1.0 + 0.2 * u_progress));
  fragColor = color;
}`,
  uniforms: {
    u_texture: null,
    u_progress: 0.0
  }
};

export class FirstScene extends Scene {
  private passes: number = 0;

  setupLayers() {
    // Create curve layer with its own pipeline
    const curvePipeline = buildWebGlPipeline(this.canvas);
    const resolution = [this.width, this.height];
    const {
      render: seedRender, renderTargets: seedRenderTargets
    } = curvePipeline.add({
      fragmentShader: `
        uniform sampler2D surfaceTexture;
        uniform vec2 resolution;
        out vec4 FragColor;

        in vec2 vUv;

        void main() {
          float alpha = texelFetch(surfaceTexture, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0).a;
          FragColor = vec4(vUv * round(alpha), 0.0, 1.0);
        }`,
      uniforms: {
        resolution,
        surfaceTexture: null,
      }
    }, {
      internalFormat: curvePipeline.gl().RGBA32F,
      format: curvePipeline.gl().RGBA,
      type: curvePipeline.gl().FLOAT,
    });

    this.passes = Math.ceil(Math.log2(Math.max(this.width, this.height))) + 1;
    const {
      render: jfaRender, renderTargets: jfaRenderTargets, uniforms: jfaUniforms,
    } = curvePipeline.add({
      fragmentShader: `
uniform vec2 oneOverSize;
uniform vec2 resolution;
uniform sampler2D inputTexture;
uniform float uOffset;
uniform int direction;
uniform bool skip;
uniform int passes;

const int MAX_TILE_SIZE = 32;

const float SQRT_2 = 1.41;

in vec2 vUv;
out vec4 FragColor;

void classic() {
  if (skip) {
    FragColor = vec4(vUv, 0.0, 1.0);
  } else {
    vec2 nearestSeed = vec2(-1.0);
    float nearestDist = 999999.9;
    vec2 pre = uOffset * oneOverSize;

    // Start with the center to try to appeal to loading in a block
    vec2 sampleUV = vUv;

    // Check if the sample is within bounds
    vec2 sampleValue = texture(inputTexture, sampleUV).xy;
    vec2 sampleSeed = sampleValue.xy;

    if (sampleSeed.x > 0.0 || sampleSeed.y > 0.0) {
      vec2 diff = sampleSeed - vUv;
      float dist = dot(diff, diff);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestSeed.xy = sampleValue.xy;
      }
    }

    // Then do the rest
    for (float y = -1.0; y <= 1.0; y += 1.0) {
      for (float x = -1.0; x <= 1.0; x += 1.0) {
        if (x == 0.0 && y == 0.0) { continue; }
        vec2 sampleUV = vUv + vec2(x, y) * pre;

        // Check if the sample is within bounds
        if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) { continue; }

          vec2 sampleValue = texture(inputTexture, sampleUV).xy;
          vec2 sampleSeed = sampleValue.xy;

          if (sampleSeed.x > 0.0 || sampleSeed.y > 0.0) {
            vec2 diff = sampleSeed - vUv;
            float dist = dot(diff, diff);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestSeed.xy = sampleValue.xy;
            }
          }
      }
    }

    FragColor = vec4(nearestSeed, 0.0, 1.0);
  }
}

void main() {
  classic();
}`,
      uniforms: {
        inputTexture: null,
        resolution: [this.width, this.height],
        oneOverSize: [1.0 / this.width, 1.0 / this.height],
        uOffset: Math.pow(2, this.passes - 1),
        direction: 0,
        passes: this.passes,
        skip: true,
      }
    }, {
      internalFormat: curvePipeline.gl().RGBA32F,
      format: curvePipeline.gl().RGBA,
      type: curvePipeline.gl().FLOAT,
    });
    const {render: dfRender, renderTargets: dfRenderTargets} = curvePipeline.add({
      uniforms: {
        resolution: [this.width, this.height],
        jfaTexture: null,
        surfaceTexture: null,
      },
      fragmentShader: `
        uniform sampler2D jfaTexture;
        uniform sampler2D surfaceTexture;
        uniform vec2 resolution;

        in vec2 vUv;
        out vec4 FragColor;

        void main() {
          ivec2 texel = ivec2(vUv.x * resolution.x, vUv.y * resolution.y);
          vec2 nearestSeed = texelFetch(jfaTexture, texel, 0).xy;
          float dist = clamp(distance(vUv, nearestSeed), 0.0, 1.0);

          // Normalize and visualize the distance
          FragColor = vec4(dist, 0.0, 0.0, 1.0);
        }`,
    });

    const {render: giRender} = curvePipeline.add({
      uniforms: {
        resolution: [this.width, this.height],
        oneOverSize: [1.0 / this.width, 1.0 / this.height],
        sceneTexture: null,
        distanceTexture: null,
        rayCount: 32,
        maxSteps: 80,
        sunAngle: 0.4,
        enableSun: true,
        showGrain: false,
        showNoise: true,
        srgb: true ? 2.2 : 1.0,
      },
      fragmentShader: `
uniform int rayCount;
uniform float sunAngle;
uniform bool showNoise;
uniform bool showGrain;
uniform bool enableSun;
uniform vec2 oneOverSize;
uniform int maxSteps;

uniform sampler2D sceneTexture;
uniform sampler2D distanceTexture;

out vec4 FragColor;
in vec2 vUv;

const float PI = 3.14159265;
const float TAU = 2.0 * PI;
const float ONE_OVER_TAU = 1.0 / TAU;
const float PAD_ANGLE = 0.01;
const float EPS = 0.001f;

const vec3 skyColor = vec3(0.02, 0.08, 0.2);
const vec3 sunColor = vec3(0.95, 0.95, 0.9);
const float goldenAngle = PI * 0.7639320225;

// Popular rand function
float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec3 sunAndSky(float rayAngle) {
    // Get the sun / ray relative angle
    float angleToSun = mod(rayAngle - sunAngle, TAU);

    // Sun falloff based on the angle
    float sunIntensity = smoothstep(1.0, 0.0, angleToSun);

    // And that's our sky radiance
    return sunColor * sunIntensity + skyColor;
}

bool outOfBounds(vec2 uv) {
    return uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0;
}

void main() {
    vec2 uv = vUv;

    vec4 light = texture(sceneTexture, uv);

    vec4 radiance = vec4(0.0);

    float oneOverRayCount = 1.0 / float(rayCount);
    float angleStepSize = TAU * oneOverRayCount;

    float coef = 0.0;
    float offset = showNoise ? rand(uv + coef) : 0.0;
    float rayAngleStepSize = showGrain ? angleStepSize + offset * TAU : angleStepSize;
    float minStepSize = min(oneOverSize.x, oneOverSize.y);

    // Not light source or occluder
    if (light.a < 0.1) {
        // Shoot rays in "rayCount" directions, equally spaced, with some randomness.
        for(int i = 0; i < rayCount; i++) {
            float angle = rayAngleStepSize * (float(i) + offset) + sunAngle;
            vec2 rayDirection = vec2(cos(angle), -sin(angle));

            vec2 sampleUv = uv;
            vec4 radDelta = vec4(0.0);
            bool hitSurface = false;

            // We tested uv already (we know we aren't an object), so skip step 0.
            for (int step = 1; step < maxSteps; step++) {
                // How far away is the nearest object?
                float dist = texture(distanceTexture, sampleUv).r;

                // Go the direction we're traveling (with noise)
                sampleUv += rayDirection * dist;

                if (outOfBounds(sampleUv)) break;

                if (dist <= minStepSize) {
                    vec4 sampleColor = texture(sceneTexture, sampleUv);
                    radDelta += sampleColor;
                    hitSurface = true;
                    break;
                }
            }

            // If we didn't find an object, add some sky + sun color
            if (!hitSurface && enableSun) {
                radDelta += vec4(sunAndSky(angle), 1.0);
            }

            // Accumulate total radiance
            radiance += radDelta;
        }
    } else if (length(light.rgb) >= 0.1) {
        radiance = light;
    }


    // Bring up all the values to have an alpha of 1.0.
    vec4 finalRadiance = vec4(max(light, radiance * oneOverRayCount).rgb, 1.0);
    FragColor = finalRadiance;
}`,
    }, {
      // magFilter: curvePipeline.gl().LINEAR,
      // minFilter: curvePipeline.gl().LINEAR,
      // internalFormat: curvePipeline.gl().RGBA16F,
    });

    const curveLayer: Layer = {
      name: 'curve-layer',
      render: (texture, _: number) => {
        seedRender({
          renderTarget: seedRenderTargets[0],
          uniforms: { surfaceTexture: texture }
        });

        let currentInput = seedRenderTargets[0].texture;

        let [renderA, renderB] = jfaRenderTargets;
        let currentOutput = renderA;
        let passes = jfaUniforms.passes;

        for (let i = 0; i < passes || (passes === 0 && i === 0); i++) {
          const offset = Math.pow(2, passes - i - 1);

          jfaRender({
            renderTarget: currentOutput,
            uniforms: {
              skip: passes === 0,
              inputTexture: currentInput,
              // This intentionally uses `this.passes` which is the true value
              // In order to properly show stages using the JFA slider.
              uOffset: offset,
              direction: 0,
            },
          });

          currentInput = currentOutput.texture;
          currentOutput = (currentOutput === renderA) ? renderB : renderA;
        }

        dfRender({
          renderTarget: dfRenderTargets[0],
          uniforms: {
            jfaTexture: currentOutput.texture,
            surfaceTexture: texture,
          }
        });

        giRender({
          uniforms: {
            distanceTexture: dfRenderTargets[0].texture,
            sceneTexture: texture,
            sunAngle: container.sunAngle,
          }
        });
      },
    };

    const seedLayer: Layer = {
      name: 'seed-layer',
      render: (texture, _: number) => {
        seedRender({
          uniforms: { surfaceTexture: texture }
        });
      },
      x: this.width * 0.25,
      y: this.height * 0.125,
      width: this.width * 0.125,
      height: this.height * 0.75,
      isSubview: true,
      renderWhenScrubbing: true,
    };

    const jfaLayer: Layer = {
      name: 'jfa-layer',
      render: (texture, _: number) => {
        seedRender({
          renderTarget: seedRenderTargets[0],
          uniforms: { surfaceTexture: texture }
        });

        let currentInput = seedRenderTargets[0].texture;

        let [renderA, renderB] = jfaRenderTargets;
        let currentOutput = renderA;
        let passes = jfaUniforms.passes;

        for (let i = 0; i < passes || (passes === 0 && i === 0); i++) {
          const offset = Math.pow(2, passes - i - 1);

          jfaRender({
            renderTarget: currentOutput,
            uniforms: {
              skip: passes === 0,
              inputTexture: currentInput,
              // This intentionally uses `this.passes` which is the true value
              // In order to properly show stages using the JFA slider.
              uOffset: offset,
              direction: 0,
            },
          });

          currentInput = currentOutput.texture;
          currentOutput = (currentOutput === renderA) ? renderB : renderA;
        }

        jfaRender();
      },
      x: this.width * 0.25,
      y: this.height * 0.125,
      width: this.width * 0.125,
      height: this.height * 0.75,
      isSubview: true,
      renderWhenScrubbing: true,
    };

    const dfLayer: Layer = {
      name: 'df-layer',
      render: (texture, _: number) => {
        seedRender({
          renderTarget: seedRenderTargets[0],
          uniforms: { surfaceTexture: texture }
        });

        let currentInput = seedRenderTargets[0].texture;

        let [renderA, renderB] = jfaRenderTargets;
        let currentOutput = renderA;
        let passes = jfaUniforms.passes;

        for (let i = 0; i < passes || (passes === 0 && i === 0); i++) {
          const offset = Math.pow(2, passes - i - 1);

          jfaRender({
            renderTarget: currentOutput,
            uniforms: {
              skip: passes === 0,
              inputTexture: currentInput,
              // This intentionally uses `this.passes` which is the true value
              // In order to properly show stages using the JFA slider.
              uOffset: offset,
              direction: 0,
            },
          });

          currentInput = currentOutput.texture;
          currentOutput = (currentOutput === renderA) ? renderB : renderA;
        }

        dfRender({
          uniforms: {
            jfaTexture: currentOutput.texture,
            surfaceTexture: texture,
          }
        });
      },
      x: this.width * 0.25,
      y: this.height * 0.125,
      width: this.width * 0.125,
      height: this.height * 0.75,
      isSubview: true,
      renderWhenScrubbing: true,
    };

    // Create polygon layer with its own pipeline
    const polygonPipeline = buildWebGlPipeline(this.canvas);
    const polygonPipelineResult = polygonPipeline.add(polygonLayerShader);
    const polygonLayer: Layer = {
      name: 'polygon-layer',
      render: (texture, progress: number) => {
        polygonPipelineResult.render({
          uniforms: {
            u_texture: texture,
            u_progress: progress
          }
        });
      },
    };

    this.pushLayer(curveLayer);
    this.pushLayer(seedLayer);
    this.pushLayer(jfaLayer);
    this.pushLayer(dfLayer);
    this.pushLayer(polygonLayer);
  }
  *animationSequence(): Generator<Promise<void>, void, unknown> {
    const { width, height } = this.canvas;

    yield this.animate([
      {
        // Path
        layer: 'background',
        draw(ctx: OffscreenCanvasRenderingContext2D, _: number) {
          ctx.fillStyle = '#181818';
          ctx.fillRect(0, 0, width, height);
        }
      },
    ], { duration: 0.0 });

    // --- Calculate canvas center ---
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    yield this.animate([
      {
        // Path
        layer: ['curve-layer', 'seed-layer', 'jfa-layer', 'df-layer'],
        draw(ctx: OffscreenCanvasRenderingContext2D, progress: number, extras) {
          extras.layers['seed-layer'].x = width * 0.125 + progress * width * 0.25;
          extras.layers['jfa-layer'].x = width * 0.25 + progress * width * 0.25;
          extras.layers['df-layer'].x = width * 0.375 + progress * width * 0.25;

          // --- Translate the origin to the canvas center ---
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.scale(width / 1920, height / 1080);
          // Draw curve with progress
          const path = new Path(curvePath);
          const length = path.getData()[0].length * 8;
          const curvePath2D = new Path2D(curvePath);
          ctx.strokeStyle = '#3498db';
          ctx.lineWidth = 8;

          // Using the dash effect to animate the path
          ctx.setLineDash([progress * length, length]);
          ctx.lineDashOffset = 0;
          ctx.lineWidth = 16;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke(curvePath2D);
          ctx.restore();
        }
      },
    ], { duration: 2.0, easing: Easing.easeInOutCubic, delay: 0.0 });

    yield this.animate([
      {
        // Path
        layer: 'curve-layer',
        draw(_: OffscreenCanvasRenderingContext2D, progress: number, extras) {
          container.sunAngle = progress * 2.0 * 3.14;
          extras.layers['seed-layer'].height = progress === 0 ? (height * 0.75) : (1.0 - progress) * (height * 0.75);
          
          // Collapse jfa layer toward the center
          extras.layers['jfa-layer'].height = progress === 0 ? (height * 0.75) : (1.0 - progress) * (height * 0.75);
          extras.layers['jfa-layer'].y = progress === 0 ? height * 0.125 : height * 0.5 - ((1.0 - progress) * (height * 0.75)) / 2;
          
          // Collapse df layer from top
          const originalHeight = height * 0.75;
          const newHeight = progress === 0 ? originalHeight : (1.0 - progress) * originalHeight;
          extras.layers['df-layer'].height = newHeight;
          extras.layers['df-layer'].y = height * 0.125 + (originalHeight - newHeight);
        }
      }
    ], { duration: 1.0, easing: Easing.easeInOutCubic });

    // const polygonPath = `M ${this.canvas.width * 0.2} ${this.canvas.height * 0.6}
    //                      L ${this.canvas.width * 0.4} ${this.canvas.height * 0.8}
    //                      L ${this.canvas.width * 0.6} ${this.canvas.height * 0.7}
    //                      L ${this.canvas.width * 0.4} ${this.canvas.height * 0.5}
    //                      Z`;
    //
    // yield this.animate([
    //   {
    //     // Polygon
    //     layer: 'polygon-layer',
    //     draw(ctx: OffscreenCanvasRenderingContext2D, progress: number) {
    //       const polygonPath2D = new Path2D(polygonPath);
    //       const r = Math.floor(231 * progress);
    //       const g = Math.floor(76 * progress);
    //       const b = Math.floor(60 * progress);
    //       const a = progress;
    //
    //       ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    //       ctx.fill(polygonPath2D);
    //     }
    //   }
    // ], { duration: 0.3, easing: Easing.easeInOutCubic, delay: 0.0 });
  }
}
