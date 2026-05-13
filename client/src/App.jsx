import { useState } from 'react';
import PDFUpload from './components/PDFUpload';
import ChatInterface from './components/ChatInterface';

export default function App() {
  const [session, setSession] = useState(null); // { sessionId, filename }

  const handleUploadSuccess = ({ sessionId, filename }) => {
    setSession({ sessionId, filename });
  };

  const handleReset = () => {
    setSession(null);
  };

  return (
    <>
      {session ? (
        <ChatInterface
          sessionId={session.sessionId}
          filename={session.filename}
          onReset={handleReset}
        />
      ) : (
        <PDFUpload onUploadSuccess={handleUploadSuccess} />
      )}
    </>
  );
}
