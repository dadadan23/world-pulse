/*
 * World Pulse globe performance probe (issue #384).
 *
 * Self-contained, dependency-free. Works two ways:
 *   1. Injected before page load by scripts/perf/globe-baseline.mjs (Playwright).
 *   2. Pasted into the DevTools console of ANY browser running the app
 *      (Electron devtools, Safari Web Inspector for iPad, chrome://inspect for
 *      Android TV / Pi Chromium). See scripts/perf/README.md.
 *
 * It does not touch application code. It patches WebGL2RenderingContext
 * prototype draw calls (to count draw calls / primitives per frame and,
 * optionally, skip a scene element for ablation) and measures frame intervals
 * with its own requestAnimationFrame loop.
 *
 * API (on window.__wpPerf):
 *   start()            reset counters and begin sampling
 *   stop() -> result   stop sampling, return { summary, perTag, textures }
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
    callbackMs: [],
    perFrame: [],
    cur: null,
    lastTs: null,
    programTags: new WeakMap(),
    currentTag: 'other',
    perTagCalls: {},
    perTagPrims: {},
    perTagGpuMs: {},
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
    return { calls: 0, tris: 0, lineVerts: 0, points: 0 };
  }

  function account(mode, count, instances) {
    if (state.firstDrawAt === null) state.firstDrawAt = now();
    if (!state.sampling || !state.cur) return;
    var n = count * (instances || 1);
    state.cur.calls++;
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
      state.currentTag = program ? tagFor(this, program) : 'other';
      return origUse.call(this, program);
    };

    function wrapDraw(name, countIdx, instIdx) {
      var orig = P[name];
      if (!orig) return;
      P[name] = function () {
        var mode = arguments[0];
        var count = arguments[countIdx];
        var tag = state.currentTag;
        if (tag === 'basic') tag = refineBasic(mode, count);
        if (state.skip[tag]) return undefined;
        if (state.sampling) {
          state.perTagCalls[tag] = (state.perTagCalls[tag] || 0) + 1;
          state.perTagPrims[tag] = (state.perTagPrims[tag] || 0) + (mode === 4 ? count / 3 : count);
        }
        account(mode, count, instIdx !== undefined ? arguments[instIdx] : 1);
        if (state.sampling && state.attribution) {
          this.finish();
          var t0 = now();
          var r = orig.apply(this, arguments);
          this.finish();
          state.perTagGpuMs[tag] = (state.perTagGpuMs[tag] || 0) + (now() - t0);
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

  // ---- Frame interval loop (independent of the app) ----
  function tick(ts) {
    if (!state.sampling) return;
    if (state.lastTs !== null) {
      state.frameIntervals.push(ts - state.lastTs);
      if (state.cur) state.perFrame.push(state.cur);
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
  function mean(arr) {
    if (!arr.length) return null;
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += arr[i];
    return Math.round((t / arr.length) * 100) / 100;
  }

  window.__wpPerf = {
    start: function () {
      state.frameIntervals = [];
      state.callbackMs = [];
      state.perFrame = [];
      state.perTagCalls = {};
      state.perTagPrims = {};
      state.perTagGpuMs = {};
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
      var frames = state.perFrame.length || 1;
      var perTag = {};
      Object.keys(state.perTagCalls).forEach(function (k) {
        perTag[k] = {
          drawCallsPerFrame: Math.round((state.perTagCalls[k] / frames) * 10) / 10,
          primitivesPerFrame: Math.round(state.perTagPrims[k] / frames),
          gpuMsPerFrame: state.attribution
            ? Math.round(((state.perTagGpuMs[k] || 0) / frames) * 100) / 100
            : null,
        };
      });
      var texBytes = state.textures.reduce(function (t, x) {
        return t + x.bytes;
      }, 0);
      var mem = performance.memory;
      return {
        summary: {
          seconds: Math.round(dur * 10) / 10,
          frames: fi.length,
          fpsMean: fi.length ? Math.round((fi.length / dur) * 10) / 10 : null,
          frameMsP50: pct(fi, 50),
          frameMsP95: pct(fi, 95),
          frameMsP99: pct(fi, 99),
          frameMsMax: pct(fi, 100),
          framesOver33ms: fi.filter(function (x) {
            return x > 33.4;
          }).length,
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
          jsHeapUsedMiB: mem ? Math.round((mem.usedJSHeapSize / 1048576) * 10) / 10 : null,
          firstDrawMs: state.firstDrawAt === null ? null : Math.round(state.firstDrawAt),
          devicePixelRatio: window.devicePixelRatio,
          viewport: window.innerWidth + 'x' + window.innerHeight,
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
