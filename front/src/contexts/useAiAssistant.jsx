import { useContext } from 'react';
import AiAssistantContext from './aiContextCore';

export function useAiAssistant() {
  return useContext(AiAssistantContext);
}

export default useAiAssistant;
