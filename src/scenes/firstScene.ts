import { Scene, Layer } from "../animation.ts";
import { Path } from "polymorph-js";
import { Easing } from "../easings.ts";
import { createPipeline } from "../webgl.ts";
import { curvePath } from "../assets/firstSceneAssets.ts";

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
  setupLayers() {
    // Create curve layer with its own pipeline
    const curvePipeline = createPipeline(this.canvas);
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

    const passes = Math.ceil(Math.log2(Math.max(this.width, this.height))) + 1;
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
        uOffset: Math.pow(2, passes - 1),
        direction: 0,
        passes: passes,
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

    const {uniforms: curveUniforms, render: giRender, renderTargets: giRenderTargets} = curvePipeline.add({
      uniforms: {
        resolution: [this.width, this.height],
        oneOverSize: [1.0 / this.width, 1.0 / this.height],
        sceneTexture: null,
        distanceTexture: null,
        rayCount: 16,
        maxSteps: 80,
        sunAngle: 0.4,
        enableSun: false,
        showGrain: false,
        showNoise: true,
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
      internalFormat: curvePipeline.gl().RGBA16F,
    });

    const { render: debandingRender } = curvePipeline.add({
      fragmentShader: `
// This shader reduces color banding by adding controlled noise to smooth gradients

uniform sampler2D inputTexture;
uniform float noiseAmount;
uniform float ditherRange; // Range of colors to analyze for banding
uniform vec2 resolution;

in vec2 vUv;
out vec4 FragColor;

float random(vec2 coords) {
    return fract(sin(dot(coords.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = vUv;
    
    // Sample the original color
    vec4 originalColor = texture(inputTexture, uv);
    
    // Generate controlled noise based on position
    // This helps break up banding patterns
    vec3 noise = vec3(
        random(uv + 0.07 * fract(vec2(1.0, 0.0))),
        random(uv + 0.07 * fract(vec2(0.0, 1.0))),
        random(uv + 0.07 * fract(vec2(1.0, 1.0)))
    );
    
    // Remap noise from [0,1] to [-0.5,0.5]
    noise = noise - 0.5;
    
    // Apply noise only to smooth gradients
    // First, sample neighboring pixels to detect gradients
    vec4 neighbors[4];
    neighbors[0] = texture(inputTexture, uv + vec2(1.0, 0.0) / resolution);
    neighbors[1] = texture(inputTexture, uv + vec2(-1.0, 0.0) / resolution);
    neighbors[2] = texture(inputTexture, uv + vec2(0.0, 1.0) / resolution);
    neighbors[3] = texture(inputTexture, uv + vec2(0.0, -1.0) / resolution);
    
    // Calculate color differences
    float colorDifference = 0.0;
    for (int i = 0; i < 4; i++) {
        colorDifference += distance(originalColor.rgb, neighbors[i].rgb);
    }
    colorDifference /= 4.0;
    
    // Apply more noise to areas with subtle gradient changes (where banding occurs)
    // and less noise to areas with sharp changes or flat colors
    float bandingDetection = 1.0 - smoothstep(0.0, ditherRange, colorDifference);
    
    // Apply the noise with intensity control
    vec3 finalColor = originalColor.rgb + noise * noiseAmount * bandingDetection;
    
    // Output the processed color
    FragColor = vec4(finalColor, originalColor.a);
}`,
      uniforms: {
        inputTexture: null,
        noiseAmount: 0.015,
        ditherRange: 1.0,
        resolution: [this.width, this.height],
      }
    })

    const curveLayer = new Layer(
      'curve-layer',
      curvePipeline,
      (texture, _: number) => {
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
        renderTarget: giRenderTargets[0],
        uniforms: {
          distanceTexture: dfRenderTargets[0].texture,
          sceneTexture: texture,
        }
      });

      debandingRender({
        uniforms: {
          inputTexture: giRenderTargets[0].texture,
        }
      })
    },
      {
        ignorePanZoom: true,
        extras: {
          uniforms: curveUniforms,
        },
    });

    const seedLayer = new Layer(
      'seed-layer',
      curvePipeline,
      (texture, _: number) => {
        seedRender({
          uniforms: { surfaceTexture: texture }
        });
      },
      {
        x: this.width * 0.125,
        y: this.height * 0.125,
        width: this.width * 0.125,
        height: this.height * 0.75,
        isSubview: true,
        renderDuringPreviewAction: true,
      }
    );

    const jfaLayer = new Layer(
      'jfa-layer',
      curvePipeline,
      (texture, _: number) => {
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
      {
        x: this.width * 0.25,
        y: this.height * 0.125,
        width: this.width * 0.125,
        height: this.height * 0.75,
        isSubview: true,
        renderDuringPreviewAction: true,
      }
    );

    const dfLayer = new Layer(
      'df-layer',
      curvePipeline,
      (texture, _: number) => {
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
      {
        x: this.width * 0.25,
        y: this.height * 0.125,
        width: this.width * 0.125,
        height: this.height * 0.75,
        isSubview: true,
        renderDuringPreviewAction: true,
      }
    );

    // Create polygon layer with its own pipeline
    const polygonPipeline = createPipeline(this.canvas);
    const polygonPipelineResult = polygonPipeline.add(polygonLayerShader);
    const polygonLayer = new Layer(
      'polygon-layer',
      polygonPipeline,
      (texture, progress: number) => {
        polygonPipelineResult.render({
          uniforms: {
            u_texture: texture,
            u_progress: progress
          }
        });
      },
      {}
    );

    this.pushLayer(curveLayer);
    this.pushLayer(jfaLayer);
    this.pushLayer(dfLayer);
    this.pushLayer(seedLayer);
    this.pushLayer(polygonLayer);
  }
  *animationSequence(): Generator<Promise<void>, void, unknown> {
    const { width, height } = this.canvas;

    this.animate([
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

    const polygonPath = `M ${width * 0.5} ${height * 0.6}
                         L ${width * 0.5} ${height * 0.8}
                         L ${width * 0.9} ${height * 0.9}
                         L ${width * 0.5} ${height * 0.9}Z`;

    this.animate([
      {
        // Path
        layer: ['curve-layer', 'seed-layer', 'jfa-layer', 'df-layer'],
        draw(ctx: OffscreenCanvasRenderingContext2D, progress: number, { layers }) {
          if (layers['curve-layer'].extras) {
            layers['curve-layer'].extras.uniforms.enableSun = false;
          }
          layers['seed-layer'].x = width * 0.125 + progress * width * 0.25;
          layers['jfa-layer'].x = width * 0.25 + progress * width * 0.25;
          layers['df-layer'].x = width * 0.375 + progress * width * 0.25;

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


          const polygonPath2D = new Path2D(polygonPath);
          ctx.fillStyle = '#000000';
          ctx.fill(polygonPath2D);
          ctx.fillStyle = '#000000';
          ctx.font = "96px serif";
          ctx.fillText("Hello", width * 0.65, height * 0.25);
        }
      },
    ], { duration: 5.0, easing: Easing.easeInOutCubic, delay: 0.0 });

    this.animate([
      {
        // Path
        layer: 'curve-layer',
        draw(_: OffscreenCanvasRenderingContext2D, progress: number, extras) {
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
    ], { duration: 1.0, easing: Easing.easeInOutCubic, parallel: true });

    this.animate([
      {
        layer: 'curve-layer',
        draw(_1: OffscreenCanvasRenderingContext2D, _2: number, { layers }) {
          if (layers['curve-layer'].extras) {
            layers['curve-layer'].extras.uniforms.sunAngle = 0;
            layers['curve-layer'].extras.uniforms.enableSun = true;
          }
        }
      }
    ], { duration: 0.0, easing: Easing.easeInOutCubic, delay: 0.5, parallel: true });

    this.animate([
      {
        layer: 'curve-layer',
        draw(_: OffscreenCanvasRenderingContext2D, progress: number, { layers }) {
          if (layers['curve-layer'].extras) {
            layers['curve-layer'].extras.uniforms.sunAngle = progress * 2.0 * 3.14;
          }
        }
      }
    ], { duration: 1.0, easing: Easing.easeInOutCubic, delay: 0.5 });


    this.animate([
      {
        // Polygon
        layer: 'polygon-layer',
        draw(ctx: OffscreenCanvasRenderingContext2D, progress: number) {
          const polygonPath2D = new Path2D(polygonPath);
          const r = Math.floor(231 * progress);
          const g = Math.floor(76 * progress);
          const b = Math.floor(60 * progress);
          const a = progress;

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
          ctx.fill(polygonPath2D);
        }
      }
    ], { duration: 0.3, easing: Easing.easeInOutCubic, delay: 0.0 });
  }
}
