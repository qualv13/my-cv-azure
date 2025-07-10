// Aurora WebGL Effect - Pure JavaScript implementation
class Aurora {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            colorStops: options.colorStops || ["#3A29FF", "#FF94B4", "#FF3232"],
            amplitude: options.amplitude || 1.0,
            blend: options.blend || 0.5,
            speed: options.speed || 0.5,
            ...options
        };

        this.time = 0;
        this.animationId = null;
        this.init();
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.backgroundColor = 'transparent';
        this.container.appendChild(this.canvas);

        this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
        if (!this.gl) {
            console.error('WebGL not supported');
            this.createFallback();
            return;
        }

        this.setupWebGL();
        this.createShaders();
        this.createGeometry();
        this.resize();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    createFallback() {
        // Simple CSS fallback if WebGL is not supported
        this.container.style.background = 'linear-gradient(45deg, #3A29FF, #FF94B4, #FF3232)';
        this.container.style.backgroundSize = '400% 400%';
        this.container.style.animation = 'fallbackAnimation 10s ease-in-out infinite';

        const style = document.createElement('style');
        style.textContent = `
            @keyframes fallbackAnimation {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
        `;
        document.head.appendChild(style);
        console.log('Aurora fallback activated - WebGL not supported');
    }

    setupWebGL() {
        const gl = this.gl;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
    }

    createShaders() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        const fragmentShaderSource = `
            precision highp float;

            uniform float u_time;
            uniform float u_amplitude;
            uniform vec3 u_colorStops[3];
            uniform vec2 u_resolution;
            uniform float u_blend;

            // Simplex noise implementation
            vec3 permute(vec3 x) {
                return mod(((x * 34.0) + 1.0) * x, 289.0);
            }

            float snoise(vec2 v) {
                const vec4 C = vec4(
                    0.211324865405187, 0.366025403784439,
                    -0.577350269189626, 0.024390243902439
                );
                vec2 i = floor(v + dot(v, C.yy));
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod(i, 289.0);

                vec3 p = permute(
                    permute(i.y + vec3(0.0, i1.y, 1.0))
                    + i.x + vec3(0.0, i1.x, 1.0)
                );

                vec3 m = max(
                    0.5 - vec3(
                        dot(x0, x0),
                        dot(x12.xy, x12.xy),
                        dot(x12.zw, x12.zw)
                    ),
                    0.0
                );
                m = m * m;
                m = m * m;

                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

                vec3 g;
                g.x = a0.x * x0.x + h.x * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            vec3 getColorAtPosition(float factor) {
                if (factor <= 0.5) {
                    return mix(u_colorStops[0], u_colorStops[1], factor * 2.0);
                } else {
                    return mix(u_colorStops[1], u_colorStops[2], (factor - 0.5) * 2.0);
                }
            }

            void main() {
                vec2 uv = gl_FragCoord.xy / u_resolution;

                vec3 rampColor = getColorAtPosition(uv.x);

                float height = snoise(vec2(uv.x * 2.0 + u_time * 0.1, u_time * 0.25)) * 0.5 * u_amplitude;
                height = exp(height);
                height = (uv.y * 2.0 - height + 0.2);
                float intensity = 0.6 * height;

                float midPoint = 0.20;
                float auroraAlpha = smoothstep(midPoint - u_blend * 0.5, midPoint + u_blend * 0.5, intensity);

                vec3 auroraColor = intensity * rampColor;

                gl_FragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
            }
        `;

        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        if (!this.program) {
            this.createFallback();
            return;
        }

        this.gl.useProgram(this.program);

        // Get uniform locations
        this.uniforms = {
            u_time: this.gl.getUniformLocation(this.program, 'u_time'),
            u_amplitude: this.gl.getUniformLocation(this.program, 'u_amplitude'),
            u_colorStops: this.gl.getUniformLocation(this.program, 'u_colorStops'),
            u_resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
            u_blend: this.gl.getUniformLocation(this.program, 'u_blend')
        };
    }

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;

        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);

        if (!vertexShader || !fragmentShader) {
            return null;
        }

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Error linking program:', gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    createGeometry() {
        const gl = this.gl;

        // Create a full-screen triangle
        const vertices = new Float32Array([
            -1, -1,
            3, -1,
            -1,  3
        ]);

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const positionLocation = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [0, 0, 0];
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight;

        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        if (this.gl) {
            this.gl.viewport(0, 0, width, height);
        }
    }

    animate() {
        if (!this.gl || !this.program) return;

        const gl = this.gl;

        this.time += 0.016 * this.options.speed;

        gl.clear(gl.COLOR_BUFFER_BIT);

        // Set uniforms
        gl.uniform1f(this.uniforms.u_time, this.time);
        gl.uniform1f(this.uniforms.u_amplitude, this.options.amplitude);
        gl.uniform1f(this.uniforms.u_blend, this.options.blend);
        gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);

        // Set color stops
        const colors = this.options.colorStops.map(hex => this.hexToRgb(hex)).flat();
        gl.uniform3fv(this.uniforms.u_colorStops, colors);

        gl.drawArrays(gl.TRIANGLES, 0, 3);

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        if (this.gl) {
            const ext = this.gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        }
    }
}

// Initialize Aurora when page loads (browser only)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('aurora-container');
        if (container) {
            // Small delay to ensure container is properly sized
            setTimeout(() => {
                new Aurora(container, {
                    colorStops: ["#3A29FF", "#FF94B4", "#FF3232"],
                    amplitude: 1.0,
                    blend: 0.5,
                    speed: 0.5
                });
            }, 100);
        }
    });
} else {
    console.log('This script is meant to run in a browser environment');
}