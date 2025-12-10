import { createContext } from 'react';

const defaultContext = {
  sendMessage: async () => {
    throw new Error('AiAssistantProvider is not mounted');
  },
  loading: false,
  error: null,
};

const AiAssistantContext = createContext(defaultContext);

export default AiAssistantContext;
