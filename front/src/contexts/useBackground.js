import { useContext } from 'react';
import BackgroundContext from './backgroundContextCore';

export const useBackground = () => useContext(BackgroundContext);

export default useBackground;
