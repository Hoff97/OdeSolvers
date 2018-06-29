/*
  <p>This example implements the game of life in regl.</p>

 */

requirejs.config({
    baseUrl: "lib",
    paths: {
      app: "../app"
    }
  });
  
  requirejs(["regl"], function(regl) {
    var regl = regl({extensions: ['oes_texture_float']});
  
    const RADIUS = 1024;
    const INITIAL_CONDITIONS = Array(RADIUS)
      .fill(0)
      .map(() => Array(RADIUS).fill(0).map(() => Array(4).fill(0)));
    
    for(var i = 0; i<RADIUS; i++) {
      for(var j = 0; j<RADIUS; j++) {
        var id = Math.round((i%200)/200);
        var jd = Math.round((j%200)/200);
        if(id != jd) {
            INITIAL_CONDITIONS[i][j][0] = (Math.sin(i/10)+1)/2;
        } else {
            INITIAL_CONDITIONS[i][j][0] = 0;
        }
        if(i<RADIUS/2) {
            INITIAL_CONDITIONS[i][j][1] = 0.0001;
        } else {
            INITIAL_CONDITIONS[i][j][1] = 0.0005;
        }
        INITIAL_CONDITIONS[i][j][2] = 0;
        INITIAL_CONDITIONS[i][j][3] = 1;
      }
    }
  
    const state = Array(2)
      .fill()
      .map(() =>
        regl.framebuffer({
          color: regl.texture({
            radius: RADIUS,
            data: INITIAL_CONDITIONS,
            wrap: "repeat",
            shape: [RADIUS, RADIUS, 4],
            format: "rgba",
            type: "float",
            aniso: 4
          }),
          depthStencil: false
        })
      );
  
    const updateLife = regl({
      frag: `
    precision mediump float;
    uniform sampler2D prevState;
    varying vec2 uv;
  
    const float pi = 3.1415926535897932384626433832795;
    const float maxSpeed = 10.0*pi;
    const float h = 0.002;
    const float dt = 0.0001;
  
    void main() {
      float g = texture2D(prevState, uv).g;
      float b = texture2D(prevState, uv).b;
      float a = texture2D(prevState, uv).a;
  
      float rc = texture2D(prevState, uv).r;
      float r1 = texture2D(prevState, uv+vec2(h,0)).r;
      float r2 = texture2D(prevState, uv+vec2(-h,0)).r;
      float r3 = texture2D(prevState, uv+vec2(0,h)).r;
      float r4 = texture2D(prevState, uv+vec2(0,-h)).r;

      float dx1 = (r1-rc)/h;
      float dx2 = (rc-r2)/h;
      float dy1 = (r3-rc)/h;
      float dy2 = (rc-r4)/h;

      float dxx = (dx1-dx2)/h;
      float dyy = (dy1-dy2)/h;

      float diff = g*(dxx+dyy);

      float r = rc+diff*dt;
      if(r < 0.0) {
          r=0.0;
      } else if(r > 1.0) {
          r = 1.0;
      }

      gl_FragColor = vec4(r,g,b,a);
    }`,
  
      framebuffer: ({ tick }) => state[(tick + 1) % 2],
      sample: {
        enable: true,
        alpha: false,
        coverage: {
          value: 1,
          invert: false
        }
      }
    });
  
    const setupQuad = regl({
      frag: `
    precision mediump float;
    uniform sampler2D prevState;
    varying vec2 uv;
    void main() {
      float r = texture2D(prevState, uv).r;
      float g = texture2D(prevState, uv).g;
      float b = texture2D(prevState, uv).b;
      float a = texture2D(prevState, uv).a;
      gl_FragColor = vec4(r,g*200.0,0,1);
    }`,
  
      vert: `
    precision mediump float;
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = 0.5 * (position + 1.0);
      gl_Position = vec4(position, 0, 1);
    }`,
  
      attributes: {
        position: [-4, -4, 4, -4, 0, 4]
      },
  
      uniforms: {
        prevState: ({ tick }) => state[tick % 2]
      },
  
      depth: { enable: false },
  
      count: 3
    });
  
    regl.frame(() => {
      setupQuad(() => {
        regl.draw();
        updateLife();
      });
    });
  });
  