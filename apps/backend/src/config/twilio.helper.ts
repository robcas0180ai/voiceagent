export const buildTwiml = (audioUrl: string): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play loop="1">${audioUrl}</Play>
  <Pause length="1"/>
</Response>`;
};
