import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * GenatisSpark — Logo-Centric Splash Screen
 *
 * Sequence:
 * 1. Logo fades + scales in from center
 * 2. "Genatis Board" text slides out horizontally from behind the logo
 * 3. Thin loading bar appears beneath and fills as loading progresses
 * 4. When done: text slides back into the logo
 * 5. Logo gently scales up + fades out
 * 6. UI fades in behind
 */
const GenatisSpark = ({ isLoading, onComplete }: any) => {
    const isLoadingRef = useRef(isLoading);
    const onCompleteRef = useRef(onComplete);

    const [phase, setPhase] = useState('idle');
    // phase: idle → logoIn → textOut → loading → textIn → exit

    const logoControls = useAnimation();
    const bgControls = useAnimation();
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);



    const textVariant: any= {
        hidden: { opacity: 0, x: 0, clipPath: 'inset(0 100% 0 0)' },
        visible: {
            opacity: 1,
            x: 0,
            clipPath: 'inset(0 0% 0 0)',
            transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
        },
        exit: {
            opacity: 0,
            clipPath: 'inset(0 100% 0 0)',
            transition: { duration: 0.55, ease: [0.4, 0, 0.6, 1] }
        }
    };

    const isTextVisible = phase === 'textOut' || phase === 'loading';
    const isTextExiting = phase === 'textIn' || phase === 'exit';

    // Controls for the text displacement
    const textControls = useAnimation();

    useEffect(() => {
        let isMounted = true;
        let fillInterval: any
        let checkInterval: any
        const run = async () => {
            await new Promise((r: any) => setTimeout(r, 200));
            if (!isMounted) return;

            // --- Phase 1: Logo in (Absolute Center) ---
            setPhase('logoIn');
            await logoControls.start({
                scale: 1, opacity: 1, x: 0,
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
            });
            if (!isMounted) return;

            // --- Phase 2: Text slides out (Logo + Text shift left together) ---
            await new Promise((r: any) => setTimeout(r, 200));
            if (!isMounted) return;
            setPhase('textOut');

            logoControls.start({
                x: -110,
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
            });
            textControls.start({
                x: -110, // Starts at same offset as logo
                opacity: 1,
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
            });

            await new Promise((r: any) => setTimeout(r, 700));
            if (!isMounted) return;

            // --- Phase 3: Loading bar ---
            setPhase('loading');
            const startTime = Date.now();
            const fastFillMs = 1500;
            fillInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(0.85, (elapsed / fastFillMs) * 0.85);
                if (isMounted) setLoadingProgress(progress);
                if (progress >= 0.85) clearInterval(fillInterval);
            }, 30);

            if (isLoadingRef.current) {
                await new Promise((resolve: any) => {
                    let attempts = 0;
                    checkInterval = setInterval(() => {
                        attempts++;
                        if (!isLoadingRef.current || attempts > 50) { // Max 4 seconds
                            clearInterval(checkInterval);
                            resolve();
                        }
                    }, 80);
                });
            }
            clearInterval(fillInterval);
            if (!isMounted) return;
            setLoadingProgress(1);
            await new Promise((r: any) => setTimeout(r, 600));
            if (!isMounted) return;

            // --- Phase 4: Text slides back in (Logo returns to absolute center) ---
            setPhase('textIn');
            logoControls.start({
                x: 0,
                transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
            });
            textControls.start({
                x: 0,
                opacity: 0,
                transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
            });
            await new Promise((r: any) => setTimeout(r, 800));
            if (!isMounted) return;

            // --- Phase 5: Exit ---
            setPhase('exit');
            await logoControls.start({
                scale: 1.15, opacity: 0,
                transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
            });

            await bgControls.start({
                opacity: 0,
                transition: { duration: 0.6, ease: 'easeOut' }
            });

            if (isMounted) onCompleteRef.current?.();
        };

        run();

        return () => {
            isMounted = false;
            if (fillInterval) clearInterval(fillInterval);
            if (checkInterval) clearInterval(checkInterval);
        };
    }, [logoControls, textControls, bgControls]);

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--surface, #FEFEFE)' }}
            initial={{ opacity: 1 }}
            animate={bgControls}
        >
            {/* Logo + Text Layer */}
            <div className="relative flex items-center justify-center" style={{ height: 120 }}>
                {/* Logo */}
                <motion.div
                    className="relative z-10 flex-shrink-0"
                    initial={{ scale: 0.6, opacity: 0, x: 0 }}
                    animate={logoControls}
                    style={{ width: 72, height: 72 }}
                >
                    <img
                        src="/logo.png"
                        alt="Genatis Board"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                        }}
                        onError={(e: any) => {
                            e.target.src = '/icon.png';
                        }}
                    />
                </motion.div>

                {/* Text — Positioned absolutely to the right of the logo's logical center (0) */}
                <motion.div
                    className="absolute overflow-hidden"
                    initial={{ opacity: 0, x: 0 }}
                    animate={textControls}
                    style={{
                        left: 'calc(50% + 48px)', // 36px (logo half) + 12px gap
                        originX: 0
                    }}
                >
                    <motion.div
                        style={{ whiteSpace: 'nowrap' }}
                        variants={textVariant}
                        initial="hidden"
                        animate={
                            isTextExiting ? 'exit' :
                                isTextVisible ? 'visible' : 'hidden'
                        }
                    >
                        <div
                            style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '2rem',
                                fontWeight: 300,
                                letterSpacing: '0.08em',
                                color: 'var(--text-primary, #1A1A1A)',
                                lineHeight: 1.1,
                            }}
                        >
                            Genatis Board
                        </div>
                        <div
                            style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.65rem',
                                fontWeight: 400,
                                letterSpacing: '0.22em',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary, #666666)',
                                marginTop: '0.35rem',
                                opacity: 0.7,
                            }}
                        >
                            Your classroom companion
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Loading elements container */}
            <div className="flex flex-col items-center" style={{ marginTop: 20 }}>
                {/* Loading bar */}
                <motion.div
                    className="relative overflow-hidden rounded-full"
                    style={{ width: 220, height: 2, background: 'rgba(0,0,0,0.05)' }}
                    initial={{ opacity: 0, scaleX: 0.4 }}
                    animate={{
                        opacity: (phase === 'loading' || phase === 'textIn') ? 1 : 0,
                        scaleX: (phase === 'loading' || phase === 'textIn') ? 1 : 0.4,
                    }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                    <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: 'var(--accent, #F5A68E)' }}
                        animate={{ width: `${loadingProgress * 100}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                </motion.div>

                {/* Percentage text */}
                <motion.div
                    style={{
                        marginTop: '0.75rem',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.7rem',
                        letterSpacing: '0.12em',
                        color: 'var(--text-secondary, #666666)',
                        opacity: 0.5,
                        fontVariantNumeric: 'tabular-nums',
                    }}
                    animate={{
                        opacity: phase === 'loading' ? 0.5 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                >
                    {Math.round(loadingProgress * 100)}%
                </motion.div>
            </div>
        </motion.div>
    );
};

export default GenatisSpark;


