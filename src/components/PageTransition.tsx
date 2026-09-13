import React, { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';

const PageTransition = memo(({ children, className = '', type = 'screen' }: { children: ReactNode, type?: 'fade' | 'slide' | 'modal' | 'scale' | 'screen', className?: string }) => {
    // Apple-style easing
    const premiumEase = [0.25, 1, 0.5, 1];

    const variants = {
        screen: {
            initial: { opacity: 0, x: 20 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -20 },
            transition: { duration: 0.4, ease: premiumEase }
        },
        modal: {
            initial: { opacity: 0, y: 30, scale: 0.95 },
            animate: { opacity: 1, y: 0, scale: 1 },
            exit: { opacity: 0, y: 20, scale: 0.98 },
            transition: { duration: 0.4, ease: premiumEase }
        }
    };

    const config = (variants as any)[type] || variants.screen;

    return (
        <motion.div
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={config.transition}
            className={`fixed inset-0 ${type === 'modal' ? 'bg-black/40 backdrop-blur-lg' : 'bg-zen-bg'} z-[100] ${className}`}
            style={{ willChange: 'transform, opacity' }}
        >
            {children}
        </motion.div>
    );
});

PageTransition.displayName = 'PageTransition';

export default PageTransition;
