import { useContext } from 'react';
import ThemeContext from './themeContextCore';

export function useTheme() {
    return useContext(ThemeContext);
}

export default useTheme;
