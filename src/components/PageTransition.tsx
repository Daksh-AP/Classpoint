import React, { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';

const PageTransition = memo(({ children, className = '', type = 'screen' }: { children: ReactNode, type?: 'fade' | 'slide' | 'modal' | 'scale' | 'screen', className?: string }) => {
    // Apple-style easing
    const premiumEase = [0.2, 0, 0.2, 1];

    const variants = {
        screen: {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.05, ease: 'easeOut' }
        },
        modal: {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.05, ease: 'easeOut' }
        }
    };

    const config = (variants as any)[type] || variants.screen;

    return (
        <motion.div
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={config.transition}
            className={`fixed inset-0 ${type === 'modal' ? 'bg-black/50' : 'bg-zen-bg'} z-[100] ${className}`}
        >
            {children}
        </motion.div>
    );
});

PageTransition.displayName = 'PageTransition';

export default PageTransition;
