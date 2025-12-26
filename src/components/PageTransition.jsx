import React, { memo } from 'react';
import { motion } from 'framer-motion';

const PageTransition = memo(({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1]
            }}
            className={`absolute inset-0 ${className}`}
            style={{ willChange: 'transform, opacity' }}
        >
            {children}
        </motion.div>
    );
});

PageTransition.displayName = 'PageTransition';

export default PageTransition;
