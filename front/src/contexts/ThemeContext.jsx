import React, { useEffect } from 'react';
import ThemeContext from './themeContextCore';

export function ThemeProvider({ children }) {
    // 强制使用 'light' 主题，移除切换功能
    const theme = 'light';
    const setTheme = () => {}; // 空函数，防止报错

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('dark');
        root.classList.add('light');
        localStorage.removeItem('theme');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
