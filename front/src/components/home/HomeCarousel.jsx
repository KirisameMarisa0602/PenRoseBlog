import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTopPostsPerCategory } from '@utils/api/postService';
import resolveUrl from '@utils/resolveUrl';
import { getDefaultAvatar } from '@utils/avatarUtils';
import '@styles/home/HomeCarousel.css';

const HomeCarousel = () => {
    const [slides, setSlides] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTopPostsPerCategory().then(res => {
            if (res && res.code === 200) {
                setSlides(res.data || []);
            }
        });
    }, []);

    useEffect(() => {
        if (slides.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [slides.length]);

    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
    };

    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex(prev => (prev + 1) % slides.length);
    };

    const handleSlideClick = (id) => {
        navigate(`/post/${id}`);
    };

    if (slides.length === 0) return null;

    return (
        <div className="home-carousel-container" style={{ height: '100%' }}>
            {slides.map((slide, index) => {
                const coverUrl = resolveUrl(slide.coverImageUrl);
                const avatarUrl = resolveUrl(slide.authorAvatarUrl) || getDefaultAvatar(slide.userId);
                
                return (
                    <div 
                        key={slide.id || slide.postId}
                        className={`home-carousel-slide ${index === currentIndex ? 'active' : ''}`}
                        style={{ backgroundImage: `url(${coverUrl})` }}
                        onClick={() => handleSlideClick(slide.id || slide.postId)}
                    >
                        <div className="home-carousel-content">
                            <div className="home-carousel-category">{slide.categoryName || '未分类'}</div>
                            <h2 className="home-carousel-title">{slide.title}</h2>
                            <div className="home-carousel-info">
                                <div className="home-carousel-author">
                                    <img src={avatarUrl} alt="avatar" className="home-carousel-author-avatar" />
                                    <span>{slide.authorNickname || slide.authorName}</span>
                                </div>
                                <span>•</span>
                                <span>{slide.likeCount} 点赞</span>
                            </div>
                        </div>
                    </div>
                );
            })}

            {slides.length > 1 && (
                <>
                    <button className="home-carousel-nav-btn home-carousel-prev" onClick={handlePrev}>‹</button>
                    <button className="home-carousel-nav-btn home-carousel-next" onClick={handleNext}>›</button>
                    <div className="home-carousel-indicators">
                        {slides.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`home-carousel-indicator ${idx === currentIndex ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default HomeCarousel;
