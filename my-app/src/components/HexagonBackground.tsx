import React, { useEffect, useRef } from 'react';

// Easy-to-change global color bounds (grayscale) as hex strings
const MIN_COLOR = '#000000ff'; // near-black
const MAX_COLOR = '#646464ff'; // near-white

function hexToRgb(hex: string) {
    const clean = hex.replace('#', '');
    const short = clean.length === 3;
    const r = parseInt(short ? clean[0] + clean[0] : clean.substring(0, 2), 16);
    const g = parseInt(short ? clean[1] + clean[1] : clean.substring(2, 4), 16);
    const b = parseInt(short ? clean[2] + clean[2] : clean.substring(4, 6), 16);
    return { r, g, b };
}

const MIN_RGB = hexToRgb(MIN_COLOR);
const MAX_RGB = hexToRgb(MAX_COLOR);

// Small Perlin noise implementation (2D) adapted for this component
function createPerlin() {
    const permutation = [151,160,137,91,90,15,
        131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
        8,99,37,240,21,10,23,190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
        88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152, 2,44,154,163,70,221,153,101,155,167, 43,172,9,129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
    const p = new Array(512);
    for (let i = 0; i < 512; i++) p[i] = permutation[i & 255];

    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
    const lerp = (t: number, a: number, b: number) => a + t * (b - a);
    const grad = (hash: number, x: number, y: number) => {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    };

    function perlin2(x: number, y: number) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);

        const topRight = p[p[X + 1] + Y + 1];
        const topLeft = p[p[X] + Y + 1];
        const bottomRight = p[p[X + 1] + Y];
        const bottomLeft = p[p[X] + Y];

        const u = fade(xf);
        const v = fade(yf);

        const val = lerp(v,
            lerp(u, grad(bottomLeft, xf, yf), grad(bottomRight, xf - 1, yf)),
            lerp(u, grad(topLeft, xf, yf - 1), grad(topRight, xf - 1, yf - 1))
        );
        return val;
    }

    return { perlin2 };
}

const perlin = createPerlin();

const HexagonBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const hexagonsRef = useRef<Array<{
        x: number;
        y: number;
        fillLevel: number;
        targetFillLevel: number;
    }>>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        setCanvasSize();

        // Hexagon sizing
        const hexRadius = 18;
        const hexHeight = hexRadius * 2;
        const hexWidth = Math.sqrt(3) * hexRadius;
        const vertDist = hexHeight * 3 / 4;
        const horizDist = hexWidth;

        const buildGrid = () => {
            const cols = Math.ceil(canvas.width / horizDist) + 6;
            const rows = Math.ceil(canvas.height / vertDist) + 6;
            hexagonsRef.current = [];

            for (let row = -3; row < rows; row++) {
                for (let col = -3; col < cols; col++) {
                    const x = col * horizDist + (row % 2) * (horizDist / 2);
                    const y = row * vertDist;
                    hexagonsRef.current.push({ x, y, fillLevel: 0, targetFillLevel: 0 });
                }
            }
        };
        buildGrid();

        const drawHexagon = (x: number, y: number, radius: number, fillLevel: number) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const hx = radius * Math.cos(angle);
                const hy = radius * Math.sin(angle);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();

            // Grayscale color interpolation (black <-> white) for monochrome hexagons
            const t = fillLevel; // 0..1
            const r = Math.round(MIN_RGB.r + (MAX_RGB.r - MIN_RGB.r) * t);
            const g = Math.round(MIN_RGB.g + (MAX_RGB.g - MIN_RGB.g) * t);
            const b = Math.round(MIN_RGB.b + (MAX_RGB.b - MIN_RGB.b) * t);

            if (t > 0.01) {
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx.fill();
            }

            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        };

        const animate = (_now: number) => {

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // subtle neutral gray gradient background
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, '#f6f6f6');
            grad.addColorStop(1, '#e8e8e8');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // faster time factor for snappier animation
            const time = _now * 0.003;

            // Perlin noise parameters for ocean-like fBm
            const baseScale = 0.004; // spatial scale
            const speed = 1.0; // animation speed (increased)
            const octaves = 3; // fewer octaves for better performance
            const lacunarity = 2.0;
            const gain = 0.5;

            // fBm but animates in-place by modulating octave amplitudes instead of translating samples
            const fbm = (x: number, y: number, t: number) => {
                let amplitude = 1;
                let frequency = 1;
                let sum = 0;
                let max = 0;
                for (let o = 0; o < octaves; o++) {
                    // sample spatial noise only (no time added to coordinates)
                    const n = perlin.perlin2(x * frequency, y * frequency);

                    // per-octave amplitude modulation (oscillates but doesn't translate the pattern)
                    const phase = o * 1.7;
                    const mod = 0.6 + 0.4 * Math.sin(t * speed * (o + 1) + phase);

                    sum += n * amplitude * mod;
                    max += amplitude * Math.abs(mod);

                    amplitude *= gain;
                    frequency *= lacunarity;
                }
                // guard against divide-by-zero
                return max === 0 ? 0 : sum / max; // result roughly -1..1
            };

            hexagonsRef.current.forEach((hex) => {
                // Map hex position into noise space
                const nx = (hex.x + canvas.width / 2) * baseScale;
                const ny = (hex.y + canvas.height / 2) * baseScale;

                // Compute fBm noise and map to 0..1
                const n = fbm(nx, ny, time * speed);
                // Map noise (-1..1) to 0..1
                let target = (n * 0.5 + 0.5) * 0.98 + 0.01; // small padding to avoid pure 0
                // Emphasize crests slightly
                target = Math.max(0, Math.min(1, Math.pow(target, 1.1)));

                hex.targetFillLevel = target;

                // Smoothly approach target (update faster for snappier motion)
                const smooth = 0.12;
                hex.fillLevel += (hex.targetFillLevel - hex.fillLevel) * smooth;
                hex.fillLevel = Math.max(0, Math.min(1, hex.fillLevel));

                drawHexagon(hex.x, hex.y, hexRadius, hex.fillLevel);
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            setCanvasSize();
            buildGrid();
        };

        window.addEventListener('resize', handleResize);
        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="hexagon-bg"
        />
    );
};

export default HexagonBackground;