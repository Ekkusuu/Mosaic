import React, { useEffect, useRef } from 'react';

const HexagonBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationRef = useRef<number>();
    const hexagonsRef = useRef<Array<{
        x: number;
        y: number;
        fillLevel: number;
        targetFillLevel: number;
    }>>([]);

    // Auto ripple effects
    const ripplesRef = useRef<Array<{
        x: number;
        y: number;
        radius: number;
        maxRadius: number;
        strength: number;
        speed: number;
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

        // Smaller hexagon properties
        const hexRadius = 15; // Reduced from 25
        const hexHeight = hexRadius * 2;
        const hexWidth = Math.sqrt(3) * hexRadius;
        const vertDist = hexHeight * 3/4;
        const horizDist = hexWidth;

        // Calculate rows and cols to cover entire screen with extra margin
        const startRow = -Math.ceil(hexRadius / vertDist) - 2;
        const endRow = Math.ceil((canvas.height + hexRadius) / vertDist) + 2;
        const startCol = -Math.ceil(hexRadius / horizDist) - 2;
        const endCol = Math.ceil((canvas.width + hexRadius) / horizDist) + 2;

        // Initialize hexagons grid
        const initHexagons = () => {
            hexagonsRef.current = [];
            for (let row = startRow; row < endRow; row++) {
                for (let col = startCol; col < endCol; col++) {
                    const x = col * horizDist + (row % 2) * (horizDist / 2);
                    const y = row * vertDist;
                    hexagonsRef.current.push({
                        x,
                        y,
                        fillLevel: 0,
                        targetFillLevel: 0
                    });
                }
            }
        };
        initHexagons();

        // Initialize some starting ripples
        const initRipples = () => {
            ripplesRef.current = [];
            // Start with 2-3 random ripples
            for (let i = 0; i < 3; i++) {
                ripplesRef.current.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 100,
                    maxRadius: 150 + Math.random() * 100,
                    strength: 0.3 + Math.random() * 0.4,
                    speed: 0.5 + Math.random() * 1
                });
            }
        };
        initRipples();

        const drawHexagon = (
            x: number,
            y: number,
            radius: number,
            fillLevel: number
        ) => {
            ctx.save();
            ctx.translate(x, y);

            // Draw hexagon path
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const hx = radius * Math.cos(angle);
                const hy = radius * Math.sin(angle);
                if (i === 0) {
                    ctx.moveTo(hx, hy);
                } else {
                    ctx.lineTo(hx, hy);
                }
            }
            ctx.closePath();

            // Fill based on fillLevel (0 to 1)
            if (fillLevel > 0) {
                ctx.fillStyle = `rgba(50, 50, 50, ${fillLevel})`;
                ctx.fill();
            }

            // Always draw the stroke (outline)
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5; // Slightly thinner for smaller hexagons
            ctx.stroke();

            ctx.restore();
        };

        let frameCount = 0;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Light gray background
            ctx.fillStyle = '#e8e8e8';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            frameCount++;

            // Update ripples
            ripplesRef.current = ripplesRef.current.filter(ripple => {
                ripple.radius += ripple.speed;
                // Remove ripples that have reached their max radius
                return ripple.radius < ripple.maxRadius;
            });

            // Randomly add new ripples
            if (frameCount % 60 === 0 && ripplesRef.current.length < 8) { // ~every second, up to 8 ripples
                const rippleCount = 1 + Math.floor(Math.random() * 2); // 1 or 2 ripples
                for (let i = 0; i < rippleCount; i++) {
                    ripplesRef.current.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        radius: 0,
                        maxRadius: 100 + Math.random() * 150,
                        strength: 0.3 + Math.random() * 0.5,
                        speed: 0.8 + Math.random() * 1.2
                    });
                }
            }

            // Update and draw hexagons
            hexagonsRef.current.forEach((hex) => {
                // Mouse influence
                const mouseDx = hex.x - mouseRef.current.x;
                const mouseDy = hex.y - mouseRef.current.y;
                const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

                let targetFill = 0;

                // Calculate fill from mouse
                const mouseInfluenceRadius = 120;
                if (mouseDistance < mouseInfluenceRadius) {
                    targetFill = Math.max(targetFill, 1 - (mouseDistance / mouseInfluenceRadius));
                }

                // Calculate fill from automatic ripples
                ripplesRef.current.forEach(ripple => {
                    const rippleDx = hex.x - ripple.x;
                    const rippleDy = hex.y - ripple.y;
                    const rippleDistance = Math.sqrt(rippleDx * rippleDx + rippleDy * rippleDy);

                    // Create a ring effect that expands
                    const ringWidth = 40;
                    if (Math.abs(rippleDistance - ripple.radius) < ringWidth) {
                        const ringIntensity = 1 - Math.abs(rippleDistance - ripple.radius) / ringWidth;
                        // Fade out as the ripple expands
                        const fadeFactor = 1 - (ripple.radius / ripple.maxRadius);
                        targetFill = Math.max(targetFill, ringIntensity * ripple.strength * fadeFactor);
                    }
                });

                hex.targetFillLevel = targetFill;

                // Smooth transition for fill level
                const fillSpeed = 0.08;
                const emptySpeed = 0.03;

                if (hex.targetFillLevel > hex.fillLevel) {
                    hex.fillLevel += (hex.targetFillLevel - hex.fillLevel) * fillSpeed;
                } else {
                    hex.fillLevel += (hex.targetFillLevel - hex.fillLevel) * emptySpeed;
                }

                // Clamp the fill level
                hex.fillLevel = Math.max(0, Math.min(1, hex.fillLevel));

                drawHexagon(hex.x, hex.y, hexRadius, hex.fillLevel);
            });

            animationRef.current = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        const handleResize = () => {
            setCanvasSize();
            initHexagons();
            initRipples();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('resize', handleResize);
        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0
            }}
        />
    );
};

export default HexagonBackground;