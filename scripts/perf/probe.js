/*
 * World Pulse globe performance probe (issue #384).
 *
 * Self-contained, dependency-free. Works two ways:
 *   1. Injected before page load by scripts/perf/globe-baseline.mjs (Playwright).
 *   2. Pasted into the DevTools console of a browser running the app
 *      (Electron devtools, chrome://inspect for Raspberry Pi Chromium, Safari
 *      Web Inspector for a best-effort iPad check). See scripts/perf/README.md.
 *
 * It does not touch application code. It patches WebGL2RenderingContext
 * prototype draw calls (to count draw calls / primitives per frame and,
 * optionally, skip a scene element for ablation) and measures frame intervals
 * with its own requestAnimationFrame loop.
 *
 * API (on window.__wpPerf):
 *   start()            reset counters and begin sampling
 *   stop() -> result   stop sampling, return { summary, perTag, textures }.
 *                      Per-tag numbers are accumulated inside completed frame
 *                      records only, so perTag draw calls sum exactly to
 *                      summary.drawCallsPerFrame. summary also carries the
 *                      unmasked WebGL renderer string, frames over 33/50/66 ms,
 *                      and shader program counts.
 *
 * Frames: a browser rAF tick is an application RENDERED FRAME only if the app
 * issued at least one draw call (including draws suppressed by setSkip) since
 * the previous tick. frame* / fpsMean / per-frame counts use rendered frames,
 * so a 30 fps cap on a 60 Hz display reads as 30 fps and ~33 ms. Browser
 * cadence is reported separately (rafTicks, rafFpsMean, rafIntervalMs*).
 * With on-demand rendering (r3f frameloop 'demand') the rendered-frame
 * interval includes idle gaps; read rafCallbackMs* there instead.
 *   setAttribution(on) when on, bracket every draw call with gl.finish() and
 *                      accumulate the blocking time per tag (perTag.gpuMsPerFrame).
 *                      This serialises the pipeline, so absolute fps drops.
 *                      CAVEAT (#384): under Chromium + SwiftShader, finish() did
 *                      not wait for rasterisation (a full-screen earth draw read
 *                      0.03 ms), so the numbers track per-draw-call submission
 *                      overhead, not fill cost. Validate on a real GPU before
 *                      trusting it; prefer setSkip() ablation for fill cost.
 *   setSkip([tags])    skip draw calls whose program tag is in the list
 *                      tags: earth, wireframe, graticule, atmosphere, stars,
 *                            cityLights, aurora, markers, iss, labels, other
 */
(function installWorldPulseProbe() {
  if (typeof window === 'undefined' || window.__wpPerf) return;

  var GL = window.WebGL2RenderingContext;
  var state = {
    sampling: false,
    skip: {},
    frameIntervals: [],
    rafIntervals: [],
    lastRenderedTs: null,
    callbackMs: [],
    perFrame: [],
    cur: null,
    lastTs: null,
    programTags: new WeakMap(),
    currentTag: 'other',
    gl: null,
    programsCreated: 0,
    programsUsed: null,
    programsUsedCount: 0,
    attribution: false,
    textures: [],
    firstDrawAt: null,
  };

  function now() {
    return performance.now();
  }

  // ---- Program tagging (lazy, via getAttachedShaders/getShaderSource) ----
  function tagFor(gl, program) {
    var cached = state.programTags.get(program);
    if (cached) return cached;
    var src = '';
    try {
      var shaders = gl.getAttachedShaders(program) || [];
      for (var i = 0; i < shaders.length; i++) src += gl.getShaderSource(shaders[i]) || '';
    } catch (_e) {
      src = '';
    }
    var tag = 'other';
    if (src.indexOf('uPulseAmplitude') > -1) tag = 'atmosphere';
    else if (src.indexOf('vTwinkle') > -1) tag = 'stars';
    else if (src.indexOf('vNightFactor') > -1) tag = 'cityLights';
    else if (src.indexOf('uShimmerAmplitude') > -1) tag = 'aurora';
    // three.js prefixes built-in programs with '#define SHADER_TYPE <material.type>'.
    else if (src.indexOf('SHADER_TYPE MeshStandardMaterial') > -1) tag = 'earth';
    else if (src.indexOf('SHADER_TYPE SpriteMaterial') > -1) tag = 'labels';
    else if (src.indexOf('SHADER_TYPE LineBasicMaterial') > -1) tag = 'graticule';
    else if (src.indexOf('SHADER_TYPE MeshBasicMaterial') > -1) tag = 'basic';
    state.programTags.set(program, tag);
    return tag;
  }

  // MeshBasicMaterial is shared by several elements; split by primitive
  // mode and index count (geometry signatures from Globe.tsx segment counts).
  function refineBasic(mode, count) {
    if (mode === 1 /* LINES */) return 'wireframe';
    if (count === 1728 || count === 540) return 'iss'; // tube 48x6, lead sphere 10x10
    return 'markers'; // marker spheres, rings, pulse rings, home beacon
  }

  function frameRecord() {
    return {
      issued: 0, // every draw the app attempted, including skipped ones
      calls: 0,
      tris: 0,
      lineVerts: 0,
      points: 0,
      tagCalls: {},
      tagPrims: {},
      tagGpuMs: {},
    };
  }

  // Only counts while a frame record is open (state.cur), so draws issued
  // before the first tick or in the final, never-pushed frame are excluded.
  function account(tag, mode, count, instances) {
    if (state.firstDrawAt === null) state.firstDrawAt = now();
    if (!state.sampling || !state.cur) return;
    var n = count * (instances || 1);
    state.cur.calls++;
    state.cur.tagCalls[tag] = (state.cur.tagCalls[tag] || 0) + 1;
    state.cur.tagPrims[tag] = (state.cur.tagPrims[tag] || 0) + (mode === 4 ? n / 3 : n);
    if (mode === 4)
      state.cur.tris += n / 3; // TRIANGLES
    else if (mode === 5 || mode === 6) state.cur.tris += Math.max(0, n - 2);
    else if (mode === 1 || mode === 3 || mode === 2) state.cur.lineVerts += n;
    else if (mode === 0) state.cur.points += n;
  }

  if (GL) {
    var P = GL.prototype;
    var origUse = P.useProgram;
    P.useProgram = function (program) {
      state.gl = this;
      state.currentTag = program ? tagFor(this, program) : 'other';
      if (program && state.sampling && state.programsUsed && !state.programsUsed.has(program)) {
        state.programsUsed.add(program);
        state.programsUsedCount++;
      }
      return origUse.call(this, program);
    };
    var origCreateProgram = P.createProgram;
    P.createProgram = function () {
      state.programsCreated++;
      return origCreateProgram.apply(this, arguments);
    };

    function wrapDraw(name, countIdx, instIdx) {
      var orig = P[name];
      if (!orig) return;
      P[name] = function () {
        var mode = arguments[0];
        var count = arguments[countIdx];
        var tag = state.currentTag;
        if (tag === 'basic') tag = refineBasic(mode, count);
        if (state.sampling && state.cur) state.cur.issued++;
        if (state.skip[tag]) return undefined;
        account(tag, mode, count, instIdx !== undefined ? arguments[instIdx] : 1);
        if (state.sampling && state.attribution && state.cur) {
          this.finish();
          var t0 = now();
          var r = orig.apply(this, arguments);
          this.finish();
          state.cur.tagGpuMs[tag] = (state.cur.tagGpuMs[tag] || 0) + (now() - t0);
          return r;
        }
        return orig.apply(this, arguments);
      };
    }
    wrapDraw('drawArrays', 2);
    wrapDraw('drawElements', 1);
    wrapDraw('drawArraysInstanced', 2, 3);
    wrapDraw('drawElementsInstanced', 1, 4);

    // Texture allocation accounting. three.js on WebGL2 allocates with
    // texStorage2D (levels, format, w, h) and uploads via texSubImage2D;
    // texImage2D is still hooked for other paths. Assumes 4 bytes/texel.
    var origStorage = P.texStorage2D;
    if (origStorage) {
      P.texStorage2D = function (target, levels, fmt, w, h) {
        var bytes = 0;
        for (var l = 0; l < levels; l++) bytes += Math.max(1, w >> l) * Math.max(1, h >> l) * 4;
        state.textures.push({ w: w, h: h, levels: levels, bytes: bytes });
        return origStorage.apply(this, arguments);
      };
    }
    var origTex = P.texImage2D;
    P.texImage2D = function () {
      var a = arguments;
      var level = a[1];
      var w = 0;
      var h = 0;
      if (a.length >= 9) {
        w = a[3];
        h = a[4];
      } else if (a.length === 6 && a[5]) {
        w = a[5].width || a[5].videoWidth || 0;
        h = a[5].height || a[5].videoHeight || 0;
      }
      if (level === 0 && w && h) state.textures.push({ w: w, h: h, levels: 1, bytes: w * h * 4 });
      return origTex.apply(this, arguments);
    };
  }

  // ---- Main-thread time of every rAF callback (r3f render loop lives here) ----
  var origRaf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) {
    return origRaf(function (ts) {
      var t0 = now();
      try {
        cb(ts);
      } finally {
        if (state.sampling && cb !== tick) state.callbackMs.push(now() - t0);
      }
    });
  };

  // ---- Tick loop (independent of the app) ----
  // Each tick closes the record of draws issued since the previous tick. Only
  // records with at least one issued draw count as rendered frames.
  function tick(ts) {
    if (!state.sampling) return;
    if (state.lastTs !== null) {
      state.rafIntervals.push(ts - state.lastTs);
      if (state.cur && state.cur.issued > 0) {
        state.perFrame.push(state.cur);
        if (state.lastRenderedTs !== null) state.frameIntervals.push(ts - state.lastRenderedTs);
        state.lastRenderedTs = ts;
      }
    } else {
      // The sampling start tick is the reference for the first rendered frame,
      // so with a render on every tick the intervals equal the rAF intervals.
      state.lastRenderedTs = ts;
    }
    state.cur = frameRecord();
    state.lastTs = ts;
    origRaf(tick);
  }

  function pct(arr, p) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) {
      return a - b;
    });
    var i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
    return Math.round(s[i] * 100) / 100;
  }
  function over(arr, ms) {
    return arr.filter(function (x) {
      return x > ms;
    }).length;
  }
  function rendererString() {
    var gl = state.gl;
    if (!gl) return null;
    try {
      var ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    } catch (_e) {
      return null;
    }
  }
  function mean(arr) {
    if (!arr.length) return null;
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += arr[i];
    return Math.round((t / arr.length) * 100) / 100;
  }

  window.__wpPerf = {
    start: function () {
      state.frameIntervals = [];
      state.rafIntervals = [];
      state.lastRenderedTs = null;
      state.callbackMs = [];
      state.perFrame = [];
      state.programsUsed = typeof WeakSet === 'function' ? new WeakSet() : null;
      state.programsUsedCount = 0;
      state.cur = null;
      state.lastTs = null;
      state.sampling = true;
      state.startedAt = now();
      origRaf(tick);
    },
    stop: function () {
      state.sampling = false;
      var dur = (now() - state.startedAt) / 1000;
      var fi = state.frameIntervals;
      var ri = state.rafIntervals;
      state.cur = null;
      var frames = state.perFrame.length || 1;
      var calls = {};
      var prims = {};
      var gpu = {};
      state.perFrame.forEach(function (f) {
        Object.keys(f.tagCalls).forEach(function (k) {
          calls[k] = (calls[k] || 0) + f.tagCalls[k];
          prims[k] = (prims[k] || 0) + f.tagPrims[k];
          gpu[k] = (gpu[k] || 0) + (f.tagGpuMs[k] || 0);
        });
      });
      var perTag = {};
      Object.keys(calls).forEach(function (k) {
        perTag[k] = {
          drawCallsPerFrame: Math.round((calls[k] / frames) * 10) / 10,
          primitivesPerFrame: Math.round(prims[k] / frames),
          gpuMsPerFrame: state.attribution ? Math.round((gpu[k] / frames) * 100) / 100 : null,
        };
      });
      var texBytes = state.textures.reduce(function (t, x) {
        return t + x.bytes;
      }, 0);
      var mem = performance.memory;
      return {
        summary: {
          seconds: Math.round(dur * 10) / 10,
          // Application render frames (ticks with >= 1 issued draw call).
          renderedFrames: state.perFrame.length,
          fpsMean: state.perFrame.length
            ? Math.round((state.perFrame.length / dur) * 10) / 10
            : null,
          // Browser rAF cadence, whether or not the app rendered on the tick.
          rafTicks: ri.length,
          rafFpsMean: ri.length ? Math.round((ri.length / dur) * 10) / 10 : null,
          rafIntervalMsP50: pct(ri, 50),
          rafIntervalMsP95: pct(ri, 95),
          // Intervals between consecutive rendered frames.
          frameMsP50: pct(fi, 50),
          frameMsP95: pct(fi, 95),
          frameMsP99: pct(fi, 99),
          frameMsMax: pct(fi, 100),
          // Thresholds sit just above 1, 1.5 and 2 frames at 30 fps, so
          // vsync jitter on a 33.3 ms frame is not counted as a miss.
          framesOver33ms: over(fi, 33.4),
          framesOver50ms: over(fi, 50),
          framesOver66ms: over(fi, 66.7),
          pctFramesOver66ms: fi.length
            ? Math.round((over(fi, 66.7) / fi.length) * 10000) / 100
            : null,
          rafCallbackMsP50: pct(state.callbackMs, 50),
          rafCallbackMsP95: pct(state.callbackMs, 95),
          rafCallbackMsMean: mean(state.callbackMs),
          drawCallsPerFrame: mean(
            state.perFrame.map(function (f) {
              return f.calls;
            })
          ),
          trianglesPerFrame: mean(
            state.perFrame.map(function (f) {
              return f.tris;
            })
          ),
          lineVertsPerFrame: mean(
            state.perFrame.map(function (f) {
              return f.lineVerts;
            })
          ),
          pointsPerFrame: mean(
            state.perFrame.map(function (f) {
              return f.points;
            })
          ),
          textureUploadMiB: Math.round((texBytes / 1048576) * 10) / 10,
          textureCount: state.textures.length,
          programsCreated: state.programsCreated,
          programsUsedWhileSampling: state.programsUsedCount,
          jsHeapUsedMiB: mem ? Math.round((mem.usedJSHeapSize / 1048576) * 10) / 10 : null,
          firstDrawMs: state.firstDrawAt === null ? null : Math.round(state.firstDrawAt),
          devicePixelRatio: window.devicePixelRatio,
          viewport: window.innerWidth + 'x' + window.innerHeight,
          renderer: rendererString(),
        },
        perTag: perTag,
        textures: state.textures.slice(),
      };
    },
    setAttribution: function (on) {
      state.attribution = !!on;
    },
    setSkip: function (tags) {
      state.skip = {};
      (tags || []).forEach(function (t) {
        state.skip[t] = true;
      });
    },
  };
})();
