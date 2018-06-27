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

  const RADIUS = 512;
  const INITIAL_CONDITIONS = Array(RADIUS)
    .fill(0)
    .map(() => Array(RADIUS).fill(0).map(() => Array(4).fill(0)));
  
  for(var i = 0; i<RADIUS; i++) {
    for(var j = 0; j<RADIUS; j++) {
      INITIAL_CONDITIONS[i][j][0] = i/RADIUS;
      INITIAL_CONDITIONS[i][j][1] = j/RADIUS;
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
          type: "float"
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
  const float dt = 0.1;

  void toAngle(in float t,inout float angle) {
    angle = t*2.0*pi-pi;
  }

  void fromAngle(in float angle, inout float t) {
    t = (angle+pi)/(2.0*pi);
  }

  void toSpeed(in float t,inout float speed) {
    speed = t*2.0*maxSpeed-maxSpeed;
  }

  void fromSpeed(in float speed, inout float t) {
    t = (speed+maxSpeed)/(2.0*maxSpeed);
  }

  void clipCircle(in float angle, out float an) {
    if(angle > 2.0*pi) {
      an = angle-2.0*pi;
    } else if(angle < 0.0) {
      an = angle+2.0*pi;
    } else {
      an = angle;
    }
  }

  void clipInterval(in float t, in float max, out float tr) {
    if(t > max) {
      tr = max;
    } else if(t < 0.0) {
      tr = 0.0;
    } else {
      tr = t;
    }
  }

  void main() {
    float r = texture2D(prevState, uv).r;
    float g = texture2D(prevState, uv).g;
    float b = texture2D(prevState, uv).b;
    float a = texture2D(prevState, uv).a;

    float a1 = 0.0;
    float a2 = 0.0;
    float s1 = 0.0;
    float s2 = 0.0;

    toAngle(r,a1);
    toAngle(g,a2);
    toSpeed(b,s1);
    toSpeed(a,s2);



    gl_FragColor = vec4(r/1.05,g,b,1);
  }`,

    framebuffer: ({ tick }) => state[(tick + 1) % 2]
  });

  const setupQuad = regl({
    frag: `
  precision mediump float;
  uniform sampler2D prevState;
  varying vec2 uv;
  void main() {
    vec3 state = texture2D(prevState, uv).rgb;
    gl_FragColor = vec4(state,1);
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
