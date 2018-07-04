/*
  <p>This example implements the game of life in regl.</p>

 */

requirejs.config({
  baseUrl: "lib",
  paths: {
    app: "../app"
  }
});

var dt = 0.005;
var xMin = -3.1415;
var xMax = 3.1415;
var yMin = -3.1415;
var yMax = 3.1415;

var pause = false;
var restart = false;

function pausePlay() {
  pause = !pause;
}

function restartSim() {
  pause = true;
  restart = true;
}

var RADIUS = 1024;

function setInitialConditions(init) {
  const xMinM = xMin/Math.PI;
  const xMaxM = xMax/Math.PI;
  const yMinM = yMin/Math.PI;
  const yMaxM = yMax/Math.PI;

  for (var i = 0; i < RADIUS; i++) {
    for (var j = 0; j < RADIUS; j++) {
      init[i][j][0] = (i / RADIUS*(xMaxM-xMinM)+xMinM+1)/2;
      init[i][j][1] = (j / RADIUS*(yMaxM-yMinM)+yMinM+1)/2;
      init[i][j][2] = 0.5;
      init[i][j][3] = 0.5;
    }
  }
}

function createFrameBuffers(regl, init) {
  return Array(2)
    .fill()
    .map(() =>
      regl.framebuffer({
        color: regl.texture({
          radius: RADIUS,
          data: init,
          wrap: "repeat",
          shape: [RADIUS, RADIUS, 4],
          format: "rgba",
          type: "float"
        }),
        depthStencil: false
      })
    );
}

requirejs(["regl"], function (regl) {
  var regl = regl({
    extensions: ['oes_texture_float']
  });

  var INITIAL_CONDITIONS = Array(RADIUS)
    .fill(0)
    .map(() => Array(RADIUS).fill(0).map(() => Array(4).fill(0)));

  setInitialConditions(INITIAL_CONDITIONS);

  var state = createFrameBuffers(regl, INITIAL_CONDITIONS);

  const updateLife = regl({
    frag: `
  precision mediump float;
  uniform sampler2D prevState;
  varying vec2 uv;
  uniform float dt;

  const float pi = 3.1415926535897932384626433832795;
  const float maxSpeed = 10.0*pi;
  const float g = 9.81;
  const float l = 0.25;
  const float m = 9.81;

  void toAngle(in float t,inout float angle) {
    angle = t*4.0*pi-2.0*pi;
  }

  void fromAngle(in float angle, inout float t) {
    t = (angle+2.0*pi)/(4.0*pi);
  }

  void toSpeed(in float t,inout float speed) {
    speed = t*2.0*maxSpeed-maxSpeed;
  }

  void fromSpeed(in float speed, inout float t) {
    t = (speed+maxSpeed)/(2.0*maxSpeed);
  }

  void clipZero(in float t, out float tr) {
    if(t > 1.0) {
      tr = t-1.0;
    } else if(t < 0.0) {
      tr = t+1.0;
    } else {
      tr = t;
    }
  }

  void main() {
    float r = texture2D(prevState, uv).r;
    float g = texture2D(prevState, uv).g;
    float b = texture2D(prevState, uv).b;
    float a = texture2D(prevState, uv).a;

    float r1 = 0.0;
    float r2 = 0.0;
    float p1 = 0.0;
    float p2 = 0.0;

    toAngle(r,r1);
    toAngle(g,r2);
    toSpeed(b,p1);
    toSpeed(a,p2);

    float rho1 = 6.0/(m*l*l)*(2.0*p1-3.0*cos(r1-r2)*p2)/(16.0-9.0*(pow(cos(r1-r2),2.0)));
    float rho2 = 6.0/(m*l*l)*(8.0*p2-3.0*cos(r1-r2)*p1)/(16.0-9.0*(pow(cos(r1-r2),2.0)));
    float p1d = (-m*l*l)/2.0*(rho1*rho2*sin(r1-r2)+3.0*g/l*sin(r1));
    float p2d = (-m*l*l)/2.0*(-rho1*rho2*sin(r1-r2)+g/l*sin(r2));

    r1 += rho1*dt;
    r2 += rho2*dt;
    p1 += p1d*dt;
    p2 += p2d*dt;

    fromAngle(r1,r);
    fromAngle(r2,g);
    fromSpeed(p1,b);
    fromSpeed(p2,a);

    clipZero(r,r);
    clipZero(g,g);
    clipZero(b,b);
    clipZero(a,a);

    gl_FragColor = vec4(r,g,b,a);
  }`,

    framebuffer: ({
      tick
    }) => state[(tick + 1) % 2],

    uniforms: ({
      dt: ({
        tick
      }) => dt
    })
  });

  const setupQuad = regl({
    container: document.getElementById("container"),
    frag: `
  precision mediump float;
  uniform sampler2D prevState;
  varying vec2 uv;
  void main() {
    vec3 state = texture2D(prevState, uv).rgb;
    gl_FragColor = vec4(state.r,state.g,0,1);
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
      prevState: ({
        tick
      }) => state[tick % 2]
    },

    depth: {
      enable: false
    },

    count: 3
  });

  regl.frame(() => {
    setupQuad(() => {
      regl.draw();
      if(restart) {
        restart = false;
        INITIAL_CONDITIONS = Array(RADIUS)
          .fill(0)
          .map(() => Array(RADIUS).fill(0).map(() => Array(4).fill(0)));

        setInitialConditions(INITIAL_CONDITIONS);

        state = createFrameBuffers(regl, INITIAL_CONDITIONS);
      }
      if (!pause) {
        updateLife();
      }
    });
  });
});

document.addEventListener("keypress", function(ev) {
  if(ev.key === 'c') {
    if(document.getElementById('setting').style.display === 'none') {
      document.getElementById('setting').style.display = 'inline'
    } else {
      document.getElementById('setting').style.display = 'none';
    }
  } else if(ev.key === 'a') {
    pausePlay();
  }
});