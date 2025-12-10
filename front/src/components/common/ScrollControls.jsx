import React, { useState, useEffect } from 'react';
const iconTop = '/icons/blogpost/回顶部.svg';
const iconComment = '/icons/blogpost/评论区.svg';
import '@styles/common/ScrollControls.css';

export default function ScrollControls() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShow(true);
            } else {
                setShow(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToComments = () => {
        const el = document.getElementById('comments-section');
        if (el) {
            const headerOffset = 80; // Adjust for sticky header if needed
            const elementPosition = el.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    if (!show) return null;

    return (
        <div className="scroll-controls">
            <button className="scroll-btn" onClick={scrollToTop} title="回到顶部">
                <img src={iconTop} alt="Top" />
            </button>
            <button className="scroll-btn" onClick={scrollToComments} title="去评论区">
                <img src={iconComment} alt="Comments" />
            </button>
        </div>
    );
}
