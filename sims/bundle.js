(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const glslify = require( 'glslify' )

window.onload = function() {
  let canvas = document.querySelector( 'canvas' )
  let gl = canvas.getContext( 'webgl' )
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  let stateSize = Math.pow( 2, Math.floor(Math.log(canvas.width)/Math.log(2)) )

  let verts = [
    1, 1,
    -1, 1,
    -1,-1,
    1, 1,
    -1, -1,
    1, -1,
  ]

  let vertBuffer = gl.createBuffer()
  gl.bindBuffer( gl.ARRAY_BUFFER, vertBuffer )
  gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW )
  gl.vertexAttribPointer( 0, 2, gl.FLOAT, false, 0, 0 )
  gl.enableVertexAttribArray( 0 )

  let shaderSource = glslify(["precision mediump float;\n#define GLSLIFY 1\nattribute vec2 a_position;\nvoid main() {\n  gl_Position = vec4( a_position, 0, 1.0);\n}\n"])
  const vertexShader = gl.createShader( gl.VERTEX_SHADER )
  gl.shaderSource( vertexShader, shaderSource )
  gl.compileShader( vertexShader )
  console.log( gl.getShaderInfoLog( vertexShader ) ) // create fragment shader to run our simulation

  shaderSource = glslify(["precision highp float;\n#define GLSLIFY 1\nuniform sampler2D state;\nuniform vec2 scale;\n\nfloat ALPHA_M = 0.157;\nfloat ALPHA_N = 0.038;\n\n/*\nfloat birth_lo = 0.278;\nfloat birth_hi = 0.365;\nfloat death_lo = 0.267;\nfloat death_hi = 0.445;\n*/\n\nfloat birth_lo = 0.280;\nfloat birth_hi = 0.350;\nfloat death_lo = 0.360;\nfloat death_hi = 0.550;\n\nfloat b = 1.0;\nfloat PI = 3.14159265358979323846264;\n\nconst float R_outer = 9.0;\nconst float R_inner = 3.0;\n\nfloat sigma(float x, float a, float alpha) {\n    return 1.0 / (1.0 + exp(-4.0 * (x-a) / alpha));\n}\n\nfloat sigma_n(float x, float a, float b) {\n    return sigma(x, a, ALPHA_N) * (1.0 - sigma(x, b, ALPHA_N));\n}\n\nfloat sigma_m(float x, float y, float m) {\n    float weight = sigma(m, 0.5, ALPHA_M);\n    return x * (1.0-weight) + y * weight;\n}\n\nfloat s(float n, float m) {\n    return sigma_n(n,\n                   sigma_m(birth_lo, death_lo, m),\n                   sigma_m(birth_hi, death_hi, m));\n}\n\nfloat f(vec2 p) {\n    vec2 st = (vec2(gl_FragCoord.xy) + p) / scale;\n    return texture2D( state, st ).w;\n}\n\nvoid main() {\n\n  float m = 0.0;\n  float n = 0.0;\n    \n  float inner = PI * R_inner * R_inner;\n  float outer = PI * (R_outer*R_outer - R_inner*R_inner);\n    \n  for(float i = -R_outer; i <= R_outer; i++) {\n      for(float j = -R_outer; j <= R_outer; j++) {\n          \n          float dist = sqrt(float(i*i + j*j));\n          float val = f(vec2(i,j));\n          \n          if(dist < R_inner) {\n              m += val;\n          }\n          else if(dist <= R_inner) {\n              m += val * (R_inner - dist + 0.5);\n          }\n          \n          if(dist < R_outer) {\n              if(dist > R_inner) {\n                  n += val;\n              }\n              else if(dist >= R_inner) {\n                  n += val * (R_inner - dist + 0.5);\n              }\n          }\n          else if(dist <= R_outer) {\n              n += val * (R_outer - dist + 0.5);\n          }\n      }\n  }\n\n  float sM = m / inner;\n  float sN = n / outer;\n    \n  gl_FragColor = vec4( sin(s(sN,sM) * 150. * PI), sin(s(sN,sM) * 200. * PI), sin(s(sN,sM) * PI) , s(sN,sM));\n\n}\n"])
  const fragmentShaderRender = gl.createShader( gl.FRAGMENT_SHADER )
  gl.shaderSource( fragmentShaderRender, shaderSource )
  gl.compileShader( fragmentShaderRender )
  console.log( gl.getShaderInfoLog( fragmentShaderRender ) ) // create shader program const

  programRender = gl.createProgram()
  gl.attachShader( programRender, vertexShader )
  gl.attachShader( programRender, fragmentShaderRender )
  gl.linkProgram( programRender )
  gl.useProgram( programRender )


  // create pointer to vertex array and uniform sharing simulation size
  const position = gl.getAttribLocation( programRender, 'a_position' )
  gl.enableVertexAttribArray( position )
  gl.vertexAttribPointer( position, 2, gl.FLOAT, false, 0,0 )
  let scale = gl.getUniformLocation( programRender, 'scale' )
  gl.uniform2f( scale, stateSize, stateSize )

  // create shader program to draw our simulation to the screen
  shaderSource = glslify(["precision mediump float;\n#define GLSLIFY 1\nuniform sampler2D state;\nuniform vec2 scale;\n\nvoid main() {\n  vec4 color = texture2D(state, gl_FragCoord.xy / scale);\n  gl_FragColor = vec4( color.rgb, 1. );\n}\n"])
  fragmentShaderDraw = gl.createShader( gl.FRAGMENT_SHADER )
  gl.shaderSource( fragmentShaderDraw, shaderSource )
  gl.compileShader( fragmentShaderDraw )
  console.log( gl.getShaderInfoLog( fragmentShaderDraw ) )

  // create shader program
  programDraw = gl.createProgram()
  gl.attachShader( programDraw, vertexShader )
  gl.attachShader( programDraw, fragmentShaderDraw )
  gl.linkProgram( programDraw )
  gl.useProgram( programDraw )

  scale = gl.getUniformLocation( programDraw, 'scale' )
  gl.uniform2f( scale, stateSize,stateSize )
  const position2 = gl.getAttribLocation( programDraw, 'a_position' )
  gl.enableVertexAttribArray( position2 )
  gl.vertexAttribPointer( position2, 2, gl.FLOAT, false, 0,0 )

  // enable floating point textures in the browser
  gl.getExtension('OES_texture_float');

  let texFront = gl.createTexture()
  gl.bindTexture( gl.TEXTURE_2D, texFront )
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT )
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT )
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST )
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST )
  gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, stateSize, stateSize, 0, gl.RGBA, gl.FLOAT, null )

  let texBack = gl.createTexture()
  gl.bindTexture( gl.TEXTURE_2D, texBack )
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT )
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT )
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST )
  gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST )
  gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, stateSize, stateSize, 0, gl.RGBA, gl.FLOAT, null )

  const pixelSize = 4
  const initState = new Float32Array( stateSize * stateSize * pixelSize )
  const reset = function(pct) {
    for( let i = 0; i < stateSize * stateSize; i++ ) {
      for( let j = 0; j < pixelSize; j++ ) {
        initState[ (i * pixelSize) + j ] = (Math.random() < pct)? 1 : 0
      }
    }
    gl.texSubImage2D(
        gl.TEXTURE_2D, 0, 0, 0, stateSize, stateSize, gl.RGBA, gl.FLOAT, initState, 0
    )

  }
  reset(0.35)

  const fb = gl.createFramebuffer()
  const fb2 = gl.createFramebuffer()

  const pingpong = function() {
    gl.bindFramebuffer( gl.FRAMEBUFFER, fb )
    // use the framebuffer to write to our texFront texture
    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texFront, 0 )
    // set viewport to be the size of our state (reaction diffusion simulation)
    // here, this represents the size that will be drawn onto our texture
    gl.viewport(0, 0, stateSize, stateSize )
    // in our shaders, read from texBack, which is where we poked to
    gl.bindTexture( gl.TEXTURE_2D, texBack ) // run shader
    gl.drawArrays( gl.TRIANGLES, 0, 6 )

    gl.bindFramebuffer( gl.FRAMEBUFFER, fb2 )
    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texBack, 0 )
    // set our viewport to be the size of our canvas
    // so that it will fill it entirely
    gl.viewport(0, 0, canvas.width, canvas.height )
    // select the texture we would like to draw the the screen.
    // note that webgl does not allow you to write to / read from the
    // same texture in a single render pass. Because of the swap, we're
    // displaying the state of our simulation ****before**** this render pass (frame)
    gl.bindTexture( gl.TEXTURE_2D, texFront )
    // put simulation on screen
    gl.drawArrays( gl.TRIANGLES, 0, 6 )
  }

  const render = function() {
    window.requestAnimationFrame( render )

    gl.useProgram( programRender )

    pingpong()

    // use the default framebuffer object by passing null
    gl.bindFramebuffer( gl.FRAMEBUFFER, null )

    // set our viewport to be the size of our canvas
    // so that it will fill it entirely
    gl.viewport(0, 0, canvas.width, canvas.height )
    // select the texture we would like to draw the the screen.
    gl.bindTexture( gl.TEXTURE_2D, texBack )
    // use our drawing (copy) shader
    gl.useProgram( programDraw )
    // put simulation on screen
    gl.drawArrays( gl.TRIANGLES, 0, 6 )

  }

  render()
}


},{"glslify":2}],2:[function(require,module,exports){
module.exports = function(strings) {
  if (typeof strings === 'string') strings = [strings]
  var exprs = [].slice.call(arguments,1)
  var parts = []
  for (var i = 0; i < strings.length-1; i++) {
    parts.push(strings[i], exprs[i] || '')
  }
  parts.push(strings[i])
  return parts.join('')
}

},{}]},{},[1]);
